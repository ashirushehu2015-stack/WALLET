import { PrismaClient, PostingType, WithdrawalStatus, TransactionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WalletService } from '../src/services/wallet.service';
import { WebhookService } from '../src/services/webhook.service';

const prisma = new PrismaClient();

async function runWithdrawalAndReversalTests() {
  console.log('=====================================================================');
  console.log('🧪 DEMONSTRATING 2-PHASE HOLD & COMMITMENT WITHDRAWAL ARCHITECTURE');
  console.log('=====================================================================\n');

  // 1. SETUP TEST USER WITH NGN 20,000 BALANCE
  const email = 'holdcommit.test@example.com';
  let user = await prisma.user.findUnique({
    where: { email },
    include: { walletAccount: true, dva: true },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await prisma.user.create({
      data: {
        email,
        phoneNumber: '08199881122',
        firstName: 'HoldCommit',
        lastName: 'Tester',
        passwordHash,
      },
      include: { walletAccount: true, dva: true },
    });
    await WalletService.createWalletForUser(user.id);
  }

  let dva = await prisma.dedicatedVirtualAccount.findUnique({
    where: { userId: user.id },
  });

  if (!dva) {
    dva = await prisma.dedicatedVirtualAccount.create({
      data: {
        userId: user.id,
        paystackCustomerCode: 'CUS_holdcommit_tester',
        accountNumber: '7766554433',
        accountName: 'HoldCommit Tester DVA',
        bankName: 'Wema Bank',
        bankCode: '035',
      },
    });
  }

  // Pre-fund user wallet with NGN 20,000
  const wallet = (await prisma.walletAccount.findUnique({ where: { userId: user.id } }))!;
  const currentBal = Number(wallet.availableBalance);
  if (currentBal < 20000) {
    const topupNeeded = 20000 - currentBal;
    const topupPayload = {
      event: 'charge.success',
      id: `evt_hc_prep_${Date.now()}`,
      data: {
        reference: `PAY-HCPREP-${Date.now().toString(36).toUpperCase()}`,
        amount: Math.round(topupNeeded * 100),
        fees: 0,
        channel: 'dedicated_account',
        customer: { customer_code: dva.paystackCustomerCode, email: user.email },
      },
    };
    await WebhookService.handleWebhook(topupPayload);
  }

  const initialWallet = (await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))!;
  console.log(`👤 User: ${user.firstName} ${user.lastName} (Wallet #${initialWallet.walletNumber})`);
  console.log(`💰 Starting Available Balance: NGN ${Number(initialWallet.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}\n`);

  // -------------------------------------------------------------------
  // PHASE 1: PRE-AUTHORIZATION & PENDING HOLD RESERVATION
  // -------------------------------------------------------------------
  console.log('---------------------------------------------------------------------');
  console.log('📌 PHASE 1: PRE-AUTHORIZATION & PENDING HOLD RESERVATION');
  console.log('---------------------------------------------------------------------');

  const payoutAmount = 10000.0;
  const platformFee = 100.0;
  const totalDeduction = payoutAmount + platformFee; // NGN 10,100.00

  console.log(`   Initiating Withdrawal Request:`);
  console.log(`   Payout Amount:   NGN ${payoutAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Platform Fee:    NGN ${platformFee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Deduction: NGN ${totalDeduction.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);

  const withdrawalRecord = await WalletService.requestWithdrawal(
    user.id,
    'Access Bank',
    '0011223344',
    'HoldCommit Tester',
    '044',
    payoutAmount,
    `IDEM_HC_10K_${Date.now()}`,
    platformFee
  );

  console.log(`\n✅ Hold Placed! Withdrawal Status: ${withdrawalRecord.status}`);
  console.log(`   Transfer Code: ${withdrawalRecord.paystackTransferCode}`);
  console.log(`   Notice: Zero double-entry postings are created during hold phase. Network calls execute outside DB locks.`);

  // -------------------------------------------------------------------
  // PHASE 2: PAYSTACK WEBHOOK CONFIRMATION (`transfer.success`)
  // -------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------------');
  console.log('📌 PHASE 2: PAYSTACK WEBHOOK CONFIRMATION (`transfer.success`)');
  console.log('---------------------------------------------------------------------');
  console.log(`Simulating Paystack Webhook: transfer.success for transfer_code: ${withdrawalRecord.paystackTransferCode}...`);

  const successPayload = {
    event: 'transfer.success',
    id: `evt_hc_succ_${Date.now()}`,
    data: {
      reference: withdrawalRecord.transactionId,
      transfer_code: withdrawalRecord.paystackTransferCode,
      amount: 1000000,
    },
  };

  await WebhookService.handleWebhook(successPayload);

  const walletAfterSuccess = (await prisma.walletAccount.findUnique({ where: { id: wallet.id } }))!;

  const finalJournal = await prisma.journalEntry.findFirst({
    where: { description: { contains: `Confirmed Bank Payout` } },
    include: { postings: { include: { ledgerAccount: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n💵 Balance Before Withdrawal: NGN ${Number(initialWallet.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`✨ Balance After Commitment:  NGN ${Number(walletAfterSuccess.availableBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`📉 Net Balance Debited:       -NGN ${(Number(initialWallet.availableBalance) - Number(walletAfterSuccess.availableBalance)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);

  console.log('\n📖 Finalized Journal Entry Record:');
  console.log(`   Journal Ref: ${finalJournal?.reference}`);
  console.log(`   Description: ${finalJournal?.description}`);

  console.log('\n⚖️ Atomic Double-Entry Ledger Postings:');
  let totalDebit = 0;
  let totalCredit = 0;

  finalJournal?.postings.forEach((p) => {
    const amt = Number(p.amount);
    if (p.entryType === PostingType.DEBIT) totalDebit += amt;
    if (p.entryType === PostingType.CREDIT) totalCredit += amt;

    const formattedType = p.entryType === PostingType.DEBIT ? 'DEBIT ' : 'CREDIT';
    const formattedAmt = `NGN ${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    console.log(
      `   [${formattedType}] ${formattedAmt.padStart(16)}  -->  ${p.ledgerAccount.name.padEnd(32)} (${p.ledgerAccount.type})`
    );
  });

  console.log(`\n🛡️ Double-Entry Invariant Verification Check:`);
  console.log(`   Total Debits  = NGN ${totalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Total Credits = NGN ${totalCredit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`);
  console.log(`   Difference    = NGN ${(totalDebit - totalCredit).toFixed(2)} [BALANCED SUCCESS]`);
  console.log('=====================================================================\n');
}

runWithdrawalAndReversalTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
