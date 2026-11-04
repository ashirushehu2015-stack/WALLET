import { Router } from 'express';
import { VASController } from './vas.controller';
import { authenticateJWT } from '../../middlewares/auth';
import { enforceIdempotency } from '../../middlewares/idempotency';

const router = Router();

// All customer VAS endpoints require JWT authentication
router.use(authenticateJWT);

// Discovery & Catalogue
router.get('/networks', VASController.getNetworks);
router.get('/data/plans/:network', VASController.getDataPlans);

// Quotes
router.post('/airtime/quote', VASController.quoteAirtime);
router.post('/data/quote', VASController.quoteData);

// State-changing purchases (protected by Idempotency keys)
router.post('/airtime/purchase', enforceIdempotency, VASController.purchaseAirtime);
router.post('/data/purchase', enforceIdempotency, VASController.purchaseData);

// Transaction History & Receipts
router.get('/transactions', VASController.getTransactions);
router.get('/transactions/:reference', VASController.getTransactionByReference);
router.post('/transactions/:reference/requery', VASController.requeryTransaction);

// Security: Transaction PIN configuration
router.post('/pin/set', VASController.setTransactionPin);

export default router;
