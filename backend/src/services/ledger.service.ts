import { Prisma, PostingType, JournalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface PostingInput {
  ledgerAccountId: string;
  entryType: PostingType;
  amount: number;
}

export interface JournalEntryInput {
  reference: string;
  description: string;
  postings: PostingInput[];
}

export class LedgerService {
  /**
   * Post a balanced double-entry transaction.
   * Asserts sum(debits) === sum(credits).
   */
  static async postJournalEntry(
    input: JournalEntryInput,
    txContext?: Prisma.TransactionClient
  ) {
    const db = txContext || prisma;

    // Calculate total debits and credits
    let totalDebit = 0;
    let totalCredit = 0;

    for (const posting of input.postings) {
      if (posting.amount <= 0) {
        throw new Error(`Invalid posting amount: ${posting.amount}. Amount must be greater than 0.`);
      }
      if (posting.entryType === PostingType.DEBIT) {
        totalDebit += Number(posting.amount);
      } else {
        totalCredit += Number(posting.amount);
      }
    }

    // Double-Entry Ledger Invariant Check: Sum(Debits) === Sum(Credits)
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.0001) {
      throw new Error(
        `Ledger Unbalanced Error: Debits (NGN ${totalDebit}) !== Credits (NGN ${totalCredit}). Difference: ${diff}`
      );
    }

    logger.info(`Posting Journal Entry [${input.reference}]: Total ${totalDebit} NGN balanced.`);

    // Execute atomic creation
    const journalEntry = await db.journalEntry.create({
      data: {
        reference: input.reference,
        description: input.description,
        status: JournalStatus.POSTED,
        postings: {
          create: input.postings.map((p) => ({
            ledgerAccountId: p.ledgerAccountId,
            entryType: p.entryType,
            amount: p.amount,
          })),
        },
      },
      include: {
        postings: true,
      },
    });

    // Update cached balances on affected wallet accounts
    for (const posting of input.postings) {
      const wallet = await db.walletAccount.findUnique({
        where: { ledgerAccountId: posting.ledgerAccountId },
      });

      if (wallet) {
        // Normal balance for Liability (User Wallet) is Credit:
        // Credit increases balance, Debit decreases balance.
        const delta = posting.entryType === PostingType.CREDIT ? posting.amount : -posting.amount;
        
        await db.walletAccount.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { increment: delta },
            ledgerBalance: { increment: delta },
          },
        });
      }
    }

    return journalEntry;
  }

  /**
   * Calculate exact balance for a specific ledger account by summing all postings.
   */
  static async getAccountBalance(ledgerAccountId: string, txContext?: Prisma.TransactionClient) {
    const db = txContext || prisma;
    const postings = await db.ledgerPosting.findMany({
      where: { ledgerAccountId },
    });

    const account = await db.ledgerAccount.findUnique({
      where: { id: ledgerAccountId },
    });

    if (!account) throw new Error('Ledger Account not found.');

    let balance = 0;
    for (const p of postings) {
      const amt = Number(p.amount);
      if (account.type === 'LIABILITY' || account.type === 'INCOME' || account.type === 'EQUITY') {
        // Credit increases, Debit decreases
        balance += p.entryType === PostingType.CREDIT ? amt : -amt;
      } else {
        // Asset or Expense: Debit increases, Credit decreases
        balance += p.entryType === PostingType.DEBIT ? amt : -amt;
      }
    }

    return balance;
  }

  /**
   * Global trial balance check verifying sum(all debits) - sum(all credits) === 0
   */
  static async verifySystemTrialBalance() {
    const aggregateDebits = await prisma.ledgerPosting.aggregate({
      where: { entryType: PostingType.DEBIT },
      _sum: { amount: true },
    });

    const aggregateCredits = await prisma.ledgerPosting.aggregate({
      where: { entryType: PostingType.CREDIT },
      _sum: { amount: true },
    });

    const totalDebits = Number(aggregateDebits._sum.amount || 0);
    const totalCredits = Number(aggregateCredits._sum.amount || 0);
    const difference = totalDebits - totalCredits;

    return {
      totalDebits,
      totalCredits,
      difference,
      isBalanced: Math.abs(difference) < 0.0001,
    };
  }
}
