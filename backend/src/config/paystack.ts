import dotenv from 'dotenv';
dotenv.config();

export const PAYSTACK_CONFIG = {
  get SECRET_KEY() {
    return process.env.PAYSTACK_SECRET_KEY || '';
  },
  get PUBLIC_KEY() {
    return process.env.PAYSTACK_PUBLIC_KEY || '';
  },
  get WEBHOOK_SECRET() {
    return process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';
  },
  get BASE_URL() {
    return process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  },
};
