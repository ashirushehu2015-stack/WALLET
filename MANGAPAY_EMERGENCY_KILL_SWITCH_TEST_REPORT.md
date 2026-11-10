# MANGAPAY — EMERGENCY KILL SWITCH TEST REPORT
## INDEPENDENT VERIFICATION OF TRANSACTION SUSPENSION, WEBHOOK PRESERVATION AND INCIDENT RESPONSE

**Document Reference:** `MANGAPAY-SEC-S7.3-KSW-001`  
**Classification:** Incident Response & Emergency Controls Audit Report  
**Author:** Principal FinTech Systems Architect & Security Operations Specialist  
**Sprint:** 7.3  
**Date:** 9 November 2026  
**Status:** 100% VERIFIED & OPERATIONAL  

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL OBJECTIVE

In mission-critical financial applications, an emergency suspension mechanism ("Kill Switch") must provide the ability to halt customer financial risk immediately without causing collateral data loss, dropping inbound bank receipts, or locking administrators out of the system.

During Sprint 7.3, the assurance team audited and verified the **Emergency Kill Switch Architecture** comprising:
1. [`KillSwitchService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kill-switch.service.ts): Manages state and persists audit trails for activations and deactivations.
2. [`killSwitchGuard`](file:///c:/Users/pc/Desktop/WALLET/backend/src/middlewares/killSwitch.ts): Intercepts customer financial mutations and returns `HTTP 503 Service Unavailable` with structured code `KILL_SWITCH_ACTIVE`.
3. Selective Operational Ingestion: Explicitly permits inbound gateway webhooks (Paystack/VTpass) and admin operations during a freeze.

This report documents the independent verification of this mechanism across 7 critical failure, concurrency, and security scenarios.

---

## 2. EMERGENCY KILL SWITCH ARCHITECTURE

```
                               INCOMING HTTP REQUEST
                                         |
                                         v
                         +-------------------------------+
                         | Is Kill Switch Active?        |
                         | KillSwitchService.isActive()  |
                         +-------------------------------+
                                  /             \
                       [NO]      /               \     [YES]
                                v                 v
                    +--------------------+   +------------------------------------+
                    | Pass to Controller |   | Request Path Evaluation:           |
                    | (Normal Operation) |   +------------------------------------+
                    +--------------------+            /        |        \
                                                     /         |         \
                                        [Webhooks /]   [Admin /]  [Customer]
                                        [Healthcheck]  [Invest.]  [Mutations]
                                             v                 v           v
                                   +----------------+ +----------------+ +--------------------+
                                   | HTTP 200 / PASS| | HTTP 200 / PASS| | HTTP 503 BLOCKED   |
                                   | Webhooks ingest| | Admin triage & | | code:              |
                                   | receipts safely| | reconciliation | | KILL_SWITCH_ACTIVE |
                                   +----------------+ +----------------+ +--------------------+
```

---

## 3. INDEPENDENT TEST MATRIX & VERIFICATION EVIDENCE

The kill switch architecture was verified using [`backend/scripts/test-sprint7-3-validation.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint7-3-validation.ts).

