# MANGAPAY — MVP REMEDIATION AND ENGINEERING ROADMAP

**Document Version:** 1.0.0  
**Audit Date:** November 9, 2026  
**Engineering Strategy:** Minimal, Surgical Remediation of Existing Codebase for Safe MVP Launch  
**Target Repository:** `ashirushehu2015-stack/WALLET`  

---

## 1. REMEDIATION PHILOSOPHY & OBJECTIVES

The objective of this engineering roadmap is to **harden, correct, and complete the existing MangaPay codebase** without undertaking unnecessary rewrites. Every task is specifically scoped to resolve identified security vulnerabilities, eliminate financial leakage risks, ensure compliance with provider requirements, and establish live operational visibility for operators.

---

## 2. PHASED ENGINEERING ROADMAP

```
+---------------------------------------------------------------------------------------------------+
| PHASE 1: CRITICAL SECURITY & FINANCIAL-INTEGRITY FIXES (Sprint 1: Days 1 - 5)                     |
| Focus: Eliminate critical vulnerabilities, unhandled crashes, and gateway error masking.          |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 2: PAYSTACK & VTPASS INTEGRATION HARDENING (Sprint 2: Days 6 - 12)                          |
| Focus: Real settlement reconciliation, float management, live keys, and fail-safe requeries.      |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 3: CUSTOMER PORTAL & WALLET EXPERIENCE COMPLETION (Sprint 3: Days 13 - 18)                  |
| Focus: Disable simulated features, mandate PIN setup, enforce KYC tier checks, desktop VAS parity.|
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 4: ADMINISTRATIVE DASHBOARD & REPORTING COMPLETION (Sprint 4: Days 19 - 24)                 |
| Focus: Admin authentication view, Bearer token attachment, remove mock fallbacks, live telemetry. |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| PHASE 5: CONTROLLED PILOT, TESTING & PRODUCTION MONITORING (Sprint 5: Days 25 - 30)               |
| Focus: CI/CD test automation, Redis worker queues, Winston cloud logging, and pilot deployment.   |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. DETAILED TASK SPECIFICATIONS

### PHASE 1: CRITICAL SECURITY & FINANCIAL-INTEGRITY FIXES

#### Task 1.1: Eliminate Public Admin Role Escalation
- **Priority:** CRITICAL 🔴
- **Estimated Complexity:** Low (1-2 Hours)
- **Affected Files:** [`backend/src/controllers/auth.controller.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L34)
- **Dependencies:** None
- **Acceptance Criteria:**
  - The `role` property in `req.body` is completely ignored during public registration.
  - Every user created via `POST /api/v1/auth/register` is strictly assigned `role: 'USER'`.
  - Admin accounts can only be provisioned via a dedicated, protected command-line seeding script or super-admin invitation.
- **Testing Requirements:** Send registration payload with `{"email": "...", "password": "...", "role": "ADMIN"}`. Verify that the created user's role in the database is strictly `USER`.

#### Task 1.2: Remove Gateway Error Masking in Paystack Payout Service
- **Priority:** CRITICAL 🔴
- **Estimated Complexity:** Low (2-3 Hours)
- **Affected Files:** [`backend/src/services/paystack.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L45-L96), [`backend/src/services/wallet.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L411-L424)
- **Dependencies:** None
- **Acceptance Criteria:**
  - `PaystackService.initiateTransfer` and `createTransferRecipient` must rethrow external API errors instead of returning synthetic success objects (`TRF_...` or `RCP_...`).
  - In `WalletService.requestWithdrawal`, the `catch` block must intercept the rethrown error, update the `Withdrawal` status to `FAILED`, update the `Transaction` status to `FAILED`, and release the pending balance hold immediately.
- **Testing Requirements:** Simulate a rejected Paystack transfer (e.g. invalid bank code). Verify that `Withdrawal` is marked `FAILED` and available balance is immediately restored.

#### Task 1.3: Fix Webhook Signature Buffer Length Mismatch Crash
- **Priority:** HIGH 🟠
- **Estimated Complexity:** Low (1 Hour)
- **Affected Files:** [`backend/src/utils/crypto.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/utils/crypto.ts#L4-L11), [`backend/src/middlewares/webhookVerify.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/middlewares/webhookVerify.ts)
- **Dependencies:** None
- **Acceptance Criteria:**
  - `verifyPaystackSignature` checks that `Buffer.from(hash).length === Buffer.from(signature).length` before calling `crypto.timingSafeEqual`.
  - Mismatched signature lengths return `false` cleanly without throwing an unhandled `RangeError`.
  - `verifyPaystackWebhookHeader` rejects malformed signatures with HTTP 401 instead of crashing with HTTP 500.
