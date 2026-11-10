# MANGAPAY — ADMIN DASHBOARD USER ACCEPTANCE TESTING AND VERIFICATION REPORT

**Author:** Senior FinTech Operations Auditor & Back-Office Systems Specialist  
**Audit Reference:** SPRINT-5-ADMIN-DASHBOARD-2026-11-09  
**Evaluation Scope:** `admin-dashboard/` Portal, API Integrations, Role Enforcement, and Financial Accuracy  
**Status:** COMPLETE & AUDITED  
**Date:** November 9, 2026  

---

## 1. ADMIN DASHBOARD TEST MATRIX

| Dashboard Module | Acceptance Requirement | Test Verdict | Evidence / Code Verification | Outstanding Risks & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Admin Authentication** | Explicit login via `/api/v1/auth/login` asserting `role === 'ADMIN'` | **PASS** | `adminApi.login` verifies role is `ADMIN`, sets `sessionStorage` token, and redirects. | Non-admin users are rejected with `Access denied: Administrator role required`. |
| **2. Role-Based Access Control** | Backend routes protected by `requireAdmin` middleware | **PASS** | `backend/src/routes/admin.routes.ts` enforces `authenticateJWT` + `requireAdmin`. User tokens receive HTTP 403. | Tampered JWTs rejected by signature check. |
| **3. Customer Management** | Customer list, wallet numbers, KYC tier, status, balance | **PARTIAL** | Customers viewable via `GET /api/v1/admin/ledger-accounts` (shows wallet accounts and linked users). No dedicated customer profile editor/search UI. | Admin cannot manually adjust KYC tier or freeze user from UI without direct database action. |
| **4. Transaction Monitoring** | Real-time monitoring of all financial movements | **PASS** | `Transactions.tsx` displays journal entries, references, descriptions, statuses, postings count, and timestamps. | Linked directly to double-entry ledger postings. |
| **5. Deposits & Withdrawals** | Track inbound DVA deposits and outbound bank payouts | **PASS** | `Overview.tsx` displays `Total Paystack Deposits` and `Total Bank Withdrawals` aggregated directly from database. | Silent mock fallbacks completely eliminated. |
| **6. VAS Monitoring** | Track airtime/data purchases, wholesale margins, commissions | **PASS** | `VASManagement.tsx` queries `/api/v1/admin/vas/dashboard` and displays total volume, wholesale provider cost, and net commission. | Displays provider status and failure reasons. |
| **7. Failed Transactions** | Visibility into dropped/failed operations | **PASS** | Failed deposits and VAS transactions are surfaced in transaction feeds with explicit error reasons. | Visible in both audit logs and journal feeds. |
| **8. Reconciliation Exceptions** | Multi-tier reconciliation trigger and discrepancy alerts | **PASS** | `Reconciliation.tsx` triggers `POST /api/v1/admin/reconcile` and displays Tier A (Balance), Tier B (Line-item), and Tier C (Settlement) findings. | Discrepancies flagged with Paystack reference and amount variance. |
| **9. Financial Reporting** | Chart of Accounts and Trial Balance validation | **PASS** | `LedgerBrowser.tsx` displays all Asset, Liability, Equity, Income, and Expense ledger accounts with real-time balances. | Includes live Trial Balance safeguard badge (Total Debits == Total Credits). |
| **10. Audit History** | Complete system and administrative audit trail | **PASS** | `AuditLogs.tsx` queries `/api/v1/admin/audit-logs` displaying actor, action, resource, IP, and structured payload. | Captures critical events like `KYC_DEPOSIT_LIMIT_EXCEEDED`. |
| **11. Session Expiration** | Secure session expiration and cleanup | **PASS** | Tokens stored in `sessionStorage` (cleared on browser/tab close). Explicit logout removes credentials. | Backend JWT expires after 24 hours. |
| **12. Zero Mock Figures** | Assert absence of mock or hardcoded numbers | **PASS** | Code inspection of `admin-dashboard/src/services/api.ts` confirms all mock fallbacks (`MOCK_METRICS`, `MOCK_LEDGER`) were removed in Sprint 2. | All numbers derived from Prisma database aggregations. |

