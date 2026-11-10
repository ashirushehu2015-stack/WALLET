import crypto from 'crypto';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export const IDEMPOTENCY_STATUS = {
  PROCESSING: 102, // HTTP 102 Processing (standard in-flight state)
};

const ABANDONED_LEASE_THRESHOLD_MS = 5 * 60 * 1000; // 5-minute investigation threshold

/**
 * Deterministically compute SHA-256 fingerprint of request body.
 * Prevents key reuse across mismatched request payloads.
 */
export function computeRequestHash(body: any): string {
  if (!body || Object.keys(body).length === 0) {
    return 'EMPTY_PAYLOAD';
  }
  try {
    // Sort keys deterministically
    const sortedString = JSON.stringify(body, Object.keys(body).sort());
    return crypto.createHash('sha256').update(sortedString).digest('hex');
  } catch {
    return crypto.createHash('sha256').update(String(body)).digest('hex');
  }
}

export type PreReserveResult =
  | { status: 'ACQUIRED'; recordId?: string }
  | { status: 'IN_FLIGHT'; remainingMs?: number }
  | { status: 'COMPLETED'; record: any }
  | { status: 'PAYLOAD_MISMATCH'; reason: string }
  | { status: 'RECOVERY_BLOCKED_FOR_INVESTIGATION'; reason: string };

/**
 * Customer-Scoped Atomic Pre-Reservation with Safe Processing Recovery Lifecycle.
 * - Scoped strictly to (userId, key). Customer B cannot read or block Customer A's key.
 * - Detects payload tampering/mismatch.
 * - Safe recovery for abandoned processing records without authorizing duplicate execution.
 */
