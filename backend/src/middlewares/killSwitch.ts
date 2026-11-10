import { Request, Response, NextFunction } from 'express';
import { KillSwitchService } from '../services/kill-switch.service';

/**
 * Emergency Kill Switch Middleware
 *
 * When active:
 * - Blocks new customer financial transactions (deposits, transfers, withdrawals, VAS purchases).
 * - Permitted essential operational paths:
 *   1. Gateway webhooks (/api/v1/webhooks/*) -> MUST continue ingestion to prevent loss of provider receipts.
 *   2. Administrative APIs (/api/v1/admin/*) -> Required for investigation, reconciliation, and switch management.
 *   3. System health checks (/health) -> Container orchestrator uptime monitoring.
 *   4. Read-only balance & transaction queries (GET /api/v1/wallet/*) -> Informational for customers.
 */
export function killSwitchGuard(req: Request, res: Response, next: NextFunction) {
  if (!KillSwitchService.isActive()) {
    return next();
  }

  const url = req.originalUrl || req.url;

  // 1. Always permit webhooks (Paystack, VTpass)
  if (url.includes('/webhooks')) {
    return next();
  }

  // 2. Always permit system health check
  if (url === '/health' || url === '/healthz') {
    return next();
  }

  // 3. Always permit administrative portal & operations
  if (url.includes('/api/v1/admin')) {
    return next();
  }

  // 4. Permit read-only queries (GET) with informational header
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    res.setHeader('X-Emergency-Suspension', 'ACTIVE');
    return next();
  }

  // 5. Block all customer-initiated financial mutations (POST, PUT, DELETE, PATCH)
  return res.status(503).json({
    success: false,
    error: 'Emergency Transaction Suspension Active',
    code: 'KILL_SWITCH_ACTIVE',
    message: 'Financial transactions are temporarily suspended for emergency risk management. Existing wallet balances and pending reconciliations are preserved. Inbound gateway webhooks remain operational.',
    details: {
      timestamp: new Date().toISOString(),
      action: 'SUSPENDED_BY_OPERATOR',
    },
  });
}
