import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { verifyPaystackWebhookHeader } from '../middlewares/webhookVerify';

const router = Router();

router.post('/paystack', verifyPaystackWebhookHeader, WebhookController.handlePaystack);

export default router;
