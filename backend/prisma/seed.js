"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding Chart of Accounts for Double-Entry Ledger...');
    const systemAccounts = [
        {
            name: 'PAYSTACK_CLEARING_ASSET',
            type: client_1.AccountType.ASSET,
            currency: 'NGN',
            description: 'Asset account holding funds currently processed by Paystack gateway prior to bank settlement',
        },
        {
            name: 'PLATFORM_FEE_INCOME',
            type: client_1.AccountType.INCOME,
            currency: 'NGN',
            description: 'Revenue earned from withdrawal transaction fees',
        },
        {
            name: 'PAYSTACK_FEE_EXPENSE',
            type: client_1.AccountType.EXPENSE,
            currency: 'NGN',
            description: 'Expense account for charges deducted by Paystack on user deposits',
        },
        {
            name: 'SYSTEM_EQUITY',
            type: client_1.AccountType.EQUITY,
            currency: 'NGN',
            description: 'System equity and reserves account',
        },
    ];
    for (const account of systemAccounts) {
        const existing = await prisma.ledgerAccount.findUnique({
            where: { name: account.name },
        });
        if (!existing) {
            await prisma.ledgerAccount.create({
                data: account,
            });
            console.log(`✅ Created System Ledger Account: ${account.name} [${account.type}]`);
        }
        else {
            console.log(`ℹ️ System Ledger Account exists: ${account.name}`);
        }
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
