import { PostingType, TransactionType, TransactionStatus, WebhookStatus, WithdrawalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { LedgerService } from './ledger.service';
import { generateReference } from '../utils/crypto';

export class WebhookService {
  /**
   * Process Paystack Webhook Event safely with strict idempotency check
   */
  static async handleWebhook(eventPayload: any) {
    const eventType = eventPayload.event;
    const data = eventPayload.data;
    const eventId = eventPayload.id || data?.reference || `${eventType}_${Date.now()}`;

    // 1. Check for Duplicate Webhook Event Processing
    const existingWebhook = await prisma.webhookEvent.findUnique({
      where: { eventId: String(eventId) },
    });

    if (existingWebhook && existingWebhook.status === WebhookStatus.PROCESSED) {
      logger.info(`Webhook event [${eventId}] already processed. Skipping duplicate.`);
      return { status: 'IGNORED', message: 'Duplicate webhook event' };
    }

    // Record Webhook Reception
    const webhookRecord = await prisma.webhookEvent.upsert({
      where: { eventId: String(eventId) },
      update: { payload: eventPayload },
      create: {
        eventId: String(eventId),
        eventType,
        payload: eventPayload,
        status: WebhookStatus.RECEIVED,
      },
    });

    try {
      if (eventType === 'charge.success') {
        await this.processChargeSuccess(data);
      } else if (eventType === 'transfer.success') {
        await this.processTransferSuccess(data);
      } else if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
        await this.processTransferFailure(data);
      }

      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return { status: 'SUCCESS' };
    } catch (error: any) {
      logger.error(`Error processing webhook [${eventType}]:`, error);
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          status: WebhookStatus.FAILED,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Process Deposit (`charge.success` from Paystack DVA)
   */
  private static async processChargeSuccess(data: any) {
    const paystackReference = data.reference;
    const amountInKobo = data.amount;
    const amountNGN = amountInKobo / 100;
    const paystackFeeNGN = (data.fees || 0) / 100;
    const customerCode = data.customer?.customer_code;
    const customerEmail = data.customer?.email;

    // Check if deposit already recorded
    const existingDeposit = await prisma.deposit.findUnique({
      where: { paystackReference },
    });
    if (existingDeposit) return;

    // Find User by DVA customer code or Email
    const dva = await prisma.dedicatedVirtualAccount.findFirst({
      where: {
        OR: [
          { paystackCustomerCode: customerCode },
          { user: { email: customerEmail } },
        ],
      },
      include: { user: { include: { walletAccount: true } } },
    });

    if (!dva || !dva.user || !dva.user.walletAccount) {
      throw new Error(`User or Wallet not found for Paystack Customer [${customerCode} / ${customerEmail}]`);
    }

    const userId = dva.userId;
    const userWallet = dva.user.walletAccount;

    await prisma.$transaction(async (tx) => {
      const paystackClearing = await tx.ledgerAccount.findUnique({
        where: { name: 'PAYSTACK_CLEARING_ASSET' },
      });
      const platformFeeIncome = await tx.ledgerAccount.findUnique({
        where: { name: 'PLATFORM_FEE_INCOME' },
      });

      if (!paystackClearing || !platformFeeIncome) {
        throw new Error('System ledger accounts missing.');
      }

      const reference = generateReference('DEP');
      const netAmount = amountNGN - paystackFeeNGN;

      // Double-Entry Ledger:
      // DEBIT Paystack Clearing Asset (amountNGN) -> Gross funds entering Paystack
      // CREDIT User Liability Account (netAmount) -> Net money credited to user wallet
      // CREDIT Platform Fee Income (paystackFeeNGN) -> Deposit fee revenue earned (INCOME)
      const journalEntry = await LedgerService.postJournalEntry(
        {
          reference,
          description: `Deposit via Paystack DVA [Ref: ${paystackReference}]`,
          postings: [
            {
              ledgerAccountId: paystackClearing.id,
              entryType: PostingType.DEBIT,
              amount: amountNGN,
            },
            {
              ledgerAccountId: userWallet.ledgerAccountId,
              entryType: PostingType.CREDIT,
              amount: netAmount,
            },
            ...(paystackFeeNGN > 0
              ? [
                  {
                    ledgerAccountId: platformFeeIncome.id,
                    entryType: PostingType.CREDIT,
                    amount: paystackFeeNGN,
                  },
                ]
              : []),
          ],
        },
        tx
      );

      // Create Transaction
      const transaction = await tx.transaction.create({
        data: {
          reference,
          type: TransactionType.DEPOSIT,
          journalEntryId: journalEntry.id,
          amount: amountNGN,
          fee: paystackFeeNGN,
          status: TransactionStatus.SUCCESS,
        },
      });

      // Create Deposit Record
      await tx.deposit.create({
        data: {
          userId,
          transactionId: transaction.id,
          paystackReference,
          channel: data.channel || 'DVA',
          amount: amountNGN,
          paystackFee: paystackFeeNGN,
          netAmount,
          status: TransactionStatus.SUCCESS,
        },
      });

      logger.info(`Successfully deposited NGN ${netAmount} to user wallet [${userWallet.walletNumber}]`);
    });
  }

  /**
   * Process Transfer Success (`transfer.success` from Paystack)
   * Finalizes journal entry posting and converts hold to debited ledger liability.
   */
  private static async processTransferSuccess(data: any) {
    const reference = data.reference;
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        OR: [{ paystackTransferCode: data.transfer_code }, { transaction: { reference } }],
      },
      include: { transaction: true, user: { include: { walletAccount: true } } },
    });

    if (!withdrawal || withdrawal.status === WithdrawalStatus.SUCCESS) return;

    await prisma.$transaction(async (tx) => {
      const userWallet = withdrawal.user.walletAccount;
      if (!userWallet) throw new Error('User wallet not found for final payout commit.');

      const paystackClearing = await tx.ledgerAccount.findUnique({
        where: { name: 'PAYSTACK_CLEARING_ASSET' },
      });
      const platformFeeAccount = await tx.ledgerAccount.findUnique({
        where: { name: 'PLATFORM_FEE_INCOME' },
      });

      if (!paystackClearing || !platformFeeAccount) {
        throw new Error('System ledger accounts missing.');
      }

      const totalDeduction = Number(withdrawal.amount) + Number(withdrawal.fee);
      const journalRef = `WTH-${reference || Date.now()}`;

      // Finalize Double-Entry Ledger Posting:
      // DEBIT User Liability (deduct wallet balance)
      // CREDIT Paystack Clearing Asset (net payout leaving clearing)
      // CREDIT Platform Fee Income (fee revenue earned)
      const journalEntry = await LedgerService.postJournalEntry(
        {
          reference: journalRef,
          description: `Confirmed Bank Payout to ${withdrawal.accountNumber} (${withdrawal.bankName})`,
          postings: [
            {
              ledgerAccountId: userWallet.ledgerAccountId,
              entryType: PostingType.DEBIT,
              amount: totalDeduction,
            },
            {
              ledgerAccountId: paystackClearing.id,
              entryType: PostingType.CREDIT,
              amount: Number(withdrawal.amount),
            },
            {
              ledgerAccountId: platformFeeAccount.id,
              entryType: PostingType.CREDIT,
              amount: Number(withdrawal.fee),
            },
          ],
        },
        tx
      );

      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: WithdrawalStatus.SUCCESS },
      });

      await tx.transaction.update({
        where: { id: withdrawal.transactionId },
        data: {
          journalEntryId: journalEntry.id,
          status: TransactionStatus.SUCCESS,
        },
      });

      logger.info(`Finalized bank payout [${withdrawal.id}] for user NGN ${totalDeduction}`);
    });
  }

  /**
   * Process Transfer Failure (`transfer.failed` / `transfer.reversed`)
   * Releases pending hold cleanly.
   */
  private static async processTransferFailure(data: any) {
    const reference = data.reference;
    const withdrawal = await prisma.withdrawal.findFirst({
      where: {
        OR: [{ paystackTransferCode: data.transfer_code }, { transaction: { reference } }],
      },
      include: { transaction: true, user: { include: { walletAccount: true } } },
    });

    if (!withdrawal || withdrawal.status === WithdrawalStatus.FAILED || withdrawal.status === WithdrawalStatus.REVERSED) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      // If withdrawal was still in processing state (no journal entry posted yet),
      // simply mark as FAILED to release pending hold automatically!
      if (withdrawal.status === WithdrawalStatus.PROCESSING || withdrawal.status === WithdrawalStatus.PENDING) {
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: WithdrawalStatus.FAILED },
        });

        await tx.transaction.update({
          where: { id: withdrawal.transactionId },
          data: { status: TransactionStatus.FAILED },
        });

        logger.info(`Released pending hold for failed withdrawal [${withdrawal.id}]`);
        return;
      }

      // If withdrawal was previously marked SUCCESS (postings exist), issue reversal posting
      const userWallet = withdrawal.user.walletAccount;
      if (!userWallet) throw new Error('User wallet not found for reversal.');

      const paystackClearing = await tx.ledgerAccount.findUnique({
        where: { name: 'PAYSTACK_CLEARING_ASSET' },
      });
      const platformFeeAccount = await tx.ledgerAccount.findUnique({
        where: { name: 'PLATFORM_FEE_INCOME' },
      });

      if (!paystackClearing || !platformFeeAccount) throw new Error('System ledger accounts missing.');

      const reversalRef = generateReference('REV');
      const totalReversal = Number(withdrawal.amount) + Number(withdrawal.fee);

      const journalEntry = await LedgerService.postJournalEntry(
        {
          reference: reversalRef,
          description: `Reversal for failed payout [Ref: ${withdrawal.transaction.reference}]`,
          postings: [
            {
              ledgerAccountId: userWallet.ledgerAccountId,
              entryType: PostingType.CREDIT,
              amount: totalReversal,
            },
            {
              ledgerAccountId: paystackClearing.id,
              entryType: PostingType.DEBIT,
              amount: Number(withdrawal.amount),
            },
            {
              ledgerAccountId: platformFeeAccount.id,
              entryType: PostingType.DEBIT,
              amount: Number(withdrawal.fee),
            },
          ],
        },
        tx
      );

      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: WithdrawalStatus.REVERSED },
      });

      await tx.transaction.update({
        where: { id: withdrawal.transactionId },
        data: { status: TransactionStatus.REVERSED },
      });

      logger.info(`Reversed settled withdrawal [${withdrawal.id}] for user NGN ${totalReversal}`);
    });
  }
}
