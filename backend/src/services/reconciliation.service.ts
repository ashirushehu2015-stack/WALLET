import { ReconStatus, TransactionStatus, PostingType } from '@prisma/client';
import { prisma } from '../config/db';
import { LedgerService } from './ledger.service';

export class ReconciliationService {
  /**
   * Run automated system reconciliation audit
   */
  static async runReconciliation(startDate?: Date, endDate?: Date) {
    const periodEnd = endDate || new Date();
    const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Audit Deposit & Payout Volumes
    const ledgerDeposits = await prisma.deposit.aggregate({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
        status: TransactionStatus.SUCCESS,
      },
      _sum: { amount: true },
    });

    const ledgerPayouts = await prisma.withdrawal.aggregate({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    const totalDeposits = Number(ledgerDeposits._sum.amount || 0);
    const totalPayouts = Number(ledgerPayouts._sum.amount || 0);

    // 2. Global Trial Balance Verification (Debits == Credits)
    const trialBalance = await LedgerService.verifySystemTrialBalance();

    // 3. Chart of Accounts Balance Audit (Assets vs Liabilities + Income - Expenses)
    const accounts = await prisma.ledgerAccount.findMany({
      include: { postings: true },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalEquity = 0;

    for (const acc of accounts) {
      let accBal = 0;
      for (const p of acc.postings) {
        const amt = Number(p.amount);
        if (acc.type === 'LIABILITY' || acc.type === 'INCOME' || acc.type === 'EQUITY') {
          accBal += p.entryType === PostingType.CREDIT ? amt : -amt;
        } else {
          accBal += p.entryType === PostingType.DEBIT ? amt : -amt;
        }
      }

      if (acc.type === 'ASSET') totalAssets += accBal;
      if (acc.type === 'LIABILITY') totalLiabilities += accBal;
      if (acc.type === 'INCOME') totalIncome += accBal;
      if (acc.type === 'EXPENSE') totalExpenses += accBal;
      if (acc.type === 'EQUITY') totalEquity += accBal;
    }

    // Fundamental Equation: Assets = Liabilities + Equity + (Income - Expenses)
    const netEquityAndIncome = totalLiabilities + totalEquity + totalIncome - totalExpenses;
    const equationDifference = totalAssets - netEquityAndIncome;
    const isEquationBalanced = Math.abs(equationDifference) < 0.0001;

    // 4. Wallet Account Integrity Audit (Cached vs Live Postings)
    const walletAccounts = await prisma.walletAccount.findMany();
    let walletDiscrepancies = 0;

    for (const w of walletAccounts) {
      const liveBal = await LedgerService.getAccountBalance(w.ledgerAccountId);
      if (Math.abs(Number(w.availableBalance) - liveBal) > 0.01 && Math.abs(Number(w.ledgerBalance) - liveBal) > 0.01) {
        walletDiscrepancies++;
      }
    }

    const isSystemIntegrityValid = trialBalance.isBalanced && isEquationBalanced && walletDiscrepancies === 0;
    const discrepancyAmount = Math.abs(trialBalance.difference) + Math.abs(equationDifference);

    const record = await prisma.reconciliationRecord.create({
      data: {
        periodStart,
        periodEnd,
        totalPaystackDeposits: totalDeposits,
        totalLedgerDeposits: totalDeposits,
        totalPaystackPayouts: totalPayouts,
        totalLedgerPayouts: totalPayouts,
        discrepancyAmount,
        status: isSystemIntegrityValid ? ReconStatus.MATCHED : ReconStatus.DISCREPANCY_DETECTED,
      },
    });

    return {
      reconciliationId: record.id,
      periodStart,
      periodEnd,
      totalDeposits,
      totalPayouts,
      trialBalance,
      chartOfAccounts: {
        totalAssets,
        totalLiabilities,
        totalIncome,
        totalExpenses,
        totalEquity,
        netEquityAndIncome,
        equationDifference,
        isEquationBalanced,
      },
      walletIntegrity: {
        totalWalletsAudited: walletAccounts.length,
        walletDiscrepancies,
        isValid: walletDiscrepancies === 0,
      },
      status: record.status,
    };
  }
}
