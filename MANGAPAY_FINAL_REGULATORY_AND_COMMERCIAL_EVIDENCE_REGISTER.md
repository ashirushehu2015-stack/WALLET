# MANGAPAY — FINAL REGULATORY AND COMMERCIAL EVIDENCE REGISTER
## LEGAL BOUNDARY ANALYSIS, REGULATORY APPLICABILITY AND THIRD-PARTY COMMERCIAL PREREQUISITES

**Document Reference:** `MANGAPAY-REG-S7.3-DEP-001`  
**Classification:** Regulatory Compliance & Legal Licensing Register  
**Author:** Regulatory Compliance Specialist & FinTech Legal Auditor  
**Sprint:** 7.3  
**Date:** 9 November 2026  
**Status:** ACTIVE AUDIT REGISTER — COMMERCIAL ACTIONS REQUIRED BY PROPRIETOR  

---

## 1. LEGAL ENTITY STATUS & REGULATORY APPLICABILITY

### 1.1 Corporate Structure & Boundary
MangaPay is registered and operates as a **Business Name** under Part B of the Companies and Allied Matters Act (CAMA) with the Corporate Affairs Commission (CAC) of the Federal Republic of Nigeria.

### 1.2 Authoritative Regulatory Applicability Analysis under Nigerian Financial Laws
A rigorous legal review of Nigerian financial service frameworks establishes the following:

1. **Central Bank of Nigeria (CBN) Stored-Value & Wallet Rules:**
   - Under the *CBN Guidelines on Mobile Money Services in Nigeria* and the *Regulatory Framework for the Sandbox Operations*, **holding stored value (customer deposits) and operating a closed/semi-closed digital wallet on an independent corporate balance sheet is a regulated financial activity**.
   - An entity operating solely as a Registered Business Name **CANNOT** legally hold customer deposits, issue independent virtual accounts, or provide stored-value wallet services under its own legal authority without an appropriate banking license (e.g., Deposit Money Bank, Microfinance Bank, Mobile Money Operator, or Payment Service Bank).

2. **The Required Legal Operating Model (Technology Service Provider Rails):**
   - MangaPay **can legally operate only as a Technology and Software Solutions Provider**.
   - Under this structure:
     - Customer funds are **not** liabilities of MangaPay.
     - Dedicated Virtual Accounts (DVAs) are legally issued by **Paystack's partner acquiring banks (e.g., Wema Bank, Titan Trust Bank)**.
     - Inbound deposits sit in the trust/clearing accounts of the regulated acquiring bank.
     - Payouts and transfers are executed through the licensed payment gateway's rails.
   - **Legal Implication:** MangaPay's terms of service and customer agreements must explicitly state that MangaPay provides technology interface software, while banking and stored-value services are powered by licensed financial institutions.

---

## 2. REGULATORY & COMMERCIAL EVIDENCE REGISTER

The register below catalogs every external approval, distinguishing verified technical code from pending legal documents and commercial agreements:

| ID | Dependency Domain | Counterparty | Technical Code Status | Commercial / Legal Status | Blocking Level | Verifiable Proof / Artifact Required for PASS |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **APP-01** | **Paystack Business KYB Approval** | Paystack Payments Ltd | **VERIFIED (100%)** | **IN PROGRESS** | **P0 (CRITICAL)** | Active Production Merchant Dashboard status; Verified CAC Business Name Certificate. |
| **APP-02** | **Paystack DVA Written Approval** | Paystack / Partner Bank (Wema/Titan) | **VERIFIED (100%)** | **IN PROGRESS** | **P0 (CRITICAL)** | Formal written approval/email from Paystack authorizing Dedicated Virtual Account (DVA) creation on live API. |
| **APP-03** | **Corporate Settlement Account** | Licensed Commercial Bank (e.g. Zenith, GTB) | **VERIFIED (100%)** | **PENDING** | **P0 (CRITICAL)** | Official Bank Confirmation Letter for Corporate Current Account matching registered Business Name; linked to Paystack. |
| **APP-04** | **Paystack Transfer Float Funding** | Paystack Payments Ltd | **VERIFIED (100%)** | **PENDING** | **P1 (HIGH)** | Official bank transfer receipt confirming ₦100,000 float pre-funded into Paystack transfer balance. |
| **APP-05** | **VTpass Commercial Approval & Float**| VTpass (Inlaks / Mobile Airtime Ltd) | **VERIFIED (100%)** | **IN PROGRESS** | **P1 (HIGH)** | Countersigned VTpass Partner Service Agreement; proof of ₦50,000 operational float credit in VTpass portal. |
| **APP-06** | **Licensed Partner Legal Framework** | Regulated Financial Partner | **VERIFIED (100%)** | **IN PROGRESS** | **P1 (HIGH)** | Terms of Service vetted by Nigerian financial legal counsel explicitly defining MangaPay's technology provider status. |
| **APP-07** | **Data Protection & User Consent** | NDPC (Nigeria Data Protection) & Pilot Users | **VERIFIED (100%)** | **IN PROGRESS** | **P1 (HIGH)** | 10 physically or digitally countersigned Pilot Participation & Risk Disclosure Agreements archived. |

