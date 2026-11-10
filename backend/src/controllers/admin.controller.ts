import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { LedgerService } from '../services/ledger.service';
import { ReconciliationService } from '../services/reconciliation.service';
import { PaystackService } from '../services/paystack.service';
import { KillSwitchService } from '../services/kill-switch.service';
import { PostingType, TransactionStatus, KYCStatus, KYCTier } from '@prisma/client';
import { generateReference } from '../utils/crypto';
import { maskIdentifier } from '../utils/encryption';
import { logger } from '../config/logger';

export class AdminController {
  /**
   * Retrieves effective dual-approval threshold for deposit refunds.
   * In Controlled Pilot mode (PILOT_MODE=true) or when explicitly configured,
   * defaults to ₦5,000.00 to prevent unilateral exhaustion of pilot exposure (capped at ₦100,000).
   * In standard general mode, defaults to ₦100,000.00.
   */
  public static getDualApprovalThreshold(): number {
    const customThreshold = process.env.REFUND_DUAL_APPROVAL_THRESHOLD_NGN;
    if (customThreshold && !isNaN(Number(customThreshold))) {
      return Number(customThreshold);
    }
    if (process.env.PILOT_MODE === 'true') {
      return 5000;
    }
    return 100000;
  }

  static async getOverviewMetrics(req: Request, res: Response) {
    try {
      const userCount = await prisma.user.count();
      const totalDeposits = await prisma.deposit.aggregate({
        _sum: { amount: true },
      });
      const totalWithdrawals = await prisma.withdrawal.aggregate({
        _sum: { amount: true },
      });
      const trialBalance = await LedgerService.verifySystemTrialBalance();

      const ledgerAccounts = await prisma.ledgerAccount.findMany({
        include: { walletAccount: true },
      });

      return res.json({
        success: true,
        data: {
          userCount,
          totalDeposits: totalDeposits._sum.amount || 0,
          totalWithdrawals: totalWithdrawals._sum.amount || 0,
          trialBalance,
          ledgerAccountsCount: ledgerAccounts.length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getLedgerAccounts(req: Request, res: Response) {
    try {
      const accounts = await prisma.ledgerAccount.findMany({
        include: {
          walletAccount: {
            include: { user: true },
          },
          postings: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return res.json({ success: true, data: accounts });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getJournalEntries(req: Request, res: Response) {
    try {
      const entries = await prisma.journalEntry.findMany({
        include: {
          postings: {
            include: { ledgerAccount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return res.json({ success: true, data: entries });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getWebhooks(req: Request, res: Response) {
    try {
      const webhooks = await prisma.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.json({ success: true, data: webhooks });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async triggerReconciliation(req: Request, res: Response) {
    try {
      const recon = await ReconciliationService.runReconciliation();
      return res.json({ success: true, message: 'Reconciliation audit completed', data: recon });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const logs = await prisma.auditLog.findMany({
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.json({ success: true, data: logs });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Controlled Administrative Deposit Refund
   * POST /api/v1/admin/deposits/:id/refund
   * - Enforces remaining balance limits (never refunds more than received).
   * - Dual-authorization check (> ₦100,000 requires dualApproved: true).
   * - Posts balanced double-entry refund journal reversing SUSPENSE_LIABILITY or customer liability.
   * - Updates deposit refund status and records immutable audit log.
   */
  static async processDepositRefund(req: Request, res: Response) {
    try {
      const depositId = req.params.id;
      const { amount, reason, dualApproved, approvalRequestId } = req.body;
      const adminId = (req as any).user?.id || 'ADMIN';

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({ success: false, message: 'A documented reason for the refund is required.' });
      }

      const deposit = await prisma.deposit.findUnique({
        where: { id: depositId },
        include: {
          transaction: true,
          user: {
            include: { walletAccount: true },
          },
        },
      });

      if (!deposit) {
        return res.status(404).json({ success: false, message: 'Deposit record not found.' });
      }

      const originalAmount = Number(deposit.amount);
      const alreadyRefunded = Number(deposit.refundedAmount || 0);
      const remainingRefundable = originalAmount - alreadyRefunded;

      if (remainingRefundable <= 0 || deposit.refundStatus === 'REFUNDED') {
        return res.status(400).json({
          success: false,
          message: 'Deposit has already been fully refunded. No refundable balance remaining.',
        });
      }

      const refundAmount = amount ? Number(amount) : remainingRefundable;

      if (refundAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Refund amount must be greater than zero.' });
      }

      if (refundAmount > remainingRefundable) {
        return res.status(400).json({
          success: false,
          message: `Requested refund of ₦${refundAmount.toFixed(2)} exceeds remaining refundable balance of ₦${remainingRefundable.toFixed(2)}.`,
        });
      }

      // CRITICAL TASK ONE FIX: Strict database-backed dual-approval enforcement
      // Client-supplied booleans (e.g. dualApproved: true) are strictly rejected as proof of authorization.
      let activeApproval: any = null;
      const threshold = AdminController.getDualApprovalThreshold();
      if (refundAmount > threshold) {
        if (dualApproved === true && !approvalRequestId) {
          return res.status(403).json({
            success: false,
            message: `Client-supplied Boolean "dualApproved" is prohibited. Refunds exceeding ₦${threshold.toLocaleString('en-NG')}.00 require a database-backed approval record from a distinct SUPER_ADMIN.`,
          });
        }

        if (!approvalRequestId) {
          return res.status(403).json({
            success: false,
            message: `Dual Administrative Authorization Required: Refunds exceeding ₦${threshold.toLocaleString('en-NG')}.00 require prior approval. Submit a request via POST /api/v1/admin/deposits/:id/refund-request.`,
          });
        }

        activeApproval = await prisma.refundApprovalRequest.findUnique({
          where: { id: approvalRequestId },
          include: { requester: true, approver: true },
        });

        if (!activeApproval || activeApproval.depositId !== deposit.id) {
          return res.status(404).json({
            success: false,
            message: 'Referenced refund approval record does not match this deposit.',
          });
        }

        if (activeApproval.status !== 'APPROVED') {
          return res.status(403).json({
            success: false,
            message: `Approval request is in status '${activeApproval.status}'. Only APPROVED requests can be executed.`,
          });
        }

        // Enforce exact amount invariance: Any change to approved amount invalidates approval
        if (Number(activeApproval.amount) !== refundAmount) {
          return res.status(400).json({
            success: false,
            message: `Approved amount (₦${Number(activeApproval.amount).toFixed(2)}) does not match requested execution amount (₦${refundAmount.toFixed(2)}). Amount modifications invalidate prior approval.`,
          });
        }

        // Strict Separation of Duties: Approver cannot be the same user as requester
        if (!activeApproval.approverId || activeApproval.approverId === activeApproval.requesterId) {
          return res.status(403).json({
            success: false,
            message: 'Invalid authorization: Self-approval is strictly prohibited. The approving Super Admin must be a different user from the requester.',
          });
        }
      }

      // Initiate refund with payment gateway
      const gatewayResult = await PaystackService.createRefund(
        deposit.paystackReference,
        refundAmount,
        reason
      );

      if (gatewayResult.status === 'FAILED') {
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: { refundStatus: 'FAILED' },
        });

        await prisma.auditLog.create({
          data: {
            actorId: adminId,
            actorType: 'ADMIN',
            action: 'ADMIN_DEPOSIT_REFUND_FAILED',
            resource: `deposits/${deposit.id}`,
            details: {
              paystackReference: deposit.paystackReference,
              refundAmount,
              reason,
              gatewayMessage: gatewayResult.message,
            },
          },
        });

        return res.status(502).json({
          success: false,
          message: `Payment gateway rejected refund request: ${gatewayResult.message}`,
        });
      }

      // Gateway accepted or succeeded: Post balanced double-entry refund journal atomically
      const refundResult = await prisma.$transaction(async (tx) => {
        const paystackClearing = await tx.ledgerAccount.findUnique({
          where: { name: 'PAYSTACK_CLEARING_ASSET' },
        });

        if (!paystackClearing) {
          throw new Error('System ledger account PAYSTACK_CLEARING_ASSET missing.');
        }

        const refundRef = generateReference('REF-DEP');
        let debitAccountId: string;

        if (deposit.isSuspense) {
          // Funds are in suspense: DEBIT SUSPENSE_LIABILITY / CREDIT PAYSTACK_CLEARING_ASSET
          const suspenseLiability = await tx.ledgerAccount.findUnique({
            where: { name: 'SUSPENSE_LIABILITY' },
          });

          if (!suspenseLiability) {
            throw new Error('System ledger account SUSPENSE_LIABILITY missing.');
          }

          debitAccountId = suspenseLiability.id;
        } else {
          // Funds were credited to customer wallet: DEBIT User Wallet Liability / CREDIT PAYSTACK_CLEARING_ASSET
          const userWallet = deposit.user.walletAccount;
          if (!userWallet) {
            throw new Error('User wallet account missing.');
          }

          const currentLiveBalance = await LedgerService.getAccountBalance(userWallet.ledgerAccountId, tx);
          if (currentLiveBalance < refundAmount) {
            throw new Error(`Insufficient customer wallet balance (₦${currentLiveBalance.toFixed(2)}) to reverse credited deposit of ₦${refundAmount.toFixed(2)}.`);
          }

          debitAccountId = userWallet.ledgerAccountId;
        }

        // Post Double-Entry Refund Journal Entry
        await LedgerService.postJournalEntry(
          {
            reference: refundRef,
            description: `Admin Refund [Ref: ${deposit.paystackReference}] - ${reason}`,
            postings: [
              {
                ledgerAccountId: debitAccountId,
                entryType: PostingType.DEBIT,
                amount: refundAmount,
              },
              {
                ledgerAccountId: paystackClearing.id,
                entryType: PostingType.CREDIT,
                amount: refundAmount,
              },
            ],
          },
          tx
        );

        const newRefundedTotal = alreadyRefunded + refundAmount;
        const newRefundStatus = newRefundedTotal >= originalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

        // Update Deposit record
        const updatedDeposit = await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            refundedAmount: { increment: refundAmount },
            refundStatus: newRefundStatus,
            paystackRefundId: gatewayResult.refundReference,
          },
        });

        // If executed under dual-approval, update approval record to EXECUTED (prevent duplicate execution)
        if (activeApproval) {
          await tx.refundApprovalRequest.update({
            where: { id: activeApproval.id },
            data: {
              status: 'EXECUTED',
              executedAt: new Date(),
              paystackRefundId: gatewayResult.refundReference,
              journalEntryRef: refundRef,
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            actorId: adminId,
            actorType: 'ADMIN',
            action: 'ADMIN_DEPOSIT_REFUND_COMPLETED',
            resource: `deposits/${deposit.id}`,
            details: {
              depositId: deposit.id,
              paystackReference: deposit.paystackReference,
              refundAmount,
              remainingRefundable: remainingRefundable - refundAmount,
              refundRef,
              paystackRefundId: gatewayResult.refundReference,
              reason,
            },
          },
        });

        return {
          deposit: updatedDeposit,
          refundRef,
          refundStatus: newRefundStatus,
          remainingRefundable: remainingRefundable - refundAmount,
        };
      });

      return res.status(200).json({
        success: true,
        message: 'Deposit refund executed and posted to accounting ledger successfully.',
        data: {
          depositId: deposit.id,
          paystackReference: deposit.paystackReference,
          refundAmount,
          refundReference: refundResult.refundRef,
          paystackRefundId: gatewayResult.refundReference,
          refundStatus: refundResult.refundStatus,
          remainingRefundable: refundResult.remainingRefundable,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Admin Deposit Refund Error:', error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Retrieve Deposit Suspense Queue
   * GET /api/v1/admin/deposits/suspense
   */
  static async getSuspenseDeposits(req: Request, res: Response) {
    try {
      const deposits = await prisma.deposit.findMany({
        where: {
          OR: [
            { isSuspense: true },
            { status: TransactionStatus.PENDING },
          ],
        },
        include: {
          user: {
            select: { id: true, email: true, phoneNumber: true, firstName: true, lastName: true },
          },
          transaction: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, data: deposits });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Retrieve KYC Queue
   * GET /api/v1/admin/kyc/queue
   */
  static async getKYCQueue(req: Request, res: Response) {
    try {
      const records = await prisma.kYCRecord.findMany({
        where: {
          status: { in: [KYCStatus.VERIFICATION_PENDING, KYCStatus.REGISTERED, KYCStatus.UNAVAILABLE] },
        },
        include: {
          user: {
            select: { id: true, email: true, phoneNumber: true, firstName: true, lastName: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const maskedRecords = records.map((r) => ({
        ...r,
        bvn: maskIdentifier(r.bvn),
        nin: maskIdentifier(r.nin),
      }));

      return res.json({ success: true, data: maskedRecords });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Review Customer KYC Record
   * POST /api/v1/admin/kyc/:id/review
   */
  static async reviewKYC(req: Request, res: Response) {
    try {
      const recordId = req.params.id;
      const { status, tier, rejectionReason } = req.body;
      const adminId = (req as any).user?.id || 'ADMIN';

      if (!status || ![KYCStatus.VERIFIED, KYCStatus.REJECTED].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either VERIFIED or REJECTED.',
        });
      }

      const existing = await prisma.kYCRecord.findUnique({
        where: { id: recordId },
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'KYC Record not found.' });
      }

      const updated = await prisma.kYCRecord.update({
        where: { id: recordId },
        data: {
          status,
          tier: tier || existing.tier,
          rejectionReason: status === KYCStatus.REJECTED ? rejectionReason || 'Rejected by compliance administrator.' : null,
          verifiedAt: status === KYCStatus.VERIFIED ? new Date() : null,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorType: 'ADMIN',
          action: 'ADMIN_KYC_REVIEW_COMPLETED',
          resource: `kyc_records/${recordId}`,
          details: {
            userId: existing.userId,
            newStatus: status,
            newTier: updated.tier,
            rejectionReason,
          },
        },
      });

      return res.json({
        success: true,
        message: `KYC record successfully updated to ${status}.`,
        data: {
          ...updated,
          bvn: maskIdentifier(updated.bvn),
          nin: maskIdentifier(updated.nin),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Submit a Formal Refund Request (Dual-Approval Workflow)
   * POST /api/v1/admin/deposits/:id/refund-request
   */
  static async submitRefundRequest(req: Request, res: Response) {
    try {
      const depositId = req.params.id;
      const { amount, reason } = req.body;
      const requesterId = (req as any).user?.id;

      if (!requesterId) {
        return res.status(401).json({ success: false, message: 'Authenticated admin identity required.' });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({ success: false, message: 'Documented business reason is required.' });
      }

      const deposit = await prisma.deposit.findUnique({
        where: { id: depositId },
      });

      if (!deposit) {
        return res.status(404).json({ success: false, message: 'Deposit not found.' });
      }

      const originalAmount = Number(deposit.amount);
      const alreadyRefunded = Number(deposit.refundedAmount || 0);
      const remainingRefundable = originalAmount - alreadyRefunded;

      const requestedAmount = amount ? Number(amount) : remainingRefundable;

      if (requestedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Refund amount must be greater than zero.' });
      }

      if (requestedAmount > remainingRefundable) {
        return res.status(400).json({
          success: false,
          message: `Requested refund of ₦${requestedAmount.toFixed(2)} exceeds remaining refundable balance of ₦${remainingRefundable.toFixed(2)}.`,
        });
      }

      const threshold = AdminController.getDualApprovalThreshold();
      const requiresSuperAdminApproval = requestedAmount > threshold;
      const initialStatus = requiresSuperAdminApproval ? 'PENDING' : 'APPROVED';

      const approvalRequest = await prisma.refundApprovalRequest.create({
        data: {
          depositId: deposit.id,
          requesterId,
          approverId: requiresSuperAdminApproval ? null : requesterId,
          amount: requestedAmount,
          reason,
          status: initialStatus,
          approvedAt: requiresSuperAdminApproval ? null : new Date(),
        },
        include: {
          requester: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          deposit: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: requesterId,
          actorType: 'ADMIN',
          action: 'REFUND_REQUEST_SUBMITTED',
          resource: `refund_requests/${approvalRequest.id}`,
          details: {
            depositId: deposit.id,
            amount: requestedAmount,
            requiresSuperAdminApproval,
            threshold,
            status: initialStatus,
            reason,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: requiresSuperAdminApproval
          ? `Refund approval request submitted. Amounts exceeding ₦${threshold.toLocaleString('en-NG')}.00 require secondary approval from an independent SUPER_ADMIN.`
          : `Refund request approved under standard administrator authority (amount <= ₦${threshold.toLocaleString('en-NG')}.00).`,
        data: approvalRequest,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * List Pending & Historical Refund Requests
   * GET /api/v1/admin/refunds/requests
   */
  static async getRefundRequests(req: Request, res: Response) {
    try {
      const requests = await prisma.refundApprovalRequest.findMany({
        include: {
          requester: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          approver: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
          deposit: {
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ success: true, data: requests });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Approve a Refund Request (SUPER_ADMIN Only)
   * POST /api/v1/admin/refunds/:requestId/approve
   */
  static async approveRefundRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Secondary refund approval strictly requires SUPER_ADMIN authority.',
        });
      }

      const request = await prisma.refundApprovalRequest.findUnique({
        where: { id: requestId },
        include: { deposit: true },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Refund approval request not found.' });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Request cannot be approved because it is in '${request.status}' status.`,
        });
      }

      // CRITICAL TASK ONE CONTROL: Segregation of Duties (Self-approval strictly prohibited)
      if (request.requesterId === user.id) {
        logger.warn(`SECURITY VIOLATION ATTEMPT: User ${user.id} attempted to self-approve refund request ${requestId}.`);
        return res.status(403).json({
          success: false,
          message: 'Segregation of Duties Violation: Self-approval is strictly prohibited. The approving Super Admin must be a different authenticated user from the requester.',
        });
      }

      const updated = await prisma.refundApprovalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approverId: user.id,
          approvedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, email: true, firstName: true, lastName: true } },
          approver: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorType: 'ADMIN',
          action: 'REFUND_REQUEST_APPROVED',
          resource: `refund_requests/${requestId}`,
          details: {
            requestId,
            depositId: request.depositId,
            amount: Number(request.amount),
            requesterId: request.requesterId,
            approverId: user.id,
          },
        },
      });

      return res.json({
        success: true,
        message: 'Refund request successfully approved by Super Admin. Ready for execution.',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Reject a Refund Request
   * POST /api/v1/admin/refunds/:requestId/reject
   */
  static async rejectRefundRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId;
      const { rejectionReason } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (!rejectionReason || typeof rejectionReason !== 'string') {
        return res.status(400).json({ success: false, message: 'Documented rejection reason is required.' });
      }

      const request = await prisma.refundApprovalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Refund approval request not found.' });
      }

      if (request.status === 'EXECUTED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot reject a refund request that has already been executed.',
        });
      }

      const updated = await prisma.refundApprovalRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectionReason,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorType: 'ADMIN',
          action: 'REFUND_REQUEST_REJECTED',
          resource: `refund_requests/${requestId}`,
          details: {
            requestId,
            depositId: request.depositId,
            amount: Number(request.amount),
            rejectionReason,
          },
        },
      });

      return res.json({
        success: true,
        message: 'Refund request rejected.',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Cancel an Approved or Pending Refund Request
   * POST /api/v1/admin/refunds/:requestId/cancel
   */
  static async cancelRefundRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId;
      const { cancellationReason } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const request = await prisma.refundApprovalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Refund approval request not found.' });
      }

      if (request.status === 'EXECUTED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a refund request that has already been executed.',
        });
      }

      const updated = await prisma.refundApprovalRequest.update({
        where: { id: requestId },
        data: {
          status: 'CANCELLED',
          rejectionReason: cancellationReason || 'Cancelled by administrator',
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorType: 'ADMIN',
          action: 'REFUND_REQUEST_CANCELLED',
          resource: `refund_requests/${requestId}`,
          details: {
            requestId,
            depositId: request.depositId,
            amount: Number(request.amount),
            previousStatus: request.status,
            cancellationReason: cancellationReason || 'Cancelled by administrator',
          },
        },
      });

      return res.json({
        success: true,
        message: 'Refund request cancelled successfully.',
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Emergency Kill Switch: Retrieve Current Status
   * GET /api/v1/admin/emergency/kill-switch
   */
  static async getKillSwitchStatus(req: Request, res: Response) {
    try {
      const status = KillSwitchService.getStatus();
      return res.json({ success: true, data: status });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Emergency Kill Switch: Activate Transaction Suspension
   * POST /api/v1/admin/emergency/kill-switch/activate
   * Strictly requires SUPER_ADMIN role.
   */
  static async activateKillSwitch(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Activating the Emergency Kill Switch strictly requires SUPER_ADMIN authority.',
        });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Documented operational reason is required to activate the Emergency Kill Switch.',
        });
      }

      const status = await KillSwitchService.activate(user.id, reason);
      return res.json({
        success: true,
        message: 'Emergency Kill Switch activated successfully. All new customer financial transactions are suspended.',
        data: status,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Emergency Kill Switch: Deactivate Transaction Suspension
   * POST /api/v1/admin/emergency/kill-switch/deactivate
   * Strictly requires SUPER_ADMIN role.
   */
  static async deactivateKillSwitch(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Deactivating the Emergency Kill Switch strictly requires SUPER_ADMIN authority.',
        });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Documented operational reason is required to deactivate the Emergency Kill Switch.',
        });
      }

      const status = await KillSwitchService.deactivate(user.id, reason);
      return res.json({
        success: true,
        message: 'Emergency Kill Switch deactivated successfully. Financial operations have resumed.',
        data: status,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
