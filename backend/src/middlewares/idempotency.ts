import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { checkIdempotency, saveIdempotency } from '../utils/idempotency';

export async function enforceIdempotency(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: 'x-idempotency-key header is required for state-changing monetary requests.',
    });
  }

  try {
    const cached = await checkIdempotency(idempotencyKey);
    if (cached) {
      return res.status(cached.responseStatus).json(cached.responseBody);
    }

    // Intercept res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      saveIdempotency(
        idempotencyKey,
        req.user?.id || null,
        req.originalUrl,
        res.statusCode,
        body
      ).catch((err) => console.error('Failed to save idempotency key:', err));
      return originalJson(body);
    };

    next();
  } catch (error) {
    next(error);
  }
}
