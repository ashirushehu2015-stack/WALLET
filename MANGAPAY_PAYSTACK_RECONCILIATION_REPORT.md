# MANGAPAY — MULTI-TIER PAYSTACK FINANCIAL RECONCILIATION AUDIT REPORT

**Author:** Senior FinTech Financial Systems Auditor & Reconciliation Specialist  
**Audit Reference:** SPRINT-4-PAYSTACK-RECON-2026-11-09  
**System Module:** `backend/src/services/reconciliation.service.ts`, `backend/src/services/paystack.service.ts`  
**Status:** IMPLEMENTED & AUDITED  
**Date:** November 9, 2026  

---

## 1. OBJECTIVE AND ACCOUNTING FRAMEWORK

For a technology platform operating digital wallet infrastructure, reconciliation between internal double-entry ledger accounts and third-party payment gateway records is the foundational control against balance leakage, unrecorded customer credits, and fraud.

Prior to Sprint 4, reconciliation in MangaPay was restricted to a single endpoint querying Paystack's total account balance (`GET /balance`). While useful for macro-level validation, aggregate balance queries cannot detect individual dropped webhooks, fee discrepancies, or settlement mismatches.

To establish forensic-grade financial integrity, MangaPay implemented a **4-Tier Reconciliation Architecture** in [`backend/src/services/reconciliation.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/reconciliation.service.ts).

---

## 2. THE 4-TIER RECONCILIATION ARCHITECTURE

```mermaid
flowchart TD
    subgraph TierA["Tier A: Balance Reconciliation"]
        A1["Paystack Live Balance (GET /balance)"] <--> A2["MangaPay PAYSTACK_CLEARING_ASSET Ledger Account"]
    end

    subgraph TierB["Tier B: Line-Item Transaction Reconciliation"]
        B1["Paystack Transactions (GET /transaction)"] <--> B2["MangaPay Transaction Table (Deposits & Transfers)"]
        B3["Detect Dropped Webhooks"]
        B4["Detect Unverified Local Credits"]
        B5["Detect Fee & Amount Discrepancies"]
    end

    subgraph TierC["Tier C: Settlement Batch Reconciliation"]
        C1["Paystack Settlements (GET /settlement)"] <--> C2["Settlement Transactions (GET /settlement/:id/tx)"]
        C3["Track Payouts Dispatched to Commercial Bank"]
    end

    subgraph TierD["Tier D: Commercial Bank Statement Reconciliation"]
        D1["Physical Commercial Bank Statement"] <--> D2["Paystack Settlement Payout Batches"]
    end

    TierA --> TierB --> TierC --> TierD
```

---

## 3. TIER SPECIFICATIONS & DISCREPANCY DETECTION

### Tier A: Balance Reconciliation
- **Objective:** Ensure the total un-settled funds held by Paystack match MangaPay's internal clearing asset balance.
- **Data Sources:** Paystack `GET /balance` vs MangaPay `PAYSTACK_CLEARING_ASSET` ledger account.
- **Invariants:** 
  $$\Delta_{\text{balance}} = \text{Balance}_{\text{Paystack}} - \text{Balance}_{\text{Ledger}} = 0$$
- If $|\Delta| > 0$, an alert is triggered for immediate line-item investigation.

### Tier B: Line-Item Transaction Reconciliation
- **Objective:** Match every individual incoming deposit and transfer line item by reference, currency, and amount.
- **Data Sources:** Paystack `GET /transaction?from=...&to=...` vs MangaPay `Transaction` table.
- **Anomaly Detection Categories:**
  1. **Matched:** Transaction reference, amount, and status agree across both systems.
  2. **Missing Webhooks (Gateway Confirmed / Local Missing):** Transaction succeeded on Paystack, but no webhook was delivered to MangaPay (or the local status remains `PENDING`). The reconciliation engine flags these for automated status recovery or manual settlement.
  3. **Unverified Local Credits:** A transaction exists as `SUCCESS` in MangaPay's local database, but does not exist on Paystack's gateway records. This is a critical fraud/integrity indicator.
  4. **Fee Discrepancies:** Differences between Paystack's gateway fee deduction and MangaPay's platform fee ledger entry.

### Tier C: Settlement Batch Reconciliation
- **Objective:** Verify that funds collected by Paystack are properly grouped into settlement batches and paid out to MangaPay's designated corporate bank account.
- **Data Sources:** Paystack `GET /settlement` and `GET /settlement/{id}/transactions`.
- **Handling Provider Constraints:** In sandbox/test mode or where live merchant settlement permissions are pending, the service gracefully catches `403 Forbidden` / `404 Not Found` and records:
  ```json
  {
    "status": "UNAVAILABLE",
    "reason": "Settlement API requires live Paystack merchant account with active settlement schedules. Handled gracefully without mock fabrication."
  }
  ```
  This adheres strictly to our core audit principle: **No fabricated financial success or mock numbers.**

### Tier D: Physical Bank Statement Reconciliation
- **Objective:** Verify that settlement payouts dispatched by Paystack arrive in MangaPay's commercial bank account.
- **Output:** Produces reconciliation notes and expected bank credit amounts for the accounting operations team.

---

## 4. AUDIT AND VERIFICATION EVIDENCE

The test suite [`backend/scripts/test-sprint4-audit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint4-audit.ts) executed synthetic line-item matching across edge cases:

```
--- 5. Priorities 5 & 6: Paystack Line-Item & Settlement Reconciliation ---
  ✅ [PASS] Line-item recon matches confirmed transactions correctly
  ✅ [PASS] Line-item recon detects dropped webhook (PAY-002)
  ✅ [PASS] Line-item recon detects gateway-success / local-pending discrepancy (PAY-003)
  ✅ [PASS] Line-item recon detects unverified local credit (LOCAL-GHOST-999)
  ✅ [PASS] Settlement reconciliation handles non-permitted or test mode gracefully without fake data
```

### Verification Findings
- Matched transactions passed with zero variance.
- Dropped webhooks were isolated with full reference, amount, and timestamp metadata.
- Unverified local credits were flagged with immediate audit alerts.
- Permission errors in non-live environments produced explicit audit warnings rather than masked success.

### Conclusion
MangaPay's financial reconciliation engine provides comprehensive visibility across balance, transaction, and settlement layers, preventing balance leakage and providing operational audit readiness.
