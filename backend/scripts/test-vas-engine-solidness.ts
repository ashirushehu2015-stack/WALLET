import { PrismaClient, PostingType, VASTransactionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { VASService } from '../src/modules/vas/services/vas.service';
import { VASPricingService } from '../src/modules/vas/services/pricing.service';
import { VASTransactionService } from '../src/modules/vas/services/vas.transaction.service';
import { WalletService } from '../src/services/wallet.service';
import { LedgerService } from '../src/services/ledger.service';

const prisma = new PrismaClient();

async function runVASEngineSolidnessTests() {
  console.log('=====================================================================');
  console.log('🧪 RUNNING VALUE-ADDED SERVICES (VAS) ENGINE VERIFICATION SUITE');
  console.log('=====================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Phone Normalization & Prefix Detection
    // ---------------------------------------------------------
    console.log('--- TEST 1: Telecom Phone Normalization & Detection ---');
    const norm1 = VASService.normalizePhoneNumber('+2348031234567');
    assert(norm1 === '08031234567', `Normalize international format (+234803... -> ${norm1})`);

    const norm2 = VASService.normalizePhoneNumber('08029876543');
    assert(norm2 === '08029876543', `Preserve local format (0802... -> ${norm2})`);

    const det1 = VASService.detectNetwork('08031234567');
    assert(det1 === 'MTN', `Detect MTN prefix (0803 -> ${det1})`);

    const det2 = VASService.detectNetwork('08021234567');
    assert(det2 === 'AIRTEL', `Detect Airtel prefix (0802 -> ${det2})`);

    const det3 = VASService.detectNetwork('08051234567');
    assert(det3 === 'GLO', `Detect Glo prefix (0805 -> ${det3})`);

    const det4 = VASService.detectNetwork('08091234567');
    assert(det4 === '9MOBILE', `Detect 9mobile prefix (0809 -> ${det4})`);

    // ---------------------------------------------------------
    // TEST 2: Authoritative Wholesale Pricing & Commission Quotes
    // ---------------------------------------------------------
    console.log('\n--- TEST 2: Wholesale Pricing & Platform Margin Quotes ---');
    const mtnQuote = VASPricingService.quoteAirtime('MTN', 1000);
    assert(mtnQuote.sellingPrice === 1000, `MTN Face selling price is ₦1,000`);
    assert(mtnQuote.providerCost === 980, `MTN Provider wholesale cost is ₦980 (2% margin)`);
    assert(mtnQuote.profitAmount === 20, `MTN Platform commission is ₦20`);
    assert(mtnQuote.sellingPrice === mtnQuote.providerCost + mtnQuote.profitAmount, 'Invariant: SellingPrice = ProviderCost + Profit');

    const gloQuote = VASPricingService.quoteAirtime('GLO', 2000);
    assert(gloQuote.providerCost === 1950, `Glo Provider wholesale cost is ₦1,950 (2.5% margin)`);
    assert(gloQuote.profitAmount === 50, `Glo Platform commission is ₦50`);

    // ---------------------------------------------------------
    // TEST 3: System Accounts Existence
    // ---------------------------------------------------------
    console.log('\n--- TEST 3: System Ledger Accounts Invariant ---');
    const clearingAccount = await prisma.ledgerAccount.findUnique({
      where: { name: 'VTPASS_CLEARING_ASSET' },
    });
    assert(!!clearingAccount && clearingAccount.type === 'ASSET', 'VTPASS_CLEARING_ASSET account exists as ASSET');

    const commissionAccount = await prisma.ledgerAccount.findUnique({
      where: { name: 'VAS_COMMISSION_INCOME' },
    });
    assert(!!commissionAccount && commissionAccount.type === 'INCOME', 'VAS_COMMISSION_INCOME account exists as INCOME');

    // ---------------------------------------------------------
    // TEST 4: Double-Entry Balancing Verification on Sample Purchase
    // ---------------------------------------------------------
    console.log('\n--- TEST 4: Double-Entry Atomic Balancing Invariant ---');
    // Ensure test user exists
    const email = 'vas.tester@mangapay.ng';
    let user = await prisma.user.findUnique({
      where: { email },
      include: { walletAccount: true },
    });

    if (!user) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      user = await prisma.user.create({
        data: {
          email,
          phoneNumber: '08039988112',
          firstName: 'VAS',
          lastName: 'Tester',
          passwordHash,
          transactionPinHash: await bcrypt.hash('1234', 10),
        },
        include: { walletAccount: true },
      });
      await WalletService.createWalletForUser(user.id);
    }

    // Fund user wallet if balance is low
    let wallet = await prisma.walletAccount.findUnique({ where: { userId: user.id } });
    if (!wallet || Number(wallet.availableBalance) < 10000) {
      const userLiability = await prisma.ledgerAccount.findUnique({
        where: { name: `USER_LIABILITY_${user.id}` },
      });
      const paystackClearing = await prisma.ledgerAccount.findUnique({
        where: { name: 'PAYSTACK_CLEARING_ASSET' },
      });

      if (userLiability && paystackClearing) {
        await LedgerService.postJournalEntry({
          reference: `FUND-TEST-${Date.now()}`,
          description: 'Seed test funds for VAS suite',
          postings: [
            { ledgerAccountId: paystackClearing.id, entryType: PostingType.DEBIT, amount: 50000 },
            { ledgerAccountId: userLiability.id, entryType: PostingType.CREDIT, amount: 50000 },
          ],
        });
        await prisma.walletAccount.update({
          where: { userId: user.id },
          data: {
            availableBalance: { increment: 50000 },
            ledgerBalance: { increment: 50000 },
          },
        });
      }
    }

    const testTx = await VASTransactionService.purchaseAirtime(user.id, {
      network: 'MTN',
      recipientPhone: '08031234567',
      amount: 1000,
      pin: '1234',
    });

    assert(!!testTx, 'Transaction record was returned');
    if (!testTx) return;

    assert(testTx.status === VASTransactionStatus.SUCCESSFUL, `Airtime purchase succeeded (Ref: ${testTx.internalReference})`);

    // Verify Journal Entry for this transaction
    const journal = await prisma.journalEntry.findUnique({
      where: { reference: `VAS-JRN-${testTx.internalReference}` },
      include: { postings: { include: { ledgerAccount: true } } },
    });

    assert(!!journal, 'Atomic Journal Entry was recorded in ledger');
    if (journal) {
      let totalDebits = 0;
      let totalCredits = 0;
      for (const p of journal.postings) {
        if (p.entryType === 'DEBIT') totalDebits += Number(p.amount);
        if (p.entryType === 'CREDIT') totalCredits += Number(p.amount);
      }
      assert(totalDebits === 1000, `Total Debits = ₦${totalDebits.toFixed(2)}`);
      assert(totalCredits === 1000, `Total Credits = ₦${totalCredits.toFixed(2)}`);
      assert(
        totalDebits === totalCredits,
        `Double-Entry Invariant Strictly Satisfied: ∑Debits (₦${totalDebits}) = ∑Credits (₦${totalCredits})`
      );
    }

    // ---------------------------------------------------------
    // TEST 5: Compensating Refund & Duplicate Prevention
    // ---------------------------------------------------------
    console.log('\n--- TEST 5: Atomic Reversal & Compensating Refund ---');
    const refundResult = await VASTransactionService.refundVasTransaction(
      testTx.id,
      'Automated test suite refund verification',
      'SYSTEM_TESTER'
    );

    assert(refundResult.refundRecord.status === 'SUCCESSFUL', 'Compensating refund completed');
    assert(Number(refundResult.refundRecord.amount) === 1000, 'Refunded amount matches full customer face value (₦1,000)');

    // Verify that attempting a duplicate refund throws an error
    let duplicatePrevented = false;
    try {
      await VASTransactionService.refundVasTransaction(
        testTx.id,
        'Attempt duplicate refund',
        'SYSTEM_TESTER'
      );
    } catch (e: any) {
      duplicatePrevented = e.message.includes('already') || e.message.includes('Cannot refund');
    }
    assert(duplicatePrevented, 'Duplicate refund prevented by state validation');

    console.log('\n=====================================================================');
    console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVASEngineSolidnessTests();
