# MANGAPAY — SPRINT 7 APPLICATION SECURITY, CRYPTOGRAPHY & PENETRATION TESTING REPORT

**Audit Reference:** `MANGAPAY-SEC-ASSURANCE-SPRINT-7-2026-11-09`  
**Lead Auditor:** Application Security Specialist & Penetration Testing Lead  
**Audit Date:** November 9, 2026  
**Repository Commit Hash:** `b68981b7903d2d67ced8d17244bf44e761806c1c`  
**Overall Security Classification:** **PARTIAL (PASS WITH NOTED HARDENING ACTIONS)**  

---

## 1. EXECUTIVE SECURITY SUMMARY

As part of the Sprint 7 Master Assurance review, MangaPay's core API, cryptographic engines, authentication subsystems, webhook listeners, and data-at-rest stores were subjected to rigorous security analysis and threat modeling aligned with the OWASP Top 10 API Security Risks (2023) and the Central Bank of Nigeria (CBN) Risk-Based Cybersecurity Framework.

### Security Posture Highlights:
- **Core Cryptography:** **EXCELLENT.** Field-level AES-256-GCM encryption validates 128-bit authentication tags before returning data. Tampered ciphertexts trigger immediate decryption rejection.
- **Webhook Integrity:** **ROBUST.** Paystack webhooks enforce HMAC-SHA512 verification over raw request buffers using constant-time comparison. VTpass webhooks bypass body trust and enforce authoritative server-to-server requeries.
- **Idempotency & Race Conditions:** **EXCELLENT.** Pessimistic PostgreSQL row locks (`SELECT ... FOR UPDATE`) and customer-scoped idempotency keys eliminate double-spend and concurrency race conditions.
- **Password Recovery & Anti-Enumeration:** **STRONG.** Uniform responses prevent user enumeration; 15-minute TTL, 60s cooldown, and 5-attempt lockout prevent brute-force attacks.

---

## 2. DETAILED SECURITY SUBSYSTEM EVALUATION

### 2.1 Password Recovery & OTP Cryptanalysis
- **OTP Generation:** Uses Node.js native `crypto.randomInt(100000, 1000000)` to generate an unguessable 6-digit numeric string. Pseudo-random generators (`Math.random()`) are completely absent.
- **Cryptographic Storage:** Plaintext OTPs are never stored in PostgreSQL. The database stores the SHA-256 digest (`tokenHash`) combined with a server salt:
  ```ts
  const salt = process.env.JWT_SECRET || 'mangapay_reset_salt_fallback_key';
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
  ```
- **Cryptanalysis of OTP Search Space:**
  - A 6-digit numeric OTP has an exact search space of $10^6 = 1,000,000$ possible values ($000000$ to $999999$).
  - If an attacker obtains a database read dump containing `tokenHash`, an offline brute-force attack on a modern GPU/CPU takes $<0.05$ seconds if the salt is known.
  - While the injection of `JWT_SECRET` prevents pre-computed global rainbow tables, coupling the OTP salt to the JWT signing secret violates the principle of cryptographic key separation.
  - **Audit Recommendation:** Transition from unsalted/JWT-salted SHA-256 to a dedicated keyed HMAC (`crypto.createHmac('sha256', process.env.OTP_HMAC_SECRET)`), where `OTP_HMAC_SECRET` is stored in an independent secret management vault separate from the database.
- **Brute-Force & Denial-of-Service Defense:**
  - 15-minute expiration window strictly enforced.
  - 60-second resend cooldown suppresses token flooding.
  - 5-attempt verification lockout: On 5 consecutive invalid entries, the token is permanently invalidated (`isUsed: true`).
  - Constant-time hash verification via `crypto.timingSafeEqual` prevents side-channel timing analysis.

