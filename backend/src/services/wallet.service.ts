import { PostingType, TransactionType, TransactionStatus, WithdrawalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { LedgerService } from './ledger.service';
import { generateReference, generateWalletNumber } from '../utils/crypto';
import { PaystackService } from './paystack.service';

export class WalletService {
  /**
   * Initialize User Wallet and associated Ledger Liability Account
   */
  static async createWalletForUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const walletNumber = generateWalletNumber();
    const ledgerAccountName = `USER_LIABILITY_${userId}`;

    // 1. Create Ledger Account for user liability
    const ledgerAccount = await prisma.ledgerAccount.create({
      data: {
        name: ledgerAccountName,
        type: 'LIABILITY',
        currency: 'NGN',
        description: `Liability account for User Wallet #${walletNumber}`,
      },
    });

    // 2. Create Wallet Account
    const wallet = await prisma.walletAccount.create({
      data: {
        userId,
        walletNumber,
        ledgerAccountId: ledgerAccount.id,
        availableBalance: 0,
        ledgerBalance: 0,
      },
    });

    // 3. Request Paystack DVA
    try {
      const customer = await PaystackService.createCustomer(
        user.email,
        user.firstName,
        user.lastName,
        user.phoneNumber
      );
      const dvaData = await PaystackService.createDedicatedVirtualAccount(customer.customer_code);

      await prisma.dedicatedVirtualAccount.create({
        data: {
          userId,
          paystackCustomerCode: customer.customer_code,
          accountNumber: dvaData.account_number,
          accountName: dvaData.account_name,
          bankName: dvaData.bank.name,
          bankCode: dvaData.bank.code || '035',
        },
      });
    } catch (e) {
      // DVA creation error should not block wallet initialization in test mode
    }

    return wallet;
  }

  /**
   * Calculate live wallet balance directly from ledger postings minus pending holds
   */
  static async getWalletBalance(userId: string) {
    const wallet = await prisma.walletAccount.findUnique({
      where: { userId },
      include: { ledgerAccount: true },
    });

    if (!wallet) throw new Error('Wallet not found');

    // 1. Calculate Authoritative Live Ledger Balance from ledger_postings
    const ledgerBalance = await LedgerService.getAccountBalance(wallet.ledgerAccountId);

    // 2. Calculate sum of active Pending Holds (PENDING/PROCESSING withdrawals)
    const pendingWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
      },
      _sum: { amount: true, fee: true },
    });

    const pendingHolds =
      Number(pendingWithdrawals._sum.amount || 0) + Number(pendingWithdrawals._sum.fee || 0);

    const availableBalance = ledgerBalance - pendingHolds;

    return {
      availableBalance: Math.max(0, availableBalance),
      pendingHolds,
      ledgerBalance,
      currency: wallet.currency || 'NGN',
    };
  }

  /**
   * Get paginated transaction history with optional type/status filters
   */
  static async getUserTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      status?: TransactionStatus;
    }
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      OR: [
        { deposit: { userId } },
        { withdrawal: { userId } },
        { transfer: { OR: [{ senderId: userId }, { recipientId: userId }] } },
      ],
    };

    if (options.type) {
      whereClause.type = options.type;
    }
    if (options.status) {
      whereClause.status = options.status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          journalEntry: true,
          deposit: true,
          withdrawal: true,
          transfer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      type: t.type,
      amount: Number(t.amount),
      fee: Number(t.fee),
      status: t.status,
      description: t.journalEntry?.description || `${t.type} Transaction`,
      createdAt: t.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Internal Peer-to-Peer Transfer (User A -> User B)
   */
  static async transferFunds(
    senderId: string,
    recipientWalletNumber: string,
    amount: number,
    narration: string,
    idempotencyKey?: string
  ) {
    if (amount <= 0) throw new Error('Transfer amount must be greater than 0.');

    return await prisma.$transaction(async (tx) => {
      // 1. Explicit PostgreSQL Row Locking (SELECT FOR UPDATE) on Sender Wallet
      const [senderWalletRow]: any[] = await tx.$queryRaw`
        SELECT * FROM wallet_accounts WHERE "userId" = ${senderId} FOR UPDATE
      `;

      if (!senderWalletRow) throw new Error('Sender wallet not found.');

      const senderWallet = await tx.walletAccount.findUnique({
        where: { id: senderWalletRow.id },
        include: { user: true, ledgerAccount: true },
      });

      if (!senderWallet) throw new Error('Sender wallet details missing.');

      // 2. Compute Sender's Authoritative Live Available Balance
      const liveSenderLedgerBalance = await LedgerService.getAccountBalance(senderWallet.ledgerAccountId, tx);

      const pendingWithdrawals = await tx.withdrawal.aggregate({
        where: {
          userId: senderId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
        },
        _sum: { amount: true, fee: true },
      });

      const senderPendingHold =
        Number(pendingWithdrawals._sum.amount || 0) + Number(pendingWithdrawals._sum.fee || 0);
      const senderAvailable = liveSenderLedgerBalance - senderPendingHold;

      if (senderAvailable < amount) {
        throw new Error(
          `Insufficient wallet balance for transfer. Available: NGN ${senderAvailable.toFixed(
            2
          )}, Requested: NGN ${amount.toFixed(2)}`
        );
      }

      // 3. Find Recipient Wallet
      const recipientWallet = await tx.walletAccount.findUnique({
        where: { walletNumber: recipientWalletNumber },
        include: { user: true, ledgerAccount: true },
      });

      if (!recipientWallet) throw new Error('Recipient wallet not found.');
      if (recipientWallet.userId === senderId) {
        throw new Error('Self-transfer is not permitted.');
      }

      const reference = generateReference('P2P');

      // 4. Post Atomic Double-Entry Journal Entry
      // DEBIT Sender Liability Account (reduces sender balance)
      // CREDIT Recipient Liability Account (increases recipient balance)
      const journalEntry = await LedgerService.postJournalEntry(
        {
          reference,
          description: narration || `P2P Transfer from ${senderWallet.user.firstName} to ${recipientWallet.user.firstName}`,
          postings: [
            {
              ledgerAccountId: senderWallet.ledgerAccountId,
              entryType: PostingType.DEBIT,
              amount,
            },
            {
              ledgerAccountId: recipientWallet.ledgerAccountId,
              entryType: PostingType.CREDIT,
              amount,
            },
          ],
        },
        tx
      );

      // 5. Create Unified Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          reference,
          idempotencyKey,
          type: TransactionType.TRANSFER,
          journalEntryId: journalEntry.id,
          amount,
          fee: 0,
          status: TransactionStatus.SUCCESS,
        },
      });

      // 6. Create Transfer Record
      await tx.transfer.create({
        data: {
          senderId,
          recipientId: recipientWallet.userId,
          transactionId: transaction.id,
          amount,
          narration,
          status: TransactionStatus.SUCCESS,
        },
      });

      return {
        reference,
        amount,
        senderWalletNumber: senderWallet.walletNumber,
        recipientWalletNumber: recipientWallet.walletNumber,
        recipientName: `${recipientWallet.user.firstName} ${recipientWallet.user.lastName}`,
      };
    });
  }

  /**
   * Request Outward Bank Payout / Withdrawal
   */
  static async requestWithdrawal(
    userId: string,
    bankName: string,
    accountNumber: string,
    accountName: string,
    bankCode: string,
    amount: number,
    idempotencyKey?: string,
    customFee: number = 100.0 // Standard NGN 100 payout fee
  ) {
    const platformFee = customFee;
    const totalDeduction = amount + platformFee;
    const reference = generateReference('WTH');

    // PHASE 1: DATABASE TRANSACTION WITH ROW LOCKING & PENDING HOLD RESERVATION
    const withdrawalReservation = await prisma.$transaction(async (tx) => {
      // 1. Explicit PostgreSQL Row Locking (SELECT FOR UPDATE) to prevent concurrent overdraws
      const [walletRow]: any[] = await tx.$queryRaw`
        SELECT * FROM wallet_accounts WHERE "userId" = ${userId} FOR UPDATE
      `;

      if (!walletRow) throw new Error('User wallet not found.');

      // 2. Compute Authoritative Live Ledger Balance from ledger_postings
      const liveLedgerBalance = await LedgerService.getAccountBalance(walletRow.ledgerAccountId, tx);

      // 3. Compute Pending Holds from active processing withdrawals
      const pendingWithdrawals = await tx.withdrawal.aggregate({
        where: {
          userId,
          status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
        },
        _sum: { amount: true, fee: true },
      });

      const totalPendingHold =
        Number(pendingWithdrawals._sum.amount || 0) + Number(pendingWithdrawals._sum.fee || 0);

      const netAvailableBalance = liveLedgerBalance - totalPendingHold;

      // 4. Strict Available Balance Guard
      if (netAvailableBalance < totalDeduction) {
        throw new Error(
          `Insufficient funds for withdrawal. Available (after holds): NGN ${netAvailableBalance.toFixed(
            2
          )}, Required (including NGN ${platformFee} fee): NGN ${totalDeduction.toFixed(2)}`
        );
      }

      // 5. Create Transaction Record (PENDING)
      const transaction = await tx.transaction.create({
        data: {
          reference,
          idempotencyKey,
          type: TransactionType.WITHDRAWAL,
          amount,
          fee: platformFee,
          status: TransactionStatus.PENDING,
        },
      });

      // 6. Create Withdrawal Record (PROCESSING - Reserves Pending Hold)
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          transactionId: transaction.id,
          recipientCode: 'PENDING_RECIPIENT',
          bankName,
          accountNumber,
          accountName,
          amount,
          fee: platformFee,
          status: WithdrawalStatus.PROCESSING,
        },
      });

      return { withdrawal, transaction, ledgerAccountId: walletRow.ledgerAccountId };
    });

    // PHASE 2: CALL PAYSTACK TRANSFER API (OUTSIDE DATABASE TRANSACTION LOCK)
    try {
      const recipient = await PaystackService.createTransferRecipient(accountName, accountNumber, bankCode);
      const paystackTransfer = await PaystackService.initiateTransfer(
        amount,
        recipient.recipient_code,
        reference,
        'Wallet Payout'
      );

      // Update transfer code on withdrawal record
      return await prisma.withdrawal.update({
        where: { id: withdrawalReservation.withdrawal.id },
        data: {
          recipientCode: recipient.recipient_code,
          paystackTransferCode: paystackTransfer.transfer_code || `TRF_${reference}`,
        },
      });
    } catch (paystackError: any) {
      // If Paystack API fails synchronously, release pending hold immediately
      await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawalReservation.withdrawal.id },
          data: { status: WithdrawalStatus.FAILED },
        });
        await tx.transaction.update({
          where: { id: withdrawalReservation.transaction.id },
          data: { status: TransactionStatus.FAILED },
        });
      });
      throw new Error(`Paystack Payout Failed: ${paystackError.message}`);
    }
  }
}
