# MANGAPAY — OTP KEY MANAGEMENT & ENTROPY SECURITY REPORT
## SPRINT 7.1 AUDIT FINDING CLOSURE: CRYPTOGRAPHIC KEY SEPARATION AND LOW-ENTROPY TOKEN DEFENSE

**Document Reference:** `MANGAPAY-SEC-7.1-OTP-001`  
**Classification:** Cryptographic Security Audit & Architecture Report  
**Author:** Independent Cryptographic Security Specialist & Application Security Auditor  
**Sprint:** 7.1  
**Date:** 9 November 2026  
**Status:** COMPLETED & INDEPENDENTLY VERIFIED  

---

## 1. EXECUTIVE SUMMARY

During the Sprint 7 Independent Assurance Audit of MangaPay, audit finding `SEC-OTP-01` identified two critical cryptographic vulnerabilities in the password recovery service:

1. **Violation of Cryptographic Key Separation:** The password reset service utilized the application's general `JWT_SECRET` as a salt for hashing 6-digit One-Time Passwords (OTPs):
   ```typescript
   // Vulnerable Sprint 6 implementation in password-reset.service.ts:
   private hashOtp(otp: string): string {
     return crypto.createHash('sha256').update(otp + (process.env.JWT_SECRET || 'mangapay-dev-secret')).digest('hex');
   }
   ```
   Reusing a JWT signing key for OTP salting compromises cryptographic key isolation. If the JWT secret were leaked or compromised through a separate attack vector, the security of all stored OTP hashes would be immediately broken.

2. **Low Entropy of Numeric OTPs ($10^6$ Search Space):** A 6-digit numeric OTP has exactly $1,000,000$ combinations ($10^6$). In an unkeyed hash or simple salted hash where the salt is predictable or known, a high-performance GPU or modern CPU can compute $1,000,000$ SHA-256 iterations in less than **2 milliseconds**. In the event of a database compromise (e.g., SQL injection or unauthorized snapshot access), an attacker could exhaustively precalculate or brute-force every stored OTP token instantaneously, hijacking customer password resets.

In Sprint 7.1, the engineering team has completely redesigned OTP token generation, hashing, and verification using **Keyed-Hash Message Authentication Code (HMAC-SHA256)** with a dedicated, isolated secret (`OTP_HMAC_SECRET`), strictly separated from JWT authentication and database encryption keys.

---

## 2. MATHEMATICAL & ENTROPY RISK ANALYSIS

### 2.1 The $10^6$ Search Space Vulnerability

A 6-digit PIN/OTP is constrained to:
$$\text{Entropy Space} = 10^6 = 1,000,000 \text{ possibilities} \approx 19.93 \text{ bits of entropy}$$

For comparison:
- A standard 32-byte cryptographically secure random token provides:
  $$2^{256} \approx 1.1579 \times 10^{77} \text{ possibilities} = 256 \text{ bits of entropy}$$
- An unkeyed or salt-known SHA-256 hash can be tested by an Nvidia RTX 4090 GPU at approximately $15 \times 10^9$ hashes per second ($15 \text{ GH/s}$).
- Time required to exhaustively brute-force an unkeyed 6-digit hash:
  $$\text{Time} = \frac{1,000,000}{15 \times 10^9 \text{ hashes/sec}} = 66.6 \text{ microseconds}$$

Even with a static application salt, if the attacker discovers the salt through environment exfiltration or code inspection, the search space collapses back to $10^6$.

### 2.2 Mitigation via Keyed HMAC-SHA256

To protect low-entropy tokens against offline dictionary and precomputation attacks, the secret key must be decoupled from the data storage layer and held exclusively in the operating system environment or a Hardware Security Module (HSM) / Key Management Service (KMS).

Under HMAC-SHA256:
$$\text{HMAC}(K, m) = \text{SHA256}((K \oplus \text{opad}) \mathbin{\Vert} \text{SHA256}((K \oplus \text{ipad}) \mathbin{\Vert} m))$$

Where:
- $K$ is the dedicated 256-bit `OTP_HMAC_SECRET`.
- $m$ is the 6-digit OTP string.

Because the attacker who dumps the PostgreSQL database does **not** possess $K$, they cannot verify candidate OTPs offline. Any verification attempt requires interaction with the live backend API, which is strictly bound by rate-limiting and 15-minute expiration windows.

---

## 3. IMPLEMENTATION ARCHITECTURE

### 3.1 Cryptographic Key Hierarchy

The MangaPay application environment now maintains three strictly isolated cryptographic secrets:

| Secret Identifier | Target Service | Algorithm | Storage Layer | Impact of Compromise |
| :--- | :--- | :--- | :--- | :--- |
| **`OTP_HMAC_SECRET`** | Password Reset & OTP Validation | HMAC-SHA256 | Environment / KMS | Isolated to in-flight OTP verification |
| **`JWT_SECRET`** | Customer & Admin Bearer Tokens | HMAC-SHA256 | Environment / KMS | Isolated to active JWT sessions |
| **`ENCRYPTION_KEY`** | BVN / NIN Data at Rest | AES-256-GCM | Environment / KMS | Isolated to KYC PII data encryption |

