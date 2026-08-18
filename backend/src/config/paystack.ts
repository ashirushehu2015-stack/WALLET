import dotenv from 'dotenv';
dotenv.config();

export const PAYSTACK_CONFIG = {
  SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
  WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '',
  BASE_URL: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
};
