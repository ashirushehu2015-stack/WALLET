# MANGAPAY — PILOT CLOSURE AND REFUND RUNBOOK
## AUDITED 10-STAGE SUNSET OPERATIONAL RUNBOOK: RECONCILIATION, DISPUTE RESOLUTION AND CONTROLLED RESIDUAL REFUNDS

**Document Reference:** `MANGAPAY-OPS-S7.3-CLS-001`  
**Classification:** Operational Governance & Pilot Sunset Runbook  
**Author:** Financial Systems Auditor & Operations Lead  
**Sprint:** 7.3  
**Date:** 9 November 2026  
**Status:** ESTABLISHED & MANDATORY FOR PILOT SUNSET  

---

## 1. EXECUTIVE MANDATE: ELIMINATION OF BLIND AUTO-REFUNDS

In Sprint 7.1 and 7.2, earlier documentation proposed executing an unconditional automatic refund of all residual customer wallet balances at the end of the 14-day pilot.

### Forensic Risk Identified:
Executing automatic, unconditional refunds via batch cron jobs presents severe operational and financial risks:
1. **Unresolved In-Flight Transactions:** Transactions in `PROCESSING` state or pending carrier requeries could be double-refunded or trapped.
2. **Disputed or Suspense Funds:** Funds held in `SUSPENSE_LIABILITY` due to KYC limit breaches or mismatched payer references could be paid out to the wrong individual before ownership verification.
3. **Double-Spend via Webhook Latency:** Incoming late webhooks could credit wallets while automatic payouts are in progress.
4. **Preservation Principle:** Digital payment audits require that original transactions **must never be deleted or reversed**. Residual disbursements must be booked as explicit, traceable refund payouts.

In Sprint 7.3, unconditional auto-refunds are **formally deprecated** and replaced with the **Audited 10-Stage Pilot-Closure Workflow**.

---

## 2. THE 10-STAGE AUDITED PILOT-CLOSURE WORKFLOW

```
+-----------------------------------------------------------------------------------------+
|                               PILOT CLOSURE EXECUTION FLOW                              |
+-----------------------------------------------------------------------------------------+
  [STAGE 1]  Freeze Customer Financial Mutations (DVA lock, transfers disabled)
     |
  [STAGE 2]  Continue Ingesting Provider Webhooks (Paystack / VTpass T+1 sweeps)
     |
  [STAGE 3]  Resolve In-Flight Transactions (Requeries & timeouts cleared)
     |
  [STAGE 4]  Execute Comprehensive 3-Tier Financial Reconciliation (Layer A = B = C)
     |
  [STAGE 5]  Generate Individual Customer Closure Statements
     |
  [STAGE 6]  Segment Clean vs Disputed / Suspense Funds
     |
  [STAGE 7]  Submit Formal Pilot-Closure Batch Refund Requests
     |
  [STAGE 8]  SUPER_ADMIN Dual-Approval Sign-Off (Enforcing ₦5,000 threshold)
     |
  [STAGE 9]  Execute Authorized Payouts with Paystack References & Ledger Reversals
     |
  [STAGE 10] Escalate Unresolved Balances & Publish Final Sunset Audit Report
```

---

## 3. STEP-BY-STEP OPERATIONAL PROCEDURES

### STAGE 1: Freeze Customer-Initiated Financial Transactions
- **Execution Time:** Day 14 at 23:59 WAT.
- **Action:** Transition platform to read-only maintenance mode:
  ```bash
  npm run pilot:sunset -- --freeze-mutations
  ```
- **Technical Effect:** DVA accounts stop accepting deposits; P2P transfers, VAS purchases, and customer withdrawal endpoints reject new requests with `HTTP 503: Pilot Evaluation Period Concluded`.

### STAGE 2: Continue Ingestion of Provider Webhooks
- **Mandatory Control:** Paystack and VTpass webhook ingestion endpoints (`/api/v1/webhooks/*`) **remain 100% active**.
- **Rationale:** Any payment dispatched near the 23:59 deadline settles on $T+1$; webhooks must be received to credit clearing assets and avoid unbooked bank variances.

