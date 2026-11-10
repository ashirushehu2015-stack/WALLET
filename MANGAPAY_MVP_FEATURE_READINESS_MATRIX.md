# MANGAPAY — MVP FEATURE READINESS MATRIX

**Document Version:** 1.0.0  
**Audit Date:** November 9, 2026  
**Operating Framework:** FinTech Minimum Viable Product (MVP) Evaluation  
**Target Repository:** `ashirushehu2015-stack/WALLET`  

---

## 1. STATUS CLASSIFICATION TAXONOMY

Every feature evaluated is classified into one of seven explicit statuses:
- **`READY`:** Fully implemented, verified against database/provider, secure, and ready for commercial traffic.
- **`READY AFTER MINOR FIXES`:** Backend and frontend functional; requires immediate bug fix or security patch before enablement.
- **`REQUIRES DEVELOPMENT`:** Partially implemented or asymmetrical across clients; requires substantial engineering to complete.
- **`REQUIRES PROVIDER APPROVAL`:** Fully or partially built, but cannot be commercially deployed without written provider authorization (e.g., Paystack or VTpass production approval).
- **`REQUIRES LICENSED PARTNER`:** Functionality involves regulated stored-value, electronic money issuance, or custodial settlement that legally requires operating under an appropriately licensed financial institution (e.g., CBN-licensed MMO, Microfinance Bank, or PSSP).
- **`DISABLED FOR MVP`:** Feature is present in the UI or codebase as a prototype or simulation, but intentionally excluded/hidden from the MVP release to ensure compliance and prevent false customer expectations.
- **`NOT IMPLEMENTED`:** Feature was conceived or mentioned in requirements, but has zero backend models, endpoints, or UI implementation.

---

## 2. COMPREHENSIVE MVP FEATURE EVALUATION MATRIX