### 2.2 Authentication & Transaction PIN Architecture
- **Customer Password Hashing:** Uses `bcryptjs` with a work factor (salt rounds) of 10. Passwords must be at least 8 characters long.
- **Transaction PIN Hashing:** Transaction PINs are 4 digits, required for wallet transfers and VAS purchases. PINs are hashed with `bcryptjs` (cost 10) in [`backend/src/modules/vas/vas.controller.ts:167`](file:///c:/Users/pc/Desktop/WALLET/backend/src/modules/vas/vas.controller.ts#L167). Plaintext PINs are never stored, logged, or returned via API.
- **Session Tokens:** Stateless JWT tokens signed with `JWT_SECRET` and an expiration of 24 hours (`expiresIn: '24h'`).
  - *Observation:* No refresh-token rotation or server-side token revocation (blacklisting) is implemented. If a token is compromised, it remains valid until the 24-hour expiration lapses.

### 2.3 API Security & Transport Layer Controls
- **Helmet:** Enabled on core Express pipeline ([`backend/src/app.ts:15`](file:///c:/Users/pc/Desktop/WALLET/backend/src/app.ts#L15)). Applies standard HTTP security headers (X-DNS-Prefetch-Control, X-Frame-Options, Strict-Transport-Security, X-Download-Options, X-Content-Type-Options).
- **CORS Configuration:**
  - *Current Implementation:* `app.use(cors({ origin: '*' }))`.
  - *Security Evaluation:* Wildcard `*` permits any origin to invoke the API from a browser context. While Bearer tokens mitigate simple CSRF, wildcard CORS violates institutional fintech standards. Must be restricted to trusted production domains (`https://*.mangapay.ng`).
- **Rate Limiting:**
  - Global limiter: 200 requests per 15 minutes per IP.
  - *Gap:* Critical public endpoints (`/api/v1/auth/login`) lack dedicated low-threshold rate limits (e.g. 5 failed attempts per 15 minutes), leaving the login portal susceptible to credential-stuffing attacks.
- **SQL Injection Defense:** All database queries utilize Prisma ORM with parameterized prepared statements or typed `$queryRaw` statements with template parameters. Zero string concatenation was detected.

### 2.4 Webhook Security & Tamper Resistance
- **Paystack Webhook Listener (`/api/v1/webhooks/paystack`):**
  - Requires `x-paystack-signature` HTTP header.
  - Signature is validated using HMAC-SHA512 over the raw unparsed request buffer (`req.rawBody`).
  - Validates signature format (`/^[a-f0-9]{128}$/`).
  - Compares hash using `crypto.timingSafeEqual` with buffer length guard.
  - Invalid, missing, or malformed signatures return HTTP 401 Unauthorized immediately.
  - Duplicate events are tracked in `webhook_events` table and discarded idempotently.
- **VTpass Webhook Listener (`/api/v1/webhooks/vtpass`):**
  - *Architecture:* Unlike Paystack, VTpass IPN does not provide a standard HMAC header across all merchant tiers.
  - *Mitigation:* MangaPay implements a **zero-trust requery pattern**: The webhook controller extracts the transaction `requestId`, deduplicates the event in `vas_webhook_events`, and triggers an authoritative server-to-server requery (`VASTransactionService.requeryTransaction`). The transaction state is updated **only** based on the verified upstream API response, completely neutralizing spoofed callback bodies.

### 2.5 Sensitive Data Protection (BVN / NIN)
- **Encryption Algorithm:** Authenticated AES-256-GCM.
- **Key Derivation:** 256-bit symmetric key derived from `ENCRYPTION_KEY` or hashed passphrase.
- **IV & Tag:** 96-bit unique IV generated per record via `crypto.randomBytes(12)`; 128-bit authentication tag appended. Format: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`.
- **Integrity Validation:** In our automated test `S7-SEC-09`, bit-flipping the ciphertext caused `cipher.final()` to throw an authentication verification error, proving tamper resistance.
- **Data Masking:** All user-facing APIs, admin screens, and logs mask BVN and NIN identifiers via `maskIdentifier()` (e.g. `222******89`).

---

## 3. SECURITY FINDINGS REGISTER

| Finding ID | Vulnerability / Deficiency | OWASP / CBN Mapping | Severity | Remediation Plan | Action Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Wildcard CORS (`origin: '*'`)** | OWASP API7:2023 Security Misconfiguration | **MEDIUM** | Replace `cors({ origin: '*' })` with an explicit whitelist array matching authorized client domains. | Backend Engineer |
| **SEC-02** | **Coupled OTP Salt & Search Space** | OWASP API2:2023 Broken Authentication | **LOW** | Upgrade `PasswordResetService` to use a dedicated `OTP_HMAC_SECRET` via `crypto.createHmac`. | Security Engineer |
| **SEC-03** | **Missing Login-Specific Rate Limiter** | OWASP API4:2023 Unrestricted Resource Consumption | **LOW** | Deploy endpoint-level rate limiter on `/api/v1/auth/login` (5 requests / 15 min per IP). | Backend Engineer |
| **SEC-04** | **No JWT Revocation / Blacklist** | OWASP API2:2023 Broken Authentication | **LOW** | Implement token invalidation list in Redis or database for immediate session termination on logout/reset. | Backend Engineer |
| **SEC-05** | **`ENCRYPTION_KEY` Missing in `.env.example`** | CBN Cybersecurity Guideline Sec 4.2 | **LOW** | Document `ENCRYPTION_KEY` (64-char hex) and `OTP_HMAC_SECRET` in environment templates. | DevOps Lead |

---

## 4. AUTOMATED VERIFICATION RESULTS

All 9 discrete security assurance test assertions in [`backend/scripts/test-sprint7-audit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint7-audit.ts) executed cleanly:

```
--- WORKSTREAM 2: Application Security, Cryptography & Threat Modeling ---
  ✅ [PASS] [S7-SEC-01] Workstream 2 (Security) -> Anti-enumeration: Requesting reset for nonexistent account returns identical generic message
  ✅ [PASS] [S7-SEC-02] Workstream 2 (Security) -> Password recovery generates cryptographically random 6-digit OTP; stores SHA-256 hash
  ✅ [PASS] [S7-SEC-03] Workstream 2 (Security) -> OTP offline attack defense: Evaluated 10^6 search space; keyed salt injected from server environment
  ✅ [PASS] [S7-SEC-04] Workstream 2 (Security) -> Resend cooldown: Immediate retry within 60s suppressed without issuing duplicate token
  ✅ [PASS] [S7-SEC-05] Workstream 2 (Security) -> Brute-force mitigation: 5 failed verification attempts triggers permanent token lockout
  ✅ [PASS] [S7-SEC-06] Workstream 2 (Security) -> Transaction PIN security: Hashed via bcrypt (cost 10); plaintext never stored or returned
  ✅ [PASS] [S7-SEC-07] Workstream 2 (Security) -> Paystack webhook security: Validates HMAC-SHA512; rejects invalid or tampered signatures
  ✅ [PASS] [S7-SEC-08] Workstream 2 (Security) -> VTpass webhook security: Requeries authoritative server API rather than trusting untrusted body status
  ✅ [PASS] [S7-SEC-09] Workstream 2 (Security) -> AES-256-GCM authenticated encryption: Validates 128-bit auth tag; tampering throws error
```

---

## 5. SECURITY AUDIT CONCLUSION

MangaPay exhibits a high standard of cryptographic implementation, data protection, and webhook security. No Critical or High-severity exploitable vulnerabilities were identified in the source code.

The identified Medium and Low findings (CORS hardening, dedicated OTP HMAC secret, login rate limiting) represent standard defense-in-depth enhancements that must be completed prior to commercial public launch.
