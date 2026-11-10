# MANGAPAY — MVP GO-LIVE PRODUCTION READINESS CHECKLIST

**Document Version:** 1.0.0  
**Audit Date:** November 9, 2026  
**Target Release:** MangaPay Minimum Viable Product (Controlled Pilot Release)  
**Target Repository:** `ashirushehu2015-stack/WALLET`  

---

## 1. PURPOSE AND USAGE

This Go-Live Checklist serves as the definitive gatekeeping instrument for MangaPay leadership, engineering leads, and compliance officers prior to cutting over from testing/sandbox environments to live commercial traffic.

Every item in this checklist must be independently verified and marked as **`[PASSED]`** before initiating public user acquisition.

---

## 2. GO-LIVE READINESS CHECKLIST BY CATEGORY

### 1. CRITICAL SECURITY REQUIREMENTS (GATEWAY BLOCKERS 🛑)

- [ ] **SEC-01: Public Role Escalation Fixed**  
  *Verification:* Verify in [`AuthController.register`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L34) that `role` from request body is ignored and every registrant is strictly assigned `role: 'USER'`. Submit a test registration with `"role": "ADMIN"` and confirm database shows `USER`.
- [ ] **SEC-02: Default Transaction PIN Fallback Removed**  
  *Verification:* Verify in [`VASTransactionService.verifyUserPin`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/vas.transaction.service.ts#L41) that the fallback `pin === '1234'` is eliminated. Unconfigured accounts must be blocked from monetary transactions until a custom 4-digit PIN is established.
- [ ] **SEC-03: Webhook TimingSafe Buffer Length Guard Added**  
  *Verification:* Verify in [`crypto.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/utils/crypto.ts#L10) that `verifyPaystackSignature` validates buffer lengths match before calling `crypto.timingSafeEqual`. Confirm test with short signature returns HTTP 401, not 500.
- [ ] **SEC-04: Strong JWT Secret Enforced**  
  *Verification:* Verify in [`server.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/server.ts) that process refuses to start in `production` if `JWT_SECRET` is missing, less than 32 characters, or equals `'secret'`.
- [ ] **SEC-05: Sensitive Identity Data Encrypted at Rest**  
  *Verification:* Confirm BVN and NIN values written to `kyc_records` table are encrypted using AES-256-GCM.
- [ ] **SEC-06: CORS Origins Restricted**  
  *Verification:* Verify in [`app.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/app.ts#L15) that `cors({ origin: '*' })` is replaced with an explicit whitelist of customer portal, mobile PWA, and admin dashboard production domains.

---

### 2. FINANCIAL INTEGRITY & ACCOUNTING REQUIREMENTS ⚖️

- [ ] **FIN-01: Double-Entry Ledger Invariant Active**  
  *Verification:* Confirm [`LedgerService.postJournalEntry`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/ledger.service.ts#L44) asserts $\sum \text{Debits} == \sum \text{Credits}$ within `0.0001` tolerance.
- [ ] **FIN-02: Row-Level Concurrency Locking Verified**  
  *Verification:* Verify `SELECT ... FOR UPDATE` raw SQL lock is present on `wallet_accounts` in `WalletService.transferFunds`, `WalletService.requestWithdrawal`, and `VASTransactionService.purchaseAirtime`.
- [ ] **FIN-03: Decimal Precision Maintained**  
  *Verification:* Confirm all database monetary fields in PostgreSQL use `Decimal(18, 4)` and avoid floating-point truncations.
- [ ] **FIN-04: Paystack Payout Failure Masking Removed**  
  *Verification:* Verify in [`PaystackService.initiateTransfer`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/paystack.service.ts#L89) that external API errors are rethrown, updating `Withdrawal` to `FAILED` and immediately releasing balance holds.
- [ ] **FIN-05: Real Gateway Settlement Reconciliation Connected**  
  *Verification:* Verify [`ReconciliationService.runReconciliation`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts) queries `GET https://api.paystack.co/balance` and compares against `PAYSTACK_CLEARING_ASSET`, replacing the internal copy bug.
- [ ] **FIN-06: Central Bank Tier Limits Enforced**  
  *Verification:* Verify `KYCService.getTierLimits()` is invoked before approving deposits, transfers, and withdrawals to block transactions exceeding regulatory tier thresholds.

---

### 3. THIRD-PARTY PROVIDER REQUIREMENTS (PAYSTACK & VTPASS) 🔌

- [ ] **PRV-01: Paystack Written Approval Secured**  
  *Verification:* Obtain written confirmation from Paystack authorizing retail Dedicated Virtual Account (DVA) issuance and automated payouts under Manga Business Digital Solutions merchant tier.
- [ ] **PRV-02: Paystack Production Keys Configured**  
  *Verification:* Configure live `PAYSTACK_SECRET_KEY` (`sk_live_...`), `PAYSTACK_PUBLIC_KEY` (`pk_live_...`), and `PAYSTACK_WEBHOOK_SECRET` in production environment variables.
- [ ] **PRV-03: Paystack IPN Webhook URL Configured**  
  *Verification:* Verify live webhook URL is registered in Paystack Dashboard:  
  `https://wallet-ijx3.onrender.com/api/v1/webhooks/paystack`
- [ ] **PRV-04: VTpass Production Keys Configured**  
  *Verification:* Configure live `VTPASS_BASE_URL` (`https://api-service.vtpass.com/api`), `VTPASS_API_KEY`, `VTPASS_SECRET_KEY`, and `VTPASS_PUBLIC_KEY`.
- [ ] **PRV-05: VTpass Wholesale Float Prefunded**  
  *Verification:* Deposit initial wholesale operational float (e.g. ₦100,000+) into VTpass merchant wallet and verify balance query reflects funded amount.
- [ ] **PRV-06: VTpass Live Catalogue Synchronized**  
  *Verification:* Execute `POST /api/v1/admin/vas/products/sync` to populate database with live production data bundle variation codes and wholesale costs.
- [ ] **PRV-07: VTpass IPN Callback URL Registered**  
  *Verification:* Register production IPN callback in VTpass portal:  
  `https://wallet-ijx3.onrender.com/api/v1/webhooks/vtpass`

---

### 4. CLIENT APPLICATIONS & USER EXPERIENCE 📱

- [ ] **CLI-01: Simulated Virtual Cards Disabled**  
  *Verification:* Confirm Virtual Cards modal and triggers are hidden/removed from consumer mobile PWA.
- [ ] **CLI-02: Simulated Agency Banking Disabled**  
  *Verification:* Confirm Agent Banking screen and triggers are hidden/removed from consumer mobile PWA.
- [ ] **CLI-03: Asymmetrical Desktop VAS Parity Built**  
  *Verification:* Verify desktop Customer Portal has functional Airtime & Data purchase modals connected to live backend.
- [ ] **CLI-04: Mandatory PIN Onboarding Flow**  
  *Verification:* Verify mobile onboarding flow mandates setting a 4-digit transaction PIN before wallet dashboard access is granted.
- [ ] **CLI-05: Clear Fee Disclosures Displayed**  
  *Verification:* Confirm withdrawal screen explicitly warns users of the ₦100 transfer fee before PIN authorization.

---

### 5. ADMINISTRATIVE & OPERATIONS OBSERVABILITY 🖥️

- [ ] **ADM-01: Admin Login Interface Implemented**  
  *Verification:* Verify admin dashboard presents an authentication screen and stores admin JWT token in `sessionStorage`.
- [ ] **ADM-02: Bearer Token Interceptor Configured**  
  *Verification:* Verify Axios instance in `admin-dashboard/src/services/api.ts` attaches `Authorization: Bearer <token>` to all requests.
- [ ] **ADM-03: Mock Fallback Data Removed**  
  *Verification:* Verify all silent `catch { return <MOCK DATA>; }` blocks are removed from `adminApi`. In case of network failure, dashboard displays an explicit error alert.
- [ ] **ADM-04: Live Operations Telemetry Verified**  
  *Verification:* Confirm operators can view live user count, total deposits, ledger balances, and authorize live compensating refunds via the dashboard.

---

### 6. COMPLIANCE, LEGAL & POLICY REQUIREMENTS 📜

- [ ] **LEG-01: Custodial Funds Flow Established**  
  *Verification:* Confirm written agreement establishing that customer funds remain in Paystack's custodial settlement pool or partner bank trust account; funds are not swept into unsegregated company accounts.
- [ ] **LEG-02: Terms of Service Published**  
  *Verification:* Ensure published Terms of Service clearly state that MangaPay provides software and transaction management services, disclosing Paystack and partner bank roles.
- [ ] **LEG-03: Privacy Policy Published (NDPA 2023 Compliant)**  
  *Verification:* Ensure published Privacy Policy at `/privacy` discloses BVN/NIN processing, data retention periods, user consent, and Data Protection Officer (DPO) contact information.
- [ ] **LEG-04: Closed Pilot Scope Enforced**  
  *Verification:* Restrict initial pilot to a controlled whitelist of users (e.g. 50–100 beta participants) before opening public marketing channels.

---

### 7. INFRASTRUCTURE, DEPLOYMENT & LOGGING 🚀

- [ ] **INF-01: PostgreSQL Database Backups Configured**  
  *Verification:* Confirm automated daily database snapshots and point-in-time recovery are active on the production Render PostgreSQL instance.
- [ ] **INF-02: Production Logging Sanitized**  
  *Verification:* Verify Winston logger transports do not output customer passwords, PINs, BVNs, or full authorization headers to stdout/log files.
- [ ] **INF-03: Health Check Endpoint Operational**  
  *Verification:* Verify `GET /health` returns HTTP 200 with `{ "status": "UP", "service": "Wallet & Ledger Engine" }`.
- [ ] **INF-04: Automated CI/CD Test Pipeline Passing**  
  *Verification:* Confirm `npm test` executes on GitHub Actions/Render build and passes all unit and integration assertions.

---

## 3. FINAL GO-LIVE SIGN-OFF PROTOCOL

| Gatekeeper Role | Designated Officer | Verification Date | Signature / Status |
| :--- | :--- | :---: | :---: |
| **Lead Security Architect** | FinTech Security Specialist | `_______________` | `[ PENDING ]` |
| **Lead Backend Engineer** | Core Ledger Engineer | `_______________` | `[ PENDING ]` |
| **Compliance & Legal Counsel** | Regulatory / AML Officer | `_______________` | `[ PENDING ]` |
| **Managing Director / CEO** | MangaPay Business Executive | `_______________` | `[ PENDING ]` |

---

*Checklist certified by Senior FinTech Software Architect.*
