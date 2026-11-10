# MANGAPAY — COMMERCIAL ACTIVATION, PROVIDER READINESS & PILOT GO-LIVE CHECKLIST

**Author:** Technical Product Consultant, FinTech Operations Specialist & Financial Systems Auditor  
**Document Reference:** MANGAPAY-COMMERCIAL-CHECKLIST-2026-11-09  
**Operating Entity:** MangaPay (Technology Service Provider operating under Registered Business Name)  
**Status:** READY FOR OPERATIONAL EXECUTION  
**Date:** November 9, 2026  

---

## 1. OPERATING MODEL & REGULATORY BOUNDARIES

MangaPay is structured strictly as a **Technology Platform Provider**. It is owned and operated by a registered Nigerian Business Name.
- MangaPay does **NOT** hold an independent banking, mobile money operator (MMO), or payment service bank (PSB) license from the Central Bank of Nigeria (CBN).
- MangaPay provides the customer interface, digital ledger, wallet management software, and integration bridges to licensed third-party financial institutions.
- All stored customer value is cleared and settled through **Paystack Payments Limited** (duly licensed by the CBN) and its partner commercial settlement banks.
- Value Added Services (VAS: airtime, data, bills) are routed and fulfilled through **VTpass** (authorized payment aggregator).

To transition MangaPay from its current internal testing status to an active commercial pilot, the business owner must complete four non-engineering commercial and regulatory activations.

---

## 2. COMMERCIAL ACTIVATION CHECKLIST

### 2.1 Item 1: Paystack Dedicated Virtual Account (DVA) Commercial Approval
* **Operational Goal:** Enable live automated assignment of Dedicated NUBAN Virtual Accounts to verified MangaPay customers for inbound bank transfer deposits.
* **Current Status:** Tested successfully in Paystack Test Mode.
* **Prerequisites for Live Activation:**
  - Submit Corporate CAC Registration Documents (Business Name Registration Certificate, Status Report, Form CAC/BN/1).
  - Submit BVN / NIN validation of Business Proprietor / Ultimate Beneficial Owner (UBO).
  - Submit Utility Bill / Proof of Physical Operating Address.
  - Complete Paystack Compliance KYC/AML Form requesting **Dedicated NUBAN Virtual Accounts** activation.
  - Request Paystack Risk Team review to enable auto-assignment via `/dedicated_account`.
* **Lead Time:** 3 to 7 business days.
* **Responsible Party:** Managing Director / Business Proprietor.

### 2.2 Item 2: Paystack Commercial Settlement Account Configuration
* **Operational Goal:** Configure the primary corporate bank account where customer deposits collected through DVAs are settled by Paystack according to CBN clearing schedules (T+1).
* **Current Status:** Awaiting corporate bank account link on Paystack Live Dashboard.
* **Prerequisites for Live Activation:**
  - Corporate / Business Name Commercial Bank Account matching CAC registration name exactly.
  - Set Settlement Schedule: Daily Automated Settlement (T+1) to corporate account.
  - Ensure Paystack Clearing Asset account in MangaPay Chart of Accounts (`1020 - PAYSTACK_CLEARING_ASSET`) reconciles daily with Paystack settlement statements.
* **Lead Time:** 1 to 2 business days.
* **Responsible Party:** Finance / Treasury Lead.

### 2.3 Item 3: Paystack Transfers Balance (Payout Float) Pre-Funding
* **Operational Goal:** Provide liquid working capital in the Paystack Transfers float to fulfill outward customer withdrawals and P2P payouts to commercial bank accounts.
* **Current Status:** Architecture implemented with dual-authorization and balance validation. Live balance currently ₦0.00.
* **Prerequisites for Live Activation:**
  - Transfer initial pilot operational float (Recommended: **$\text{NGN } 250,000.00$ to $\text{NGN } 500,000.00$**) from corporate bank account into Paystack Transfers Balance.
  - Configure Low-Balance Automated Alerts via Paystack Dashboard:
    - Threshold: $\text{NGN } 100,000.00$.
    - Notification channels: Email to Treasury Lead and Operations SMS.
  - Verify MangaPay internal ledger account `1021 - PAYSTACK_FLOAT_ASSET` is credited upon float receipt.
