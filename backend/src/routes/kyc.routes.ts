import { Router } from 'express';
import { KYCController } from '../controllers/kyc.controller';
import { authenticateJWT } from '../middlewares/auth';
import { enforceIdempotency } from '../middlewares/idempotency';

const router = Router();

// All customer KYC endpoints require JWT authentication
router.use(authenticateJWT);

router.post('/submit', enforceIdempotency, KYCController.submitKYC);
router.get('/status', KYCController.getKYCStatus);

export default router;