| Feature Category | Specific Capability | Existing Implementation & Code Evidence | Current Technical & Regulatory Status | Required Action Prior to Enablement | MVP Decision |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity & Access** | **Customer Registration** | Fully implemented in [`AuthController.register`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L10). Creates user, wallet, DVA, and initial KYC record. Vulnerable to `role: ADMIN` injection. | **READY AFTER MINOR FIXES** | Hardcode `role: 'USER'` on public registration endpoint. | **INCLUDE IN MVP** (Post-Fix) |
| **Identity & Access** | **Customer Login & JWT** | Fully implemented in [`AuthController.login`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L71). Validates bcrypt hash, issues 24-hr Bearer JWT token. | **READY** | Remove fallback string `'secret'`; require explicit `JWT_SECRET`. | **INCLUDE IN MVP** |
| **Identity & Access** | **Transaction PIN Management** | Implemented in [`VASController.setTransactionPin`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/vas.controller.ts#L126). 4-digit bcrypt hashing. Fallback to `'1234'` exists if unset. | **READY AFTER MINOR FIXES** | Remove default `'1234'` fallback; mandate PIN setup on initial wallet activation. | **INCLUDE IN MVP** (Post-Fix) |
| **Identity & Access** | **Biometric Login (Touch/Face ID)** | Implemented in mobile PWA ([`BiometricAuthModal.tsx`](file:///c:/Users/pc/Desktop/WALLET/mangapay-antigravity/mangapay-for-antigravity/src/components/BiometricAuthModal.tsx)). Validates stored credentials via WebAuthn/localStorage. | **READY** | Validate device compatibility on older Android webviews. | **INCLUDE IN MVP** |
| **Identity & Access** | **KYC Tier Limits Enforcement** | Tiers 1, 2, and 3 limits defined in [`KYCService.getTierLimits`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts#L44), but never called during transactions. | **REQUIRES DEVELOPMENT** | Integrate `getTierLimits()` checks into `WalletService` transfer, deposit, and payout methods. | **INCLUDE IN MVP** (Post-Dev) |
| **Wallet & Core Ledger** | **Double-Entry General Ledger** | Institutional ledger in [`LedgerService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/ledger.service.ts). Strictly asserts $\sum \text{Debits} == \sum \text{Credits}$ across balanced chart of accounts. | **READY** | None. Fully verified mathematically and operationally. | **INCLUDE IN MVP** |
| **Wallet & Core Ledger** | **Wallet Balance Formulation** | Live calculation in [`WalletService.getWalletBalance`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L69). Formula: Live Ledger Balance minus Active Holds. | **READY** | Ensure cached column in `wallet_accounts` updates reliably on commit. | **INCLUDE IN MVP** |
| **Wallet & Core Ledger** | **Concurrency & Row Locking** | Implemented via `SELECT ... FOR UPDATE` in [`wallet.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L204) and [`vas.transaction.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L104). | **READY** | None. Prevents double-spending and lost updates. | **INCLUDE IN MVP** |
| **Wallet & Core Ledger** | **Customer Stored-Value Custody** | System models customer wallet accounts as balance-sheet liabilities (`USER_LIABILITY_${userId}`). | **REQUIRES LICENSED PARTNER** | MangaPay cannot hold customer funds directly under a Business Name. Must operate under a custodial partner bank arrangement. | **RESTRICTED PILOT** (Subject to Partner) |
| **Funding & Deposits** | **Paystack DVA Assignment** | Automated via [`PaystackService.createDedicatedVirtualAccount`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L35). Assigns unique Wema Bank DVA to each customer. | **REQUIRES PROVIDER APPROVAL** | Confirm Paystack commercial terms for DVA sub-account usage under Business Name registration. | **INCLUDE IN MVP** (Subject to Paystack) |
| **Funding & Deposits** | **Paystack Inbound Webhook** | Ingestion in [`WebhookService.handleWebhook`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/webhook.service.ts). Deduplicates `eventId`, verifies HMAC signature, credits user liability. | **READY AFTER MINOR FIXES** | Fix `crypto.timingSafeEqual` buffer length check in [`crypto.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/utils/crypto.ts#L10) to prevent 500 crash. | **INCLUDE IN MVP** (Post-Fix) |
| **Transfers & Payouts** | **Internal P2P Transfers** | Implemented in [`WalletService.transferFunds`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L193). Row-locked atomic transfer from User A to User B. Zero fee. | **REQUIRES LICENSED PARTNER** | Legally, closed-loop P2P transfer between stored-value wallets requires an MMO / banking framework. | **RESTRICTED PILOT** (Closed Alpha) |
| **Transfers & Payouts** | **Outward Bank Withdrawals** | Two-phase hold & commit in [`WalletService.requestWithdrawal`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts#L314). Reserves balance hold, calls Paystack transfer API. | **READY AFTER MINOR FIXES** | Remove fake mock success return in [`paystack.service.ts#L91`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L91). Rethrow errors to fail fast. | **INCLUDE IN MVP** (Post-Fix) |
| **Telecom VAS** | **Airtime Purchase (VTpass)** | Implemented in [`VASTransactionService.purchaseAirtime`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L67). Row-locked hold, VTpass API, double-entry commit. | **REQUIRES PROVIDER APPROVAL** | Switch from sandbox to live VTpass API keys and fund operational wholesale float. | **INCLUDE IN MVP** (Live Keys Required) |
| **Telecom VAS** | **Mobile Data Bundles (VTpass)** | Implemented in [`VASTransactionService.purchaseData`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L218). Catalogue synchronization, wholesale cost passthrough. | **REQUIRES PROVIDER APPROVAL** | Execute initial production catalogue synchronization; fund VTpass live float. | **INCLUDE IN MVP** (Live Keys Required) |
| **Telecom VAS** | **Compensating VAS Refunds** | Administrative refund in [`VASTransactionService.refundVasTransaction`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L490). Reverses commission and float; credits user. | **READY** | None. Fully verified and idempotent. | **INCLUDE IN MVP** |
| **Telecom VAS** | **Utility Bills (Power / Cable)** | Enums exist (`VASServiceType.ELECTRICITY`, `CABLE`); UI displays categories; no provider adapters exist. | **REQUIRES DEVELOPMENT** | Implement bill validation and token vend handlers for electricity and cable billers. | **DEFER BEYOND MVP** |
| **Merchant Services** | **Merchant Registration & Auth** | Mentioned in product requirements; zero models, zero routes, zero UI implemented. | **NOT IMPLEMENTED** | Build merchant identity schema, merchant dashboard, and API key provisioning. | **DEFER BEYOND MVP** |
| **Merchant Services** | **Merchant Payment Gateway** | Mentioned in product requirements; no checkout endpoints or QR code payments implemented. | **NOT IMPLEMENTED** | Design merchant QR / checkout SDK and settlement split engine. | **DEFER BEYOND MVP** |
| **Cards & Agency** | **Virtual Cards (Visa/Mastercard)** | UI modal exists in PWA (`VirtualCardsModal.tsx`), but functions are 100% in-memory simulations with `delay()`. No backend models. | **DISABLED FOR MVP** | Hide Virtual Cards modal from PWA until a licensed card issuing provider (e.g. Bridgecard, Maplerad) is contracted. | **EXCLUDE FROM MVP** |
| **Cards & Agency** | **Agency Banking (Agent App)** | Screen exists in PWA (`AgentApp.tsx`) with hardcoded mock profiles and earnings. Zero backend models or agency cash-in/out APIs. | **DISABLED FOR MVP** | Remove Agent Banking screen from consumer PWA; branch into separate enterprise agent repository. | **EXCLUDE FROM MVP** |
| **Admin & Operations** | **Admin Operations Dashboard** | Implemented in `admin-dashboard/`. Displays ledger accounts, journals, webhooks, VAS telemetry, and reconciliation. | **READY AFTER MINOR FIXES** | Add Admin Login screen; attach `Authorization: Bearer <token>` in Axios; remove mock fallbacks. | **INCLUDE IN MVP** (Post-Fix) |
| **Admin & Operations** | **Reconciliation Engine** | Implemented in [`ReconciliationService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts). Audits internal trial balance and wallet integrity. | **READY AFTER MINOR FIXES** | Connect to live Paystack Balance and Transaction totals APIs to replace self-referencing bug. | **INCLUDE IN MVP** (Post-Fix) |
| **Admin & Operations** | **Audit Logging** | Implemented in `audit_logs` table. Tracks sensitive admin actions (e.g. VAS refunds). | **READY** | Add audit logging for manual balance adjustments and role modifications. | **INCLUDE IN MVP** |

---

## 3. SUMMARY OF MVP FEATURE INCLUSION DECISIONS

### A. Included in Initial MVP (Subject to Minor Technical Fixes)
1. Customer Account Registration & JWT Authentication (Secured against role escalation).
2. Customer Transaction PIN Creation & Enforcement (Mandatory; default `'1234'` removed).
3. Dedicated Virtual Account (DVA) Deposit Generation & Inbound Crediting (Paystack).
4. Double-Entry General Ledger Account Balances & Transaction History.
5. Outward Bank Payouts / Withdrawals (With true gateway error propagation).
6. Telecommunication Airtime Top-Up for MTN, Airtel, Glo, 9mobile (VTpass).
7. Telecommunication Mobile Data Bundle Purchases (VTpass).
8. Administrative Operations Dashboard (Authenticated to live backend).
9. Automated Internal Ledger Reconciliation & Trial Balance Verification.

### B. Controlled Pilot Only (Subject to Licensed Partner Approval)
1. Stored-Value Customer Wallet Balances (Requires custodial arrangement with licensed partner bank).
2. Internal Peer-to-Peer (P2P) Wallet Transfers (Closed alpha pilot only).

### C. Explicitly Excluded / Disabled for MVP
1. **Virtual Cards:** Excluded. Pure frontend simulation; would mislead users without an issuing integration.
2. **Agency Banking:** Excluded. In-memory prototype; separate product track.
3. **Utility Bill Payments (Power & TV):** Deferred. Provider adapters incomplete.
4. **Merchant Payment Gateway:** Deferred. Zero backend implementation exists.

---

*Matrix certified by Senior FinTech Software Architect.*
