import bcrypt from 'bcryptjs';
import {
  PostingType,
  TransactionType,
  TransactionStatus,
  VASTransactionStatus,
  VASServiceType,
  VASRefundStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { prisma } from '../../../config/db';
import { logger } from '../../../config/logger';
import { LedgerService } from '../../../services/ledger.service';
import { generateReference } from '../../../utils/crypto';
import { NetworkName, ProviderPurchaseResult } from '../vas.types';
import { VASProviderFactory } from '../providers/provider.factory';
import { VASPricingService } from './pricing.service';
import { VASService } from './vas.service';

export interface AirtimeOrderInput {
  network: NetworkName;
  recipientPhone: string;
  amount: number;
  pin: string;
  idempotencyKey?: string;
}

export interface DataOrderInput {
  network: NetworkName;
  recipientPhone: string;
  variationCode: string;
  serviceId?: string;
  pin: string;
  idempotencyKey?: string;
}

interface PinAttemptRecord {
  failedAttempts: number;
  lockedUntil?: number;
}

// In-memory attempt tracker for transaction PIN (keyed by userId)
const pinAttempts = new Map<string, PinAttemptRecord>();
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export class VASTransactionService {
  /**
   * Helper to verify customer transaction PIN with strict validation, attempt limits and lockout.
   * REMOVED: Default 1234 fallback completely eliminated.
   */
  public static async verifyUserPin(user: any, pin: string): Promise<{ valid: boolean; reason?: string }> {
    if (!user || !user.id) {
      return { valid: false, reason: 'User session context missing.' };
    }

    // 1. Enforce that the user has configured a custom transaction PIN
    if (!user.transactionPinHash) {
      return {
        valid: false,
        reason: 'Transaction PIN has not been set. Please configure your 4-digit PIN in settings before transacting.',
      };
    }

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return { valid: false, reason: 'Transaction PIN must be exactly 4 numeric digits.' };
    }

    // 2. Enforce lockout timer
    const now = Date.now();
    const record = pinAttempts.get(user.id) || { failedAttempts: 0 };
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return {
        valid: false,
        reason: `Transaction PIN is locked due to too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
      };
    }

    // 3. Cryptographically compare with stored bcrypt hash
    const match = await bcrypt.compare(pin, user.transactionPinHash);
    if (match) {
      // Clear failed attempts upon successful authentication
      pinAttempts.delete(user.id);
      return { valid: true };
    }

    // 4. Increment failure counter and trigger lockout if limit reached
    const newFailed = (record.failedAttempts || 0) + 1;
    if (newFailed >= MAX_PIN_ATTEMPTS) {
      pinAttempts.set(user.id, {
        failedAttempts: newFailed,
        lockedUntil: now + PIN_LOCKOUT_MS,
      });
      return {
        valid: false,
        reason: `Transaction PIN locked for 15 minutes due to ${MAX_PIN_ATTEMPTS} consecutive incorrect entries.`,
      };
    } else {
      pinAttempts.set(user.id, {
        failedAttempts: newFailed,
      });
      const attemptsRemaining = MAX_PIN_ATTEMPTS - newFailed;
      return {
        valid: false,
        reason: `Incorrect transaction PIN. ${attemptsRemaining} attempt(s) remaining before account lockout.`,
      };
    }
  }

  /**
   * Set or update customer transaction PIN
   */
  static async setTransactionPin(userId: string, newPin: string): Promise<void> {
    if (!/^\d{4}$/.test(newPin)) {
      throw new Error('Transaction PIN must be exactly 4 numeric digits.');
    }
    const hash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { transactionPinHash: hash },
    });
    // Reset lockout state when a new PIN is configured
    pinAttempts.delete(userId);
  }

  /**
   * Purchase Airtime with Atomic Row-Locked Reservation & Double-Entry Accounting
   */
  static async purchaseAirtime(userId: string, input: AirtimeOrderInput) {
    const amount = Number(input.amount);
    if (!amount || amount < 50 || amount > 50000) {
      throw new Error('Airtime amount must be between ₦50 and ₦50,000.');
    }

    const recipientPhone = VASService.normalizePhoneNumber(input.recipientPhone);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { walletAccount: true },
    });

    if (!user || !user.walletAccount) {
      throw new Error('User or wallet account not found.');
    }

    // 1. Verify Transaction PIN
    const pinCheck = await this.verifyUserPin(user, input.pin);
    if (!pinCheck.valid) {
      throw new Error(pinCheck.reason || 'Invalid 4-digit transaction PIN.');
    }

    // 2. Authoritative Price Quote from Server-Side Pricing Engine
    const quote = VASPricingService.quoteAirtime(input.network, amount);
    const totalDeduction = quote.sellingPrice;
    const internalReference = generateReference('AIR');

    const provider = VASProviderFactory.getDefaultProvider();
    const requestId = provider.generateRequestId();

    const providerRecord = await prisma.vASProvider.findUnique({
      where: { name: provider.providerName },
    });

    // PHASE 1: DATABASE TRANSACTION WITH ROW LOCKING & PENDING RESERVATION
    const reservation = await prisma.$transaction(async (tx) => {
      // PostgreSQL Row Lock on Wallet Account to prevent race conditions & double-spending
      const [walletRow]: any[] = await tx.$queryRaw`
        SELECT * FROM wallet_accounts WHERE "userId" = ${userId} FOR UPDATE
      `;

      if (!walletRow) throw new Error('Wallet not found for row lock.');

      // Calculate Authoritative Live Ledger Balance
      const liveLedgerBalance = await LedgerService.getAccountBalance(walletRow.ledgerAccountId, tx);

      // Sum active withdrawal holds
      const pendingWithdrawals = await tx.withdrawal.aggregate({
        where: {
          userId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
        },
        _sum: { amount: true, fee: true },
      });

      // Sum active pending VAS purchase holds
      const pendingVas = await tx.vASTransaction.aggregate({
        where: {
          userId,
          status: { in: [VASTransactionStatus.RESERVED, VASTransactionStatus.PROCESSING, VASTransactionStatus.PENDING] },
        },
        _sum: { totalAmount: true },
      });

      const totalPendingHold =
        Number(pendingWithdrawals._sum.amount || 0) +
        Number(pendingWithdrawals._sum.fee || 0) +
        Number(pendingVas._sum.totalAmount || 0);

      const netAvailable = liveLedgerBalance - totalPendingHold;

      if (netAvailable < totalDeduction) {
        throw new Error(
          `Insufficient wallet balance. Available: ₦${netAvailable.toFixed(2)}, Required: ₦${totalDeduction.toFixed(2)}`
        );
      }

      // Create Unified Transaction record (PENDING)
      const transaction = await tx.transaction.create({
        data: {
          reference: internalReference,
          idempotencyKey: input.idempotencyKey,
          type: TransactionType.VAS_AIRTIME,
          amount: quote.sellingPrice,
          fee: quote.serviceFee,
          status: TransactionStatus.PENDING,
        },
      });

      // Create VASTransaction record (RESERVED)
      const vasTx = await tx.vASTransaction.create({
        data: {
          userId,
          walletAccountId: walletRow.id,
          transactionId: transaction.id,
          providerId: providerRecord?.id,
          serviceType: VASServiceType.AIRTIME,
          network: input.network,
          recipientPhone,
          internalReference,
          idempotencyKey: input.idempotencyKey,
          providerReference: requestId,
          providerCost: quote.providerCost,
          sellingPrice: quote.sellingPrice,
          serviceFee: quote.serviceFee,
          totalAmount: quote.sellingPrice,
          profitAmount: quote.profitAmount,
          status: VASTransactionStatus.RESERVED,
        },
      });

      return { vasTx, transaction, walletRow };
    });

    // PHASE 2: SUBMIT TO PROVIDER (OUTSIDE DATABASE TRANSACTION LOCK)
    const providerResult = await provider.purchaseAirtime({
      network: input.network,
      recipientPhone,
      amount,
      customerPhone: user.phoneNumber,
      internalReference,
      requestId,
    });

    // PHASE 3: FINALIZE OR RESOLVE STATUS
    if (providerResult.status === VASTransactionStatus.SUCCESSFUL) {
      await this.finalizePurchase(reservation.vasTx.id, providerResult, reservation.walletRow);
    } else if (providerResult.status === VASTransactionStatus.FAILED) {
      await this.failReservation(reservation.vasTx.id, providerResult);
    } else {
      // Pending or Uncertain: keep hold active and schedule requery
      await prisma.vASTransaction.update({
        where: { id: reservation.vasTx.id },
        data: {
          status: VASTransactionStatus.PENDING,
          providerResponseCode: providerResult.responseCode,
          providerResponseMessage: providerResult.responseMessage,
          providerTransactionId: providerResult.providerTransactionId,
        },
      });
    }

    return await prisma.vASTransaction.findUnique({
      where: { id: reservation.vasTx.id },
      include: { transaction: { include: { journalEntry: true } } },
    });
  }

  /**
   * Purchase Mobile Data Bundle with Atomic Row-Locked Reservation & Double-Entry Accounting
   */
  static async purchaseData(userId: string, input: DataOrderInput) {
    const recipientPhone = VASService.normalizePhoneNumber(input.recipientPhone);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { walletAccount: true },
    });

    if (!user || !user.walletAccount) {
      throw new Error('User or wallet account not found.');
    }

    // 1. Verify Transaction PIN
    const pinCheck = await this.verifyUserPin(user, input.pin);
    if (!pinCheck.valid) {
      throw new Error(pinCheck.reason || 'Invalid 4-digit transaction PIN.');
    }

    // 2. Authoritative Plan Verification from Provider/DB (Never trust frontend price)
    const provider = VASProviderFactory.getDefaultProvider();
    const plans = await VASService.getDataPlans(input.network);
    const plan = plans.find((p) => p.variationCode === input.variationCode);

    if (!plan) {
      throw new Error(`Data plan variation '${input.variationCode}' not found for network ${input.network}.`);
    }

    const quote = VASPricingService.quoteData(plan.providerCost);
    const totalDeduction = quote.sellingPrice;
    const internalReference = generateReference('DAT');
    const requestId = provider.generateRequestId();

    const providerRecord = await prisma.vASProvider.findUnique({
      where: { name: provider.providerName },
    });

    // PHASE 1: DATABASE TRANSACTION WITH ROW LOCKING & PENDING RESERVATION
    const reservation = await prisma.$transaction(async (tx) => {
      const [walletRow]: any[] = await tx.$queryRaw`
        SELECT * FROM wallet_accounts WHERE "userId" = ${userId} FOR UPDATE
      `;

      if (!walletRow) throw new Error('Wallet not found for row lock.');

      const liveLedgerBalance = await LedgerService.getAccountBalance(walletRow.ledgerAccountId, tx);

      const pendingWithdrawals = await tx.withdrawal.aggregate({
        where: {
          userId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
        },
        _sum: { amount: true, fee: true },
      });

      const pendingVas = await tx.vASTransaction.aggregate({
        where: {
          userId,
          status: { in: [VASTransactionStatus.RESERVED, VASTransactionStatus.PROCESSING, VASTransactionStatus.PENDING] },
        },
        _sum: { totalAmount: true },
      });

      const totalPendingHold =
        Number(pendingWithdrawals._sum.amount || 0) +
        Number(pendingWithdrawals._sum.fee || 0) +
        Number(pendingVas._sum.totalAmount || 0);

      const netAvailable = liveLedgerBalance - totalPendingHold;

      if (netAvailable < totalDeduction) {
        throw new Error(
          `Insufficient wallet balance. Available: ₦${netAvailable.toFixed(2)}, Required: ₦${totalDeduction.toFixed(2)}`
        );
      }

      const transaction = await tx.transaction.create({
        data: {
          reference: internalReference,
          idempotencyKey: input.idempotencyKey,
          type: TransactionType.VAS_DATA,
          amount: quote.sellingPrice,
          fee: quote.serviceFee,
          status: TransactionStatus.PENDING,
        },
      });

      const vasTx = await tx.vASTransaction.create({
        data: {
          userId,
          walletAccountId: walletRow.id,
          transactionId: transaction.id,
          providerId: providerRecord?.id,
          serviceType: VASServiceType.DATA,
          network: input.network,
          recipientPhone,
          internalReference,
          idempotencyKey: input.idempotencyKey,
          providerReference: requestId,
          providerCost: quote.providerCost,
          sellingPrice: quote.sellingPrice,
          serviceFee: quote.serviceFee,
          totalAmount: quote.sellingPrice,
          profitAmount: quote.profitAmount,
          status: VASTransactionStatus.RESERVED,
        },
      });

      return { vasTx, transaction, walletRow };
    });

    // PHASE 2: SUBMIT TO PROVIDER
    const providerResult = await provider.purchaseData({
      network: input.network,
      recipientPhone,
      amount: quote.providerCost,
      variationCode: input.variationCode,
      serviceId: input.serviceId || plan.serviceId,
      customerPhone: user.phoneNumber,
      internalReference,
      requestId,
    });

    // PHASE 3: FINALIZE OR RESOLVE STATUS
    if (providerResult.status === VASTransactionStatus.SUCCESSFUL) {
      await this.finalizePurchase(reservation.vasTx.id, providerResult, reservation.walletRow);
    } else if (providerResult.status === VASTransactionStatus.FAILED) {
      await this.failReservation(reservation.vasTx.id, providerResult);
    } else {
      await prisma.vASTransaction.update({
        where: { id: reservation.vasTx.id },
        data: {
          status: VASTransactionStatus.PENDING,
          providerResponseCode: providerResult.responseCode,
          providerResponseMessage: providerResult.responseMessage,
          providerTransactionId: providerResult.providerTransactionId,
        },
      });
    }

    return await prisma.vASTransaction.findUnique({
      where: { id: reservation.vasTx.id },
      include: { transaction: { include: { journalEntry: true } } },
    });
  }

  /**
   * Finalize confirmed purchase: Posts Double-Entry Ledger Entry and updates transaction
   */
  private static async finalizePurchase(
    vasTxId: string,
    providerResult: ProviderPurchaseResult,
    walletAccount: any
  ) {
    await prisma.$transaction(async (tx) => {
      const vasTx = await tx.vASTransaction.findUnique({
        where: { id: vasTxId },
        include: { transaction: true },
      });

      if (!vasTx || vasTx.status === VASTransactionStatus.SUCCESSFUL) {
        return;
      }

      // Retrieve System Ledger Accounts
      const vtpassClearing = await tx.ledgerAccount.findUnique({
        where: { name: 'VTPASS_CLEARING_ASSET' },
      });
      const vasCommissionIncome = await tx.ledgerAccount.findUnique({
        where: { name: 'VAS_COMMISSION_INCOME' },
      });

      if (!vtpassClearing || !vasCommissionIncome) {
        throw new Error('Required VAS system ledger accounts are missing.');
      }

      const totalSellingPrice = Number(vasTx.sellingPrice);
      const providerCost = Number(vasTx.providerCost);
      const commissionProfit = Number(vasTx.profitAmount);
      const journalReference = `VAS-${vasTx.internalReference}`;

      // POST BALANCED DOUBLE-ENTRY JOURNAL ENTRY:
      // DEBIT: User Liability Account (Deducts customer wallet) -> totalSellingPrice
      // CREDIT: VTPASS_CLEARING_ASSET (Reduces prefunded float at VTpass) -> providerCost
      // CREDIT: VAS_COMMISSION_INCOME (Platform revenue/margin) -> commissionProfit
      // Verification: Debits (totalSellingPrice) === Credits (providerCost + commissionProfit)
      const journalEntry = await LedgerService.postJournalEntry(
        {
          reference: journalReference,
          description: `${vasTx.serviceType} recharge (${vasTx.network}) to ${vasTx.recipientPhone}`,
          postings: [
            {
              ledgerAccountId: walletAccount.ledgerAccountId,
              entryType: PostingType.DEBIT,
              amount: totalSellingPrice,
            },
            {
              ledgerAccountId: vtpassClearing.id,
              entryType: PostingType.CREDIT,
              amount: providerCost,
            },
            {
              ledgerAccountId: vasCommissionIncome.id,
              entryType: PostingType.CREDIT,
              amount: commissionProfit > 0 ? commissionProfit : 0,
            },
          ].filter((p) => p.amount > 0),
        },
        tx
      );

      // Finalize VASTransaction
      await tx.vASTransaction.update({
        where: { id: vasTxId },
        data: {
          status: VASTransactionStatus.SUCCESSFUL,
          providerTransactionId: providerResult.providerTransactionId,
          providerResponseCode: providerResult.responseCode,
          providerResponseMessage: providerResult.responseMessage,
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Finalize Unified Transaction
      if (vasTx.transactionId) {
        await tx.transaction.update({
          where: { id: vasTx.transactionId },
          data: {
            status: TransactionStatus.SUCCESS,
            journalEntryId: journalEntry.id,
          },
        });
      }

      logger.info(`Successfully posted double-entry ledger for VAS [${vasTx.internalReference}]. Customer debited ₦${totalSellingPrice}.`);
    });
  }

  /**
   * Release reservation when provider conclusively fails before debit
   */
  private static async failReservation(vasTxId: string, providerResult: ProviderPurchaseResult) {
    await prisma.$transaction(async (tx) => {
      const vasTx = await tx.vASTransaction.findUnique({
        where: { id: vasTxId },
      });
      if (!vasTx) return;

      await tx.vASTransaction.update({
        where: { id: vasTxId },
        data: {
          status: VASTransactionStatus.FAILED,
          providerResponseCode: providerResult.responseCode,
          providerResponseMessage: providerResult.responseMessage,
          failureReason: providerResult.responseMessage,
          completedAt: new Date(),
        },
      });

      if (vasTx.transactionId) {
        await tx.transaction.update({
          where: { id: vasTx.transactionId },
          data: { status: TransactionStatus.FAILED },
        });
      }

      logger.warn(`VAS Transaction [${vasTx.internalReference}] marked FAILED. Wallet hold released.`);
    });
  }

  /**
   * Compensating Refund for Confirmed Post-Debit Failures
   */
  static async refundVasTransaction(
    vasTxId: string,
    reason: string,
    initiatedBy: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const vasTx = await tx.vASTransaction.findUnique({
        where: { id: vasTxId },
        include: { user: { include: { walletAccount: true } }, refund: true },
      });

      if (!vasTx) throw new Error('VAS transaction not found.');
      if (vasTx.refund) throw new Error('Transaction has already been refunded.');
      if (vasTx.status !== VASTransactionStatus.SUCCESSFUL) {
        throw new Error(`Cannot refund transaction with status ${vasTx.status}. Only SUCCESSFUL debited transactions can be refunded.`);
      }

      const userWallet = vasTx.user.walletAccount;
      if (!userWallet) throw new Error('Customer wallet not found for refund.');

      const vtpassClearing = await tx.ledgerAccount.findUnique({
        where: { name: 'VTPASS_CLEARING_ASSET' },
      });
      const vasCommissionIncome = await tx.ledgerAccount.findUnique({
        where: { name: 'VAS_COMMISSION_INCOME' },
      });

      if (!vtpassClearing || !vasCommissionIncome) {
        throw new Error('Required VAS system ledger accounts are missing for refund.');
      }

      const refundAmount = Number(vasTx.sellingPrice);
      const providerCost = Number(vasTx.providerCost);
      const commissionProfit = Number(vasTx.profitAmount);
      const refundRef = generateReference('RFD');

      // POST BALANCED COMPENSATING DOUBLE-ENTRY JOURNAL ENTRY:
      // DEBIT: VTPASS_CLEARING_ASSET (Reverses clearing asset credit) -> providerCost
      // DEBIT: VAS_COMMISSION_INCOME (Reverses commission income) -> commissionProfit
      // CREDIT: User Liability Account (Restores customer wallet balance) -> refundAmount
      // Verification: Debits (providerCost + commissionProfit) === Credits (refundAmount)
      await LedgerService.postJournalEntry(
        {
          reference: `RFD-${vasTx.internalReference}`,
          description: `Compensating refund for failed ${vasTx.serviceType} [${vasTx.internalReference}]: ${reason}`,
          postings: [
            {
              ledgerAccountId: vtpassClearing.id,
              entryType: PostingType.DEBIT,
              amount: providerCost,
            },
            {
              ledgerAccountId: vasCommissionIncome.id,
              entryType: PostingType.DEBIT,
              amount: commissionProfit > 0 ? commissionProfit : 0,
            },
            {
              ledgerAccountId: userWallet.ledgerAccountId,
              entryType: PostingType.CREDIT,
              amount: refundAmount,
            },
          ].filter((p) => p.amount > 0),
        },
        tx
      );

      // Create VASRefund record
      const refundRecord = await tx.vASRefund.create({
        data: {
          vasTransactionId: vasTx.id,
          amount: refundAmount,
          refundReference: refundRef,
          reason,
          status: VASRefundStatus.SUCCESSFUL,
          initiatedBy,
        },
      });

      // Update VASTransaction status
      await tx.vASTransaction.update({
        where: { id: vasTx.id },
        data: { status: VASTransactionStatus.REFUNDED },
      });

      // Update Transaction status
      if (vasTx.transactionId) {
        await tx.transaction.update({
          where: { id: vasTx.transactionId },
          data: { status: TransactionStatus.REVERSED },
        });
      }

      // Record in Audit Log
      await tx.auditLog.create({
        data: {
          actorId: initiatedBy,
          actorType: 'ADMIN',
          action: 'VAS_TRANSACTION_REFUND',
          resource: `VASTransaction:${vasTx.id}`,
          details: {
            internalReference: vasTx.internalReference,
            refundReference: refundRef,
            amount: refundAmount,
            reason,
          },
        },
      });

      logger.info(`Successfully processed compensating refund ₦${refundAmount} for [${vasTx.internalReference}].`);
      return refundRecord;
    });
  }

  /**
   * Requery and verify state with VTpass
   */
  static async requeryTransaction(reference: string) {
    const vasTx = await prisma.vASTransaction.findFirst({
      where: {
        OR: [{ internalReference: reference }, { providerReference: reference }],
      },
      include: { user: { include: { walletAccount: true } } },
    });

    if (!vasTx) throw new Error(`VAS transaction [${reference}] not found.`);

    if (vasTx.status === VASTransactionStatus.SUCCESSFUL || vasTx.status === VASTransactionStatus.REFUNDED) {
      return vasTx;
    }

    const provider = VASProviderFactory.getDefaultProvider();
    const requeryResult = await provider.verifyTransaction(vasTx.providerReference || vasTx.internalReference);

    if (requeryResult.status === VASTransactionStatus.SUCCESSFUL) {
      await this.finalizePurchase(vasTx.id, {
        providerName: provider.providerName,
        providerReference: vasTx.providerReference || '',
        providerTransactionId: requeryResult.providerTransactionId,
        status: VASTransactionStatus.SUCCESSFUL,
        responseCode: requeryResult.responseCode,
        responseMessage: requeryResult.responseMessage,
        providerCost: Number(vasTx.providerCost),
        rawPayload: requeryResult.rawPayload,
      }, vasTx.user.walletAccount);
    } else if (requeryResult.status === VASTransactionStatus.FAILED) {
      await this.failReservation(vasTx.id, {
        providerName: provider.providerName,
        providerReference: vasTx.providerReference || '',
        status: VASTransactionStatus.FAILED,
        responseCode: requeryResult.responseCode,
        responseMessage: requeryResult.responseMessage,
        providerCost: Number(vasTx.providerCost),
        rawPayload: requeryResult.rawPayload,
      });
    }

    return await prisma.vASTransaction.findUnique({
      where: { id: vasTx.id },
      include: { transaction: { include: { journalEntry: true } } },
    });
  }
}
