import { Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookStatus } from '@prisma/client';
import { prisma } from '../../../config/db';
import { logger } from '../../../config/logger';
import { VASTransactionService } from '../services/vas.transaction.service';

export class VASWebhookController {
  /**
   * POST /api/v1/webhooks/vtpass
   */
  static async handleVTPassCallback(req: Request, res: Response) {
    const payload = req.body;
    logger.info('Received VTpass webhook notification:', JSON.stringify(payload));

    const requestId = payload.request_id || payload.content?.transactions?.requestId || payload.data?.request_id;
    if (!requestId) {
      return res.status(200).json({ status: 'IGNORED', message: 'Missing request_id' });
    }

    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    // 1. Webhook Deduplication
    const existing = await prisma.vASWebhookEvent.findUnique({
      where: { eventReference: requestId },
    });

    if (existing && existing.processingStatus === WebhookStatus.PROCESSED) {
      logger.info(`VTpass webhook for [${requestId}] already processed.`);
      return res.status(200).json({ status: 'IGNORED', message: 'Duplicate event' });
    }

    await prisma.vASWebhookEvent.upsert({
      where: { eventReference: requestId },
      update: { payload, payloadHash },
      create: {
        providerName: 'VTPASS',
        eventReference: requestId,
        eventType: payload.type || 'TRANSACTION_STATUS',
        payloadHash,
        payload,
        processingStatus: WebhookStatus.RECEIVED,
      },
    });

    try {
      // 2. Requery & reconcile transaction based on authoritative state
      await VASTransactionService.requeryTransaction(requestId);

      await prisma.vASWebhookEvent.update({
        where: { eventReference: requestId },
        data: {
          processingStatus: WebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      return res.status(200).json({ status: 'SUCCESS' });
    } catch (err: any) {
      logger.error(`Error processing VTpass webhook [${requestId}]:`, err.message);
      await prisma.vASWebhookEvent.update({
        where: { eventReference: requestId },
        data: {
          processingStatus: WebhookStatus.FAILED,
          errorMessage: err.message,
        },
      });
      return res.status(200).json({ status: 'ERROR', message: err.message });
    }
  }
}
