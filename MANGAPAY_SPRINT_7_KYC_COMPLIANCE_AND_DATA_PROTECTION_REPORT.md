# MANGAPAY — SPRINT 7 KYC, AML COMPLIANCE, DATA PRIVACY & REGULATORY BOUNDARY REPORT

**Audit Reference:** `MANGAPAY-KYC-REG-SPRINT-7-2026-11-09`  
**Lead Auditor:** KYC/AML Regulatory Compliance Specialist & Data Protection Officer  
**Audit Date:** November 9, 2026  
**Repository Commit Hash:** `b68981b7903d2d67ced8d17244bf44e761806c1c`  
**Overall Regulatory Classification:** **PARTIAL (SOFTWARE COMPLIANT; COMMERCIAL PARTNERSHIP PREREQUISITES PENDING)**  

---

## 1. REGULATORY BOUNDARY AND OPERATING ENTITY STATUS

### 1.1 Registered Business Name Limitations
MangaPay is an application software and financial technology interface operated under a registered Nigerian **Business Name**.

**CRITICAL REGULATORY FACT:**
- MangaPay does **NOT** hold an independent banking license, Microfinance Bank (MFB) license, Mobile Money Operator (MMO) license, or Payment Service Bank (PSB) license from the Central Bank of Nigeria (CBN).
- Operating under a Business Name legally restricts MangaPay from claiming to be a bank, issuing electronic money independently, holding unhedged public deposits on its own balance sheet, or guaranteeing customer deposits through the NDIC.
- All stored-value customer balances, Dedicated Virtual Accounts (DVA), and payment clearing services must legally and physically reside with **Paystack Payments Limited** (duly licensed by the CBN as a Payment Solution Service Provider / Switching Company) and its designated licensed commercial settlement banks.
- MangaPay functions strictly as a **Technology Platform Provider** interfacing customers with regulated financial infrastructure.

### 1.2 Regulatory Pre-requisite for Controlled Pilot
To offer digital wallet interfaces, P2P transfers, and bank withdrawals even within a 10-person pilot:
1. Paystack's written commercial terms must authorize MangaPay to manage Dedicated Virtual Accounts and disburse transfers via Paystack Transfer APIs.
2. Customer Terms of Service must explicitly disclose the technology provider operating model.
3. If genuine customer funds are accepted, all funds must be held in segregated omnibus accounts at a licensed bank in Paystack's name, not mixed with MangaPay operational funds.

---

## 2. KYC LIFECYCLE AND STATUS SEMANTICS AUDIT

### 2.1 Initial Registration State Machine
In Sprint 5, an audit finding noted that basic phone registration previously marked users as `status: VERIFIED`.

