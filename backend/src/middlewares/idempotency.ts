import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import {
  preReserveIdempotencyKey,
  finalizeIdempotencyKey,
  releaseIdempotencyKey,
} from '../utils/idempotency';
import { logger } from '../config/logger';

export async function enforceIdempotency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  const userId = req.user?.id || null;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: 'x-idempotency-key header is required for state-changing monetary requests.',
    });
  }

  try {
    const reservation = await preReserveIdempotencyKey(
      idempotencyKey,
      userId,
      req.originalUrl,
      req.body
    );

    // 1. Mismatched payload rejection
    if (reservation.status === 'PAYLOAD_MISMATCH') {
      return res.status(422).json({
        success: false,
        message: reservation.reason,
      });
    }

    // 2. Recovery blocked for pending investigation
    if (reservation.status === 'RECOVERY_BLOCKED_FOR_INVESTIGATION') {
      return res.status(409).json({
        success: false,
        message: reservation.reason,
      });
    }

    // 3. Concurrent request in flight: Block race condition
    if (reservation.status === 'IN_FLIGHT') {
      return res.status(409).json({
        success: false,
        message: 'A request with this idempotency key is currently being processed. Please retry shortly.',
      });
    }

    // 4. Previously completed identical request: Return cached result directly
    if (reservation.status === 'COMPLETED') {
      return res.status(reservation.record.responseStatus).json(reservation.record.responseBody);
    }

    // 5. Newly acquired reservation: Intercept response to commit result
    let finalized = false;
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      if (!finalized) {
        finalized = true;
        const txRef = body?.data?.reference || body?.reference || null;
        finalizeIdempotencyKey(idempotencyKey, userId, res.statusCode, body, txRef).catch((err) =>
          logger.error('Failed to finalize customer-scoped idempotency record:', err)
        );
      }
      return originalJson(body);
    };

    // If server error occurs before sending response, release lock safely
    res.on('finish', () => {
      if (!finalized && res.statusCode >= 500) {
        releaseIdempotencyKey(idempotencyKey, userId).catch(() => {});
      }
    });

    next();
  } catch (error) {
    await releaseIdempotencyKey(idempotencyKey, userId).catch(() => {});
    next(error);
  }
}
