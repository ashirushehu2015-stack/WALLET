# MANGAPAY — FINAL PILOT CONTROL MATRIX
## OPERATIONAL RISK CONTROLS, EMERGENCY SUSPENSION AND GOVERNANCE POLICIES FOR CONTROLLED PILOT

**Document Reference:** `MANGAPAY-OPS-S7.2-CTL-001`  
**Classification:** Operational Risk Management & Pilot Controls Matrix  
**Author:** Operational Risk Lead & FinTech Quality Assurance Lead  
**Sprint:** 7.2  
**Date:** 9 November 2026  
**Status:** ESTABLISHED & ENFORCED  

---

## 1. CONTROLLED PILOT MANDATE & SCOPE

The MangaPay Controlled Pilot is designed to evaluate software stability, ledger accuracy, and user experience under strictly controlled parameters. **The pilot cannot and must not be activated automatically.**

### Core Pilot Constraints:
- **Cohort Size:** Exactly 10 invited internal participants.
- **Pilot Duration:** Exactly 14 calendar days from launch.
- **Total Platform Capital at Risk:** Capped at `₦100,000.00` ($10 \times ₦10,000$).
- **Permitted Services:** Deposit (DVA), Airtime, Mobile Data, P2P Transfers, Withdrawal.
- **Excluded Services:** Electricity billing, cable TV, betting funding, foreign exchange.

---

## 2. 15-POINT PILOT CONTROL MATRIX

The table below defines the 15 mandatory operational controls, their enforcement mechanisms, responsible roles, and verification criteria:

| # | Control Area | Policy Specification | Enforcement Mechanism | Responsible Owner | Verification Criteria |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Participant Cohort Cap** | Strictly limited to 10 named, pre-vetted participants. Public self-registration is closed. | Whitelist filter in `AuthController.register`; invite code required. | Admin Operations | Only 10 user IDs present in active pilot cohort. |
| **2** | **Pilot Duration & Sunset** | Pilot runs for exactly 14 calendar days; automated sunset on Day 14. | Cron job evaluates `PILOT_START_DATE + 14d`; triggers read-only lock. | Systems Architect | Services transition to maintenance mode on Day 14 at 23:59 WAT. |
| **3** | **Customer Exposure Cap** | Hard ceiling of ₦10,000 cumulative deposits per participant across entire pilot. | `DepositService` checks cumulative user deposits; rejects inflows $> ₦10,000$. | Financial Engineer | Database check confirms no user exceeds ₦10,000 lifetime deposit. |
| **4** | **Transaction Limits** | Max single transaction: ₦5,000. Max daily velocity: ₦10,000. | Service-level limit check in `WalletService.ts`. | Backend Engineer | Transactions exceeding limits throw `HTTP 400 Limit Exceeded`. |
| **5** | **Approved Services Only** | Only Airtime, Mobile Data, P2P, DVA Deposits, and Bank Payouts permitted. | Feature flags disable electricity, cable TV, and merchant checkout. | Product Lead | API calls to disabled services return `HTTP 403 Service Disabled`. |
| **6** | **KYC Standards** | Tier-1 verification (phone number + full legal name) required before transacting. | `KYCService` validates identity status before wallet activation. | Compliance Officer | 100% of pilot cohort verified at Tier-1. |
| **7** | **Informed Consent** | Participants must sign a written pilot disclosure acknowledging testing limits. | Countersigned digital or physical consent forms archived. | Legal Counsel | 10/10 signed consent forms in compliance archive. |
| **8** | **Daily 4-Tier Reconciliation** | Full automated ledger, wallet, and gateway audit executed daily at 23:59 WAT. | Scheduled cron executes `ReconciliationService.runReconciliation()`. | Financial Auditor | Zero discrepancy across Layer A, Layer B, and Layer C reports. |
| **9** | **Suspense Monitoring** | Account 2100 reviewed daily for uncredited or over-limit deposits. | Admin Suspense Queue alert (`GET /api/v1/admin/deposits/suspense`). | Admin Operations | Suspense queue investigated and cleared within 24 hours. |
| **10** | **Refund Dual-Approval** | Any refund $> ₦100,000$ requires SUPER_ADMIN approval. Self-approval strictly blocked. | `RefundApprovalRequest` state machine in `AdminController.ts`. | SUPER_ADMIN | Multi-actor approval verified in database before execution. |
| **11** | **Fraud & Brute-Force Defense**| 5 failed login attempts locks account for 15 minutes; IP rate limited. | `LoginThrottlingService` + `express-rate-limit`. | Security Engineer | Automated lockout triggered after 5 consecutive failures. |
| **12** | **Dedicated Support Channel**| Dedicated direct communication channel for pilot participants. | WhatsApp dedicated group + direct phone line to support lead. | Support Lead | 100% of reported issues acknowledged within 15 minutes. |
| **13** | **Incident Response Plan** | Documented P0/P1 triage protocol with 1-hour resolution target. | Standard Incident Response Runbook with on-call rotation. | Technical Lead | Clear escalation path from Support $\rightarrow$ Tech $\rightarrow$ Proprietor. |
| **14** | **Emergency Kill Switch** | Single-command suspension of all monetary transactions without server reboot. | Middleware checks `KILL_SWITCH_ACTIVE=true` in Redis/Environment. | DevOps Engineer | Instant rejection of all write transactions with HTTP 503. |
| **15** | **End-of-Pilot Sunset Audit** | Comprehensive final reconciliation, residual refunding, and technical audit. | Post-pilot reconciliation script + formal Sunset Report. | Assurance Lead | All residual customer balances refunded to source accounts. |