---

## 3. EVIDENCE AUDIT & GAPS ANALYSIS

### APP-01 & APP-02: Paystack KYB and DVA Authorization
- **Technical Status:** Clean. Full API client, HMAC-SHA512 webhook ingestion, customer creation, and DVA assignment modules are fully tested.
- **Evidence Gap:** Paystack requires full business identity underwriting before enabling production DVA generation. Awaiting final live merchant approval from Paystack's underwriting team.

### APP-03: Corporate Settlement Current Account
- **Technical Status:** Clean. Settlement reconciliation tracks batch transfers to the settlement bank.
- **Evidence Gap:** Paystack cannot settle funds to a personal individual account when registered as a Business Name. The proprietor must complete opening a corporate current account titled with the exact CAC Business Name.

### APP-04 & APP-05: Operational Float Pre-Funding
- **Technical Status:** Clean. The quantitative exposure model ([`MANGAPAY_PILOT_FLOAT_AND_EXPOSURE_MODEL.md`](file:///c:/Users/pc/Desktop/WALLET/MANGAPAY_PILOT_FLOAT_AND_EXPOSURE_MODEL.md)) proves that ₦100,000 Paystack float and ₦50,000 VTpass float provide 200% and 166% solvency margins for the 10-user pilot.
- **Evidence Gap:** Bank transfer receipts confirming the physical funding of the provider float accounts are pending.

### APP-06: Regulated Partner Legal Framework
- **Technical Status:** Clean. All UI text and ledger models treat external funds as provider clearing receivables.
- **Evidence Gap:** The platform's Terms of Service and Privacy Notice must be formally countersigned by Nigerian legal counsel to verify compliance with the CBN circular on *New Regulatory Framework for the Nigerian Payment System*.

### APP-07: Data Protection & Customer Consent
- **Technical Status:** Clean. AES-256-GCM encryption for BVN/NIN verified; access logs audit all PII requests.
- **Evidence Gap:** The Nigeria Data Protection Act (NDPA 2023) mandates explicit, informed consent for processing identity numbers. While the consent form has been drafted, **all 10 pilot participants must execute the countersigned agreement before their accounts can be activated.**

---

## 4. PROPRIETOR ACTION RUNBOOK

To satisfy the Gate 4 commercial prerequisites, the business proprietor must execute the following sequence:

```
+-----------------------------------------------------------------------------------------+
|                               PROPRIETOR ACTION SEQUENCE                                |
+-----------------------------------------------------------------------------------------+
  1. Banking: Finalize corporate current account opening with commercial bank.
  2. Paystack KYB: Upload CAC Certificate, TIN, Bank Letter, and Proprietor ID to Paystack.
  3. DVA Approval: Request live DVA API feature flag activation from Paystack support.
  4. VTpass Agreement: Execute commercial reseller contract with VTpass.
  5. Float Funding: Transfer ₦100,000 to Paystack payout balance and ₦50,000 to VTpass portal.
  6. Participant Consent: Collect 10 signed Pilot Participation & Risk Disclosure Agreements.
```
