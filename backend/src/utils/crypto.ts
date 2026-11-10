import crypto from 'crypto';
import { PAYSTACK_CONFIG } from '../config/paystack';

export function verifyPaystackSignature(payload: string, signature: string): boolean {
  try {
    if (!signature || typeof signature !== 'string' || !PAYSTACK_CONFIG.WEBHOOK_SECRET) {
      return false;
    }

    const trimmedSignature = signature.trim().toLowerCase();

    // Paystack x-paystack-signature is an HMAC-SHA512 hex digest (exactly 128 hex chars)
    if (!/^[a-f0-9]{128}$/.test(trimmedSignature)) {
      return false;
    }

    const expectedHash = crypto
      .createHmac('sha512', PAYSTACK_CONFIG.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex')
      .toLowerCase();

    const expectedBuffer = Buffer.from(expectedHash, 'utf8');
    const signatureBuffer = Buffer.from(trimmedSignature, 'utf8');

    // Strict buffer length check before crypto.timingSafeEqual to prevent RangeError
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch {
    // Safely swallow any crypto or decoding error without throwing unhandled exception
    return false;
  }
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
