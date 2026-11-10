import cors from 'cors';
import { logger } from './logger';

export function getCorsOptions(): cors.CorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Production authorized domains
  const defaultProductionOrigins = [
    'https://app.mangapay.ng',
    'https://admin.mangapay.ng',
    'https://portal.mangapay.ng',
  ];

  // 2. Development & Test localhost domains
  const developmentOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  // 3. User-configured environment origins (e.g. CORS_ALLOWED_ORIGINS="https://app.mangapay.ng,https://admin.mangapay.ng")
  const customOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const allowlist: string[] = isProduction
    ? (customOrigins.length > 0 ? customOrigins : defaultProductionOrigins)
    : [...defaultProductionOrigins, ...developmentOrigins, ...customOrigins];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow non-browser requests (native mobile apps, server-to-server webhooks, CLI tools) with no origin header
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin matches allowlist
      if (allowlist.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS Rejected: Unauthorized origin attempted connection: ${origin}`);
      const error = new Error(`CORS Policy Violation: Origin ${origin} is not authorized.`);
      (error as any).status = 403;
      return callback(error);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-idempotency-key',
      'x-paystack-signature',
    ],
    credentials: true,
    maxAge: 86400, // 24-hour preflight cache
  };
}
