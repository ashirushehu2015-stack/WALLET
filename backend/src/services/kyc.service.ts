import { KYCTier, KYCStatus } from '@prisma/client';
import { prisma } from '../config/db';

export class KYCService {
  /**
   * Submit BVN/NIN for KYC Verification
   */
  static async submitKYC(userId: string, bvn?: string, nin?: string) {
    const existing = await prisma.kYCRecord.findUnique({
      where: { userId },
    });

    if (existing && existing.status === KYCStatus.VERIFIED) {
      throw new Error('KYC already verified for this user.');
    }

    // Encrypt or mask BVN/NIN in production
    const status = KYCStatus.VERIFIED;
    const tier = bvn && nin ? KYCTier.TIER_3 : bvn ? KYCTier.TIER_2 : KYCTier.TIER_1;

    return await prisma.kYCRecord.upsert({
      where: { userId },
      update: {
        bvn,
        nin,
        tier,
        status,
        verifiedAt: new Date(),
      },
      create: {
        userId,
        bvn,
        nin,
        tier,
        status,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Get User Tier & Limits
   */
  static getTierLimits(tier: KYCTier) {
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
}
