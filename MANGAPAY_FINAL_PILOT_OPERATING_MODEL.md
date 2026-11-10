# MANGAPAY — FINAL PILOT OPERATING MODEL
## DEFINITIVE 10-PARTICIPANT / 14-DAY CONTROLLED PILOT SPECIFICATION AND GOVERNANCE MODEL

**Document Reference:** `MANGAPAY-OPS-S7.3-OPM-001`  
**Classification:** Definitive Operating Model & Pilot Governance Blueprint  
**Author:** Principal FinTech Systems Architect & Operations Lead  
**Sprint:** 7.3  
**Date:** 9 November 2026  
**Status:** AUTHORITATIVE PILOT BLUEPRINT — PENDING PROPRIETOR LAUNCH AUTHORIZATION  

---

## 1. OBJECTIVE & PILOT MANDATE

The MangaPay Controlled Pilot is an internal, closed-cohort evaluation designed to validate end-to-end user journeys, payment rails, double-entry ledger invariance, and operational risk controls under real-world conditions with strictly capped financial exposure.

**Mandatory Operating Principle:**
The pilot cannot and must not be activated automatically. Launch is contingent upon the proprietor fulfilling commercial prerequisites and signing the Go-Live charter.

---

## 2. PILOT ELIGIBILITY & ONBOARDING

### 2.1 Participant Eligibility Criteria
- **Cohort Size:** Exactly 10 pre-vetted internal individuals (employees, advisors, designated trusted testers).
- **Public Registration:** Public self-registration is **DISABLED**.
- **Onboarding Method:** Each participant receives an administrative single-use invitation token.
- **Mandatory Consent:** Each participant must sign the *Pilot Participation Agreement & Risk Disclosure Notice* acknowledging that testing limits apply.

### 2.2 KYC & Verification Requirements
- **Verification Standard:** CBN Tier-1 standard (Phone number verification, full legal name, email address).
- **DVA Assignment:** Upon phone verification, Paystack Dedicated Virtual Account (DVA) is assigned to the participant's wallet.

---

## 3. PERMITTED SERVICES & FINANCIAL LIMITS

### 3.1 Service Whitelist

| Service Category | Operational Status | Technical Implementation |
| :--- | :---: | :--- |
| **DVA Inbound Bank Deposit** | **APPROVED** | Inbound transfer to assigned Paystack Dedicated Virtual Account. |
| **Airtime Purchase (VAS)** | **APPROVED** | MTN, Airtel, Glo, 9mobile VTpass API integration. |
| **Mobile Data Purchase (VAS)** | **APPROVED** | Data bundle purchase via VTpass API integration. |
| **Internal Peer-to-Peer (P2P)** | **APPROVED** | Instant ledger reallocations between pilot participants. |
| **Commercial Bank Withdrawal** | **APPROVED** | Outbound payout via Paystack Transfer API to user's bank account. |
| **Electricity & Utility Bills** | **EXCLUDED** | Disabled via feature flag during the pilot. |
| **Cable TV Subscriptions** | **EXCLUDED** | Disabled via feature flag during the pilot. |
| **Betting & Merchant Checkout** | **EXCLUDED** | Disabled via feature flag during the pilot. |

### 3.2 Tiered Exposure Limits

| Policy Limit | Audited Cap | Enforcement Point | Behavior upon Breach |
| :--- | :---: | :--- | :--- |
| **Maximum Single Transaction** | **NGN 5,000.00** | `WalletService.ts` | Mutation rejected with `HTTP 400 Limit Exceeded`. |
| **Maximum Daily Outflow** | **NGN 10,000.00** | `WalletService.ts` | 24h rolling velocity check; rejects further debits. |
| **Cumulative Deposit Ceiling** | **NGN 10,000.00** | `DepositService.ts` | Inflows $> ₦10,000$ lifetime routed to `SUSPENSE_LIABILITY`. |
| **Aggregate Platform Exposure**| **NGN 100,000.00**| Cohort Cap | 10 participants $\times$ ₦10,000 = Absolute maximum gross liability. |
| **Pilot Duration** | **14 Calendar Days**| System Scheduler | Auto-sunset into read-only mode on Day 14 at 23:59 WAT. |

---

## 4. FINANCIAL GOVERNANCE & RECONCILIATION

