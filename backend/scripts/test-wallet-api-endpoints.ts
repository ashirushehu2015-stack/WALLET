import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { WalletController } from '../src/controllers/wallet.controller';

const prisma = new PrismaClient();

async function testWalletApiEndpoints() {
  console.log('=====================================================================');
  console.log('🧪 TESTING USER-FACING WALLET API ENDPOINTS');
  console.log('=====================================================================\n');

  // Find a test user
  const user = await prisma.user.findFirst({
    include: { walletAccount: true },
  });

  if (!user) {
    console.error('No user found in database for testing.');
    return;
  }

  const mockReq = (params: any = {}, body: any = {}, query: any = {}, headers: any = {}) => ({
    user: { id: user.id, email: user.email, role: user.role },
    params,
    body,
    query,
    headers,
  });

  const createMockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // -------------------------------------------------------------------
  // 1. TEST GET /api/v1/wallet/balance
  // -------------------------------------------------------------------
  console.log('---------------------------------------------------------------------');
  console.log('📌 1. GET /api/v1/wallet/balance');
  console.log('---------------------------------------------------------------------');

  const balanceReq = mockReq();
  const balanceRes = createMockRes();
  await WalletController.getBalance(balanceReq as any, balanceRes as any);

  console.log(`Status Code: ${balanceRes.statusCode || 200}`);
  console.log('Response Body:\n', JSON.stringify(balanceRes.body, null, 2));

  // -------------------------------------------------------------------
  // 2. TEST GET /api/v1/wallet/transactions
  // -------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------------');
  console.log('📌 2. GET /api/v1/wallet/transactions (Pagination & Filters)');
  console.log('---------------------------------------------------------------------');

  const txReq = mockReq({}, {}, { page: '1', limit: '5' });
  const txRes = createMockRes();
  await WalletController.getTransactions(txReq as any, txRes as any);

  console.log(`Status Code: ${txRes.statusCode || 200}`);
  console.log('Response Body:\n', JSON.stringify(txRes.body, null, 2));

  // -------------------------------------------------------------------
  // 3. TEST POST /api/v1/wallet/withdraw
  // -------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------------');
  console.log('📌 3. POST /api/v1/wallet/withdraw');
  console.log('---------------------------------------------------------------------');

  const withdrawReq = mockReq(
    {},
    {
      amount: 1000.0,
      bankName: 'Guaranty Trust Bank',
      accountNumber: '0123456789',
      accountName: 'API Test User',
      bankCode: '058',
    },
    {},
    { 'x-idempotency-key': `IDEM_API_WTH_${Date.now()}` }
  );
  const withdrawRes = createMockRes();
  await WalletController.withdraw(withdrawReq as any, withdrawRes as any);

  console.log(`Status Code: ${withdrawRes.statusCode || 200}`);
  console.log('Response Body:\n', JSON.stringify(withdrawRes.body, null, 2));
  console.log('=====================================================================\n');
}

testWalletApiEndpoints()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
