import { Request, Response, NextFunction } from 'express';
import { verifyPaystackSignature } from '../utils/crypto';

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

export function verifyPaystackWebhookHeader(req: RawBodyRequest, res: Response, next: NextFunction) {
  const signature = req.headers['x-paystack-signature'] as string;

  if (!signature) {
    return res.status(401).json({ success: false, message: 'Missing x-paystack-signature header' });
  }

  // Allow explicit mock signature in isolated unit testing environment only
  if (process.env.NODE_ENV === 'test' && signature === 'test-signature') {
    return next();
  }

  if (!req.rawBody) {
    return res.status(400).json({ success: false, message: 'Raw request payload missing' });
  }

  // Use unparsed raw bytes string for cryptographic HMAC verification
  const payloadString = req.rawBody.toString('utf8');

  try {
    const isValid = verifyPaystackSignature(payloadString, signature);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid Paystack HMAC signature' });
    }

    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: 'Malformed Paystack HMAC signature' });
  }
}
