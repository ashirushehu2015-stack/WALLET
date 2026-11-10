# MANGAPAY — COMMERCIAL AND REGULATORY DEPENDENCY REGISTER
## SPRINT 7.1 GOVERNANCE REGISTER: LEGAL BOUNDARIES, LICENSING STATUS AND THIRD-PARTY PRE-REQUISITES

**Document Reference:** `MANGAPAY-GOV-7.1-DEP-001`  
**Classification:** Legal, Regulatory & Commercial Governance Register  
**Author:** Regulatory Compliance Specialist & FinTech Systems Architect  
**Sprint:** 7.1  
**Date:** 9 November 2026  
**Status:** ACTIVE REGISTER — ACTION REQUIRED BY BUSINESS PROPRIETOR  

---

## 1. LEGAL ENTITY CLASSIFICATION & OPERATING BOUNDARY

### 1.1 Corporate Structure & Regulatory Posture

MangaPay is structured and operated as a **Registered Business Name** under Part B of the Companies and Allied Matters Act (CAMA) registered with the Corporate Affairs Commission (CAC) of the Federal Republic of Nigeria.

**Mandatory Legal Boundary:**
1. MangaPay is **not** a licensed Deposit Money Bank (DMB), Primary Mortgage Bank (PMB), or Microfinance Bank (MFB).
2. MangaPay is **not** a Central Bank of Nigeria (CBN) licensed Mobile Money Operator (MMO) or Payment Service Bank (PSB).
3. MangaPay operates strictly as a **Technology and Financial Software Platform** that integrates with CBN-licensed and regulated financial institutions (Paystack Payments Limited, its partner commercial acquiring banks, and VTpass).
4. Customer funds are not held as bank deposits on MangaPay's balance sheet; they are held in trust accounts, settlement clearing pools, or dedicated virtual accounts managed by Paystack and partner commercial banks.

---

## 2. COMMERCIAL & REGULATORY DEPENDENCY MATRIX

The table below catalogs all external dependencies, legal prerequisites, third-party approvals, and banking arrangements required before MangaPay can transition from an internal development sandbox to a controlled production pilot.

| ID | Dependency Domain | Requirement Description | Governing Counterparty | Current Status | Blocking Level | Required Proof / Artifact |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- |
| **DEP-01** | Payment Processing | Formal Paystack KYB & Merchant Account Verification | Paystack Payments Ltd | **IN PROGRESS** | **CRITICAL (P0)** | Approved Paystack Merchant Dashboard status; Verified Certificate of Business Name |
| **DEP-02** | Virtual Accounts | Written Approval for Dedicated Virtual Account (DVA) Issuance | Paystack Payments Ltd / Partner Bank (Wema/Titan) | **IN PROGRESS** | **CRITICAL (P0)** | Production DVA API access keys activated on Paystack dashboard |
| **DEP-03** | Settlement Banking | Dedicated Corporate Settlement Account in Registered Business Name | Licensed Commercial Bank (e.g., Zenith, GTBank) | **PENDING** | **CRITICAL (P0)** | Official Bank Account Confirmation Letter showing matching CAC Business Name |
| **DEP-04** | Payout Float | Pre-funding of Paystack Transfer / Payout Float | Paystack Payments Ltd | **PENDING** | **HIGH (P1)** | Transfer of initial pilot operational float ($\approx \text{NGN } 100,000$) to Paystack balance |
| **DEP-05** | VAS Commercial | VTpass Commercial Merchant Agreement & Production API Keys | VTpass (Inlaks / Mobile Airtime Ltd) | **IN PROGRESS** | **HIGH (P1)** | Production Live API credentials and signed Partner Service Level Agreement (SLA) |
| **DEP-06** | VAS Float | Pre-funding of VTpass Operating Wallet Float | VTpass | **PENDING** | **HIGH (P1)** | Deposit of VAS operational float ($\approx \text{NGN } 50,000$) into VTpass portal |
| **DEP-07** | CBN Regulatory | Enforcement of CBN Tier-1 KYC Limits ($\le \text{NGN } 50,000$ tx, $\le \text{NGN } 300,000$ bal) | Central Bank of Nigeria (CBN) | **IMPLEMENTED** | **RESOLVED** | Verified in `WalletService.ts` and automated test suite |
| **DEP-08** | Data Privacy | Data Protection Compliance & Privacy Policy for PII/BVN Handling | Nigeria Data Protection Commission (NDPC) | **IMPLEMENTED** | **RESOLVED** | AES-256-GCM encryption at rest; Published Platform Privacy Notice |
| **DEP-09** | Pilot User Terms | Signed Controlled Pilot Participation & Risk Disclosure Agreement | Pilot Users (Max 10 named users) | **PENDING** | **HIGH (P1)** | Countersigned Pilot User Terms of Service acknowledging testing limits |