### 4.1 Refund Dual-Approval Policy
- **Pilot Threshold:** Set to **₦5,000.00** via `AdminController.getDualApprovalThreshold()`.
- **Refunds $\le \text{NGN } 5,000.00$:** May be processed under standard administrator authority.
- **Refunds $> \text{NGN } 5,000.00$:** Strictly mandate secondary review and database approval by a `SUPER_ADMIN`.
- **Segregation of Duties:** Self-approval is mathematically and programmatically blocked ($\text{requesterId} \neq \text{approverId}$).
- **Amount Invariance:** Approved amount must match execution amount to the kobo.

### 4.2 Suspense Account Governance (Account 2100)
- Any inbound deposit exceeding the ₦10,000 cumulative limit or lacking verified customer mapping is booked to `SUSPENSE_LIABILITY` (Account 2100).
- Suspense funds **never credit customer wallet balances**.
- The administrator reviews the Suspense Queue daily at `GET /api/v1/admin/deposits/suspense`.

### 4.3 Daily 4-Tier Automated Reconciliation
- Executes every calendar day at **23:59 WAT** via automated cron:
  - **Tier A (Balance):** Paystack Clearing Asset vs live Paystack API balance.
  - **Tier B (Transactions):** Line-by-line matching of Paystack transactions vs internal deposits.
  - **Tier C (Settlements):** Ingests $T+1$ settlement batches to corporate settlement bank.
  - **Tier D (General Ledger):** Asserts $\sum \text{Debits} \equiv \sum \text{Credits}$ ($0.0000$ NGN discrepancy).

---

## 5. INCIDENT MANAGEMENT & EMERGENCY SUSPENSION

### 5.1 Emergency Kill Switch ("P0 Red Button")
- **Authority:** Strictly reserved for `SUPER_ADMIN`.
- **Activation Endpoint:** `POST /api/v1/admin/emergency/kill-switch/activate`.
- **Impact:** Instantly returns `HTTP 503` for customer transactions while preserving gateway webhooks, read-only balance lookups, and administrative audit tools.

### 5.2 Complaint Handling & Escalation
- **Support Channel:** Dedicated WhatsApp group and direct telephone hotline for the 10 participants.
- **Response SLAs:**
  - P0 (Ledger or financial discrepancy): Acknowledged in 5 mins; resolved in $< 1$ hour.
  - P1 (Failed VAS transaction): Acknowledged in 15 mins; auto-refunded or resolved in $< 2$ hours.
  - P2 (General question): Acknowledged in 30 mins.

---

## 6. PILOT TERMINATION & 10-STAGE SUNSET RUNBOOK

On Day 14 at 23:59 WAT, the pilot terminates in accordance with the 10-stage audited sunset runbook:
1. Freeze customer financial mutations.
2. Ingest pending provider webhooks.
3. Resolve in-flight pending holds.
4. Execute final 3-tier financial reconciliation.
5. Generate individual customer closure statements.
6. Segment clean vs suspense balances.
7. Submit batch refund approval requests.
8. SUPER_ADMIN review and approval (enforcing ₦5,000 dual-approval threshold).
9. Disburse residual wallet funds to verified external bank accounts via Paystack Transfer API.
10. Publish Final Pilot Sunset Audit Report.

---

## 7. RESPONSIBILITY MATRIX (RACI)

| Operational Domain | Proprietor | System Administrator | SUPER_ADMIN | Financial Reviewer | Customer Support Officer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Commercial KYB & Bank Setup** | **Accountable (A)** | Responsible (R) | Informed (I) | Consulted (C) | Informed (I) |
| **Float Pre-Funding (₦150k)** | **Accountable (A)** | Informed (I) | Responsible (R) | Consulted (C) | Informed (I) |
| **Participant Onboarding** | Informed (I) | **Responsible (R)** | Consulted (C) | Informed (I) | Responsible (R) |
| **Standard Refunds ($\le ₦5,000$)**| Informed (I) | **Responsible (R)** | Informed (I) | Consulted (C) | Informed (I) |
| **High Refunds ($> ₦5,000$)** | Consulted (C) | Requesting (R) | **Authorizing (A)** | Consulted (C) | Informed (I) |
| **Daily 4-Tier Reconciliation** | Informed (I) | Responsible (R) | Consulted (C) | **Accountable (A)** | Informed (I) |
| **Emergency Kill Switch** | Consulted (C) | Informed (I) | **Accountable (A)** | Consulted (C) | Informed (I) |
| **Pilot Sunset Disbursement** | **Accountable (A)** | Responsible (R) | **Authorizing (A)** | Responsible (R) | Informed (I) |
