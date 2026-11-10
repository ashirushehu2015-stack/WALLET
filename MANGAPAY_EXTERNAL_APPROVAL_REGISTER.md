# MANGAPAY — EXTERNAL APPROVAL REGISTER
## EVIDENCE REGISTER: THIRD-PARTY GATEWAY APPROVALS, COMMERCIAL AGREEMENTS AND REGULATORY COMPLIANCE

**Document Reference:** `MANGAPAY-REG-S7.2-DEP-001`  
**Classification:** Regulatory Compliance & Commercial Licensing Register  
**Author:** Regulatory Compliance Specialist & FinTech Systems Architect  
**Sprint:** 7.2  
**Date:** 9 November 2026  
**Status:** ACTIVE REGISTER — COMMERCIAL ACTIONS REQUIRED BY PROPRIETOR  

---

## 1. COMPLIANCE & LEGAL POSTURE

MangaPay is registered and operates as a **Business Name** under the Companies and Allied Matters Act (CAMA Part B) registered with the Corporate Affairs Commission (CAC) of Nigeria.

**Regulatory Boundary:**
- MangaPay is a **technology and financial software provider**.
- It is **not** a licensed Deposit Money Bank (DMB), Microfinance Bank (MFB), or Mobile Money Operator (MMO).
- Stored value and payment flows are facilitated via licensed infrastructure (Paystack Payments Limited, its partner acquiring banks, and VTpass).

**Strict Audit Standard:**
No approval item may be marked `PASS` based on technical capability alone. Each entry must distinguish between:
1. **Technical Code Readiness:** Whether software modules, APIs, webhooks, and ledger integrations are implemented and verified.
2. **Commercial & Legal Authorization:** Whether formal written agreements, compliance sign-offs, and live accounts have been executed by counterparty institutions.

---

## 2. EXTERNAL APPROVAL & EVIDENCE REGISTER

| ID | Approval Domain | Counterparty | Technical Code Status | Commercial / Legal Status | Blocking Level | Verifiable Evidence Required for PASS |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **APP-01** | **Paystack KYB Approval** | Paystack Payments Ltd | **VERIFIED (100%)** | **IN PROGRESS** | **P0 (CRITICAL)** | Active Production Merchant Dashboard status; Verified CAC Business Name Certificate. |
| **APP-02** | **Paystack DVA Written Approval** | Paystack / Partner Bank (Wema/Titan) | **VERIFIED (100%)** | **IN PROGRESS** | **P0 (CRITICAL)** | Written confirmation from Paystack authorizing Dedicated Virtual Account (DVA) generation in production. |
| **APP-03** | **Corporate Settlement Account** | Licensed Commercial Bank (e.g. Zenith, GTBank) | **VERIFIED (100%)** | **PENDING** | **P0 (CRITICAL)** | Bank Account Confirmation Letter matching registered Business Name; linked to Paystack settlement profile. |
| **APP-04** | **Paystack Payout Float Funding** | Paystack Payments Ltd | **VERIFIED (100%)** | **PENDING** | **P1 (HIGH)** | Bank transfer confirmation receipt of ₦100,000 float deposited into Paystack transfer balance. |
| **APP-05** | **VTpass VAS Production Approval & Float** | VTpass (Inlaks / Mobile Airtime Ltd) | **VERIFIED (100%)** | **IN PROGRESS** | **P1 (HIGH)** | Countersigned VTpass Partner SLA; proof of ₦50,000 operational float credit in VTpass portal. |
| **APP-06** | **Licensed Financial Partner Framework** | Regulated Financial Partner | **VERIFIED (100%)** | **IN PROGRESS** | **P1 (HIGH)** | Terms of Service explicitly identifying MangaPay as technology provider utilizing licensed banking rails. |
| **APP-07** | **Regulatory & Data Protection Obligations** | CBN & NDPC (Nigeria Data Protection) | **VERIFIED (100%)** | **VERIFIED (PASS)** | **RESOLVED** | CBN Tier-1 limits (₦50k/tx) enforced in code; AES-256-GCM encryption for BVN/NIN; Published Privacy Notice. |

