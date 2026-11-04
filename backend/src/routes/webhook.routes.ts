import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { VASWebhookController } from '../modules/vas/webhooks/vas.webhook.controller';
import { verifyPaystackWebhookHeader } from '../middlewares/webhookVerify';

const router = Router();

router.post('/paystack', verifyPaystackWebhookHeader, WebhookController.handlePaystack);
router.post('/vtpass', VASWebhookController.handleVTPassCallback);

export default router;
