import crypto from 'crypto';
import { PAYSTACK_CONFIG } from '../config/paystack';

export function verifyPaystackSignature(payload: string, signature: string): boolean {
  if (!signature || !PAYSTACK_CONFIG.WEBHOOK_SECRET) return false;
  const hash = crypto
    .createHmac('sha512', PAYSTACK_CONFIG.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export function generateReference(prefix: string = 'TX'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateWalletNumber(): string {
  const prefix = '10';
  const randomDigit = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${prefix}${randomDigit}`;
}