---

## 3. EVIDENCE RECORD DETAILS

### Record APP-01: Paystack KYB & Merchant Verification
- **Technical Status:** Verified. `PaystackService` correctly handles HMAC verification, webhook parsing, and API authentication.
- **Commercial Status:** `IN PROGRESS`. The business registration documents (CAC Certificate of Registration of Business Name, Tax Identification Number, proprietor National Identity Card) have been prepared for submission.
- **Evidence Gap:** Awaiting final Paystack compliance team verification and activation of live API keys.

### Record APP-02: Paystack Dedicated Virtual Account (DVA) Approval
- **Technical Status:** Verified. Dynamic virtual account assignment (`customer.create`, `dedicated_account.create`) is fully tested and mapped to individual customer wallets.
- **Commercial Status:** `IN PROGRESS`. DVA issuance requires specific risk underwriting by Paystack's partner acquiring banks (e.g., Wema Bank, Titan Trust Bank).
- **Evidence Gap:** Formal notification from Paystack enabling the DVA feature flag on the live merchant account.

### Record APP-03: Corporate Settlement Account Confirmation
- **Technical Status:** Verified. Automated reconciliation tracks $T+1$ settlement batches to the corporate account.
- **Commercial Status:** `PENDING`. Under CBN AML/CFT regulations, merchant payouts cannot be swept to personal accounts when operating as a registered business entity.
- **Evidence Gap:** Submission of an official bank confirmation letter confirming an active corporate current account matching the CAC-registered Business Name.

### Record APP-04: Paystack Transfer Float Pre-Funding
- **Technical Status:** Verified. Payout hold, gateway dispatch, and balanced compensating ledger reversals are 100% verified.
- **Commercial Status:** `PENDING`. Pre-funding is held until KYB approval is achieved.
- **Evidence Gap:** Transfer of ₦100,000 operational float into Paystack transfer balance.

### Record APP-05: VTpass Production Approval & Float Funding
- **Technical Status:** Verified. 3-phase VAS settlement, status requeries, and error compensations are 100% verified.
- **Commercial Status:** `IN PROGRESS`. Integration sandbox testing complete; commercial partner agreement under review.
- **Evidence Gap:** Executed partner agreement and proof of ₦50,000 deposit into VTpass partner wallet.

### Record APP-06: Licensed Financial Partner Legal Framework
- **Technical Status:** Verified. The UI, error strings, and audit logs consistently reflect MangaPay's role as a technology provider.
- **Commercial Status:** `IN PROGRESS`. Legal disclosure and pilot participation agreements are drafted.
- **Evidence Gap:** Countersigned pilot participant agreements containing explicit regulatory disclosures.

### Record APP-07: Regulatory & Data Protection Compliance
- **Technical Status:** `PASS`. CBN Tier-1 limits (₦50,000 single transaction, ₦300,000 cumulative balance) are strictly enforced in `WalletService.ts`. BVN and NIN records are encrypted at rest using authenticated AES-256-GCM.
- **Regulatory Status:** `PASS`. Data protection notice published in compliance with the Nigeria Data Protection Act (NDPA 2023).

---

## 4. ACTION CHECKLIST FOR PROPRIETOR

To clear the pending commercial items and unlock pilot activation:

```
+-----------------------------------------------------------------------------------------+
|                              PROPRIETOR ACTION CHECKLIST                                |
+-----------------------------------------------------------------------------------------+
  [ ] 1. Obtain Corporate Current Account confirmation letter from commercial bank
  [ ] 2. Complete Paystack live merchant KYB upload (CAC Certificate + Bank Details)
  [ ] 3. Request Paystack DVA feature activation
  [ ] 4. Sign VTpass commercial partner agreement
  [ ] 5. Transfer ₦100,000 float to Paystack and ₦50,000 float to VTpass
  [ ] 6. Obtain 10 countersigned pilot user consent forms
```
