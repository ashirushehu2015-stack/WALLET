import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = Router();

// Secure admin routes
router.use(authenticateJWT, requireAdmin);

router.get('/metrics', AdminController.getOverviewMetrics);
router.get('/ledger-accounts', AdminController.getLedgerAccounts);
router.get('/journal-entries', AdminController.getJournalEntries);
router.get('/webhooks', AdminController.getWebhooks);
router.post('/reconcile', AdminController.triggerReconciliation);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