- **Testing Requirements:** Send a webhook request with header `x-paystack-signature: short`. Verify that the endpoint returns HTTP 401 with `{ "success": false, "message": "Invalid Paystack HMAC signature" }`.

#### Task 1.4: Eliminate Fallback Transaction PIN of 1234
- **Priority:** HIGH 🟠
- **Estimated Complexity:** Low (2 Hours)
- **Affected Files:** [`backend/src/modules/vas/services/vas.transaction.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L41-L48)
- **Dependencies:** None
- **Acceptance Criteria:**
  - `verifyUserPin` returns `false` if `user.transactionPinHash` is null or undefined.
  - Transactions submitted without an established PIN return an explicit error: `"Transaction PIN has not been set. Please configure your 4-digit PIN before proceeding."`
- **Testing Requirements:** Attempt airtime purchase on a new account that has not set a PIN. Verify that submitting `'1234'` is rejected.

---

### PHASE 2: PAYSTACK & VTPASS INTEGRATION HARDENING

#### Task 2.1: Connect Live Paystack Balance to Reconciliation Service
- **Priority:** CRITICAL 🔴
- **Estimated Complexity:** Medium (4-6 Hours)
- **Affected Files:** [`backend/src/services/reconciliation.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts#L88-L95), [`backend/src/services/paystack.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts)
- **Dependencies:** Task 1.2
- **Acceptance Criteria:**
  - Implement `PaystackService.getAccountBalance()` calling `GET https://api.paystack.co/balance`.
  - `ReconciliationService.runReconciliation` compares live Paystack ledger balance against `PAYSTACK_CLEARING_ASSET` in the database.
  - True settlement discrepancies are calculated and recorded in `reconciliation_records.discrepancyAmount`.
- **Testing Requirements:** Run `ReconciliationService.runReconciliation()`. Verify that `totalPaystackDeposits` reflects independent gateway data.

#### Task 2.2: Configure Production Environment Variables & Key Validation
- **Priority:** HIGH 🟠
- **Estimated Complexity:** Low (2 Hours)
- **Affected Files:** [`backend/src/server.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/server.ts), [`backend/src/config/paystack.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/config/paystack.ts), [`backend/src/modules/vas/providers/vtpass.provider.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/providers/vtpass.provider.ts)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Backend performs startup validation on `DATABASE_URL`, `JWT_SECRET`, `PAYSTACK_SECRET_KEY`, and `VTPASS_API_KEY`.
  - If `JWT_SECRET` is missing or equals `'secret'` in `production`, the process refuses to boot.
- **Testing Requirements:** Start server with `NODE_ENV=production` and missing `JWT_SECRET`. Verify process exits with clear configuration error.

---

### PHASE 3: CUSTOMER PORTAL & WALLET EXPERIENCE COMPLETION

#### Task 3.1: Enforce Central Bank of Nigeria (CBN) Tier Limits
- **Priority:** HIGH 🟠
- **Estimated Complexity:** Medium (4 Hours)
- **Affected Files:** [`backend/src/services/wallet.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts), [`backend/src/services/kyc.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts)
- **Dependencies:** None
- **Acceptance Criteria:**
  - `WalletService.transferFunds` checks sender's KYC tier and blocks transfers exceeding `maxDailyTransfer`.
  - `WalletService.requestWithdrawal` blocks withdrawals exceeding single-transaction limits.
  - Deposits exceeding tier balance limits are flagged for Tier upgrade.
- **Testing Requirements:** Set user to `TIER_1` (limit ₦50,000 single deposit, ₦300,000 max balance). Attempt a ₦400,000 transfer. Verify transaction is blocked with descriptive limit error.

#### Task 3.2: Disable Simulated Features in Customer PWA
- **Priority:** MEDIUM 🟡
- **Estimated Complexity:** Low (2 Hours)
- **Affected Files:** [`mangapay-antigravity/mangapay-for-antigravity/src/App.tsx`](file:///c:/Users/pc/Desktop/WALLET/mangapay-antigravity/mangapay-for-antigravity/src/App.tsx), [`mangapay-antigravity/mangapay-for-antigravity/src/screens/HomeScreen.tsx`](file:///c:/Users/pc/Desktop/WALLET/mangapay-antigravity/mangapay-for-antigravity/src/screens/HomeScreen.tsx)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Remove/hide the Virtual Cards trigger and modal from the consumer PWA.
  - Remove the Agency Banking entry point from the consumer PWA.
  - Customers see only fully operational capabilities: DVA Funding, P2P Transfers, Bank Withdrawals, and Telecom Airtime/Data.
- **Testing Requirements:** Inspect HomeScreen and Services sheet on mobile PWA. Confirm Virtual Cards and Agent App links are absent.

#### Task 3.3: Backport Airtime & Data UI to Desktop Customer Portal
- **Priority:** MEDIUM 🟡
- **Estimated Complexity:** Medium (6-8 Hours)
- **Affected Files:** [`customer-portal/src/pages/Dashboard.tsx`](file:///c:/Users/pc/Desktop/WALLET/customer-portal/src/pages/Dashboard.tsx), [`customer-portal/src/services/api.ts`](file:///c:/Users/pc/Desktop/WALLET/customer-portal/src/services/api.ts)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Add "Buy Airtime" and "Buy Data" modals to the desktop web portal.
  - Connect to existing `/api/v1/vas/networks`, `/api/v1/vas/data/plans/:network`, and purchase endpoints.
  - Add digital receipt modal on successful recharge.
- **Testing Requirements:** Execute airtime recharge from desktop portal. Confirm wallet balance updates and receipt displays.

---

### PHASE 4: ADMINISTRATIVE DASHBOARD & REPORTING COMPLETION

#### Task 4.1: Implement Admin Authentication & Request Interceptor
- **Priority:** CRITICAL 🔴
- **Estimated Complexity:** Medium (4-6 Hours)
- **Affected Files:** [`admin-dashboard/src/services/api.ts`](file:///c:/Users/pc/Desktop/WALLET/admin-dashboard/src/services/api.ts), [`admin-dashboard/src/App.tsx`](file:///c:/Users/pc/Desktop/WALLET/admin-dashboard/src/App.tsx)
- **Dependencies:** Task 1.1
- **Acceptance Criteria:**
  - Create `AdminLogin.tsx` view requiring admin credentials.
  - Store admin JWT in `sessionStorage`.
  - Add Axios request interceptor attaching `Authorization: Bearer <token>`.
  - Remove all silent `catch { return <MOCK DATA>; }` fallbacks in `adminApi`.
  - In case of API failure, display an explicit error alert instead of synthetic mock numbers.
- **Testing Requirements:** Log in as verified Admin. Confirm that `/metrics`, `/ledger-accounts`, and `/vas/dashboard` render live data from the database.

---

### PHASE 5: CONTROLLED PILOT, TESTING & PRODUCTION MONITORING

#### Task 5.1: Automated CI Test Suite Integration
- **Priority:** HIGH 🟠
- **Estimated Complexity:** Medium (6-8 Hours)
- **Affected Files:** [`backend/package.json`](file:///c:/Users/pc/Desktop/WALLET/backend/package.json)
- **Dependencies:** Tasks 1.1 - 4.1
- **Acceptance Criteria:**
  - Install Jest and Supertest in `backend/package.json`.
  - Add `"test": "jest --detectOpenHandles --forceExit"` to scripts.
  - Migrate standalone test scripts (`test-vas-unit.ts`, `test-engine-solidness.ts`) to standard automated test suites.
  - Achieve $100\%$ pass rate on CI/CD pipelines.
- **Testing Requirements:** Run `npm test` in `backend/`. Confirm all tests execute and pass cleanly.

#### Task 5.2: Redis / BullMQ Asynchronous Task Runner
- **Priority:** MEDIUM 🟡
- **Estimated Complexity:** High (12-16 Hours)
- **Affected Files:** [`backend/src/services/webhook.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/webhook.service.ts), [`backend/src/modules/vas/webhooks/vas.webhook.controller.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/webhooks/vas.webhook.controller.ts)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Webhook endpoints immediately acknowledge receipts with HTTP 200 and push jobs to a BullMQ queue.
  - Background workers process ledger postings, requeries, and reconciliation asynchronously.
- **Testing Requirements:** Simulate 100 concurrent webhook requests. Confirm zero HTTP timeouts and complete asynchronous processing.

---

## 4. ESTIMATED TIMELINE & SPRINT ALLOCATION

| Sprint | Phase Focus | Key Deliverables | Estimated Duration | Target Exit Milestone |
| :-: | :--- | :--- | :-: | :--- |
| **Sprint 1** | Phase 1: Security & Integrity | Public role fix, payout fail-fast, webhook buffer guard, PIN mandate | 5 Working Days | **Internal Testing Alpha** |
| **Sprint 2** | Phase 2: Gateway Hardening | Live settlement recon, key startup guards, Paystack live config | 5 Working Days | **Pre-Pilot Integration** |
| **Sprint 3** | Phase 3: Client Experience | Disable mocks (cards/agent), CBN tier limits, desktop VAS parity | 5 Working Days | **Client Feature Complete** |
| **Sprint 4** | Phase 4: Admin Observability | Admin login view, Bearer token interceptor, live operations UI | 5 Working Days | **Operations Readiness** |
| **Sprint 5** | Phase 5: CI/CD & Controlled Pilot | Automated test suite, background queues, pilot deployment | 6 Working Days | **Controlled Pilot Launch** |

---

*Roadmap certified by Senior FinTech Software Architect.*
