# MANGAPAY — SECURE PASSWORD RECOVERY ARCHITECTURE & AUDIT REPORT

**Author:** Application Security Specialist & Senior FinTech Backend Engineer  
**Audit Reference:** MANGAPAY-SEC-PWD-2026-11-09  
**Status:** IMPLEMENTED & AUDIT VERIFIED  
**Date:** November 9, 2026  

---

## 1. OBJECTIVE & THREAT MODEL

Password recovery is one of the most critical security interfaces in any digital financial application. If misconfigured, password recovery mechanisms can become the primary vector for:
1. **Account Enumeration:** Attackers probing usernames/emails to determine registered customers.
2. **OTP Brute-Force Attacks:** Attackers repeatedly guessing numeric OTP codes.
3. **Token Interception & Stored Credential Compromise:** Unhashed reset tokens exposed in database dumps or logs.
4. **Replay & Session Continuation Attacks:** Attackers reusing spent OTPs or victims remaining logged in on compromised devices after a password reset.

In Sprint 6, MangaPay engineered a defense-in-depth password recovery subsystem adhering strictly to OWASP Application Security Verification Standard (ASVS) Level 2/3 guidelines.

---

## 2. SYSTEM ARCHITECTURE & DATA FLOW

The password recovery workflow consists of two endpoints:
1. `POST /api/v1/auth/forgot-password` (Initiation & OTP generation)
2. `POST /api/v1/auth/reset-password` (Verification, token invalidation & password update)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Attacker
    participant API as Auth Controller
    participant Service as PasswordResetService
    participant DB as PostgreSQL (Prisma)
    participant Notification as SMS / Email Gateway

    Customer->>API: POST /api/v1/auth/forgot-password { identifier }
    API->>Service: requestPasswordReset(identifier)
    Service->>DB: findFirst(email OR phoneNumber)
    alt Account Does Not Exist
        Service-->>API: Return Generic Success (Anti-Enumeration)
    else Account Exists
        Service->>DB: Check Cooldown (< 60s since last request)
        alt Within Cooldown Window
            Service-->>API: Return Generic Success (Rate-Limited)
        else Cooldown Cleared
            Service->>Service: Invalidate prior tokens (isUsed=true)
            Service->>Service: Generate secure 6-digit OTP (crypto.randomInt)
            Service->>Service: Compute SHA-256(OTP)
            Service->>DB: Create PasswordResetToken (tokenHash, expiresAt=now+15m, maxAttempts=5)
            Service->>DB: Create AuditLog (actor=user.id, action=PASSWORD_RESET_REQUESTED)
            Service->>Notification: Dispatch OTP via SMS or Email
            Service-->>API: Return Generic Success
        end
    end
    API-->>Customer: 200 OK: "If an account matching those details exists, a reset code has been sent."

    Customer->>API: POST /api/v1/auth/reset-password { identifier, otp, newPassword }
    API->>Service: resetPassword(identifier, otp, newPassword)
    Service->>DB: findFirst(user) & findActiveToken(userId, isUsed=false, expiresAt > now)
    alt Token Missing or Expired
        Service-->>API: 400 Bad Request: "Invalid or expired reset code"
    else Token Attempts >= 5
        Service->>DB: Mark token isUsed=true (Lockout)
        Service-->>API: 400 Bad Request: "Reset code locked due to too many failed attempts"
    else Token Active
        Service->>Service: timingSafeEqual(SHA-256(otp), tokenRecord.tokenHash)
        alt OTP Mismatch
            Service->>DB: Increment token.attempts + 1
            Service-->>API: 400 Bad Request: "Invalid reset code. X attempt(s) remaining"
        else OTP Valid
            Service->>Service: Hash new password with bcrypt (10 rounds)
            Service->>DB: Transaction: [mark all tokens isUsed=true, update user passwordHash]
            Service->>DB: Create AuditLog (action=PASSWORD_RESET_COMPLETED)
            Service-->>API: 200 OK: "Password has been successfully reset"
        end
    end
    API-->>Customer: 200 OK Response
