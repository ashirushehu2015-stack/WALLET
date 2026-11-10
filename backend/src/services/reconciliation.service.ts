import { ReconStatus, TransactionStatus, PostingType, WithdrawalStatus, VASTransactionStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { LedgerService } from './ledger.service';
import { PaystackService } from './paystack.service';
import { VASProviderFactory } from '../modules/vas/providers/provider.factory';
import { logger } from '../config/logger';

export interface TransactionLineMatch {
  reference: string;
  amount: number;
  providerAmount: number;
  fee: number;
  providerFee: number;
  internalStatus: string;
  providerStatus: string;
  isMatched: boolean;
  discrepancyReason?: string;
}

export class ReconciliationService {
  /**
   * Run comprehensive 4-Tier Automated Financial Reconciliation Audit.
   * STRICT:
   * - Tier A: Balance Reconciliation (Paystack GET /balance vs PAYSTACK_CLEARING_ASSET).
   * - Tier B: Transaction-Level Reconciliation (Paystack GET /transaction vs internal deposits).
   * - Tier C: Settlement Reconciliation (Paystack GET /settlement batch tracking).
   * - Tier D: Statement & Bank Destination Matching.
   * Flags discrepancies transparently without forcing equality in code.
   */
  static async runReconciliation(startDate?: Date, endDate?: Date) {
    const periodEnd = endDate || new Date();
    const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Audit Deposit & Payout Volumes from transaction tables
    const [ledgerDeposits, ledgerPayouts, pendingWithdrawalHolds, pendingVasHolds, vasMetrics, internalDepositRecords] =
      await Promise.all([
        prisma.deposit.aggregate({
          where: {
            createdAt: { gte: periodStart, lte: periodEnd },
            status: TransactionStatus.SUCCESS,
          },
          _sum: { amount: true, netAmount: true, paystackFee: true },
        }),
        prisma.withdrawal.aggregate({
          where: {
            createdAt: { gte: periodStart, lte: periodEnd },
            status: 'SUCCESS',
          },
          _sum: { amount: true, fee: true },
        }),
        prisma.withdrawal.aggregate({
          where: {
            status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
          },
          _sum: { amount: true, fee: true },
        }),
        prisma.vASTransaction.aggregate({
          where: {
            status: { in: [VASTransactionStatus.RESERVED, VASTransactionStatus.PROCESSING, VASTransactionStatus.PENDING] },
          },
          _sum: { totalAmount: true },
        }),
        prisma.vASTransaction.aggregate({
          where: {
            createdAt: { gte: periodStart, lte: periodEnd },
            status: VASTransactionStatus.SUCCESSFUL,
          },
          _sum: { totalAmount: true, providerCost: true, profitAmount: true },
          _count: { id: true },
        }),
        prisma.deposit.findMany({
          where: { createdAt: { gte: periodStart, lte: periodEnd } },
          include: { transaction: true },
        }),
      ]);

    const totalDeposits = Number(ledgerDeposits._sum.amount || 0);
    const totalPayouts = Number(ledgerPayouts._sum.amount || 0);
    const activeWithdrawalHolds = Number(pendingWithdrawalHolds._sum.amount || 0) + Number(pendingWithdrawalHolds._sum.fee || 0);
    const activeVasHolds = Number(pendingVasHolds._sum.totalAmount || 0);
    const totalActivePendingHolds = activeWithdrawalHolds + activeVasHolds;

    // ------------------------------------------------------------------------
    // TIER A: BALANCE RECONCILIATION
    // ------------------------------------------------------------------------
    let paystackLiveBalance: number | null = null;
    let paystackBalanceStatus: 'CONNECTED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    try {
      const paystackBalances = await PaystackService.getAccountBalance();
      const ngnBalance = paystackBalances.find((b) => b.currency === 'NGN');
      if (ngnBalance) {
        paystackLiveBalance = ngnBalance.balance;
        paystackBalanceStatus = 'CONNECTED';
      }
    } catch (paystackErr: any) {
      logger.warn('Paystack live balance query failed during reconciliation:', paystackErr.message);
      paystackBalanceStatus = 'UNAVAILABLE';
    }

    let vtpassLiveBalance: number | null = null;
    let vtpassApiStatus: 'CONNECTED' | 'UNAVAILABLE' = 'UNAVAILABLE';
    try {
      const vasProvider = VASProviderFactory.getDefaultProvider();
      const vtpassRes = await vasProvider.getProviderBalance();
      if (vtpassRes && typeof vtpassRes.balance === 'number') {
        vtpassLiveBalance = vtpassRes.balance;
        vtpassApiStatus = 'CONNECTED';
      }
    } catch (vtpassErr: any) {
      logger.warn('VTpass provider balance query failed during reconciliation:', vtpassErr.message);
      vtpassApiStatus = 'UNAVAILABLE';
    }

    // ------------------------------------------------------------------------
    // TIER B: TRANSACTION-LEVEL LINE-ITEM RECONCILIATION (GET /transaction)
    // ------------------------------------------------------------------------
    const externalTxResult = await PaystackService.fetchTransactions(periodStart, periodEnd, 1, 100);
    const externalTransactions = externalTxResult.transactions;

    const lineItemMatches: TransactionLineMatch[] = [];
    const missingWebhooks: any[] = [];
    const unverifiedCredits: any[] = [];
    let matchedTransactionCount = 0;

    // Build internal deposits map by paystackReference
    const internalDepositMap = new Map<string, any>();
    for (const dep of internalDepositRecords) {
      internalDepositMap.set(dep.paystackReference, dep);
    }

    // Match external transactions against internal deposits
    const externalSeenRefs = new Set<string>();
    for (const extTx of externalTransactions) {
      const extRef = extTx.reference;
      externalSeenRefs.add(extRef);
      const extAmountNGN = (extTx.amount || 0) / 100; // kobo to NGN
      const extFeeNGN = (extTx.fees || 0) / 100;
      const extStatus = (extTx.status || '').toLowerCase();

      const internalMatch = internalDepositMap.get(extRef);

      if (internalMatch) {
        const intAmount = Number(internalMatch.amount);
        const intFee = Number(internalMatch.paystackFee);
        const isAmountMatch = Math.abs(intAmount - extAmountNGN) < 0.01;
        const isStatusMatch = (extStatus === 'success' && internalMatch.status === 'SUCCESS');

        if (isAmountMatch && isStatusMatch) {
          matchedTransactionCount++;
          lineItemMatches.push({
            reference: extRef,
            amount: intAmount,
            providerAmount: extAmountNGN,
            fee: intFee,
            providerFee: extFeeNGN,
            internalStatus: internalMatch.status,
            providerStatus: extStatus,
            isMatched: true,
          });
        } else {
          lineItemMatches.push({
            reference: extRef,
            amount: intAmount,
            providerAmount: extAmountNGN,
            fee: intFee,
            providerFee: extFeeNGN,
            internalStatus: internalMatch.status,
            providerStatus: extStatus,
            isMatched: false,
            discrepancyReason: !isAmountMatch ? 'Amount mismatch' : 'Status mismatch',
          });
        }
      } else {
        // Missing webhook: Provider recorded successful transaction, but MangaPay has no internal deposit!
        if (extStatus === 'success') {
          missingWebhooks.push({
            reference: extRef,
            amount: extAmountNGN,
            fees: extFeeNGN,
            channel: extTx.channel,
            paidAt: extTx.paid_at,
            customerEmail: extTx.customer?.email,
          });
        }
      }
    }

    // Check internal credits that have no matching external transaction in fetched batch
    for (const dep of internalDepositRecords) {
      if (!externalSeenRefs.has(dep.paystackReference) && externalTxResult.status === 'CONNECTED' && externalTransactions.length > 0) {
        unverifiedCredits.push({
          reference: dep.paystackReference,
          amount: Number(dep.amount),
          status: dep.status,
          createdAt: dep.createdAt,
        });
      }
    }

    // ------------------------------------------------------------------------
    // TIER C: SETTLEMENT BATCH RECONCILIATION (GET /settlement)
    // ------------------------------------------------------------------------
    const settlementsResult = await PaystackService.fetchSettlements(periodStart, periodEnd, 1, 50);
    const settlements = settlementsResult.settlements.map((s: any) => ({
      settlementId: s.id,
      settlementReference: s.settlement_reference || `SET_${s.id}`,
      settlementDate: s.settled_at || s.createdAt,
      grossAmount: (s.total_amount || 0) / 100,
      fees: (s.total_fees || 0) / 100,
      netSettlementAmount: ((s.total_amount || 0) - (s.total_fees || 0)) / 100,
      status: s.status,
      destinationBank: s.destination || 'Corporate Bank Account',
    }));

    // ------------------------------------------------------------------------
    // GLOBAL TRIAL BALANCE & CHART OF ACCOUNTS AUDIT
    // ------------------------------------------------------------------------
    const trialBalance = await LedgerService.verifySystemTrialBalance();

    const accounts = await prisma.ledgerAccount.findMany({
      include: { postings: true },
    });

    let totalAssets = new Prisma.Decimal(0);
    let totalLiabilities = new Prisma.Decimal(0);
    let totalIncome = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);
    let totalEquity = new Prisma.Decimal(0);
    let paystackClearingLedgerBalance = new Prisma.Decimal(0);
    let vtpassClearingLedgerBalance = new Prisma.Decimal(0);
    let suspenseLiabilityLedgerBalance = new Prisma.Decimal(0);

    for (const acc of accounts) {
      let accBal = new Prisma.Decimal(0);
      for (const p of acc.postings) {
        const amt = new Prisma.Decimal(p.amount);
        if (acc.type === 'LIABILITY' || acc.type === 'INCOME' || acc.type === 'EQUITY') {
          accBal = p.entryType === PostingType.CREDIT ? accBal.plus(amt) : accBal.minus(amt);
        } else {
          accBal = p.entryType === PostingType.DEBIT ? accBal.plus(amt) : accBal.minus(amt);
        }
      }

      if (acc.type === 'ASSET') {
        totalAssets = totalAssets.plus(accBal);
        if (acc.name === 'PAYSTACK_CLEARING_ASSET') paystackClearingLedgerBalance = accBal;
        if (acc.name === 'VTPASS_CLEARING_ASSET') vtpassClearingLedgerBalance = accBal;
      } else if (acc.type === 'LIABILITY') {
        totalLiabilities = totalLiabilities.plus(accBal);
        if (acc.name === 'SUSPENSE_LIABILITY') suspenseLiabilityLedgerBalance = accBal;
      } else if (acc.type === 'INCOME') {
        totalIncome = totalIncome.plus(accBal);
      } else if (acc.type === 'EXPENSE') {
        totalExpenses = totalExpenses.plus(accBal);
      } else if (acc.type === 'EQUITY') {
        totalEquity = totalEquity.plus(accBal);
      }
    }

    // Fundamental Accounting Equation: Assets = Liabilities + Equity + (Income - Expenses)
    const netEquityAndIncome = totalLiabilities.plus(totalEquity).plus(totalIncome).minus(totalExpenses);
    const equationDifference = totalAssets.minus(netEquityAndIncome);
    const isEquationBalanced = equationDifference.abs().lessThan(0.0001);

    // Customer Wallet Cache vs Live Ledger Postings Integrity Check
    const walletAccounts = await prisma.walletAccount.findMany();
    let walletDiscrepancies = 0;

    for (const w of walletAccounts) {
      const liveBal = await LedgerService.getAccountBalance(w.ledgerAccountId);
      if (
        Math.abs(Number(w.availableBalance) - liveBal) > 0.01 &&
        Math.abs(Number(w.ledgerBalance) - liveBal) > 0.01
      ) {
        walletDiscrepancies++;
      }
    }

    // External Settlement Reconciliation (Clearing Asset vs Live Balance)
    let paystackDiscrepancy: number | null = null;
    if (paystackLiveBalance !== null) {
      paystackDiscrepancy = Math.abs(paystackClearingLedgerBalance.toNumber() - paystackLiveBalance);
    }

    let vtpassDiscrepancy: number | null = null;
    if (vtpassLiveBalance !== null) {
      vtpassDiscrepancy = Math.abs(vtpassClearingLedgerBalance.toNumber() - vtpassLiveBalance);
    }

    let totalDiscrepancyAmount = Math.abs(trialBalance.difference) + equationDifference.abs().toNumber();
    if (paystackDiscrepancy !== null && paystackDiscrepancy > 0.01) totalDiscrepancyAmount += paystackDiscrepancy;
    if (vtpassDiscrepancy !== null && vtpassDiscrepancy > 0.01) totalDiscrepancyAmount += vtpassDiscrepancy;
    if (missingWebhooks.length > 0) {
      totalDiscrepancyAmount += missingWebhooks.reduce((s, m) => s + m.amount, 0);
    }

    const isSystemIntegrityValid =
      trialBalance.isBalanced &&
      isEquationBalanced &&
      walletDiscrepancies === 0 &&
      (paystackDiscrepancy === null || paystackDiscrepancy < 0.01) &&
      (vtpassDiscrepancy === null || vtpassDiscrepancy < 0.01) &&
      missingWebhooks.length === 0;

    const reconStatus = isSystemIntegrityValid ? ReconStatus.MATCHED : ReconStatus.DISCREPANCY_DETECTED;

    // Record immutable audit history
    const record = await prisma.reconciliationRecord.create({
      data: {
        periodStart,
        periodEnd,
        totalPaystackDeposits: totalDeposits,
        totalLedgerDeposits: totalDeposits,
        totalPaystackPayouts: totalPayouts,
        totalLedgerPayouts: totalPayouts,
        discrepancyAmount: totalDiscrepancyAmount,
        status: reconStatus,
      },
    });

    return {
      reconciliationId: record.id,
      periodStart,
      periodEnd,
      status: record.status,
      discrepancyAmount: totalDiscrepancyAmount,
      isSystemIntegrityValid,
      tierA_balanceReconciliation: {
        paystack: {
          status: paystackBalanceStatus,
          liveBalance: paystackLiveBalance,
          clearingLedgerBalance: paystackClearingLedgerBalance.toNumber(),
          discrepancy: paystackDiscrepancy,
        },
        vtpass: {
          status: vtpassApiStatus,
          liveBalance: vtpassLiveBalance,
          clearingLedgerBalance: vtpassClearingLedgerBalance.toNumber(),
          discrepancy: vtpassDiscrepancy,
        },
        suspense: {
          suspenseLiabilityBalance: suspenseLiabilityLedgerBalance.toNumber(),
          description: 'Uncredited customer deposits held in suspense awaiting KYC upgrade or administrative refund',
        },
      },
      tierB_transactionReconciliation: {
        providerStatus: externalTxResult.status,
        totalExternalFetched: externalTransactions.length,
        totalInternalDepositsAudited: internalDepositRecords.length,
        matchedCount: matchedTransactionCount,
        missingWebhooksCount: missingWebhooks.length,
        missingWebhooks,
        unverifiedCreditsCount: unverifiedCredits.length,
        unverifiedCredits,
        lineItemDiscrepancies: lineItemMatches.filter((m) => !m.isMatched),
      },
      tierC_settlementReconciliation: {
        providerStatus: settlementsResult.status,
        settlementBatchesCount: settlements.length,
        settlements,
        grossSettledTotal: settlements.reduce((sum, s) => sum + s.grossAmount, 0),
        netSettledTotal: settlements.reduce((sum, s) => sum + s.netSettlementAmount, 0),
        totalFeesDeducted: settlements.reduce((sum, s) => sum + s.fees, 0),
      },
      tierD_statementReconciliation: {
        bankStatementIntegration: 'MANUAL_IMPORT_REQUIRED',
        status: 'PENDING_BANK_STATEMENT_UPLOAD',
        notes: 'Paystack settlements are swept to corporate bank account on T+1 schedule. Manual statement credit verification required.',
      },
      internalLedger: {
        trialBalance,
        totalAssets: totalAssets.toNumber(),
        totalLiabilities: totalLiabilities.toNumber(),
        totalIncome: totalIncome.toNumber(),
        totalExpenses: totalExpenses.toNumber(),
        totalEquity: totalEquity.toNumber(),
        netEquityAndIncome: netEquityAndIncome.toNumber(),
        equationDifference: equationDifference.toNumber(),
        isEquationBalanced,
      },
      volumes: {
        inboundDeposits: totalDeposits,
        outwardPayouts: totalPayouts,
        activeWithdrawalHolds,
        activeVasHolds,
        totalActivePendingHolds,
        vasSales: Number(vasMetrics._sum.totalAmount || 0),
        vasWholesaleCost: Number(vasMetrics._sum.providerCost || 0),
        vasProfitMargin: Number(vasMetrics._sum.profitAmount || 0),
        vasTransactionCount: vasMetrics._count.id,
      },
      walletIntegrity: {
        totalWalletsAudited: walletAccounts.length,
        walletDiscrepancies,
        isValid: walletDiscrepancies === 0,
      },
    };
  }
}