* **Lead Time:** Same-day (NIP Bank Transfer).
* **Responsible Party:** Treasury Lead.

### 2.4 Item 4: VTpass Distributor Wallet Pre-Funding & VAS Float Management
* **Operational Goal:** Ensure liquid distributor float in VTpass to instantly vend airtime, mobile data bundles, and utility services to customers.
* **Current Status:** Endpoints, catalog synchronization, profit calculation, and ledger journals verified. Live distributor balance currently ₦0.00.
* **Prerequisites for Live Activation:**
  - Fund VTpass Live Wallet with initial pilot distributor float (Recommended: **$\text{NGN } 100,000.00$ to $\text{NGN } 200,000.00$**).
  - Configure Auto-Topup or Low-Balance Threshold Alert on VTpass Portal:
    - Alert Trigger: $\text{NGN } 30,000.00$.
  - Record pre-funding in MangaPay internal ledger:
    $$\text{DEBIT } \text{VTPASS\_FLOAT\_ASSET (1030)} \quad \text{Float Amount}$$
    $$\text{CREDIT } \text{CORPORATE\_BANK\_ACCOUNT (1010)} \quad \text{Float Amount}$$
* **Lead Time:** Same-day.
* **Responsible Party:** Operations Lead.

---

## 3. COMPLIANCE, CUSTOMER TERMS & OPERATIONAL GOVERNANCE

### 3.1 Customer Terms of Service & Privacy Policy Disclosures
Before onboarding external pilot customers:
- **Disclose Entity Status:** Customer Terms of Service must clearly state:
  > *"MangaPay is a financial technology software provider, not a bank or licensed deposit-taking institution. Payment services, dedicated account issuance, and fund custody are provided exclusively through licensed financial partners including Paystack Payments Limited."*
- **Privacy Policy:** Include explicit notice regarding field-level encryption of BVN and NIN in accordance with the Nigeria Data Protection Act (NDPA 2023).

### 3.2 Administrative Security & Operations Runbook
- Mandatory Two-Factor Authentication (2FA) enforced on Paystack Dashboard and VTpass Partner Portal for all administrative users.
- Role-based separation: No single operator possesses both Paystack payout credentials and MangaPay database master access.
- Daily 08:00 AM reconciliation runbook: Review automated reconciliation discrepancies (`/api/v1/admin/reconciliation/daily`).

---

## 4. COMMERCIAL ACTIVATION ACTION MATRIX

| Action Item | Task Description | Owner | Target Date | Readiness Status |
| :--- | :--- | :--- | :--- | :--- |
| **COMM-01** | Submit Paystack Live DVA activation documents | Managing Director | Nov 12, 2026 | Pending CAC Review |
| **COMM-02** | Link Corporate Bank Settlement Account on Paystack | Finance Lead | Nov 13, 2026 | Ready for Linkage |
| **COMM-03** | Fund Paystack Transfer Float (₦250k initial) | Treasury Lead | Nov 14, 2026 | Capital Ready |
| **COMM-04** | Fund VTpass Distributor Float (₦100k initial) | Operations Lead | Nov 14, 2026 | Capital Ready |
| **COMM-05** | Publish Updated Terms of Service & Privacy Policy | Legal / Compliance | Nov 15, 2026 | Draft Completed |
| **COMM-06** | Conduct 10-Customer Controlled Closed Pilot | QA & Product Lead | Nov 16, 2026 | Scheduled |

---

## 5. SUMMARY RECOMMENDATION

All engineering blockers are resolved. Once Commercial Items **COMM-01 through COMM-04** are funded and activated, MangaPay can immediately transition from pre-production testing to a live, controlled 10-to-25 customer pilot.