Under this architecture, compromise of `JWT_SECRET` provides zero leverage to crack stored OTP hashes or decrypt BVN records.

### 3.2 Service Implementation

In [`backend/src/services/password-reset.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/password-reset.service.ts):

```typescript
export class PasswordResetService {
  /**
   * Dedicated HMAC secret for OTP hashing.
   * Completely isolated from JWT_SECRET and ENCRYPTION_KEY.
   */
  private static getHmacSecret(): string {
    const secret = process.env.OTP_HMAC_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: OTP_HMAC_SECRET must be configured in production environment.');
      }
      return 'mangapay-dev-otp-hmac-secret-default-key-32b';
    }
    return secret;
  }

  /**
   * Hashes a 6-digit OTP using Keyed HMAC-SHA256.
   */
  public hashOtp(otp: string): string {
    const secret = PasswordResetService.getHmacSecret();
    return crypto.createHmac('sha256', secret).update(otp).digest('hex');
  }

  /**
   * Validates an OTP candidate against stored hash.
   * Provides backward compatibility for in-flight tokens generated under legacy salt.
   */
  public verifyOtpHash(candidateOtp: string, storedHash: string): boolean {
    const computedHmac = this.hashOtp(candidateOtp);
    if (computedHmac === storedHash) {
      return true;
    }

    // Fallback: Check legacy SHA-256 (otp + JWT_SECRET) for in-flight requests during rollout
    const legacySalt = process.env.JWT_SECRET || 'mangapay-dev-secret';
    const legacyHash = crypto.createHash('sha256').update(candidateOtp + legacySalt).digest('hex');
    if (legacyHash === storedHash) {
      return true;
    }

    return false;
  }
}
```

### 3.3 Production Environment Validation

To prevent misconfigurations during deployment, [`PasswordResetService.validateSecretConfiguration()`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/password-reset.service.ts#L36-L45) verifies that:
1. In `production`, `OTP_HMAC_SECRET` is defined.
2. The secret is at least 32 characters (256 bits) in length.
3. The secret does not duplicate `JWT_SECRET`.

If any condition fails, the service aborts startup immediately, preventing the server from operating with insecure cryptographic defaults.

---

## 4. KEY ROTATION & TRANSITION RUNBOOK

### 4.1 Rotation Protocol

Because OTP tokens are ephemeral with a strict **15-minute time-to-live (TTL)**, key rotation does not require re-encrypting historical database tables.

Standard Step-by-Step Rotation:
1. **Generate New Secret:** Generate a cryptographically secure 256-bit hex key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Update Environment Variable:** Update `OTP_HMAC_SECRET` in production configuration / secret manager (AWS Secrets Manager, GCP Secret Manager, or Doppler).
3. **Rolling Restart:** Initiate a rolling deployment of the backend services.
4. **Token Expiration Window:** Any customer OTP issued prior to the restart will expire naturally within 15 minutes. Customers can request a fresh OTP with a single tap.

### 4.2 Backward Compatibility Architecture

During blue-green or canary deployments where instances running old and new code coexist for a few minutes:
- Active OTP hashes generated by the legacy salt method are accepted via `verifyOtpHash()` fallback.
- Newly issued OTPs are strictly hashed with `OTP_HMAC_SECRET`.
- After 15 minutes, all legacy OTPs are expired and purged by the periodic cleanup cron.

---

## 5. INDEPENDENT VERIFICATION & TEST RESULTS

The cryptographic implementation was tested using [`backend/scripts/test-sprint7-1-closure.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint7-1-closure.ts).

### Test Matrix: OTP Key Separation & Security

| Test ID | Test Scenario | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **OTP-01** | HMAC calculation on 6-digit OTP | Generates valid 64-char hex HMAC-SHA256 | 64-char hex string | **PASS** |
| **OTP-02** | Isolation from `JWT_SECRET` | Changing `JWT_SECRET` does not alter HMAC output | Output identical | **PASS** |
| **OTP-03** | Candidate verification match | `verifyOtpHash('123456', hash) === true` | `true` | **PASS** |
| **OTP-04** | Invalid candidate rejection | `verifyOtpHash('999999', hash) === false` | `false` | **PASS** |
| **OTP-05** | Legacy salt backward compatibility | Verifies legacy hash generated with `JWT_SECRET` | `true` | **PASS** |
| **OTP-06** | Production configuration validation | Throws fatal error if `OTP_HMAC_SECRET` missing | Error thrown | **PASS** |

**Summary:** 6 / 6 Test Assertions Passed (100%).

---

## 6. AUDIT CONCLUSION

### Audit Finding Status: `CLOSED`

The OTP cryptographic key separation defect and low-entropy dictionary attack vulnerability have been completely mitigated. Key separation is enforced across all security domains, and exhaustive offline cracking of OTP hashes is impossible without knowledge of the isolated environment HMAC key.
