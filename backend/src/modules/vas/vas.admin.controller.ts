import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { prisma } from '../../config/db';
import { VASTransactionStatus, VASServiceType } from '@prisma/client';
import { VASService } from './services/vas.service';
import { VASTransactionService } from './services/vas.transaction.service';
import { VASProviderFactory } from './providers/provider.factory';

export class VASAdminController {
  /**
   * GET /api/v1/admin/vas/dashboard
   */
  static async getVasDashboardMetrics(req: Request, res: Response) {
    try {
      const [
        totalTransactions,
        successfulCount,
        failedCount,
        pendingCount,
        refundedCount,
        airtimeVolume,
        dataVolume,
        totalSales,
        totalCosts,
        totalProfit,
      ] = await Promise.all([
        prisma.vASTransaction.count(),
        prisma.vASTransaction.count({ where: { status: VASTransactionStatus.SUCCESSFUL } }),
        prisma.vASTransaction.count({ where: { status: VASTransactionStatus.FAILED } }),
        prisma.vASTransaction.count({
          where: {
            status: { in: [VASTransactionStatus.PENDING, VASTransactionStatus.PROCESSING, VASTransactionStatus.RESERVED] },
          },
        }),
        prisma.vASTransaction.count({ where: { status: VASTransactionStatus.REFUNDED } }),
        prisma.vASTransaction.aggregate({
          where: { serviceType: VASServiceType.AIRTIME, status: VASTransactionStatus.SUCCESSFUL },
          _sum: { totalAmount: true },
        }),
        prisma.vASTransaction.aggregate({
          where: { serviceType: VASServiceType.DATA, status: VASTransactionStatus.SUCCESSFUL },
          _sum: { totalAmount: true },
        }),
        prisma.vASTransaction.aggregate({
          where: { status: VASTransactionStatus.SUCCESSFUL },
          _sum: { totalAmount: true },
        }),
        prisma.vASTransaction.aggregate({
          where: { status: VASTransactionStatus.SUCCESSFUL },
          _sum: { providerCost: true },
        }),
        prisma.vASTransaction.aggregate({
          where: { status: VASTransactionStatus.SUCCESSFUL },
          _sum: { profitAmount: true },
        }),
      ]);

      const successRate = totalTransactions > 0 ? Math.round((successfulCount / totalTransactions) * 100) : 100;

      // Provider Floating Balance Check
      const provider = VASProviderFactory.getDefaultProvider();
      const providerBalance = await provider.getProviderBalance();

      return res.json({
        success: true,
        data: {
          metrics: {
            totalTransactions,
            successfulCount,
            failedCount,
            pendingCount,
            refundedCount,
            successRate,
            airtimeSales: Number(airtimeVolume._sum.totalAmount || 0),
            dataSales: Number(dataVolume._sum.totalAmount || 0),
            grossRevenue: Number(totalSales._sum.totalAmount || 0),
            providerCosts: Number(totalCosts._sum.providerCost || 0),
            grossProfit: Number(totalProfit._sum.profitAmount || 0),
          },
          providerBalance,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/admin/vas/transactions
   */
  static async getVasTransactions(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const { network, serviceType, status, search } = req.query;
      const where: any = {};

      if (network) where.network = String(network).toUpperCase();
      if (serviceType) where.serviceType = String(serviceType).toUpperCase();
      if (status) where.status = String(status).toUpperCase();
      if (search) {
        where.OR = [
          { recipientPhone: { contains: String(search) } },
          { internalReference: { contains: String(search) } },
          { providerReference: { contains: String(search) } },
        ];
      }

      const [transactions, total] = await Promise.all([
        prisma.vASTransaction.findMany({
          where,
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
            refund: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.vASTransaction.count({ where }),
      ]);

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/admin/vas/products/sync
   */
  static async syncProducts(req: Request, res: Response) {
    try {
      const result = await VASService.syncFullCatalogue();
      return res.json({
        success: true,
        message: 'Product catalogue synchronized with provider successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/admin/vas/refund
   */
  static async processRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id || 'SYSTEM_ADMIN';
      const { transactionId, reason } = req.body;

      if (!transactionId || !reason) {
        return res.status(400).json({ success: false, message: 'Transaction ID and reason are required.' });
      }

      const refund = await VASTransactionService.refundVasTransaction(transactionId, reason, adminId);
      return res.json({
        success: true,
        message: 'Compensating refund completed and posted to ledger.',
        data: refund,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/admin/vas/providers
   */
  static async getVasProviders(req: Request, res: Response) {
    try {
      const providers = await prisma.vASProvider.findMany({
        include: { _count: { select: { products: true, transactions: true } } },
      });
      return res.json({ success: true, data: providers });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
