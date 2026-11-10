import { Prisma, PostingType, JournalStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { logger } from '../config/logger';

export interface PostingInput {
  ledgerAccountId: string;
  entryType: PostingType;
  amount: number | Prisma.Decimal;
}

export interface JournalEntryInput {
  reference: string;
  description: string;
  postings: PostingInput[];
}

export class LedgerService {
  /**
   * Post a balanced double-entry transaction.
   * Asserts exact arbitrary-precision equality: sum(debits) === sum(credits).
   */
  static async postJournalEntry(
    input: JournalEntryInput,
    txContext?: Prisma.TransactionClient
  ) {
    const db = txContext || prisma;

    // Arbitrary-precision decimal calculation of debits and credits
    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const posting of input.postings) {
      const decAmount = new Prisma.Decimal(posting.amount);
      if (decAmount.lessThanOrEqualTo(0)) {
        throw new Error(`Invalid posting amount: ${posting.amount}. Amount must be greater than 0.`);
      }
      if (posting.entryType === PostingType.DEBIT) {
        totalDebit = totalDebit.plus(decAmount);
      } else {
        totalCredit = totalCredit.plus(decAmount);
      }
    }

    // Double-Entry Ledger Invariant Check: Sum(Debits) === Sum(Credits) (Zero tolerance)
    if (!totalDebit.equals(totalCredit)) {
      const diff = totalDebit.minus(totalCredit).abs();
      throw new Error(
        `Ledger Unbalanced Error: Debits (NGN ${totalDebit.toFixed(2)}) !== Credits (NGN ${totalCredit.toFixed(2)}). Discrepancy: NGN ${diff.toFixed(4)}`
      );
    }

    logger.info(`Posting Journal Entry [${input.reference}]: Total NGN ${totalDebit.toFixed(2)} balanced.`);

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
            amount: new Prisma.Decimal(p.amount),
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
        const delta = posting.entryType === PostingType.CREDIT ? Number(posting.amount) : -Number(posting.amount);
        
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
   * Calculate exact balance for a specific ledger account by summing all postings with arbitrary-precision Decimal arithmetic.
   */
  static async getAccountBalance(ledgerAccountId: string, txContext?: Prisma.TransactionClient): Promise<number> {
    const db = txContext || prisma;

    const postings = await db.ledgerPosting.findMany({
      where: { ledgerAccountId },
    });

    const account = await db.ledgerAccount.findUnique({
      where: { id: ledgerAccountId },
    });

    if (!account) throw new Error('Ledger Account not found.');

    let balance = new Prisma.Decimal(0);
    for (const p of postings) {
      const amt = new Prisma.Decimal(p.amount);
      if (account.type === 'LIABILITY' || account.type === 'INCOME' || account.type === 'EQUITY') {
        // Credit increases, Debit decreases
        balance = p.entryType === PostingType.CREDIT ? balance.plus(amt) : balance.minus(amt);
      } else {
        // Asset or Expense: Debit increases, Credit decreases
        balance = p.entryType === PostingType.DEBIT ? balance.plus(amt) : balance.minus(amt);
      }
    }

    return balance.toNumber();
  }

  /**
   * Global trial balance check verifying sum(all debits) - sum(all credits) === 0 using Decimal arithmetic.
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

    const totalDebits = new Prisma.Decimal(aggregateDebits._sum.amount || 0);
    const totalCredits = new Prisma.Decimal(aggregateCredits._sum.amount || 0);
    const difference = totalDebits.minus(totalCredits);

    return {
      totalDebits: totalDebits.toNumber(),
      totalCredits: totalCredits.toNumber(),
      difference: difference.toNumber(),
      isBalanced: difference.isZero(),
    };
  }
}