---

## 2. DETAILED TEST EXECUTION AND EVIDENCE

### Acceptance Test 1: Administrator Authentication & RBAC (PASS)
- **Execution:** Attempted authentication with a user token where `role: 'USER'`.
- **Observed Behavior:** 
  1. Frontend `adminApi.login` checks `user.role === 'ADMIN'`. If `USER`, throws: `Access denied: Administrator role required to access this portal.`
  2. Backend `requireAdmin` middleware checks `req.user.role === 'ADMIN'`. If `USER`, returns:
     ```json
     { "success": false, "message": "Access forbidden: Administrator privileges required." }
     ```
- **Code Anchor:** [`backend/src/middlewares/auth.ts#L45-L54`](file:///c:/Users/pc/Desktop/WALLET/backend/src/middlewares/auth.ts)
- **Verdict:** **PASS**

### Acceptance Test 2: Elimination of Production Mock Figures (PASS)
- **Execution:** Audited `admin-dashboard/src/services/api.ts` and `admin-dashboard/src/pages/Overview.tsx`.
- **Observed Behavior:** 
  - In Sprint 1, `getMetrics` returned hardcoded `userCount: 1420`, `totalDeposits: 52400000`, `totalWithdrawals: 18200000`.
  - In Sprint 2, all mock arrays were deleted. The methods now strictly execute HTTP GET requests to `/api/v1/admin/...` and return real database query results. If the backend is unreachable, the dashboard displays loading skeletons or explicit error alerts rather than fake data.
- **Code Anchor:** [`admin-dashboard/src/services/api.ts#L69-L99`](file:///c:/Users/pc/Desktop/WALLET/admin-dashboard/src/services/api.ts)
- **Verdict:** **PASS**

### Acceptance Test 3: Customer Management Usability (PARTIAL)
- **Execution:** Evaluated customer administration capabilities.
- **Observed Behavior:**
  - Administrators can inspect all customer wallet accounts and ledger liabilities via `GET /api/v1/admin/ledger-accounts`.
  - However, there is no dedicated "Customer Management" screen with search, KYC document inspection, tier upgrade override, or account suspension buttons.
- **Verdict:** **PARTIAL**
- **Risk:** Back-office support staff have read-only visibility into wallets, but must execute manual database queries to suspend accounts or adjust customer details.

### Acceptance Test 4: Reconciliation Trigger & Exception Visibility (PASS)
- **Execution:** Triggered `POST /api/v1/admin/reconcile`.
- **Observed Behavior:**
  - Triggers the 4-tier reconciliation service.
  - Returns structured comparison of:
    1. Paystack live balance vs `PAYSTACK_CLEARING_ASSET`.
    2. Missing webhooks (gateway success, local pending/missing).
    3. Unverified local credits.
    4. Settlement payouts.
- **Code Anchor:** [`backend/src/controllers/admin.controller.ts#L87-L94`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/admin.controller.ts)
- **Verdict:** **PASS**

---

## 3. SUMMARY OF ADMIN DASHBOARD TEST OUTCOMES

```
Total Modules Evaluated: 12
✅ PASS:        11
⚠️  PARTIAL:      1 (Customer Management UI is Read-Only via Ledger Browser; No KYC Tier Admin Editor)
🛑 BLOCKED:      0
❌ FAIL:         0
```

### Conclusion
The Admin Dashboard satisfies core fintech back-office requirements: strong authentication, role enforcement, complete elimination of mock data, live double-entry trial balance visibility, multi-tier reconciliation controls, and immutable audit logs. A dedicated Customer Management profile editor is recommended as a post-MVP operational enhancement.