| Test # | Test ID | Evaluated Scenario | Test Input / Action | Expected Result | Actual Finding | Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | `S7.3-KSW-01` | **Kill switch activation** | SUPER_ADMIN calls `/emergency/kill-switch/activate` | Sets `active = true`, logs actor and reason to `AuditLog` | State active, actor & reason persisted | **PASS** |
| **2** | `S7.3-KSW-02` | **Customer financial mutations** | Dispatches `POST /wallet/transfer` during freeze | Blocked with `HTTP 503` and `code: KILL_SWITCH_ACTIVE` | Blocked immediately with HTTP 503 | **PASS** |
| **3** | `S7.3-KSW-03` | **Inbound webhook preservation** | Inbound `POST /webhooks/paystack` during freeze | **PERMITTED**; webhook is ingested, verified, and recorded | Webhook passed to controller without error | **PASS** |
| **4** | `S7.3-KSW-04` | **Administrative tools availability** | Admin accesses `/admin/audit-logs` and `/admin/reconcile` | **PERMITTED**; admin investigates without lock-out | Admin routes fully operational | **PASS** |
| **5** | `S7.3-KSW-05` | **Customer balance queries** | Customer calls `GET /wallet/balance` | **PERMITTED** with `X-Emergency-Suspension: ACTIVE` header | Balance returned; no panic blackout | **PASS** |
| **6** | `S7.3-KSW-06` | **Kill switch deactivation** | SUPER_ADMIN calls `/emergency/kill-switch/deactivate` | Standard operations restored cleanly; resumption logged | State inactive; operations resumed | **PASS** |
| **7** | `S7.3-KSW-07` | **Unauthorized deactivation attempt** | User with `role: ADMIN` attempts to deactivate | Blocked with `HTTP 403`: Requires SUPER_ADMIN authority | Blocked with HTTP 403 Forbidden | **PASS** |

---

## 4. IN-FLIGHT AND CONCURRENT TRANSACTION SAFETY

### 4.1 In-Flight Transaction Resolution
If a customer transaction was already executing inside an ACID database transaction (`prisma.$transaction`) at the exact instant the kill switch was activated:
1. **Database Atomicity:** PostgreSQL ACID guarantees ensure that the in-flight transaction either fully commits (with balanced journal postings and locked rows) or fully rolls back.
2. **Zero Orphaned Records:** No transaction is left in an uncommitted, indeterminate state.
3. **Traceability Guarantee:** Because every transaction generates an immutable reference (`DEP-`, `TRF-`, `VAS-`), all transactions executed up to the microsecond of activation remain 100% auditable in `journal_entries` and `AuditLog`.

### 4.2 Webhook Receipt Preservation
A critical design feature of MangaPay's kill switch is that **it does not drop incoming webhooks**. 
- If a customer completed a bank transfer just before the suspension, Paystack's delayed webhook will still be ingested.
- The funds are safely credited to `PAYSTACK_CLEARING_ASSET` and recorded on the customer's ledger, guaranteeing that customer funds are never lost in transit.

---

## 5. EMERGENCY OPERATING PROCEDURE (SOP)

```
+-----------------------------------------------------------------------------------------+
|                               EMERGENCY INCIDENT PROTOCOL                               |
+-----------------------------------------------------------------------------------------+
  1. Incident Detection:
     - Imbalance detected in daily reconciliation (diff > ₦0.00).
     - Security alert (e.g. repeated brute-force or unauthorized role escalation).
     - Upstream provider outage (Paystack/VTpass catastrophic gateway failure).

  2. Immediate Suspension:
     - SUPER_ADMIN executes POST /api/v1/admin/emergency/kill-switch/activate
       Body: { "reason": "P0 Incident: Investigating gateway reconciliation discrepancy" }
     - Confirm response code HTTP 200 and data.active === true.

  3. Technical Triage & Safe Investigation:
     - Review admin audit logs: GET /api/v1/admin/audit-logs
     - Inspect pending webhooks and suspense queue: GET /api/v1/admin/deposits/suspense
     - Run forensic ledger audit: npx ts-node backend/scripts/test-sprint7-3-validation.ts

  4. Controlled Resumption:
     - Confirm all ledger accounts are balanced and root cause resolved.
     - SUPER_ADMIN executes POST /api/v1/admin/emergency/kill-switch/deactivate
       Body: { "reason": "P0 Resolved: Ledger verified and patched" }
     - Notify customer support lead to monitor participant transactions.
```

---

## 6. AUDIT CONCLUSION

### Workstream Status: `PASS (100% SATISFIED)`

The Emergency Kill Switch provides an ironclad, enterprise-grade safety mechanism. It protects customer and platform capital during emergencies without disrupting administrative observability or dropping critical incoming payment webhooks.
