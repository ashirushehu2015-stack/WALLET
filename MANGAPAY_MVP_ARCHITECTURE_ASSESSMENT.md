# MANGAPAY — MVP ARCHITECTURE AND PRODUCTION READINESS ASSESSMENT

**Document Version:** 1.0.0  
**Audit Date:** November 9, 2026  
**Auditor Profile:** Senior FinTech Software Architect, Backend Engineer, Financial Systems Auditor & Cybersecurity Specialist  
**Target Repository:** `ashirushehu2015-stack/WALLET`  
**Git Revision Evaluated:** Commit `b68981b7903d2d67ced8d17244bf44e761806c1c` (`b68981b`)  
**Assessment Scope:** Minimum Viable Product (MVP) Readiness, Technology Platform Architecture, Paystack & VTpass Integrations  

---

## 1. EXECUTIVE SUMMARY

MangaPay is structured as a financial technology platform designed to operate under a registered Nigerian Business Name (*Manga Business Digital Solutions*). The platform’s commercial objective is to provide a unified software suite, digital wallet interface, accounting ledger, and value-added telecommunications service engine, utilizing **Paystack** for Dedicated Virtual Account (DVA) funding and bank payouts, alongside **VTpass** for wholesale telecommunication airtime and mobile data bundles.

This assessment evaluated whether the current codebase is technically, operationally, and architecturally ready for an initial Minimum Viable Product (MVP) launch.

### Key Assessment Conclusions:
1. **Core Accounting Engine is Mathematically Sound:** The core double-entry general ledger ([`LedgerService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/ledger.service.ts)) and PostgreSQL row-locking concurrency model (`SELECT ... FOR UPDATE` in [`WalletService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts)) are well-constructed. They enforce the accounting invariant $\sum \text{Debits} = \sum \text{Credits}$ and effectively prevent concurrent balance overspending.
2. **VAS Telecom Module is Operationally Complete:** Value-Added Services (Phases 1 through 7) are fully implemented for MTN, Airtel, Glo, and 9mobile, backed by server-side authoritative pricing quotes and compensating refund mechanisms.
3. **Critical Defects Prevent Production MVP:** Several high-severity vulnerabilities and integration flaws exist in the current commit:
   - **Public Role Escalation:** Public user registration accepts `"role": "ADMIN"`.
   - **Payment Gateway Error Masking:** Payout transfer failures at Paystack return synthetic mock success objects (`TRF_...`).
   - **Disconnected Admin Dashboard:** Admin frontend sends unauthenticated requests, receives HTTP 401, and falls back to hardcoded mock numbers.
   - **Self-Referencing Reconciliation:** The reconciliation engine copies local database deposit figures into Paystack audit columns without querying the Paystack settlement API.
   - **Unenforced KYC Limits:** Regulatory tier limits are defined in code but completely omitted during transaction execution.
   - **Simulated Frontend Modules:** Virtual Cards and Agency Banking exist solely as local client-side prototypes without backend persistence.
4. **Regulatory & Operating Reality:** Operating under a Business Name means MangaPay provides *technology and transaction management*. It cannot legally hold customer deposits or issue stored-value electronic money without operating under the regulatory umbrella of a licensed partner institution (e.g., Paystack’s licensed banking partners or a licensed Microfinance Bank/Mobile Money Operator).

**Executive Decision:** **NOT READY FOR MVP** in its present state. Upon completing Priority 1 remediation, the platform advances to **READY FOR INTERNAL TESTING ONLY**, and upon formalizing provider custodial approvals, advances to a **CONTROLLED PILOT**.

---

## 2. BASELINE AUDIT VERIFICATION

