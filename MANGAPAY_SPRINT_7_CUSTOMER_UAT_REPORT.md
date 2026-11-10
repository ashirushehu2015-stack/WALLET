# MANGAPAY — SPRINT 7 END-TO-END CUSTOMER JOURNEY ACCEPTANCE REPORT

**Audit Reference:** `MANGAPAY-UAT-CUSTOMER-SPRINT-7-2026-11-09`  
**Lead Auditor:** Quality Assurance & User Acceptance Testing (UAT) Lead  
**Audit Date:** November 9, 2026  
**Repository Commit Hash:** `b68981b7903d2d67ced8d17244bf44e761806c1c`  
**Overall UAT Classification:** **PASS (21 / 21 STAGES VERIFIED)**  

---

## 1. SCOPE AND TESTING METHODOLOGY

To independently determine whether MangaPay delivers a frictionless, secure, and compliant customer journey, the Quality Assurance assurance team executed the complete **21-step customer experience lifecycle**.

All testing was executed in an isolated pre-production sandbox using synthetic customer profiles, deterministic mock drivers, and simulated provider callbacks. No real customer identities, actual BVNs, or real money transfers were used.

---

## 2. TWENTY-ONE STAGE CUSTOMER JOURNEY TEST MATRIX

| Test ID | Journey Stage | Preconditions | Action Executed | Expected Outcome | Actual Verified Outcome | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-01** | **Customer Registration** | Unregistered email & phone. | `POST /api/v1/auth/register` with customer details. | User created with role `USER`, wallet initialized, KYC status `REGISTERED`. | 201 Created. User initialized at Tier 1 with ₦0.00 balance. | **PASS** |
| **UAT-02** | **Customer Login** | Registered user credentials. | `POST /api/v1/auth/login` with email and password. | JWT issued (24h validity), customer wallet and DVA details returned. | 200 OK. Bearer token returned with user profile metadata. | **PASS** |
| **UAT-03** | **Forgot Password Request** | Registered customer email/phone. | `POST /api/v1/auth/forgot-password` with identifier. | Cryptographic 6-digit OTP generated, SHA-256 hash saved, generic success returned. | 200 OK. Generic anti-enumeration response returned; OTP hashed. | **PASS** |
| **UAT-04** | **Password Reset Verification** | Active OTP token. | `POST /api/v1/auth/reset-password` with OTP and new pass. | Password updated via bcrypt (cost 10); prior reset tokens invalidated. | 200 OK. Old password invalidated; login succeeds with new password. | **PASS** |
| **UAT-05** | **Transaction PIN Setup** | Authenticated customer session. | `POST /api/v1/vas/pin/set` with 4-digit PIN. | PIN hashed with bcrypt (cost 10) and saved in `transactionPinHash`. | 200 OK. Plaintext PIN discarded; bcrypt hash persisted. | **PASS** |
| **UAT-06** | **Profile Management** | Valid JWT token. | `GET /api/v1/auth/me`. | Customer profile, wallet, and KYC status returned. | 200 OK. Masked details returned without sensitive leaks. | **PASS** |
| **UAT-07** | **KYC Submission** | Tier 1 customer profile. | `POST /api/v1/kyc/submit` with synthetic 11-digit BVN. | Format validated, encrypted via AES-256-GCM (`v1:`), sent to provider match. | 200 OK. Encrypted at rest; status transitions based on result. | **PASS** |
| **UAT-08** | **KYC Status Checking** | Submitted KYC record. | `GET /api/v1/kyc/status`. | Masked BVN (`222******89`), tier level, and status returned. | 200 OK. Correct status and tier limits displayed to user. | **PASS** |
| **UAT-09** | **Wallet Dashboard Query** | Active wallet account. | `GET /api/v1/wallet/balance`. | Authoritative live available and ledger balances returned. | 200 OK. Balances match general ledger postings exactly. | **PASS** |
| **UAT-10** | **DVA Assignment** | Active customer account. | Query `dva` property in user profile. | Dedicated NUBAN, bank name, and account number displayed. | 200 OK. Dedicated virtual account details available for deposits. | **PASS** |
| **UAT-11** | **Deposit Ingestion** | Inbound DVA transfer ₦20,000. | Simulated `charge.success` Paystack webhook. | Double-entry journal: `DR PAYSTACK_CLEARING / CR USER_LIABILITY`. | 200 OK. Customer available balance increments by ₦20,000.00. | **PASS** |
| **UAT-12** | **Suspense Interception** | Inbound transfer ₦60,000 (Tier 1 limit ₦50,000). | Over-limit `charge.success` Paystack webhook. | Captured as `SUSPENSE_LIABILITY`; wallet balance **not** credited. | 200 OK. Funds safely held in suspense; wallet balance unchanged. | **PASS** |
| **UAT-13** | **Transaction History** | Completed deposit & transfer. | `GET /api/v1/wallet/transactions`. | Paginated list of unified transaction records returned. | 200 OK. Correct timestamps, amounts, fees, and types rendered. | **PASS** |
| **UAT-14** | **P2P Transfer Execution** | Sender with ₦20,000 balance. | `POST /api/v1/wallet/transfer` with recipient wallet number. | Row-level locked; atomic journal debits sender, credits recipient. | 200 OK. Sender balance decreases by ₦5,000; recipient balance increases. | **PASS** |
| **UAT-15** | **Withdrawal Hold** | Customer with ₦15,000 balance. | `POST /api/v1/wallet/withdraw` (₦5,000 + ₦50 fee). | Outflow hold reserved; pending status created; Paystack called. | 200 OK. Available balance decremented by ₦5,050.00 hold. | **PASS** |
| **UAT-16** | **VAS Airtime Quote** | Catalog sync completed. | `POST /api/v1/vas/airtime/quote` for MTN ₦1,000. | Cost, discount, selling price, and profit computed via pricing engine. | 200 OK. Quote generated with transparent fee structure. | **PASS** |
| **UAT-17** | **VAS Airtime Purchase** | Customer wallet has ₦1,000. | `POST /api/v1/vas/airtime/purchase` with PIN & quote. | 3-phase flow: wallet held, VTpass vended, profit booked. | 200 OK. Airtime vended; customer wallet debited; profit credited. | **PASS** |
| **UAT-18** | **VAS Failure Handling** | Simulated VTpass outage. | `POST /api/v1/vas/airtime/purchase` with failing provider. | Provider error detected; compensating refund journal posted. | 200 OK. Transaction marked failed; wallet balance fully restored. | **PASS** |
| **UAT-19** | **Receipt Retrieval** | Successful VAS transaction. | `GET /api/v1/vas/transactions/:reference`. | Complete transaction receipt metadata returned. | 200 OK. Operator reference, token/PIN, amount, and time returned. | **PASS** |
| **UAT-20** | **Session Logout** | Authenticated customer. | Client clears Bearer JWT token from local storage. | Subsequent requests without Bearer token rejected with HTTP 401. | 401 Unauthorized. Access token required. | **PASS** |
| **UAT-21** | **Session Expiration** | Expired JWT token (issued > 24h). | Authenticate with expired token. | Backend verifies signature and claims; rejects expired token. | 401 Unauthorized. "Invalid or expired token" returned. | **PASS** |

---

## 3. SUMMARY OF UAT DEFECTS AND OBSERVATIONS

Across the 21 customer journey stages:
- **Zero Critical Functional Defects:** Every state-changing financial flow completed with balanced ledger entries.
- **Zero Balance Discrepancies:** Customer available balances matched general ledger entries to the exact kobo.
- **Observation:** The mobile application client (`mangapay-app`) correctly displays warning badges indicating that virtual card generation and agency banking modules are disabled pending regulatory licensing.

---

## 4. UAT CONCLUSION

The end-to-end customer journey is coherent, functionally intact, mathematically reliable, and secure.

**UAT Final Result:**
$$\mathbf{ALL\ 21\ CUSTOMER\ JOURNEY\ STAGES\ VERIFIED\ (PASS)}$$
The customer experience is approved for inclusion in the 10-person controlled pilot.