export async function preReserveIdempotencyKey(
  key: string,
  userId: string | null,
  requestPath: string,
  requestBody?: any,
  operationType?: string,
  transactionReference?: string
): Promise<PreReserveResult> {
  const requestHash = computeRequestHash(requestBody);
  const currentWorker = `pid_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Scoped lookup: Lookup key strictly within the authenticated customer's scope
  const existing = await prisma.idempotencyKey.findFirst({
    where: {
      key,
      userId: userId || null,
    },
  });

  if (existing) {
    // A. Payload Fingerprint Mismatch Check
    if (existing.requestHash && existing.requestHash !== 'EMPTY_PAYLOAD' && existing.requestHash !== requestHash) {
      const msg = `Idempotency key '${key}' was previously used with a different request payload. Reusing keys across different operations is prohibited.`;
      logger.warn(`Idempotency Payload Mismatch [User: ${userId}, Key: ${key}]`);
      return { status: 'PAYLOAD_MISMATCH', reason: msg };
    }

    // B. In-Flight Processing State (Status 102) Lifecycle
    if (existing.responseStatus === IDEMPOTENCY_STATUS.PROCESSING) {
      const now = Date.now();
      const lastUpdate = existing.lastProcessingUpdate
        ? new Date(existing.lastProcessingUpdate).getTime()
        : new Date(existing.createdAt).getTime();
      const elapsedMs = now - lastUpdate;

      // Case 1: Fresh in-flight request (< 5 minutes) -> Active Lock, block duplicate
      if (elapsedMs < ABANDONED_LEASE_THRESHOLD_MS) {
        return { status: 'IN_FLIGHT', remainingMs: ABANDONED_LEASE_THRESHOLD_MS - elapsedMs };
      }

      // Case 2: Abandoned Lease (>= 5 minutes) -> Execute Safe Recovery Lifecycle
      logger.warn(`Abandoned Idempotency Record Detected [User: ${userId}, Key: ${key}, Elapsed: ${Math.round(elapsedMs / 1000)}s]. Inspecting underlying transaction state...`);
      return await recoverAbandonedProcessingRecord(existing, currentWorker, requestHash);
    }

    // C. Completed Request -> Return cached response
    return { status: 'COMPLETED', record: existing };
  }

  // 2. No existing record for this (userId, key) -> Attempt atomic reservation
  try {
    const created = await prisma.idempotencyKey.create({
      data: {
        key,
        userId: userId || null,
        requestPath,
        requestHash,
        operationType: operationType || null,
        transactionReference: transactionReference || null,
        leaseOwner: currentWorker,
        lastProcessingUpdate: new Date(),
        responseStatus: IDEMPOTENCY_STATUS.PROCESSING,
        responseBody: { message: 'Transaction request in flight' },
      },
    });
    return { status: 'ACQUIRED', recordId: created.id };
  } catch (error: any) {
    // P2002 Unique Constraint Violation: Another concurrent thread reserved (userId, key) simultaneously
    if (error.code === 'P2002') {
      const concurrent = await prisma.idempotencyKey.findFirst({
        where: { key, userId: userId || null },
      });
      if (concurrent && concurrent.responseStatus !== IDEMPOTENCY_STATUS.PROCESSING) {
        return { status: 'COMPLETED', record: concurrent };
      }
      return { status: 'IN_FLIGHT' };
    }
    logger.error('Error pre-reserving idempotency key:', error);
    throw error;
  }
}

/**
 * Safe Processing Record Recovery Lifecycle
 * Audits underlying transaction state before allowing retry or finalization.
 * Never authorizes duplicate execution merely because 5 minutes elapsed.
 */
async function recoverAbandonedProcessingRecord(
  existing: any,
  newWorker: string,
  requestHash: string
): Promise<PreReserveResult> {
  // 1. Inspect underlying financial transaction if a reference was recorded
  if (existing.transactionReference) {
    const txRecord = await prisma.transaction.findUnique({
      where: { reference: existing.transactionReference },
      include: { journalEntry: true, deposit: true, withdrawal: true, transfer: true, vasTransaction: true },
    });

    if (txRecord) {
      // If transaction completed successfully, finalize idempotency record and return cached result!
      if (txRecord.status === 'SUCCESS') {
        logger.info(`Recovery: Underlying transaction ${existing.transactionReference} succeeded. Finalizing idempotency record.`);
        const finalized = await prisma.idempotencyKey.update({
          where: { id: existing.id },
          data: {
            responseStatus: 200,
            responseBody: {
              success: true,
              message: 'Transaction completed successfully (recovered from previous session)',
              data: { reference: txRecord.reference, amount: txRecord.amount },
            },
            lastProcessingUpdate: new Date(),
          },
        });
        return { status: 'COMPLETED', record: finalized };
      }

      // If transaction failed definitively, update record
      if (txRecord.status === 'FAILED' || txRecord.status === 'REVERSED') {
        logger.info(`Recovery: Underlying transaction ${existing.transactionReference} failed definitively.`);
        const failedRecord = await prisma.idempotencyKey.update({
          where: { id: existing.id },
          data: {
            responseStatus: 400,
            responseBody: { success: false, message: 'Transaction previously failed' },
            lastProcessingUpdate: new Date(),
          },
        });
        return { status: 'COMPLETED', record: failedRecord };
      }

      // If transaction status is PENDING, outcome is uncertain: do NOT authorize second debit!
      logger.warn(`Recovery: Underlying transaction ${existing.transactionReference} remains PENDING. Halting for administrative reconciliation.`);
      return {
        status: 'RECOVERY_BLOCKED_FOR_INVESTIGATION',
        reason: `Transaction ${existing.transactionReference} is currently pending provider settlement. A second execution is blocked to prevent double-spending.`,
      };
    }
  }

  // 2. If NO transaction reference was created, the node crashed before any database financial movements.
  // It is safe to reclaim the lease and allow atomic processing.
  logger.info(`Recovery: Zero underlying financial transactions found for record ${existing.id}. Reclaiming lease safely.`);
  await prisma.idempotencyKey.update({
    where: { id: existing.id },
    data: {
      leaseOwner: newWorker,
      requestHash,
      lastProcessingUpdate: new Date(),
      responseStatus: IDEMPOTENCY_STATUS.PROCESSING,
    },
  });

  return { status: 'ACQUIRED', recordId: existing.id };
}

/**
 * Finalize an acquired customer-scoped idempotency key with final HTTP status, response body, and transaction reference.
 * Supports overloaded arguments for backwards compatibility:
 * - finalizeIdempotencyKey(key, userId, responseStatus, responseBody, transactionReference)
 * - finalizeIdempotencyKey(key, responseStatus, responseBody)
 */
export async function finalizeIdempotencyKey(
  key: string,
  userIdOrStatus: string | null | number,
  responseStatusOrBody: number | any,
  responseBodyOrRef?: any,
  transactionReference?: string
) {
  let userId: string | null = null;
  let responseStatus: number;
  let responseBody: any;
  let txRef: string | undefined = transactionReference;

  if (typeof userIdOrStatus === 'number') {
    // 3-argument call: (key, responseStatus, responseBody)
    responseStatus = userIdOrStatus;
    responseBody = responseStatusOrBody;
    txRef = responseBodyOrRef;
  } else {
    // 4 or 5-argument call: (key, userId, responseStatus, responseBody, transactionReference)
    userId = userIdOrStatus;
    responseStatus = responseStatusOrBody as number;
    responseBody = responseBodyOrRef;
  }

  const existing = await prisma.idempotencyKey.findFirst({
    where: { key, ...(userId !== null ? { userId } : {}) },
  });

  if (!existing) {
    return null;
  }

  return await prisma.idempotencyKey.update({
    where: { id: existing.id },
    data: {
      responseStatus,
      responseBody,
      transactionReference: transactionReference || existing.transactionReference,
      lastProcessingUpdate: new Date(),
    },
  });
}

/**
 * Release an acquired idempotency key if an unhandled server error occurs before execution commits.
 */
export async function releaseIdempotencyKey(key: string, userId: string | null) {
  try {
    const existing = await prisma.idempotencyKey.findFirst({
      where: { key, userId: userId || null, responseStatus: IDEMPOTENCY_STATUS.PROCESSING },
    });
    if (existing && !existing.transactionReference) {
      await prisma.idempotencyKey.delete({
        where: { id: existing.id },
      });
    }
  } catch (err: any) {
    logger.warn(`Could not release in-flight idempotency key ${key}: ${err.message}`);
  }
}