Every defect identified in the previous forensic audit ([`MANGAPAY_PHASE_1_FINANCIAL_INTEGRITY_AUDIT.md`](file:///c:/Users/pc/Desktop/WALLET/MANGAPAY_PHASE_1_FINANCIAL_INTEGRITY_AUDIT.md)) was re-evaluated against the current source code at revision `b68981b`:

| # | Previous Audit Finding | File & Function Inspected | Current Code State | Classification Status |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Public registration permits ADMIN role escalation** | [`backend/src/controllers/auth.controller.ts:34`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L34) | `role: role === 'ADMIN' ? 'ADMIN' : 'USER'` | **Confirmed and unresolved** |
| **2** | **Paystack transfer failure returns fabricated success** | [`backend/src/services/paystack.service.ts:89-96`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L89-L96) | `catch (error) { return { transfer_code: 'TRF_...', status: 'success' } }` | **Confirmed and unresolved** |
| **3** | **Admin dashboard falls back to mock data** | [`admin-dashboard/src/services/api.ts:14-65`](file:///c:/Users/pc/Desktop/WALLET/admin-dashboard/src/services/api.ts#L14-L65) | Axios lacks auth headers; all endpoints catch 401 and return mock objects | **Confirmed and unresolved** |
| **4** | **Reconciliation compares internal values to internal values** | [`backend/src/services/reconciliation.service.ts:88-91`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts#L88-L91) | `totalPaystackDeposits: totalDeposits` (copied from local deposit table) | **Confirmed and unresolved** |
| **5** | **KYC tier restrictions not enforced in transactions** | [`backend/src/services/kyc.service.ts:44-55`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts#L44-L55) | `getTierLimits()` defined but never invoked in `wallet.service.ts` | **Confirmed and unresolved** |
| **6** | **Webhook signature fails on buffer length mismatch** | [`backend/src/utils/crypto.ts:10`](file:///c:/Users/pc/Desktop/WALLET/backend/src/utils/crypto.ts#L10) | `crypto.timingSafeEqual` called without length guard; throws unhandled `RangeError` | **Confirmed and unresolved** |
| **7** | **Default transaction PIN of 1234 exists** | [`backend/src/modules/vas/services/vas.transaction.service.ts:47`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L47) | `return pin === '1234'` fallback if `user.transactionPinHash` is null | **Confirmed and unresolved** |
| **8** | **Idempotency permits concurrent duplicate requests** | [`backend/src/middlewares/idempotency.ts:23-32`](file:///c:/Users/pc/Desktop/WALLET/backend/src/middlewares/idempotency.ts#L23-L32) | Keys are written to DB in `res.json` interceptor *after* operation completes | **Confirmed and unresolved** |
| **9** | **Calculations use JavaScript floating-point casting** | [`backend/src/services/ledger.service.ts:37-40`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/ledger.service.ts#L37-L40) | `Number(posting.amount)` casts arbitrary precision Decimal to IEEE-754 float | **Confirmed and unresolved** |
| **10**| **Paystack settlement reconciliation missing** | [`backend/src/services/reconciliation.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts) | No Paystack Balance or Settlement API integration exists | **Confirmed and unresolved** |

---

## 3. APPLICATION ARCHITECTURE ASSESSMENT

### 3.1 Component Architecture Overview
MangaPay is structured as a monorepo comprising four distinct application tiers:
1. **Core Backend Engine (`backend/`):** Node.js / Express service providing RESTful endpoints, double-entry ledger logic, Paystack webhook ingestion, and VTpass VAS transaction management.
2. **Customer Desktop Portal (`customer-portal/`):** React 18 / Vite SPA for web-based account overview, DVA display, P2P transfers, and bank withdrawals.
3. **Customer Mobile PWA (`mangapay-antigravity/`):** Progressive Web App with mobile onboarding flow (7 screens), biometric/PIN authentication, airtime/data purchase sheets, digital receipts, and client prototypes.
4. **Admin Management Dashboard (`admin-dashboard/`):** Glassmorphic React SPA designed for system telemetry, ledger monitoring, webhook logs, reconciliation triggers, and VAS refund management.

```
+---------------------------------------------------------------------------------------------------+
|                                          CLIENTS & PORTS                                          |
|  +------------------------------+  +------------------------------+  +-------------------------+  |
|  | Customer Portal (Vite 5173)  |  |   MangaPay PWA (Port 5174)   |  | Admin Dashboard (5175)  |  |
|  | [Desktop Web Experience]     |  | [Mobile Web / PWA / Android] |  | [Operations Console]    |  |
|  +--------------+---------------+  +--------------+---------------+  +------------+------------+  |
+-----------------|---------------------------------|-------------------------------|---------------+
                  | Bearer JWT                      | Bearer JWT                    | No Token (401)
                  v                                 v                               v
+---------------------------------------------------------------------------------------------------+
|                                     MANGAPAY BACKEND (Express)                                    |
|  Middlewares: Helmet | CORS | ExpressRateLimit | RawBodyCapture | AuthenticateJWT | Idempotency   |
|                                                                                                   |
|  Controllers: AuthController | WalletController | WebhookController | VASController | AdminCtlr   |
|                                                                                                   |
|  Services:    WalletService  | LedgerService    | PaystackService   | VASTransactionSvc | Recon   |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      PERSISTENCE LAYER (Prisma)                                   |
|  PostgreSQL Database: users, wallet_accounts, ledger_accounts, journal_entries, ledger_postings   |
|  transactions, deposits, withdrawals, transfers, vas_transactions, vas_refunds, webhook_events    |
+---------------------------------------------------------------------------------------------------+
                                                  |
                               +------------------+------------------+
                               |                                     |
                               v                                     v
                +-----------------------------+       +-----------------------------+
                |      PAYSTACK GATEWAY       |       |       VTPASS GATEWAY        |
                | • Customer Code             |       | • Service Variations        |
                | • Dedicated Virtual Account |       | • Airtime Top-Up            |
                | • Inbound IPN Webhook       |       | • Mobile Data Bundles       |
                | • Outward Bank Transfers    |       | • Transaction Requery & IPN |
                +-----------------------------+       +-----------------------------+
```

### 3.2 Tightly Coupled & Redundant Elements
- **Duplicate Mobile Codebases:** Two mobile client folders exist: `mangapay-app` (an older legacy snapshot) and `mangapay-antigravity/mangapay-for-antigravity` (the actively developed PWA). The legacy `mangapay-app` should be archived to eliminate confusion.
- **Asymmetrical Client Features:** VAS Airtime and Mobile Data purchasing exists exclusively in the mobile PWA (`mangapay-antigravity`), while the desktop `customer-portal` lacks airtime/data interfaces entirely.
- **Synchronous Event Loop Blocking:** Webhook event handling, VAS purchase dispatch, and reconciliation calculations are executed synchronously inside HTTP request threads without an asynchronous task runner (e.g., Redis/BullMQ).

---

## 4. DATABASE ARCHITECTURE ASSESSMENT

### 4.1 Schema Evaluation ([`backend/prisma/schema.prisma`](file:///c:/Users/pc/Desktop/WALLET/backend/prisma/schema.prisma))
The persistence tier contains 19 models, 11 enums, and comprehensive relational integrity rules:
- **Precision:** Financial columns (`amount`, `fee`, `availableBalance`, `ledgerBalance`, `providerCost`, `sellingPrice`, `profitAmount`) use `@db.Decimal(18, 4)`, preventing floating-point truncation.
- **Integrity Constraints:** Foreign keys are explicitly defined. Deletions on core financial tables (`deposits`, `withdrawals`, `transfers`, `vas_transactions`, `ledger_postings`) are protected against accidental cascade deletions.
- **Indexing:** Primary lookup fields are indexed:
  - `wallet_accounts`: `@unique([userId])`, `@unique([walletNumber])`, `@unique([ledgerAccountId])`
  - `transactions`: `@unique([reference])`, `@unique([idempotencyKey])`
  - `vas_transactions`: Index on `userId`, `status`, `providerReference`, `createdAt`
  - `webhook_events`: `@unique([eventId])`

### 4.2 Database Weaknesses for MVP
1. **Missing CHECK Constraints:** PostgreSQL `CHECK (available_balance >= 0)` constraints are not declared at the database schema level. Balance non-negativity relies entirely on application-layer guards.
2. **Missing Soft Deletes:** If an administrative operator deletes a `User`, the relation `onDelete: Cascade` on `WalletAccount` and `KYCRecord` will delete these records, leaving orphaned ledger entries. A `deletedAt` soft-delete pattern is required.

---

## 5. PAYSTACK INTEGRATION REVIEW

### 5.1 Dedicated Virtual Account (DVA) Flow
1. **Customer Provisioning:** During registration, [`WalletService.createWalletForUser`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L41-L58) calls Paystack's `/customer` endpoint to create a customer code (`CUS_...`).
2. **Account Assignment:** Calls `/dedicated_account` requesting an account with preferred bank `wema-bank`.
3. **Storage:** The generated account number, account name, and bank code (`035`) are stored in `dedicated_virtual_accounts`.
4. **Deposit Detection:** When funds are transferred via NIP, Paystack dispatches a `charge.success` webhook event to `/api/v1/webhooks/paystack`.
5. **Deduplication & Crediting:** [`WebhookService.handleWebhook`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/webhook.service.ts) verifies HMAC-SHA512 signature, validates deduplication via `webhook_events.eventId`, and posts a balanced journal entry:
   - **DEBIT:** `PAYSTACK_CLEARING_ASSET` (Gross)
   - **CREDIT:** `USER_LIABILITY_${userId}` (Net of fees)
   - **CREDIT:** `PLATFORM_FEE_INCOME` (Fee)

### 5.2 Identified Paystack Deficiencies
- **Failure Masking:** In [`PaystackService.initiateTransfer`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L89-L96), payout API errors return fake success objects (`TRF_...`). Gateway rejections must rethrow errors to allow immediate hold release.
- **Settlement Blindspot:** MangaPay has no mechanism to query `https://api.paystack.co/balance` or `/transaction/totals`. It cannot determine whether Paystack has actually swept funds into MangaPay's corporate bank account.

---

## 6. VTPASS INTEGRATION REVIEW

### 6.1 Architecture & Implementation
The VAS telecommunications engine is fully implemented across Phases 1–7:
- **Provider Interface:** [`VTPassProvider`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/providers/vtpass.provider.ts) handles `/pay`, `/service-variations`, and `/requery`.
- **Request ID Generation:** Complies with VTpass specifications by generating a 12-digit timestamp prefix (`YYYYMMDDHHmm`) followed by an alphanumeric string (`generateRequestId`).
- **Wholesale Margin Calculation:** [`VASPricingService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/pricing.service.ts) enforces mathematical margin invariants:
  - MTN: $2.0\%$ discount
  - Airtel: $2.0\%$ discount
  - Glo: $2.5\%$ discount
  - 9mobile: $3.0\%$ discount
  - Data: Wholesale passthrough pricing
- **Offline Test Coverage:** The unit suite in [`backend/scripts/test-vas-unit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-vas-unit.ts) validates phone normalization, prefix detection, request ID formats, and pricing invariants with **27/27 passing tests**.

### 6.2 VAS Deficiencies
- **Fallback Test Credentials:** Provider initialization defaults to sandbox URLs (`https://sandbox.vtpass.com/api`). Production environment keys and live float funding procedures must be configured before commercial operation.

---

## 7. CUSTOMER & CLIENT FUNCTIONALITY REVIEW

### 7.1 Web Customer Portal (`customer-portal/`)
- **Functional:** Account registration, login, JWT session persistence (`localStorage.getItem('payvault_token')`), live ledger balance card, DVA account details card with one-click copy, internal P2P transfer modal, outward withdrawal modal, and paginated transaction history.
- **Deficiencies:** Lacks VAS Airtime/Data recharge interface; uses legacy `'payvault_token'` key name.

### 7.2 Mobile Progressive Web App (`mangapay-antigravity/`)
- **Functional:** 7-screen mobile onboarding flow, phone + PIN authentication, biometric authentication modal, interactive Services sheet with live prefix auto-detection (MTN/Airtel/Glo/9mobile), data bundle variation dropdowns, digital receipt modal (`VASReceiptModal.tsx`), and categorized transaction history.
- **Simulated Prototypes (Non-Functional):**
  - **Virtual Cards:** Card creation, funding, and CVV display are 100% simulated in browser memory with `delay()` promises.
  - **Agency Banking (`AgentApp.tsx`):** Hardcoded agent profiles with mock earnings and simulated customer onboarding.

---

## 8. ADMINISTRATIVE DASHBOARD REVIEW

### 8.1 Functional Scope
Mounted in [`backend/src/routes/admin.routes.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/routes/admin.routes.ts):
- System Overview metrics (Total users, deposits, payouts, trial balance check).
- Chart of Accounts browser with recent postings.
- Master Journal Entries browser.
- Webhook Reception Audit logs.
- VAS Operations Telemetry (Transaction volume, gross sales, wholesale costs, margins).
- VAS Product Catalogue Sync.
- Compensating Refund Authorization modal.

### 8.2 Critical Operational Issue
In [`admin-dashboard/src/services/api.ts`](file:///c:/Users/pc/Desktop/WALLET/admin-dashboard/src/services/api.ts):
The Axios client does not store or attach JWT tokens. Every request sent to the backend receives `401 Unauthorized`. The dashboard catches these errors and renders hardcoded mock data. Operators cannot view live ledger balances, real transactions, or execute live refunds through the frontend.

---

## 9. SECURITY AND ACCESS CONTROL REVIEW

### 9.1 Vulnerability Matrix
| Vulnerability Identifier | Severity | Component Affected | Description & Exploitability | Remediation |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01: Admin Escalation** | **CRITICAL** | `auth.controller.ts:34` | Public registration accepts `role: 'ADMIN'`, granting administrative privileges to any user. | Hardcode `role: 'USER'` on public registration. |
| **SEC-02: TimingSafe Crash** | **HIGH** | `crypto.ts:10` | `crypto.timingSafeEqual` throws an unhandled error when signature buffer lengths differ, causing an HTTP 500 crash. | Add buffer length guard before comparison. |
| **SEC-03: Default PIN 1234** | **HIGH** | `vas.transaction.service.ts:47`| Accounts without a configured PIN default to `'1234'`, permitting unauthorized debits. | Reject requests if PIN hash is unset. |
| **SEC-04: Plaintext BVN/NIN** | **HIGH** | `kyc.service.ts:24-25` | BVN and NIN identity numbers are stored unencrypted in `kyc_records`. | Encrypt identity data at rest using AES-256-GCM. |
| **SEC-05: Permissive CORS** | **MEDIUM** | `app.ts:15` | CORS allows `origin: '*'`. | Whitelist specific frontend domains. |
| **SEC-06: JWT Fallback Secret**| **MEDIUM** | `auth.controller.ts:44` | Server falls back to string `'secret'` if `JWT_SECRET` is unset. | Throw an error on startup if secret is missing. |

---

## 10. TECHNICAL WEAKNESSES & ARCHITECTURAL GAPS

1. **Self-Referencing Reconciliation:** The reconciliation service does not compare internal records against Paystack's external settlement ledger.
2. **Missing Asynchronous Worker Queues:** Webhooks, provider requeries, and catalogue syncs run synchronously in Express request threads. Redis / BullMQ is required to prevent event loop starvation.
3. **Idempotency Pre-Reservation Gap:** Idempotency keys are saved after the operation completes in `res.json`, permitting simultaneous requests with the same key to run concurrently.
4. **Simulated Features Displayed in UI:** Virtual Cards and Agency Banking appear in the UI without backend implementations.

---

## 11. MVP ARCHITECTURAL RECOMMENDATIONS

1. **Harden Authentication:** Lock public registration strictly to `role: 'USER'`, eliminate the default `'1234'` PIN fallback, and enforce strong JWT secret configuration.
2. **Fix Gateway Error Handling:** Rethrow errors in `PaystackService` so that failed payouts immediately mark transactions as `FAILED` and release balance holds.
3. **Connect Admin Dashboard:** Implement an Admin Login view, attach `Authorization: Bearer <token>`, and remove mock fallback data in production builds.
4. **Connect Real Gateway Settlement APIs:** Update `ReconciliationService` to fetch live balances and transaction totals from `https://api.paystack.co/balance`.
5. **Disable Client-Side Simulations:** Hide or remove Virtual Cards and Agency Banking UI elements from the MVP release until provider partnerships and backend models are established.
6. **Enforce CBN Tier Limits:** Call `KYCService.getTierLimits()` before approving deposits, transfers, or withdrawals.

---

*Assessment certified by Senior FinTech Software Architect.*
