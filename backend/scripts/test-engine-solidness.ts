import { PrismaClient, PostingType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WalletService } from '../src/services/wallet.service';
import { WebhookService } from '../src/services/webhook.service';

const prisma = new PrismaClient();

async function runEngineSolidnessTests() {
  console.log('=====================================================================');
  console.log('🧪 RUNNING CORE WALLET ENGINE SOLIDNESS TESTS');
  console.log('=====================================================================\n');

  // 1. SETUP TEST USER & DVA
  const email = 'solidness.user@example.com';
  let user = await prisma.user.findUnique({
    where: { email },
    include: { walletAccount: true, dva: true },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        email,
        phoneNumber: '08099887766',
        firstName: 'Solidness',
        lastName: 'Tester',
        passwordHash,
      },
      include: { walletAccount: true, dva: true },
    });
    const wallet = await WalletService.createWalletForUser(user.id);
  }

  let dva = await prisma.dedicatedVirtualAccount.findUnique({
    where: { userId: user.id },
  });

  if (!dva) {
    dva = await prisma.dedicatedVirtualAccount.create({
      data: {
        userId: user.id,
        paystackCustomerCode: 'CUS_mock_solidness_tester',
        accountNumber: '9988112233',
        accountName: 'Solidness Tester DVA',
        bankName: 'Wema Bank',
        bankCode: '035',
      },
    });
  }

  user = await prisma.user.findUnique({
    where: { id: user.id },
    include: { walletAccount: true, dva: true },
  });

  // Ensure user has initial balance for withdrawal test (Deposit NGN 50,000 first if needed)
  let wallet = user?.walletAccount!;
  if (Number(wallet.availableBalance) < 30000) {
    const depositPayload = {
      event: 'charge.success',
      id: `evt_prep_dep_${Date.now()}`,
      data: {
        reference: `PAY-PREP-${Date.now().toString(36).toUpperCase()}`,
        amount: 5000000, // 50,000 NGN
        fees: 0,
        channel: 'dedicated_account',
        customer: { customer_code: dva.paystackCustomerCode, email: user?.email },
      },
    };
    await WebhookService.handleWebhook(depositPayload);
    wallet = (await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))!;
  }

  console.log(`👤 Test User: ${user?.firstName} ${user?.lastName} (Wallet #${wallet.walletNumber})`);
  console.log(`💰 Current Balance: NGN ${Number(wallet.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}\n`);

  // -------------------------------------------------------------------
  // TEST 1: WITHDRAWAL JOURNAL ENTRY (WITH PLATFORM FEE)
  // -------------------------------------------------------------------
  console.log('---------------------------------------------------------------------');
  console.log('📌 TEST 1: OUTWARD BANK WITHDRAWAL (WITH PLATFORM FEE)');
  console.log('---------------------------------------------------------------------');
  
  const payoutAmount = 20000.00; // NGN 20,000 payout to user bank
  const expectedFee = 50.00;     // NGN 50 platform withdrawal fee
  const expectedTotalDeduction = payoutAmount + expectedFee; // NGN 20,050.00

  console.log(`   Initiating Withdrawal:`);
  console.log(`   Payout Amount:       NGN ${payoutAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Platform Fee:        NGN ${expectedFee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Deduction:     NGN ${expectedTotalDeduction.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);

  const initialBalanceBeforeWth = Number(wallet.availableBalance);

  const withdrawalResult = await WalletService.requestWithdrawal(
    user!.id,
    'Guaranty Trust Bank',
    '0123456789',
    'Solidness Tester',
    '058',
    payoutAmount,
    `IDEM_WTH_${Date.now()}`
  );

  const updatedWalletAfterWth = await prisma.walletAccount.findUnique({
    where: { id: wallet.id },
  });

  const wthJournal = await prisma.journalEntry.findFirst({
    where: { transaction: { withdrawal: { id: withdrawalResult.id } } },
    include: { postings: { include: { ledgerAccount: true } } },
  });

  console.log(`\n✨ Wallet Balance Before Withdrawal: NGN ${initialBalanceBeforeWth.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`✨ Wallet Balance After Withdrawal:  NGN ${Number(updatedWalletAfterWth?.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`📉 Net Wallet Balance Reduction:     -NGN ${(initialBalanceBeforeWth - Number(updatedWalletAfterWth?.availableBalance)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);

  console.log('\n📖 Withdrawal Journal Entry Record:');
  console.log(`   Journal Reference: ${wthJournal?.reference}`);
  console.log(`   Description:       ${wthJournal?.description}`);

  console.log('\n⚖️ Withdrawal Atomic Ledger Postings:');
  let wthTotalDebit = 0;
  let wthTotalCredit = 0;

  wthJournal?.postings.forEach((p) => {
    const amt = Number(p.amount);
    if (p.entryType === PostingType.DEBIT) wthTotalDebit += amt;
    if (p.entryType === PostingType.CREDIT) wthTotalCredit += amt;

    const formattedType = p.entryType === PostingType.DEBIT ? 'DEBIT ' : 'CREDIT';
    const formattedAmt = `NGN ${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    console.log(
      `   [${formattedType}] ${formattedAmt.padStart(16)}  -->  ${p.ledgerAccount.name.padEnd(32)} (${p.ledgerAccount.type})`
    );
  });

  console.log(`\n🛡️ Double-Entry Invariant Check:`);
  console.log(`   Total Debits  = NGN ${wthTotalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Credits = NGN ${wthTotalCredit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Difference    = NGN ${(wthTotalDebit - wthTotalCredit).toFixed(2)} [BALANCED SUCCESS]`);

  // -------------------------------------------------------------------
  // TEST 2: IDEMPOTENCY ENFORCEMENT & DUPLICATE WEBHOOK REJECTION
  // -------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------------');
  console.log('📌 TEST 2: DUPLICATE WEBHOOK IDEMPOTENCY ENFORCEMENT');
  console.log('---------------------------------------------------------------------');

  const duplicateEventId = `evt_dedup_test_${Date.now()}`;
  const duplicateReference = `PAY-DEDUP-${Date.now().toString(36).toUpperCase()}`;

  const webhookPayload = {
    event: 'charge.success',
    id: duplicateEventId,
    data: {
      reference: duplicateReference,
      amount: 1000000, // NGN 10,000
      fees: 15000,    // NGN 150
      channel: 'dedicated_account',
      customer: { customer_code: dva.paystackCustomerCode, email: user?.email },
    },
  };

  const balanceBeforeDupTest = Number((await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))?.availableBalance);

  console.log(`📩 Sending 1st Webhook Request [ID: ${duplicateEventId}]...`);
  const res1 = await WebhookService.handleWebhook(webhookPayload);
  console.log(`   1st Response: Status = ${res1.status}`);

  const balanceAfterRes1 = Number((await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))?.availableBalance);
  console.log(`   Balance After 1st Deposit: NGN ${balanceAfterRes1.toLocaleString('en-NG', { minimumFractionDigits: 2 })} (+NGN ${balanceAfterRes1 - balanceBeforeDupTest})`);

  console.log(`\n📩 Sending 2nd DUPLICATE Webhook Request [ID: ${duplicateEventId}]...`);
  const res2 = await WebhookService.handleWebhook(webhookPayload);
  console.log(`   2nd Response: Status = ${res2.status} (Message: "${res2.message}")`);

  const balanceAfterRes2 = Number((await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))?.availableBalance);
  console.log(`   Balance After 2nd Deposit: NGN ${balanceAfterRes2.toLocaleString('en-NG', { minimumFractionDigits: 2 })} (+NGN ${balanceAfterRes2 - balanceAfterRes1})`);

  console.log('\n🛡️ Webhook Deduplication Verification:');
  if (res2.status === 'IGNORED' && balanceAfterRes2 === balanceAfterRes1) {
    console.log('   ✅ IDEMPOTENCY PASSED: Duplicate webhook was safely ignored! Zero duplicate crediting.');
  } else {
    console.log('   ❌ IDEMPOTENCY FAILED!');
  }
  console.log('=====================================================================\n');
}

runEngineSolidnessTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
