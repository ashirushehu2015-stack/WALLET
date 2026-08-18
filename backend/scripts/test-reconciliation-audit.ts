import { PrismaClient } from '@prisma/client';
import { ReconciliationService } from '../src/services/reconciliation.service';

const prisma = new PrismaClient();

async function runReconciliationAuditTest() {
  console.log('=====================================================================');
  console.log('🧪 SYSTEM LEDGER RECONCILIATION & TRIAL BALANCE AUDIT');
  console.log('=====================================================================\n');

  const auditResult = await ReconciliationService.runReconciliation();

  console.log(`📌 Reconciliation ID: ${auditResult.reconciliationId}`);
  console.log(`📌 Audit Period:      ${auditResult.periodStart.toISOString().split('T')[0]} -> ${auditResult.periodEnd.toISOString().split('T')[0]}`);
  console.log(`📌 Overall Status:    [${auditResult.status}]\n`);

  console.log('---------------------------------------------------------------------');
  console.log('1. GLOBAL TRIAL BALANCE INVARIANT CHECK (Debits == Credits)');
  console.log('---------------------------------------------------------------------');
  console.log(`   Total System Debits:  NGN ${auditResult.trialBalance.totalDebits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total System Credits: NGN ${auditResult.trialBalance.totalCredits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Difference:           NGN ${auditResult.trialBalance.difference.toFixed(2)} [${auditResult.trialBalance.isBalanced ? 'PERFECTLY BALANCED' : 'DISCREPANCY'}]\n`);

  console.log('---------------------------------------------------------------------');
  console.log('2. CHART OF ACCOUNTS FUNDAMENTAL ACCOUNTING EQUATION');
  console.log('   Assets = Liabilities + Equity + (Income - Expenses)');
  console.log('---------------------------------------------------------------------');
  console.log(`   Total Assets (Paystack Clearing):          NGN ${auditResult.chartOfAccounts.totalAssets.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total User Liabilities:                     NGN ${auditResult.chartOfAccounts.totalLiabilities.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Platform Fee Income:                  NGN ${auditResult.chartOfAccounts.totalIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Expenses:                             NGN ${auditResult.chartOfAccounts.totalExpenses.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Net Equity & Revenue (Liab + Inc - Exp):    NGN ${auditResult.chartOfAccounts.netEquityAndIncome.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Accounting Equation Difference:             NGN ${auditResult.chartOfAccounts.equationDifference.toFixed(2)} [${auditResult.chartOfAccounts.isEquationBalanced ? 'MATHEMATICALLY EXACT' : 'DISCREPANCY'}]\n`);

  console.log('---------------------------------------------------------------------');
  console.log('3. INDIVIDUAL USER WALLET INTEGRITY AUDIT');
  console.log('---------------------------------------------------------------------');
  console.log(`   Total User Wallets Audited: ${auditResult.walletIntegrity.totalWalletsAudited}`);
  console.log(`   Wallet Discrepancies Found: ${auditResult.walletIntegrity.walletDiscrepancies}`);
  console.log(`   Wallet Integrity Status:    [${auditResult.walletIntegrity.isValid ? '100% VERIFIED ACCURATE' : 'CORRUPTED'}]\n`);

  console.log('---------------------------------------------------------------------');
  console.log('4. VOLUME SUMMARY AUDIT');
  console.log('---------------------------------------------------------------------');
  console.log(`   Total Processed Deposits: NGN ${auditResult.totalDeposits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Processed Payouts:  NGN ${auditResult.totalPayouts.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log('=====================================================================\n');
}

runReconciliationAuditTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
