import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { prisma } from '../../config/db';
import { NetworkName } from './vas.types';
import { VASService } from './services/vas.service';
import { VASPricingService } from './services/pricing.service';
import { VASTransactionService } from './services/vas.transaction.service';
import { validateAirtimeOrder, validateDataOrder } from './vas.validation';

export class VASController {
  /**
   * GET /api/v1/vas/networks
   */
  static async getNetworks(req: AuthenticatedRequest, res: Response) {
    try {
      const networks = await VASService.getNetworks();
      return res.json({ success: true, data: networks });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/vas/data/plans/:network
   */
  static async getDataPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const network = req.params.network?.toUpperCase() as NetworkName;
      if (!['MTN', 'AIRTEL', 'GLO', '9MOBILE'].includes(network)) {
        return res.status(400).json({ success: false, message: 'Invalid telecom network specified.' });
      }

      const plans = await VASService.getDataPlans(network);
      return res.json({ success: true, data: plans });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/airtime/quote
   */
  static async quoteAirtime(req: AuthenticatedRequest, res: Response) {
    try {
      const { network, amount } = req.body;
      const numAmount = Number(amount);
      if (!network || !numAmount || numAmount < 50 || numAmount > 50000) {
        return res.status(400).json({ success: false, message: 'Valid network and amount (₦50-₦50,000) required.' });
      }

      const quote = VASPricingService.quoteAirtime(network.toUpperCase() as NetworkName, numAmount);
      return res.json({ success: true, data: quote });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/airtime/purchase
   */
  static async purchaseAirtime(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const validation = validateAirtimeOrder(req.body);
      if (!validation.isValid || !validation.data) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      const result = await VASTransactionService.purchaseAirtime(userId, {
        ...validation.data,
        idempotencyKey,
      });

      return res.json({
        success: true,
        message: 'Airtime purchase processed successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/data/quote
   */
  static async quoteData(req: AuthenticatedRequest, res: Response) {
    try {
      const { network, variationCode } = req.body;
      if (!network || !variationCode) {
        return res.status(400).json({ success: false, message: 'Network and variation code required.' });
      }

      const plans = await VASService.getDataPlans(network.toUpperCase() as NetworkName);
      const plan = plans.find((p) => p.variationCode === variationCode);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Data plan variation not found.' });
      }

      const quote = VASPricingService.quoteData(plan.providerCost);
      return res.json({
        success: true,
        data: {
          ...quote,
          planName: plan.name,
          dataAllowance: plan.dataAllowance,
          validity: plan.validity,
        },
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/data/purchase
   */
  static async purchaseData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const validation = validateDataOrder(req.body);
      if (!validation.isValid || !validation.data) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      const result = await VASTransactionService.purchaseData(userId, {
        ...validation.data,
        idempotencyKey,
      });

      return res.json({
        success: true,
        message: 'Mobile data subscription processed successfully.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/vas/transactions
   */
  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.vASTransaction.findMany({
          where: { userId },
          include: { refund: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.vASTransaction.count({ where: { userId } }),
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
   * GET /api/v1/vas/transactions/:reference
   */
  static async getTransactionByReference(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { reference } = req.params;

      const transaction = await prisma.vASTransaction.findFirst({
        where: {
          userId,
          OR: [{ internalReference: reference }, { providerReference: reference }],
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, phoneNumber: true, email: true },
          },
          refund: true,
        },
      });

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found.' });
      }

      // Generate digital receipt metadata
      const receipt = {
        receiptNumber: `REC-${transaction.internalReference}`,
        transactionReference: transaction.internalReference,
        providerReference: transaction.providerReference,
        date: transaction.createdAt.toISOString(),
        customerName: `${transaction.user.firstName} ${transaction.user.lastName}`,
        customerPhone: transaction.user.phoneNumber,
        serviceType: transaction.serviceType,
        network: transaction.network,
        recipientPhone: transaction.recipientPhone,
        amount: Number(transaction.sellingPrice),
        fee: Number(transaction.serviceFee),
        totalAmountPaid: Number(transaction.totalAmount),
        status: transaction.status,
      };

      return res.json({
        success: true,
        data: {
          transaction,
          receipt,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/transactions/:reference/requery
   */
  static async requeryTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { reference } = req.params;
      const result = await VASTransactionService.requeryTransaction(reference);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/vas/pin/set
   */
  static async setTransactionPin(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { pin } = req.body;
      await VASTransactionService.setTransactionPin(userId, pin);
      return res.json({ success: true, message: 'Transaction PIN configured successfully.' });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}
