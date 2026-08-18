import { PrismaClient, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Chart of Accounts for Double-Entry Ledger...');

  const systemAccounts = [
    {
      name: 'PAYSTACK_CLEARING_ASSET',
      type: AccountType.ASSET,
      currency: 'NGN',
      description: 'Asset account holding funds currently processed by Paystack gateway prior to bank settlement',
    },
    {
      name: 'PLATFORM_FEE_INCOME',
      type: AccountType.INCOME,
      currency: 'NGN',
      description: 'Revenue earned from deposit & withdrawal transaction fees charged to users',
    },
    {
      name: 'PAYSTACK_FEE_EXPENSE',
      type: AccountType.EXPENSE,
      currency: 'NGN',
      description: 'Operating expense account for merchant gateway processing charges paid to Paystack by the platform',
    },
    {
      name: 'SYSTEM_EQUITY',
      type: AccountType.EQUITY,
      currency: 'NGN',
      description: 'System equity and reserves account',
    },
  ];

  for (const account of systemAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { name: account.name },
      update: { description: account.description },
      create: account,
    });
    console.log(`✅ Configured System Ledger Account: ${account.name} [${account.type}]`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
