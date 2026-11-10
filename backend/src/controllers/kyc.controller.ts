import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { KYCService } from '../services/kyc.service';
import { PaystackService } from '../services/paystack.service';
import { KYCStatus } from '@prisma/client';
import { logger } from '../config/logger';

export class KYCController {
  /**
   * Submit Identity Credentials (BVN / NIN) for Verification & Tier Upgrade.
   * POST /api/v1/kyc/submit
   */
  static async submitKYC(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { bvn, nin } = req.body;

      if (!bvn && !nin) {
        return res.status(400).json({
          success: false,
          message: 'At least one identity credential (BVN or NIN) must be provided for verification.',
        });
      }

      if (bvn && !/^\d{11}$/.test(bvn.trim())) {
        return res.status(400).json({
          success: false,
          message: 'BVN must be exactly 11 numeric digits.',
        });
      }

      if (nin && !/^\d{11}$/.test(nin.trim())) {
        return res.status(400).json({
          success: false,
          message: 'NIN must be exactly 11 numeric digits.',
        });
      }

      // Query external identity provider if BVN provided
      let providerResult: { verified: boolean; status?: KYCStatus; reason?: string } | undefined;

      if (bvn) {
        try {
          const check = await PaystackService.verifyBVN(bvn);
          if (check.status === 'VERIFIED') {
            providerResult = { verified: true, status: KYCStatus.VERIFIED };
          } else if (check.status === 'REJECTED') {
            providerResult = { verified: false, status: KYCStatus.REJECTED, reason: check.reason };
          } else {
            // Provider is unconfigured or in test mode without live NIBSS permissions
            providerResult = {
              verified: false,
              status: KYCStatus.VERIFICATION_PENDING,
              reason: 'Identity submitted and queued for authorized provider review.',
            };
          }
        } catch (err: any) {
          logger.warn(`Identity provider query error: ${err.message}`);
          providerResult = {
            verified: false,
            status: KYCStatus.UNAVAILABLE,
            reason: 'Identity verification service temporarily unavailable. Stored in pending queue.',
          };
        }
      } else {
        // NIN only: queued for NIMC verification
        providerResult = {
          verified: false,
          status: KYCStatus.VERIFICATION_PENDING,
          reason: 'NIN submitted and queued for authorized NIMC provider verification.',
        };
      }

      const maskedRecord = await KYCService.submitKYC(userId, bvn, nin, providerResult);

      return res.status(200).json({
        success: true,
        message:
          maskedRecord?.status === KYCStatus.VERIFIED
            ? 'Identity verified successfully. Your account limits have been upgraded.'
            : 'Identity submitted successfully. Verification status is currently pending.',
        data: maskedRecord,
      });
    } catch (error: any) {
      logger.error('KYC Submission Error:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Retrieve Customer Masked KYC Status & Transaction Limits.
   * GET /api/v1/kyc/status
   */
  static async getKYCStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const record = await KYCService.getMaskedKYCRecord(userId);

      if (!record) {
        return res.status(404).json({ success: false, message: 'KYC record not found.' });
      }

      return res.json({ success: true, data: record });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