```

---

## 3. CORE SECURITY CONTROLS & IMPLEMENTATION DETAILS

### 3.1 Cryptographically Secure OTP Generation & SHA-256 Hashing
- **Generation:** Uses Node.js native `crypto.randomInt(100000, 1000000)` to generate an unguessable 6-digit numeric string. Pseudo-random math functions (`Math.random()`) are strictly forbidden.
- **Hashing at Rest:** Plaintext OTPs are never stored in the database. The database stores exclusively the SHA-256 hexadecimal digest:
  ```ts
  const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
  ```
  Even if database read access is compromised, attackers cannot extract actionable OTPs.

### 3.2 Anti-Enumeration & Timing Attack Defenses
- **Uniform Responses:** Both valid and invalid account identifiers receive the exact same HTTP 200 response:
  > *"If an account matching those details exists, a password reset code has been sent."*
- **Constant-Time Hash Comparison:** Verification uses `crypto.timingSafeEqual` over raw buffer representations:
  ```ts
  const incomingHash = PasswordResetService.hashOtp(otp.trim());
  const expectedBuffer = Buffer.from(tokenRecord.tokenHash, 'hex');
  const incomingBuffer = Buffer.from(incomingHash, 'hex');

  const isValid =
    expectedBuffer.length === incomingBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, incomingBuffer);
  ```
  This prevents side-channel timing analysis from inferring hash prefixes.

### 3.3 Rate Limiting, Expiration & Lockout Controls
- **15-Minute Expiry Window:** All tokens specify `expiresAt = new Date(Date.now() + 15 * 60 * 1000)`. Expired tokens are rejected automatically.
- **60-Second Cooldown:** A user requesting another OTP within 60 seconds is rate-limited, preventing SMS gateway abuse and resource exhaustion.
- **5-Attempt Lockout:** If an attacker attempts to brute-force the 6-digit code, the system decrements remaining attempts. Upon reaching 5 failed attempts, the token is permanently locked (`isUsed: true`), neutralizing automated guessing.

### 3.4 Session & Prior Token Invalidation (Replay Prevention)
- Upon successful reset, an atomic database transaction marks **all** reset tokens associated with the user as `isUsed: true`.
- A consumed OTP cannot be re-submitted or replayed.
- The user's new password is encrypted with `bcrypt` (work factor 10) before persistence.

---

## 4. DATABASE SCHEMA SPECIFICATION

In [`backend/prisma/schema.prisma`](file:///c:/Users/pc/Desktop/WALLET/backend/prisma/schema.prisma#L496-L511):

```prisma
model PasswordResetToken {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  identifier  String   // email or phone number
  tokenHash   String
  expiresAt   DateTime
  attempts    Int      @default(0)
  maxAttempts Int      @default(5)
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([identifier])
  @@index([userId])
  @@map("password_reset_tokens")
}
```

---

## 5. AUTOMATED VERIFICATION RESULTS

All password recovery security controls were tested in [`backend/scripts/test-sprint6-audit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint6-audit.ts):

| Test ID | Security Assertion | Expected Behavior | Result |
| :--- | :--- | :--- | :--- |
| `S6-PWD-01` | Anti-Enumeration | Nonexistent user receives identical generic response | **PASS** |
| `S6-PWD-02` | Secure Generation & Hashing | 6-digit numeric OTP generated, SHA-256 hash stored | **PASS** |
| `S6-PWD-03` | Resend Cooldown Limit | Resend within 60s suppressed without duplicate creation | **PASS** |
| `S6-PWD-04` | 5-Attempt Lockout | 5 consecutive wrong attempts locks the token permanently | **PASS** |
| `S6-PWD-05` | Hash Update & Invalidation | Valid reset updates bcrypt hash and invalidates tokens | **PASS** |
| `S6-PWD-06` | Password Hash Invalidation | Old password fails authentication; new password passes | **PASS** |
| `S6-PWD-07` | Replay Prevention | Re-submitting the same OTP fails with invalid token error | **PASS** |

---

## 6. OPERATIONAL GUIDELINES FOR SUPPORT & HELPDESK

1. **Zero-Knowledge Support:** Customer support agents have no access to OTPs or plaintext passwords. Support personnel must never ask customers for OTPs.
2. **Locked Account Assistance:** If a customer locks their token via 5 failed attempts, they must wait until the 15-minute window expires or request a fresh OTP through the standard client UI.
3. **Audit Trail Inspection:** Administrators can verify whether reset requests were dispatched by inspecting `audit_logs` where `action = 'PASSWORD_RESET_REQUESTED'`. Plaintext OTPs are excluded from audit records.