---

## 3. EMERGENCY TRANSACTION SUSPENSION ("KILL SWITCH") RUNBOOK

In the event of a security anomaly, gateway failure, or ledger imbalance during the pilot, the emergency suspension protocol must be activated immediately.

```
+-----------------------------------------------------------------------------------------+
|                               EMERGENCY KILL SWITCH RUNBOOK                             |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               | 1. Incident Detection & P0 Alert                      |
               | (Imbalance > ₦0, repeated webhook errors, fraud alert)|
               +-------------------------------------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               | 2. Activate Global Transaction Freeze                 |
               | Command: npm run emergency:kill-switch -- --enable    |
               | (Sets KILL_SWITCH_ACTIVE=true in environment/cache)   |
               +-------------------------------------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               | 3. Middleware Enforces Read-Only Mode                 |
               | - Inbound deposits: Held in Paystack clearing pool    |
               | - Outbound transfers & VAS: Rejected (HTTP 503)       |
               | - Customer dashboards: Display maintenance notice     |
               +-------------------------------------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               | 4. Technical Triage & Ledger Verification             |
               | - Execute npx ts-node scripts/audit-ledger.ts         |
               | - Identify root cause & apply targeted hotfix         |
               +-------------------------------------------------------+
                                           |
                                           v
               +-------------------------------------------------------+
               | 5. Controlled Resumption (Requires SUPER_ADMIN Signoff|
               | Command: npm run emergency:kill-switch -- --disable   |
               +-------------------------------------------------------+
```

---

## 4. END-OF-PILOT SUNSET & SETTLEMENT PROTOCOL

On Day 14 at 23:59 WAT, the pilot terminates in accordance with the following procedure:
1. **Freeze Inflows:** DVA virtual accounts are locked; no further deposits are accepted.
2. **Execute Final Reconciliation:** Run automated 4-tier reconciliation audit across all 10 user wallets.
3. **Refund Residual Balances:** Any customer wallet maintaining an unspent available balance is refunded to the customer's verified external commercial bank account via Paystack Transfer API.
4. **Publish Sunset Report:** The assurance team compiles the final Pilot Sunset Audit Report detailing uptime, transaction success rate, total volume, fees earned, and ledger reconciliation accuracy.
