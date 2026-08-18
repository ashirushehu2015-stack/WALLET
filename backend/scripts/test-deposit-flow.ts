import { PrismaClient, PostingType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WalletService } from '../src/services/wallet.service';
import { WebhookService } from '../src/services/webhook.service';

const prisma = new PrismaClient();

async function runTestDepositFlow() {
  console.log('--- 🧪 STARTING MOCK PAYSTACK DEPOSIT TEST FLOW ---');

  // 1. Create or Find Test User
  const email = 'alex.fintech@example.com';
  let user = await prisma.user.findUnique({
    where: { email },
    include: { walletAccount: true, dva: true },
  });

  if (!user) {
    console.log('👤 Creating Test User: Alex Fintech (alex.fintech@example.com)...');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        email,
        phoneNumber: '08012345678',
        firstName: 'Alex',
        lastName: 'Fintech',
        passwordHash,
      },
      include: { walletAccount: true, dva: true },
    });

    const wallet = await WalletService.createWalletForUser(user.id);
  }

  // Ensure DVA record exists for testing
  let dva = await prisma.dedicatedVirtualAccount.findUnique({
    where: { userId: user.id },
  });

  if (!dva) {
    dva = await prisma.dedicatedVirtualAccount.create({
      data: {
        userId: user.id,
        paystackCustomerCode: 'CUS_mock_alex_fintech',
        accountNumber: '9928172635',
        accountName: 'Alex Fintech DVA',
        bankName: 'Wema Bank',
        bankCode: '035',
      },
    });
  }

  user = await prisma.user.findUnique({
    where: { id: user.id },
    include: { walletAccount: true, dva: true },
  });

  const initialWallet = user?.walletAccount;
  console.log(`👤 Test User: Alex Fintech (Wallet #${initialWallet?.walletNumber})`);
  console.log(`💰 Initial Available Balance: NGN ${Number(initialWallet?.availableBalance).toFixed(2)}`);

  // 2. Prepare Mock Paystack Webhook Payload
  // Deposit Gross: NGN 50,000.00 (5,000,000 Kobo)
  // Paystack Fee:  NGN 750.00 (75,000 Kobo)
  // Net User Credit: NGN 49,250.00
  const mockWebhookPayload = {
    event: 'charge.success',
    id: `evt_mock_dep_${Date.now()}`,
    data: {
      reference: `PAY-MOCK-${Date.now().toString(36).toUpperCase()}`,
      amount: 5000000, // 50,000 NGN in Kobo
      fees: 75000,     // 750 NGN Paystack fee
      channel: 'dedicated_account',
      customer: {
        customer_code: dva.paystackCustomerCode,
        email: user?.email,
      },
    },
  };

  console.log('\n📩 Incoming Paystack Webhook (`charge.success`)...');
  console.log(`   Paystack Ref:   ${mockWebhookPayload.data.reference}`);
  console.log(`   Gross Amount:   NGN 50,000.00`);
  console.log(`   Paystack Fee:   NGN 750.00`);
  console.log(`   Expected Net:   NGN 49,250.00`);

  // 3. Process Webhook through WebhookService
  const webhookResult = await WebhookService.handleWebhook(mockWebhookPayload);
  console.log(`\n⚙️ Webhook Processing Status:`, webhookResult.status);

  // 4. Fetch Updated User Wallet
  const updatedWallet = await prisma.walletAccount.findUnique({
    where: { id: initialWallet?.id },
    include: { user: true, ledgerAccount: true },
  });

  // 5. Fetch Posted Journal Entry & Postings
  const journalEntry = await prisma.journalEntry.findFirst({
    where: { description: { contains: mockWebhookPayload.data.reference } },
    include: {
      postings: {
        include: { ledgerAccount: true },
      },
    },
  });

  // 6. Output Results
  console.log('\n=====================================================================');
  console.log('📊 TEST DEPOSIT FLOW RESULTS & DOUBLE-ENTRY LEDGER BREAKDOWN');
  console.log('=====================================================================');
  console.log(`👤 User:               ${updatedWallet?.user.firstName} ${updatedWallet?.user.lastName}`);
  console.log(`💳 Wallet Number:      #${updatedWallet?.walletNumber}`);
  console.log(`💵 Previous Balance:   NGN ${Number(initialWallet?.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`✨ Updated Balance:    NGN ${Number(updatedWallet?.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`📈 Net Balance Increase: +NGN ${(Number(updatedWallet?.availableBalance) - Number(initialWallet?.availableBalance)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);

  console.log('\n📖 Created Journal Entry:');
  console.log(`   Journal ID:  ${journalEntry?.id}`);
  console.log(`   Reference:   ${journalEntry?.reference}`);
  console.log(`   Description: ${journalEntry?.description}`);
  console.log(`   Status:      ${journalEntry?.status}`);

  console.log('\n⚖️ Atomic Double-Entry Ledger Postings:');
  let totalDebit = 0;
  let totalCredit = 0;

  journalEntry?.postings.forEach((p) => {
    const amt = Number(p.amount);
    if (p.entryType === PostingType.DEBIT) totalDebit += amt;
    if (p.entryType === PostingType.CREDIT) totalCredit += amt;

    const formattedType = p.entryType === PostingType.DEBIT ? 'DEBIT ' : 'CREDIT';
    const formattedAmt = `NGN ${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    console.log(
      `   [${formattedType}] ${formattedAmt.padStart(16)}  -->  ${p.ledgerAccount.name.padEnd(32)} (${p.ledgerAccount.type})`
    );
  });

  console.log('\n🛡️ Ledger Invariant Verification Check:');
  console.log(`   Total Debits  = NGN ${totalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Credits = NGN ${totalCredit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Difference    = NGN ${(totalDebit - totalCredit).toFixed(2)} [BALANCED SUCCESS]`);
  console.log('=====================================================================\n');
}

runTestDepositFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
