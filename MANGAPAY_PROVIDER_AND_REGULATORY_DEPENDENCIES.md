# MANGAPAY — PROVIDER AND REGULATORY DEPENDENCIES

**Document Version:** 1.0.0  
**Audit Date:** November 9, 2026  
**Subject Entity:** Manga Business Digital Solutions (Operating as *MangaPay*)  
**Entity Classification:** Registered Nigerian Business Name (Enterprise Technology Provider)  
**Regulatory Jurisdiction:** Federal Republic of Nigeria (Central Bank of Nigeria - CBN Guidelines)  

---

## 1. PURPOSE AND REGULATORY CONTEXT

MangaPay is structured from a corporate registration standpoint as a **Business Name**, operating as a software and transaction management technology provider.

The platform provides a consumer-facing mobile/web wallet experience, a double-entry ledger, Paystack Dedicated Virtual Account (DVA) funding, outward bank payouts, and VTpass telecommunications service delivery.

### Critical Regulatory Premise:
Under the regulatory frameworks of the **Central Bank of Nigeria (CBN)**—specifically the *Regulatory Framework for Mobile Money Services in Nigeria*, the *Guidelines on Stored Value and Prepaid Payment Cards*, and the *New License Categorizations for the Nigerian Payments System (2020)*:
1. **A Technology Platform is NOT an Electronic Money Issuer (EMI):** Operating a software application does not grant legal authorization to accept, pool, hold, or intermediate public customer deposits.
2. **Paystack's Integration Does NOT Transfer Licensing:** Using Paystack's APIs (DVA, Transfers, Webhooks) does not automatically confer an MMO, Payment Service Bank (PSB), or Deposit Money Bank (DMB) license upon the merchant.
3. **Custodial Funds Clarity is Mandatory:** Clear contractual and regulatory definitions must establish where customer funds reside legally from the moment an inbound transfer hits the DVA until it is disbursed for bills or payouts.

---

## 2. REGULATORY CLASSIFICATION OF MANGAPAY FEATURES

```
+---------------------------------------------------------------------------------------------------+
| CATEGORY A: TECHNOLOGY & SOFTWARE MVP (Permitted under Business Name)                              |
| Features that MangaPay can develop, host, and operate as pure software and transaction management:|
| • User Registration, Authentication & Profile Management.                                         |
| • Transaction History, Receipt Generation & Audit Logging.                                        |
| • Double-Entry General Ledger Tracking (Internal Accounting).                                     |
| • Wholesale Telecom Airtime & Mobile Data Aggregation (VTpass Agent model).                       |
| • Operational Telemetry & Administrative Dashboards.                                              |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| CATEGORY B: PROVIDER-APPROVAL DEPENDENT (Requires Paystack / VTpass Sign-off)                     |
| Features built on third-party APIs that require explicit commercial & compliance approval:       |
| • Dedicated Virtual Account (DVA) generation for individual consumer funding (Paystack).          |
| • Automated Outward Bank Transfers / Payouts from Paystack balance.                               |
| • Live Telecom Float Funding and Production Airtime/Data Delivery (VTpass).                       |
| • Commercial Wholesale Margin Retention on Telecom Airtime.                                      |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| CATEGORY C: REGULATED-PARTNER DEPENDENT (Requires Licensed Financial Institution)                 |
| Features that legally require operating under a CBN-licensed financial institution:              |
| • Holding Customer Stored-Value Balances for indefinite periods (Custodial Trust Account).        |
| • Unrestricted Closed-Loop Peer-to-Peer (P2P) Wallet-to-Wallet Money Transfers.                   |
| • Electronic Money Issuance (representing digital balances as claims on fiat currency).           |
| • Outward Third-Party Merchant Payments and Settlement Intermediation.                            |
| • Future Virtual Card Issuance (Requires CBN-approved Card Issuer / Sponsor Bank).                |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. PAYSTACK WRITTEN APPROVAL QUESTIONS

Prior to transitioning from sandbox to commercial live transactions with Paystack, MangaPay leadership must submit the following technical and compliance questions to Paystack Support / Account Management and secure **written confirmation**:

### Question 1: Consumer DVA Provisioning under Business Name Registration
> *"Does Paystack's compliance policy permit our registered Business Name (*Manga Business Digital Solutions*) to programmatically assign Dedicated Virtual Accounts (DVAs) to individual retail wallet users for personal funding, or is DVA provisioning restricted to corporate collection under our merchant tier?"*

### Question 2: Stored-Value Custodial Structure & Settlement
> *"When a customer transfers funds into their assigned DVA (e.g. Wema Bank account), does Paystack hold these funds in an aggregate custodial settlement account, or are they automatically swept on a T+1 basis into MangaPay's corporate bank account? Does Paystack permit maintaining an active float balance to fulfill user-initiated withdrawals and bill payments?"*

### Question 3: Outward Bank Payouts to Third-Party Accounts
> *"Does Paystack authorize our software application to initiate outward automated bank transfers (`/transfer`) to arbitrary third-party personal bank accounts on behalf of registered retail users, subject to user balance validation and KYC tiers?"*

### Question 4: P2P Wallet Transfer Classification
> *"If our software facilitates internal balance adjustments between registered users on our internal double-entry ledger without triggering external banking rails, does Paystack raise any anti-money laundering (AML) or merchant agreement concerns regarding internal user-to-user transfers?"*

### Question 5: Production Tier Limits & KYC Verification
> *"What specific KYC documentation (e.g., automated BVN validation, Tier 1/2/3 thresholds) does Paystack mandate on our end users before activating live Dedicated Virtual Accounts and outward bank transfer APIs?"*

---

## 4. VTPASS PRODUCTION REQUIREMENTS

To transition the Value-Added Services module from sandbox testing to live commercial operation, the following operational requirements must be fulfilled:

1. **Merchant Account Verification:**  
   Complete KYC verification on the VTpass Merchant Portal, providing Business Name certificate, Tax Identification Number (TIN), and director identification.
2. **Live API Credentials:**  
   Obtain production `VTPASS_BASE_URL` (`https://api-service.vtpass.com/api`), `VTPASS_API_KEY`, `VTPASS_SECRET_KEY`, and `VTPASS_PUBLIC_KEY`. Replace sandbox credentials in production environment configuration.
