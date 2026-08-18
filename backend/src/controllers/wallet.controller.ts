import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma } from '../config/db';
import { WalletService } from '../services/wallet.service';
import { LedgerService } from '../services/ledger.service';

export class WalletController {
  static async getBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const data = await WalletService.getWalletBalance(userId);
      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page, limit, type, status } = req.query;

      const data = await WalletService.getUserTransactions(userId, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        type: type as any,
        status: status as any,
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async transfer(req: AuthenticatedRequest, res: Response) {
    try {
      const senderId = req.user!.id;
      const { recipientWalletNumber, amount, narration } = req.body;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      if (!recipientWalletNumber || !amount) {
        return res.status(400).json({ success: false, message: 'Recipient wallet number and amount required' });
      }

      const result = await WalletService.transferFunds(
        senderId,
        recipientWalletNumber,
        Number(amount),
        narration,
        idempotencyKey
      );

      return res.json({
        success: true,
        message: 'Internal P2P Transfer successful',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async withdraw(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { bankName, accountNumber, accountName, bankCode, amount } = req.body;
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      if (!bankName || !accountNumber || !accountName || !amount) {
        return res.status(400).json({
          success: false,
          message: 'All bank details (bankName, accountNumber, accountName, amount) are required.',
        });
      }

      if (Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Withdrawal amount must be greater than 0.',
        });
      }

      const withdrawal = await WalletService.requestWithdrawal(
        userId,
        bankName,
        accountNumber,
        accountName,
        bankCode || '035',
        Number(amount),
        idempotencyKey
      );

      return res.status(201).json({
        success: true,
        message: 'Withdrawal request initiated successfully. Status is PROCESSING.',
        data: {
          id: withdrawal.id,
          paystackTransferCode: withdrawal.paystackTransferCode,
          amount: Number(withdrawal.amount),
          fee: Number(withdrawal.fee),
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber,
          accountName: withdrawal.accountName,
          status: withdrawal.status,
          createdAt: withdrawal.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
