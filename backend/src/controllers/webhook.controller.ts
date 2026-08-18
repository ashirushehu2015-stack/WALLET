import { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';

export class WebhookController {
  static async handlePaystack(req: Request, res: Response) {
    try {
      const payload = req.body;
      const result = await WebhookService.handleWebhook(payload);
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      // Always return 200 to Paystack with error logged so they don't disable webhook unless server crash
      return res.status(200).json({ success: false, message: error.message });
    }
  }
}
