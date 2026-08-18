import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticateJWT } from '../middlewares/auth';
import { enforceIdempotency } from '../middlewares/idempotency';

const router = Router();

router.use(authenticateJWT);

router.get('/balance', WalletController.getBalance);
router.get('/transactions', WalletController.getTransactions);
router.post('/transfer', enforceIdempotency, WalletController.transfer);
router.post('/withdraw', enforceIdempotency, WalletController.withdraw);

export default router;
