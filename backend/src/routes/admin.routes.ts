import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { VASAdminController } from '../modules/vas/vas.admin.controller';
import { authenticateJWT, requireAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = Router();

// Secure admin routes
router.use(authenticateJWT, requireAdmin);

router.get('/metrics', AdminController.getOverviewMetrics);
router.get('/ledger-accounts', AdminController.getLedgerAccounts);
router.get('/journal-entries', AdminController.getJournalEntries);
router.get('/webhooks', AdminController.getWebhooks);
router.post('/reconcile', AdminController.triggerReconciliation);
router.get('/audit-logs', AdminController.getAuditLogs);

// Deposit Suspense & Dual-Approval Refund Administration
router.get('/deposits/suspense', AdminController.getSuspenseDeposits);
router.post('/deposits/:id/refund-request', AdminController.submitRefundRequest);
router.get('/refunds/requests', AdminController.getRefundRequests);
router.post('/refunds/:requestId/approve', requireSuperAdmin, AdminController.approveRefundRequest);
router.post('/refunds/:requestId/reject', AdminController.rejectRefundRequest);
router.post('/refunds/:requestId/cancel', AdminController.cancelRefundRequest);
router.post('/deposits/:id/refund', AdminController.processDepositRefund);

// KYC Compliance Administration
router.get('/kyc/queue', AdminController.getKYCQueue);
router.post('/kyc/:id/review', AdminController.reviewKYC);

// VAS Administration Routes
router.get('/vas/dashboard', VASAdminController.getVasDashboardMetrics);
router.get('/vas/transactions', VASAdminController.getVasTransactions);
router.post('/vas/products/sync', VASAdminController.syncProducts);
router.post('/vas/refund', VASAdminController.processRefund);
router.get('/vas/providers', VASAdminController.getVasProviders);

// Emergency Kill Switch Administration
router.get('/emergency/kill-switch', AdminController.getKillSwitchStatus);
router.post('/emergency/kill-switch/activate', requireSuperAdmin, AdminController.activateKillSwitch);
router.post('/emergency/kill-switch/deactivate', requireSuperAdmin, AdminController.deactivateKillSwitch);

export default router;