### STAGE 3: Resolve In-Flight Pending Transactions
- Query all transactions where `status IN ('PENDING', 'PROCESSING', 'RESERVED')`.
- For VAS transactions in `RESERVED`: Trigger authoritative VTpass status requery. If carrier failed, execute automated compensating refund to wallet.
- For withdrawals in `PROCESSING`: Trigger Paystack transfer requery. If transfer completed, commit ledger hold; if failed, reverse hold.

### STAGE 4: Execute Comprehensive 3-Tier Financial Reconciliation
- Run automated audit:
  ```bash
  npm run audit:reconcile
  ```
- Verify:
  $$\sum \text{Wallet Accounts (Layer A)} \equiv \text{Account 2010 (Layer B Customer Liabilities)}$$
  $$\sum \text{Debits} - \sum \text{Credits} = 0.0000\text{ NGN (Zero Tolerance)}$$
  $$\text{Paystack Clearing Asset (1020)} \equiv \text{Verified Gateway Transaction Total}$$

### STAGE 5: Generate Individual Customer Closure Statements
- For each of the 10 participants, generate an immutable PDF/JSON closure statement itemizing:
  - Total deposits credited.
  - Total VAS purchases made.
  - Total P2P transfers sent and received.
  - Total fees paid.
  - Net residual available balance refundable to customer.

### STAGE 6: Segment Clean vs Disputed / Suspense Funds
- **Clean Balances:** Available wallet balance where KYC Tier-1 is verified, 0 active disputes exist, and source funding is fully confirmed.
- **Suspense Balances (Account 2100):** Over-limit deposits or unassigned DVA inflows **CANNOT be refunded to participant wallets**. They remain held in `SUSPENSE_LIABILITY` pending manual banking verification of the originating bank account.

### STAGE 7: Submit Formal Batch Refund Requests
- System generates a `RefundApprovalRequest` for each participant maintaining an available balance $> ₦0.00$.
- Each request records: `userId`, `depositId`, `exactAmount`, `destinationAccount`, `reason: "Pilot Sunset Residual Wallet Settlement"`.

### STAGE 8: SUPER_ADMIN Dual-Approval Sign-Off
- Because the Pilot Dual-Approval Threshold is set to **₦5,000.00**:
  - Any participant residual balance $> ₦5,000$ strictly mandates secondary review and approval by the `SUPER_ADMIN`.
  - Self-approval is rejected.
  - Approver verifies that the refund amount exactly matches the reconciled customer closure statement.

### STAGE 9: Execute Authorized Payouts with Paystack References
- For approved refund requests, the system calls `PaystackService.initiateTransfer`:
  - Destination: Customer's verified commercial bank account (from original deposit or KYC record).
  - Payout reference: `REF-SUNSET-<userId>-<timestamp>`.
  - Paystack Transfer ID recorded in `refund_approval_requests` and `deposits`.
- Post balanced double-entry journal atomically:
  - **Debit:** Account 2010 (Customer Wallet Liability `USER_LIABILITY_${userId}`)
  - **Credit:** Account 1020 (`PAYSTACK_CLEARING_ASSET`)
- Customer available balance decrements to `₦0.0000`.

### STAGE 10: Escalate Unresolved Balances & Publish Sunset Report
- In the event a bank payout fails (e.g., customer bank account frozen or invalid NUBAN):
  - The balance is moved to an Escrow Closure Ledger.
  - Customer support initiates direct telephone contact to verify secondary bank details.
- The assurance team compiles and delivers the formal **Pilot Sunset Audit Report** to the proprietor.

---

## 4. PRESERVATION OF HISTORICAL INTEGRITY

### Strict Audit Invariant:
Under no circumstances are historical customer deposits, transfers, or journal lines deleted or overwritten. The sunset payout is an additive, balanced financial event that brings customer liability accounts to zero while preserving the complete, immutable transaction history for regulatory compliance.