---

## 3. DETAILED PREREQUISITE ANALYSIS

### 3.1 Paystack Dedicated Virtual Account (DVA) Integration (DEP-01 & DEP-02)

To allow customers to fund their wallets via automated bank transfer:
- Paystack provisions Dedicated Virtual Accounts through partner commercial banks (e.g., Wema Bank, Titan Trust Bank).
- Paystack requires full business verification (CAC registration certificate, Tax Identification Number, government-issued ID of proprietor, and proof of operating address).
- **Current Position:** Technical API endpoints (`createDva`, `verifyTransaction`, `handleWebhook`) are 100% written, unit tested, and sandbox verified. Live keys cannot be injected into `.env` until Paystack activates the live merchant profile.

### 3.2 Corporate Settlement Account (DEP-03)

- Under Nigerian financial regulations and anti-money laundering (AML) directives, Paystack cannot settle funds into a personal individual bank account if the merchant profile is registered as a Business Name.
- The proprietor must establish a commercial bank corporate current account explicitly titled with the registered Business Name (e.g., *MangaPay Ventures* or *MangaPay Enterprise*).
- **Current Position:** Awaiting account opening confirmation and settlement bank linkage in Paystack settings.

### 3.3 VTpass VAS Infrastructure (DEP-05 & DEP-06)

- VTpass functions on a pre-funded debit model: every airtime, mobile data, or electricity token purchase debits MangaPay's VTpass merchant balance in real time.
- To prevent failed customer purchases, MangaPay must fund the VTpass partner balance with an initial operational float prior to onboarding pilot users.
- **Current Position:** In-memory reservation, idempotency, and automated compensatory refunds are fully verified. Operational funding is pending commercial activation.

---

## 4. REGULATORY SAFEGUARDS ENFORCED IN SOFTWARE

MangaPay has proactively implemented regulatory compliance rules within the codebase to ensure operations remain strictly within legal limits:

```
+-----------------------------------------------------------------------------------------+
|                               CBN REGULATORY COMPLIANCE TIERS                           |
+-----------------------------------------------------------------------------------------+
  Tier 1 (Phone Number Verified):
    - Maximum Single Transaction: NGN 50,000.00
    - Maximum Cumulative Daily Outflow: NGN 50,000.00
    - Maximum Permitted Balance: NGN 300,000.00
  Tier 2 (BVN / Identity Verified):
    - Maximum Single Transaction: NGN 200,000.00
    - Maximum Cumulative Daily Outflow: NGN 200,000.00
    - Maximum Permitted Balance: NGN 500,000.00
  Tier 3 (Proof of Address / Full KYC):
    - Maximum Single Transaction: NGN 5,000,000.00
    - Maximum Cumulative Daily Outflow: NGN 5,000,000.00
    - Maximum Permitted Balance: Unlimited
```

All tier boundaries are enforced at the service level in [`backend/src/services/wallet.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts) and validated against database records.

---

## 5. ACTION PLAN FOR BUSINESS PROPRIETOR

To clear the blocking commercial dependencies, the MangaPay proprietor must complete the following actions:

1. **Step 1 (Banking):** Complete corporate account opening with a commercial bank and obtain the official settlement account number.
2. **Step 2 (Paystack KYB):** Upload the CAC certificate, proprietor ID, and corporate bank details to the Paystack compliance portal. Request DVA feature activation.
3. **Step 3 (VTpass Setup):** Execute the VTpass merchant agreement and deposit an initial test float ($\text{NGN } 25,000–50,000$).
4. **Step 4 (Float Allocation):** Fund the Paystack transfer balance ($\text{NGN } 50,000–100,000$) to enable withdrawal testing for pilot users.
5. **Step 5 (Sign-off):** Submit proof of items 1–4 to the assurance team to transition to **Controlled Pilot Authorisation**.
