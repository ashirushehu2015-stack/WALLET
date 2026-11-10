import { KYCTier, KYCStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { encryptIdentifier, decryptIdentifier, maskIdentifier } from '../utils/encryption';
import { logger } from '../config/logger';

export interface TierLimits {
  [key: string]: any;
  maxSingleDeposit: number;
  maxDailyTransfer: number;
  maxBalance: number;
}

export class KYCService {
  /**
   * Initialize Customer KYC Record at Registration.
   * STRICT: Customers start at Tier 1 with status REGISTERED (unverified identity).
   * Registration alone NEVER grants VERIFIED status.
   */
  static async initializeKYC(userId: string) {
    const existing = await prisma.kYCRecord.findUnique({ where: { userId } });
    if (existing) return existing;

    return await prisma.kYCRecord.create({
      data: {
        userId,
        tier: KYCTier.TIER_1,
        status: KYCStatus.REGISTERED,
        bvn: null,
        nin: null,
        verifiedAt: null,
      },
    });
  }

  /**
   * Submit BVN/NIN for KYC Verification and Upgrade.
   * - STRICT: Encrypts sensitive identity data with AES-256-GCM before DB persistence.
   * - Requires authorized verification confirmation from identity provider.
   * - Awaits verification: sets VERIFICATION_PENDING or UNAVAILABLE if provider check is unconfirmed.
   * - Never fabricates successful identity verification.
   */
  static async submitKYC(
    userId: string,
    bvn?: string,
    nin?: string,
    verificationProviderResult?: { verified: boolean; status?: KYCStatus; reason?: string }
  ) {
    const existing = await prisma.kYCRecord.findUnique({
      where: { userId },
    });

    if (existing && existing.status === KYCStatus.VERIFIED && existing.tier === KYCTier.TIER_3) {
      throw new Error('KYC already verified at maximum Tier 3 for this user.');
    }

    if (!bvn && !nin && !existing?.bvn && !existing?.nin) {
      throw new Error('At least one identity credential (BVN or NIN) must be provided.');
    }

    // Validate identifier format if provided
    if (bvn && (!/^\d{11}$/.test(bvn.trim()))) {
      throw new Error('BVN must be exactly 11 numeric digits.');
    }
    if (nin && (!/^\d{11}$/.test(nin.trim()))) {
      throw new Error('NIN must be exactly 11 numeric digits.');
    }

    // Encrypt sensitive fields with AES-256-GCM authenticated encryption
    const encryptedBvn = bvn ? encryptIdentifier(bvn.trim()) : existing?.bvn || null;
    const encryptedNin = nin ? encryptIdentifier(nin.trim()) : existing?.nin || null;

    const hasBvn = !!encryptedBvn;
    const hasNin = !!encryptedNin;

    // Determine status based on verified evidence
    let status: KYCStatus = KYCStatus.VERIFICATION_PENDING;
    let verifiedAt: Date | null = null;
    let rejectionReason: string | null = null;
    let tier: KYCTier = existing?.tier || KYCTier.TIER_1;

    if (verificationProviderResult) {
      if (verificationProviderResult.verified) {
        status = KYCStatus.VERIFIED;
        verifiedAt = new Date();
        tier = hasBvn && hasNin ? KYCTier.TIER_3 : hasBvn ? KYCTier.TIER_2 : KYCTier.TIER_1;
      } else if (verificationProviderResult.status === KYCStatus.REJECTED) {
        status = KYCStatus.REJECTED;
        rejectionReason = verificationProviderResult.reason || 'Identity verification provider rejected submitted credentials.';
      } else if (verificationProviderResult.status === KYCStatus.UNAVAILABLE) {
        status = KYCStatus.UNAVAILABLE;
        rejectionReason = verificationProviderResult.reason || 'Identity verification service temporarily unavailable.';
      }
    }

    const updated = await prisma.kYCRecord.upsert({
      where: { userId },
      update: {
        bvn: encryptedBvn,
        nin: encryptedNin,
        tier,
        status,
        verifiedAt,
        rejectionReason,
      },
      create: {
        userId,
        bvn: encryptedBvn,
        nin: encryptedNin,
        tier,
        status,
        verifiedAt,
        rejectionReason,
      },
    });

    // Audit log state transition
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorType: 'USER',
        action: 'KYC_SUBMISSION_PROCESSED',
        resource: `users/${userId}/kyc`,
        details: {
          status,
          tier,
          bvnProvided: hasBvn,
          ninProvided: hasNin,
          verified: status === KYCStatus.VERIFIED,
        },
      },
    });

    logger.info(`KYC Submission for User ${userId}: Status updated to ${status} (Tier: ${tier}).`);

    return this.getMaskedKYCRecord(userId);
  }

  /**
   * Retrieve customer KYC record with sensitive fields MASKED.
   * Safe for client presentation and admin dashboard displays.
   */
  static async getMaskedKYCRecord(userId: string) {
    const record = await prisma.kYCRecord.findUnique({
      where: { userId },
    });

    if (!record) return null;

    return {
      id: record.id,
      userId: record.userId,
      tier: record.tier,
      status: record.status,
      bvnMasked: maskIdentifier(record.bvn),
      ninMasked: maskIdentifier(record.nin),
      verifiedAt: record.verifiedAt,
      rejectionReason: record.rejectionReason,
      limits: this.getTierLimits(record.tier),
    };
  }

  /**
   * Retrieve decrypted BVN for authorized payment provider operations only (e.g. Paystack DVA creation).
   * Restricts decryption to backend internal logic.
   */
  static async getDecryptedBVN(userId: string): Promise<string | null> {
    const record = await prisma.kYCRecord.findUnique({
      where: { userId },
    });
    if (!record || !record.bvn) return null;
    return decryptIdentifier(record.bvn);
  }

  /**
   * Authoritative Business Tier Limits Specification
   */
  static getTierLimits(tier: KYCTier): TierLimits {
    switch (tier) {
      case KYCTier.TIER_1:
        return { maxSingleDeposit: 50000, maxDailyTransfer: 300000, maxBalance: 300000 };
      case KYCTier.TIER_2:
        return { maxSingleDeposit: 200000, maxDailyTransfer: 500000, maxBalance: 1000000 };
      case KYCTier.TIER_3:
        return { maxSingleDeposit: 5000000, maxDailyTransfer: 10000000, maxBalance: 50000000 };
      default:
        return { maxSingleDeposit: 50000, maxDailyTransfer: 300000, maxBalance: 300000 };
    }
  }

  /**
   * Returns Africa/Lagos (WAT, UTC+1) Daily Reset Boundary.
   * Calculated from 00:00:00.000 WAT today to 23:59:59.999 WAT today.
   */
  static getDailyResetWindow(): { startOfDay: Date; endOfDay: Date } {
    const now = new Date();
    // West Africa Time is UTC+1 (60 minutes offset)
    const watOffsetMs = 60 * 60 * 1000;
    const watTime = new Date(now.getTime() + watOffsetMs);

    const watYear = watTime.getUTCFullYear();
    const watMonth = watTime.getUTCMonth();
    const watDate = watTime.getUTCDate();

    // Start of day in WAT expressed as UTC Date
    const startOfWatDayUtc = new Date(Date.UTC(watYear, watMonth, watDate, 0, 0, 0, 0) - watOffsetMs);
    const endOfWatDayUtc = new Date(startOfWatDayUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

    return {
      startOfDay: startOfWatDayUtc,
      endOfDay: endOfWatDayUtc,
    };
  }

  /**
   * Enforce KYC limits for Inbound Deposits (DVA & Webhooks).
   * Asserts single deposit <= maxSingleDeposit and resulting balance <= maxBalance.
   */
  static async validateDeposit(
    userId: string,
    amountNGN: number,
    currentWalletBalance: number,
    txContext?: Prisma.TransactionClient
  ): Promise<{ valid: boolean; reason?: string; limits: TierLimits; tier: KYCTier }> {
    const db = txContext || prisma;
    const kyc = await db.kYCRecord.findUnique({ where: { userId } });
    const tier = kyc?.tier || KYCTier.TIER_1;
    const limits = this.getTierLimits(tier);

    // 1. Single deposit cap check
    if (amountNGN > limits.maxSingleDeposit) {
      const msg = `Deposit of ₦${amountNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })} violates KYC Tier ${tier} single deposit limit of ₦${limits.maxSingleDeposit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
      logger.warn(`KYC Deposit Limit Violation [User: ${userId}]: ${msg}`);
      return { valid: false, reason: msg, limits, tier };
    }

    // 2. Maximum cumulative balance check
    if (currentWalletBalance + amountNGN > limits.maxBalance) {
      const msg = `Deposit results in wallet balance of ₦${(currentWalletBalance + amountNGN).toLocaleString('en-NG', { minimumFractionDigits: 2 })}, which exceeds KYC Tier ${tier} maximum balance limit of ₦${limits.maxBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
      logger.warn(`KYC Balance Cap Violation [User: ${userId}]: ${msg}`);
      return { valid: false, reason: msg, limits, tier };
    }

    return { valid: true, limits, tier };
  }

  /**
   * Enforce KYC limits for Outward P2P Transfers.
   * Asserts cumulative daily transfers + attempted transfer <= maxDailyTransfer.
   * Also asserts recipient resulting balance <= recipient maxBalance.
   */
  static async validateTransfer(
    senderId: string,
    recipientUserId: string,
    amountNGN: number,
    recipientLiveBalance: number,
    txContext: Prisma.TransactionClient
  ): Promise<{ valid: boolean; reason?: string; limits: TierLimits; tier: KYCTier }> {
    const db = txContext;
    const { startOfDay } = this.getDailyResetWindow();

    // 1. Check Sender KYC tier & daily cumulative limit
    const senderKyc = await db.kYCRecord.findUnique({ where: { userId: senderId } });
    const senderTier = senderKyc?.tier || KYCTier.TIER_1;
    const senderLimits = this.getTierLimits(senderTier);

    // Sum all successful transfers sent by this user today (WAT boundary)
    const dailyTransfers = await db.transfer.aggregate({
      where: {
        senderId,
        status: 'SUCCESS',
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    const cumulativeTransfersToday = Number(dailyTransfers._sum.amount || 0);

    if (cumulativeTransfersToday + amountNGN > senderLimits.maxDailyTransfer) {
      const msg = `Transfer of ₦${amountNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })} violates KYC Tier ${senderTier} daily transfer limit of ₦${senderLimits.maxDailyTransfer.toLocaleString('en-NG', { minimumFractionDigits: 2 })}. Transferred today: ₦${cumulativeTransfersToday.toLocaleString('en-NG', { minimumFractionDigits: 2 })}, Remaining limit: ₦${Math.max(0, senderLimits.maxDailyTransfer - cumulativeTransfersToday).toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
      logger.warn(`KYC Daily Transfer Limit Violation [Sender: ${senderId}]: ${msg}`);
      return { valid: false, reason: msg, limits: senderLimits, tier: senderTier };
    }

    // 2. Check Recipient KYC tier & maximum balance cap
    const recipientKyc = await db.kYCRecord.findUnique({ where: { userId: recipientUserId } });
    const recipientTier = recipientKyc?.tier || KYCTier.TIER_1;
    const recipientLimits = this.getTierLimits(recipientTier);

    if (recipientLiveBalance + amountNGN > recipientLimits.maxBalance) {
      const msg = `Transfer would cause recipient balance to exceed KYC Tier ${recipientTier} maximum wallet balance limit of ₦${recipientLimits.maxBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
      logger.warn(`KYC Recipient Balance Cap Violation [Recipient: ${recipientUserId}]: ${msg}`);
      return { valid: false, reason: msg, limits: senderLimits, tier: senderTier };
    }

    return { valid: true, limits: senderLimits, tier: senderTier };
  }

  /**
   * Enforce KYC limits for Outward Bank Withdrawals.
   * Asserts cumulative daily outflows (transfers + withdrawals) <= maxDailyTransfer.
   */
  static async validateWithdrawal(
    userId: string,
    amountNGN: number,
    txContext: Prisma.TransactionClient
  ): Promise<{ valid: boolean; reason?: string; limits: TierLimits; tier: KYCTier }> {
    const db = txContext;
    const { startOfDay } = this.getDailyResetWindow();

    const kyc = await db.kYCRecord.findUnique({ where: { userId } });
    const tier = kyc?.tier || KYCTier.TIER_1;
    const limits = this.getTierLimits(tier);

    // Sum active/completed withdrawals + transfers today
    const [withdrawalsToday, transfersToday] = await Promise.all([
      db.withdrawal.aggregate({
        where: {
          userId,
          status: { in: ['PENDING', 'PROCESSING', 'SUCCESS'] },
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
      db.transfer.aggregate({
        where: {
          senderId: userId,
          status: 'SUCCESS',
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
    ]);

    const cumulativeOutflowToday =
      Number(withdrawalsToday._sum.amount || 0) + Number(transfersToday._sum.amount || 0);

    if (cumulativeOutflowToday + amountNGN > limits.maxDailyTransfer) {
      const msg = `Withdrawal of ₦${amountNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })} violates KYC Tier ${tier} daily outflow limit of ₦${limits.maxDailyTransfer.toLocaleString('en-NG', { minimumFractionDigits: 2 })}. Outflow today: ₦${cumulativeOutflowToday.toLocaleString('en-NG', { minimumFractionDigits: 2 })}, Remaining limit: ₦${Math.max(0, limits.maxDailyTransfer - cumulativeOutflowToday).toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
      logger.warn(`KYC Withdrawal Outflow Violation [User: ${userId}]: ${msg}`);
      return { valid: false, reason: msg, limits, tier };
    }

    return { valid: true, limits, tier };
  }
}