3. **Operational Float Funding:**  
   Deposit an initial wholesale operating float (e.g. ₦100,000 – ₦500,000) into MangaPay’s VTpass merchant wallet via automated bank transfer.
4. **Wholesale Margin Confirmation:**  
   Confirm that contracted wholesale discount margins on live networks match server-side assumptions in [`VASPricingService`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/services/pricing.service.ts):
   - MTN Airtime: $2.0\%$ margin
   - Airtel Airtime: $2.0\%$ margin
   - Glo Airtime: $2.5\%$ margin
   - 9mobile Airtime: $3.0\%$ margin
5. **IPN Webhook Configuration:**  
   Configure the production Instant Payment Notification (IPN) callback URL in the VTpass portal:
   ```text
   https://wallet-ijx3.onrender.com/api/v1/webhooks/vtpass
   ```
6. **Automated Float Alerts:**  
   Establish operational threshold alerts (e.g., notify operators via Slack/email when VTpass float drops below ₦50,000).

---

## 5. LICENSED-PARTNER DEPENDENCIES & FUNDS FLOW ARCHITECTURE

### 5.1 The Custodial Funds Dilemma
In MangaPay's current code, customer deposits are recorded as internal liabilities (`USER_LIABILITY_${userId}`). However, because MangaPay is a Business Name, holding customer funds in a proprietary company bank account creates legal and counterparty risks.

### 5.2 Recommended Custodial Partner Options for Launch

```
OPTION 1: PAYSTACK-MANAGED FLOAT MODEL (Fastest for MVP)
Customer Bank ---> NIP ---> Paystack DVA (Wema Bank)
                                    |
                     Held in Paystack Balance Pool
                                    |
                +-------------------+-------------------+
                |                                       |
                v                                       v
    Outward Payout Transfer                  VTpass Float Settlement
    (Paystack Transfer API)                  (Periodic Payout from Paystack)
```
- **Structure:** Customer funds remain in Paystack's settlement balance. When users withdraw, Paystack fulfills the payout directly from this balance. MangaPay never sweeps customer deposits into its own corporate operating account.
- **Regulatory Burden:** Minimal. MangaPay acts strictly as a technology layer directing Paystack API disbursements.
- **Requirement:** Paystack must explicitly approve holding customer float for payouts.

```
OPTION 2: LICENSED MFB / MMO PARTNERSHIP MODEL (Scalable Institutional Model)
Customer Bank ---> NIP ---> Partner Bank Custodial Trust Account
                                    |
                    MangaPay Open API / Core Banking
                                    |
             Internal Ledger Mirrors Regulated Sub-Accounts
```
- **Structure:** MangaPay partners with a licensed Microfinance Bank (e.g., Kuda, Wema, VFD, Providus) or a licensed Mobile Money Operator (MMO). The partner bank acts as the licensed custodian of all customer deposits and electronic money issuance.
- **Regulatory Burden:** Fully compliant with CBN regulations. The partner bank provides regulatory coverage.
- **Requirement:** Commercial partnership agreement with a licensed MFB/MMO.

---

## 6. FEATURES REQUIRING FURTHER REGULATORY ASSESSMENT

1. **Internal Peer-to-Peer (P2P) Transfers:**
   - *Issue:* Closed-loop money transfer between users without immediate external bank settlement mimics Mobile Money Operator (MMO) functionality.
   - *Recommendation:* Keep P2P in restricted closed-alpha pilot mode among registered internal users until custodial partner bank agreement is finalized.
2. **Merchant Checkout & Third-Party Collection:**
   - *Issue:* Processing payments for third-party commercial merchants and settling them T+1 requires a Payment Solution Service Provider (PSSP) or Payment Intermediary license.
   - *Recommendation:* Keep merchant payment features disabled in the MVP.
3. **Virtual Card Issuing (USD / NGN):**
   - *Issue:* Issuing payment cards linked to user balances requires a card-issuing sponsor bank and compliance with CBN foreign-exchange regulations.
   - *Recommendation:* Exclude Virtual Cards from MVP; remove simulated client modals.

---

## 7. OPERATIONAL ASSUMPTIONS REQUIRING WRITTEN CONFIRMATION

| # | Assumption Made in Codebase | Regulatory / Operational Risk | Action Required Prior to Public Launch |
| :-: | :--- | :--- | :--- |
| **1** | Customers can store funds indefinitely on MangaPay's internal ledger. | Operating an unlicensed stored-value wallet. | Obtain written partner bank custodial agreement or confirm Paystack float holding terms. |
| **2** | Inbound DVA transfers can be charged a platform fee (`PLATFORM_FEE_INCOME`). | Customer transparency and consumer protection rules. | Disclose all deposit processing fees clearly in onboarding Terms of Service. |
| **3** | User balances can be used directly to purchase wholesale VTpass airtime. | Funds diversion from custodial pool to telecom provider. | Maintain an independent company-funded float at VTpass; do not fund VTpass float directly with unsegregated customer deposits. |
| **4** | Outward withdrawals can assess a flat ₦100 fee. | Competitive and CBN consumer protection fee guidelines. | Ensure fee disclosure modal appears prior to user PIN entry on withdrawal screens. |

---

*Dependencies certified by Senior FinTech Software Architect.*
