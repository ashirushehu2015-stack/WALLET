import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { LedgerService } from '../services/ledger.service';
import { ReconciliationService } from '../services/reconciliation.service';

export class AdminController {
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
}
