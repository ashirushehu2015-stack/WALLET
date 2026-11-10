import { verifyPaystackSignature } from '../src/utils/crypto';
import { VASTransactionService } from '../src/modules/vas/services/vas.transaction.service';
import { PaystackService, PaystackTimeoutError } from '../src/services/paystack.service';
import { LedgerService } from '../src/services/ledger.service';
import { KYCService } from '../src/services/kyc.service';
import { preReserveIdempotencyKey, finalizeIdempotencyKey, releaseIdempotencyKey, IDEMPOTENCY_STATUS } from '../src/utils/idempotency';
import { PostingType, KYCTier, KYCStatus, WithdrawalStatus, TransactionStatus, VASTransactionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function record(suite: string, name: string, condition: boolean, message?: string) {
  results.push({ suite, name, passed: condition, message });
  if (condition) {
    console.log(`  ✅ [PASS] ${suite} -> ${name}`);
  } else {
    console.error(`  ❌ [FAIL/FLAG] ${suite} -> ${name}: ${message || 'Assertion failed'}`);
  }
}

async function runSprint3AuditSuite() {
  console.log('\n========================================================================');
  console.log('🔍 MANGAPAY SPRINT 3 INDEPENDENT VERIFICATION & CONCURRENCY AUDIT SUITE');
  console.log('========================================================================\n');

  // ==========================================================================
  // SECTION 1: PREVIOUS 15 REMEDIATION FIXES INDEPENDENT CHECK
  // ==========================================================================
  console.log('--- 1. Verification of Previous Fixes ---');

  // Check 1: Public registration cannot create ADMIN or SUPER_ADMIN
  const { AuthController } = await import('../src/controllers/auth.controller');
  const { prisma } = await import('../src/config/db');

  let assignedRoleAdmin: string | null = null;
  let assignedRoleSuperAdmin: string | null = null;
  const origUserCreate = prisma.user.create;
  const origUserFind = prisma.user.findFirst;

  try {
    prisma.user.findFirst = (async () => null) as any;
    prisma.user.create = (async (args: any) => {
      if (args.data.email === 'admin-attempt@example.com') assignedRoleAdmin = args.data.role;
      if (args.data.email === 'super-attempt@example.com') assignedRoleSuperAdmin = args.data.role;
      return { id: 'u-1', email: args.data.email, role: args.data.role, createdAt: new Date() };
    }) as any;

    const resAdmin: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this; }, json() {} };
    await AuthController.register({
      body: { email: 'admin-attempt@example.com', phoneNumber: '08000000001', password: 'pass', firstName: 'A', lastName: 'B', role: 'ADMIN' },
    } as any, resAdmin);

    const resSuper: any = { statusCode: 200, status(c: number) { this.statusCode = c; return this; }, json() {} };
    await AuthController.register({
      body: { email: 'super-attempt@example.com', phoneNumber: '08000000002', password: 'pass', firstName: 'A', lastName: 'B', role: 'SUPER_ADMIN' },
    } as any, resSuper);

    record('Previous Fixes', 'Registration role=ADMIN overridden to USER', assignedRoleAdmin === 'USER');
    record('Previous Fixes', 'Registration role=SUPER_ADMIN overridden to USER', assignedRoleSuperAdmin === 'USER');
  } finally {
    prisma.user.create = origUserCreate;
    prisma.user.findFirst = origUserFind;
  }

  // Check 2 & 3: Paystack transfer failure & timeout hold retention
  let transferErrorCaught = false;
  try {
    await PaystackService.initiateTransfer(5000, 'RCP_invalid_code', 'REF_AUDIT_01', 'Test payout');
  } catch (err: any) {
    transferErrorCaught = true;
    record(
      'Previous Fixes',
      'Paystack initiateTransfer throws real error on provider failure (no fake success)',
      err instanceof PaystackTimeoutError || err.message.includes('Paystack')
    );
  }
  record('Previous Fixes', 'Provider transfer error is never masked', transferErrorCaught);

  // Check 4: Requery method exists and returns explicit typed states
  const verifyResult = await PaystackService.verifyTransfer('NON_EXISTENT_REF_999');
  record(
    'Previous Fixes',
    'Paystack verifyTransfer requery returns explicit mapped status',
    ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'REVERSED', 'UNKNOWN'].includes(verifyResult.status)
  );

  // Check 5 & 6: Webhook HMAC verification handles malformed input safely without dev bypass
  process.env.PAYSTACK_WEBHOOK_SECRET = 'audit_webhook_secret_key_888';
  const testPayload = JSON.stringify({ event: 'charge.success', data: { reference: 'PAY_123' } });
  const validSig = crypto.createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET).update(testPayload).digest('hex');

  record('Previous Fixes', 'Valid HMAC-SHA512 passes verification', verifyPaystackSignature(testPayload, validSig) === true);
  record('Previous Fixes', 'Tampered payload fails verification', verifyPaystackSignature(testPayload + '_tampered', validSig) === false);
  record('Previous Fixes', 'Malformed short signature rejected safely without RangeError', verifyPaystackSignature(testPayload, 'short') === false);
  record('Previous Fixes', 'Malformed non-hex signature rejected safely', verifyPaystackSignature(testPayload, 'G'.repeat(128)) === false);

  // Check 7 & 8: Unconfigured PIN rejected (no 1234 fallback), lockout enforced
  const noPinUser = { id: 'user-no-pin-audit', transactionPinHash: null };
  const verifyNoPin = await VASTransactionService.verifyUserPin(noPinUser, '1234');
  record(
    'Previous Fixes',
    'Unconfigured PIN cannot default to 1234',
    verifyNoPin.valid === false && !!verifyNoPin.reason?.includes('not been set')
  );

  const hashedAuditPin = await bcrypt.hash('9876', 8);
  const auditUser = { id: 'user-lockout-audit', transactionPinHash: hashedAuditPin };
  for (let i = 1; i <= 4; i++) {
    await VASTransactionService.verifyUserPin(auditUser, '0000');
  }
  const attempt5 = await VASTransactionService.verifyUserPin(auditUser, '0000');
  record('Previous Fixes', '5th consecutive wrong PIN locks account for 15 minutes', attempt5.valid === false && !!attempt5.reason?.includes('locked for 15 minutes'));

  // Check 13: Decimal-safe ledger arithmetic
  let decimalErrorCaught = false;
  try {
    await LedgerService.postJournalEntry({
      reference: 'AUDIT_UNBALANCED_01',
      description: 'Audit entry',
      postings: [
        { ledgerAccountId: 'a1', entryType: PostingType.DEBIT, amount: 250.00 },
        { ledgerAccountId: 'a2', entryType: PostingType.CREDIT, amount: 249.99 },
      ],
    }, {
      journalEntry: { create: async () => ({}) },
      walletAccount: { findUnique: async () => null, update: async () => ({}) },
    } as any);
  } catch (err: any) {
    decimalErrorCaught = true;
    record('Previous Fixes', 'Zero-tolerance Decimal arithmetic catches 1 kobo discrepancy', err.message.includes('Ledger Unbalanced Error') && err.message.includes('0.0100'));
  }
  record('Previous Fixes', 'Unbalanced journal entry rejected', decimalErrorCaught);

  // ==========================================================================
  // SECTION 2: KYC REVISIT & UNENFORCED LIMITS AUDIT
  // ==========================================================================
  console.log('\n--- 2. KYC Investigation & Transaction Limits Audit ---');

  // Verify Tier limits definition
  const tier1Limits = KYCService.getTierLimits(KYCTier.TIER_1);
  const tier2Limits = KYCService.getTierLimits(KYCTier.TIER_2);
  const tier3Limits = KYCService.getTierLimits(KYCTier.TIER_3);

  record('KYC Audit', 'KYC Tier 1 limit specifies maxSingleDeposit: ₦50,000', tier1Limits.maxSingleDeposit === 50000);
  record('KYC Audit', 'KYC Tier 2 limit specifies maxSingleDeposit: ₦200,000', tier2Limits.maxSingleDeposit === 200000);
  record('KYC Audit', 'KYC Tier 3 limit specifies maxSingleDeposit: ₦5,000,000', tier3Limits.maxSingleDeposit === 5000000);

  // Test whether wallet.service.ts or webhook.service.ts checks tier limits
  const { WalletService } = await import('../src/services/wallet.service');
  const walletServiceStr = WalletService.toString();
  const transferHasKycCheck = walletServiceStr.includes('KYC') || walletServiceStr.includes('tier') || walletServiceStr.includes('getTierLimits');
  record('KYC Audit', 'DEFECT CHECK: Wallet transferFunds checks KYC tier limits', transferHasKycCheck, 'KYC tier limits are NOT checked in WalletService.transferFunds');

  const { WebhookService } = await import('../src/services/webhook.service');
  const webhookServiceStr = WebhookService.toString();
  const depositHasKycCheck = webhookServiceStr.includes('KYC') || webhookServiceStr.includes('tier') || webhookServiceStr.includes('getTierLimits');
  record('KYC Audit', 'DEFECT CHECK: Webhook deposit processing checks KYC tier limits', depositHasKycCheck, 'KYC tier limits are NOT checked in WebhookService.processChargeSuccess');

  // ==========================================================================
  // SECTION 4: CONCURRENT TRANSACTION TESTING (IDEMPOTENCY)
  // ==========================================================================
  console.log('\n--- 4. Concurrency & Idempotency Stress Testing ---');

  // Setup an in-memory concurrent idempotency repository
  const concurrentMap = new Map<string, any>();
  const origPrismaIdemp = {
    findUnique: prisma.idempotencyKey.findUnique,
    findFirst: prisma.idempotencyKey.findFirst,
    create: prisma.idempotencyKey.create,
    update: prisma.idempotencyKey.update,
  };

  try {
    prisma.idempotencyKey.findFirst = (async (args: any) => {
      const rec = concurrentMap.get(args.where.key);
      return rec ? { ...rec } : null;
    }) as any;

    prisma.idempotencyKey.findUnique = (async (args: any) => {
      const rec = concurrentMap.get(args.where.key);
      return rec ? { ...rec } : null;
    }) as any;

    prisma.idempotencyKey.create = (async (args: any) => {
      if (concurrentMap.has(args.data.key)) {
        const p2002: any = new Error('Unique constraint failed on the fields: (`key`)');
        p2002.code = 'P2002';
        throw p2002;
      }
      const recordData = { ...args.data, id: 'idemp-' + Math.random().toString(36).substring(2) };
      concurrentMap.set(args.data.key, recordData);
      return recordData;
    }) as any;

    prisma.idempotencyKey.update = (async (args: any) => {
      const existing = concurrentMap.get(args.where.key);
      const updated = { ...existing, ...args.data };
      concurrentMap.set(args.where.key, updated);
      return updated;
    }) as any;

    // Concurrency Test 1: 10 simultaneous requests with the SAME key
    const key10 = 'concurrent-key-10-batch';
    const batch10Promises = Array.from({ length: 10 }, () =>
      preReserveIdempotencyKey(key10, 'cust-10', '/api/v1/wallet/transfer')
    );
    const batch10Results = await Promise.all(batch10Promises);

    const acquired10 = batch10Results.filter((r: any) => r.status === 'ACQUIRED');
    const inFlight10 = batch10Results.filter((r: any) => r.status === 'IN_FLIGHT');

    record('Concurrency', '10 simultaneous requests: Exactly 1 acquires lock', acquired10.length === 1);
    record('Concurrency', '10 simultaneous requests: Exactly 9 blocked as IN_FLIGHT (HTTP 409)', inFlight10.length === 9);

    // Concurrency Test 2: 50 simultaneous requests with the SAME key
    const key50 = 'concurrent-key-50-batch';
    const batch50Promises = Array.from({ length: 50 }, () =>
      preReserveIdempotencyKey(key50, 'cust-50', '/api/v1/wallet/transfer')
    );
    const batch50Results = await Promise.all(batch50Promises);

    const acquired50 = batch50Results.filter((r: any) => r.status === 'ACQUIRED');
    const inFlight50 = batch50Results.filter((r: any) => r.status === 'IN_FLIGHT');

    record('Concurrency', '50 simultaneous requests: Exactly 1 acquires lock', acquired50.length === 1);
    record('Concurrency', '50 simultaneous requests: Exactly 49 blocked as IN_FLIGHT (HTTP 409)', inFlight50.length === 49);

    // Concurrency Test 3: Different keys for the same customer
    const resA = await preReserveIdempotencyKey('cust-same-key-A', 'cust-1', '/api/v1/wallet/transfer');
    const resB = await preReserveIdempotencyKey('cust-same-key-B', 'cust-1', '/api/v1/wallet/transfer');
    record('Concurrency', 'Different keys for same customer both acquire lock cleanly', resA.status === 'ACQUIRED' && resB.status === 'ACQUIRED');

    // Concurrency Test 4: Same key used by DIFFERENT customers (Cross-tenant isolation check)
    // Customer 1 completes key K-X
    const crossKey = 'shared-key-cross-tenant';
    await preReserveIdempotencyKey(crossKey, 'customer-A', '/api/v1/wallet/transfer');
    await finalizeIdempotencyKey(crossKey, 200, { success: true, secretData: 'CustA Confidential Transaction' });

    // Customer 2 submits the exact same key K-X
    const crossResCustB = await preReserveIdempotencyKey(crossKey, 'customer-B', '/api/v1/wallet/transfer');
    // Notice: Does it return Customer A's completed record?
    const hasCrossCustomerDataLeak = crossResCustB.status === 'COMPLETED';
    record(
      'Concurrency',
      'ISOLATION CHECK: Idempotency keys are global across all customers (not scoped by customerId)',
      hasCrossCustomerDataLeak,
      'If customer B submits customer A key, they receive customer A cached response'
    );

    // Concurrency Test 5: Server interruption during PROCESSING (status 102 abandoned key)
    const interruptedKey = 'interrupted-during-processing-key';
    await preReserveIdempotencyKey(interruptedKey, 'cust-crash', '/api/v1/wallet/transfer');
    // Simulate server crash: response is never finalized
    const retryAfterCrash = await preReserveIdempotencyKey(interruptedKey, 'cust-crash', '/api/v1/wallet/transfer');
    record(
      'Concurrency',
      'ABANDONED RECOVERY CHECK: Interrupted processing keys remain locked as IN_FLIGHT indefinitely without TTL expiration',
      retryAfterCrash.status === 'IN_FLIGHT',
      'No background reaper or timestamp expiration exists for abandoned status 102 keys'
    );
  } finally {
    prisma.idempotencyKey.findUnique = origPrismaIdemp.findUnique;
    prisma.idempotencyKey.findFirst = origPrismaIdemp.findFirst;
    prisma.idempotencyKey.create = origPrismaIdemp.create;
    prisma.idempotencyKey.update = origPrismaIdemp.update;
  }

  // ==========================================================================
  // SECTION 5: PAYSTACK RECONCILIATION AUDIT
  // ==========================================================================
  console.log('\n--- 5. Deep Paystack Reconciliation Audit ---');

  const { ReconciliationService } = await import('../src/services/reconciliation.service');
  const reconServiceStr = ReconciliationService.toString();

  const hasBalanceRecon = reconServiceStr.includes('getAccountBalance');
  const hasTransactionRecon = reconServiceStr.includes('/transaction') || reconServiceStr.includes('fetchTransactions');
  const hasSettlementRecon = reconServiceStr.includes('/settlement') || reconServiceStr.includes('settlement');

  record('Reconciliation', 'A. Balance Reconciliation implemented (queries live Paystack balance)', hasBalanceRecon);
  record('Reconciliation', 'B. Transaction Reconciliation implemented (matches individual transaction line items)', hasTransactionRecon, 'Individual line item query against Paystack transaction API is not implemented');
  record('Reconciliation', 'C. Settlement Reconciliation implemented (queries Paystack settlement API)', hasSettlementRecon, 'Paystack settlement API query (/settlement) is not implemented');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(`📊 SPRINT 3 VERIFICATION SUMMARY: ${passed}/${total} Checks Evaluated (${failed} Failed/Flagged)`);
  console.log('========================================================================\n');
}

runSprint3AuditSuite().catch((err) => {
  console.error('Fatal error in Sprint 3 verification suite:', err);
  process.exit(1);
});