In Sprint 7 independent verification:
- Inspecting [`backend/src/controllers/auth.controller.ts:55`](file:///c:/Users/pc/Desktop/WALLET/backend/src/controllers/auth.controller.ts#L55) confirms:
  ```ts
  await KYCService.initializeKYC(user.id);
  ```
- Inspecting [`backend/src/services/kyc.service.ts:32`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts#L32) confirms:
  ```ts
  tier: KYCTier.TIER_1,
  status: KYCStatus.REGISTERED,
  ```
- **Audit Finding:** **CONFIRMED (PASS).** New users are strictly assigned `status: REGISTERED` and placed in `TIER_1`. No customer can receive `VERIFIED` status without authenticated identity document submission.

### 2.2 Tier Assignment and Operational Caps
MangaPay enforces the CBN Three-Tiered KYC framework:

| KYC Tier | Identity Requirements | Status | Single Deposit Cap | Daily Outflow Cap | Max Cumulative Balance | Audit Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Basic)** | Phone number & Full Name | `REGISTERED` | $\text{NGN } 50,000.00$ | $\text{NGN } 50,000.00$ | $\text{NGN } 300,000.00$ | **VERIFIED (PASS)** |
| **Tier 2 (Standard)**| Verified BVN | `VERIFIED` | $\text{NGN } 100,000.00$ | $\text{NGN } 200,000.00$ | $\text{NGN } 500,000.00$ | **VERIFIED (PASS)** |
| **Tier 3 (Enhanced)**| Verified BVN + NIN | `VERIFIED` | $\text{NGN } 5,000,000.00$| $\text{NGN } 10,000,000.00$| Unlimited | **VERIFIED (PASS)** |

### 2.3 Identity Verification Provider Failures & Outages
- In [`backend/src/services/kyc.service.ts:89`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts#L89):
  If the external verification API (Paystack BVN match or identity registry) is unreachable or degraded, the customer's status transitions to `VERIFICATION_PENDING` (or `UNAVAILABLE`).
- **Audit Finding:** **CONFIRMED (PASS).** The engine never fabricates verification passes. A provider outage never promotes a user to Tier 2 or Tier 3.

---

## 3. DATA PRIVACY & NDPA 2023 COMPLIANCE

### 3.1 Field-Level Cryptographic Protection
Under the Nigeria Data Protection Act (NDPA 2023) and CBN Cybersecurity Guidelines:
- BVN and NIN are classified as **Sensitive Personal Data (SPD)**.
- Storing SPD in plaintext or reversible weak encoding (e.g. Base64) is an offense punishable by severe regulatory fines.
- MangaPay encrypts all BVN and NIN values at rest using **AES-256-GCM** with a unique 96-bit initialization vector (IV) per field.
- **Audit Test `S7-SEC-09` Evidence:** The 128-bit authentication tag guarantees ciphertext integrity. Flipping bits in the ciphertext caused immediate decryption failure, preventing unauthorized tampering.

### 3.2 Data Masking Across Admin and Logs
- Inspecting [`backend/src/utils/encryption.ts:117`](file:///c:/Users/pc/Desktop/WALLET/backend/src/utils/encryption.ts#L117) confirms `maskIdentifier()` is applied before returning KYC records to API responses or administrative tables.
- BVN values appear as `222******89`; NIN values appear as `100******45`. Full plaintext identifiers are never exposed in user interfaces or application log streams.

---

## 4. AML TRANSACTION MONITORING & SUSPICIOUS ACTIVITY GAPS

While KYC tier caps and single-deposit limits are strictly enforced, the assurance team identified the following AML transaction monitoring gaps:

| AML Control Domain | Current Implementation Status | Identified Risk / Gap | Remediation Requirement |
| :--- | :--- | :--- | :--- |
| **Structuring / Smurfing Detection** | **NOT IMPLEMENTED** | Multiple deposits just below the ₦50,000 Tier 1 threshold (e.g. ₦49,500 $\times$ 4) across consecutive days are not automatically flagged. | Implement velocity rules detecting repeated sub-limit deposits within 72 hours. |
| **Sanctions & PEP Screening** | **NOT IMPLEMENTED** | Names are matched against BVN records, but not screened against domestic or international Politically Exposed Persons (PEP) or OFAC/UN sanctions watchlists. | Integrate an automated AML sanctions screening API prior to Tier 3 onboarding. |
| **Suspicious Transaction Reporting (STR)** | **MANUAL ONLY** | No automated mechanism exists to export or format STR filings for the Nigerian Financial Intelligence Unit (goAML NFIU portal). | Codify an administrative "Flag as Suspicious" workflow in the Admin Dashboard with NFIU export format. |

---

## 5. AUTOMATED VERIFICATION RESULTS

In [`backend/scripts/test-sprint7-audit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint7-audit.ts):

```
--- WORKSTREAM 5: KYC Lifecycle, Status Semantics & Regulatory Boundaries ---
  ✅ [PASS] [S7-KYC-01] Workstream 5 (KYC & AML) -> KYC Status Semantics: Registration strictly initializes at REGISTERED (never automatically VERIFIED)
  ✅ [PASS] [S7-KYC-02] Workstream 5 (KYC & AML) -> Provider outage handling: Unreachable provider retains VERIFICATION_PENDING; no false approval
  ✅ [PASS] [S7-KYC-03] Workstream 5 (KYC & AML) -> Tier limit enforcement: ₦50,000 deposit accepted; ₦50,001 deposit rejected
```

---

## 6. REGULATORY COMPLIANCE RECOMMENDATIONS

1. **Clear Disclosures in Customer Terms:** Customer registration must require explicit acceptance of Terms of Service stating:
   > *"MangaPay provides wallet software and payment technology. Banking and fund clearing services are provided by Paystack Payments Limited and partner commercial banks."*
2. **Execute Commercial Agreement with Paystack:** Ensure the business owner signs Paystack's official merchant services contract and DVA issuance addendum prior to moving live funds.
3. **Appoint a Nominated AML/Compliance Officer:** Assign an administrative user responsible for daily review of the Suspense Deposits Queue and flagged transaction monitoring alerts.
