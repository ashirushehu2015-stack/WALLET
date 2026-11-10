# MANGAPAY — KYC AND TRANSACTION LIMITS ENFORCEMENT REPORT

**Author:** Senior FinTech Financial Systems Architect & Compliance Engineering Lead  
**Audit Reference:** SPRINT-4-KYC-LIMITS-2026-11-09  
**System Module:** `backend/src/services/kyc.service.ts`, `webhook.service.ts`, `wallet.service.ts`  
**Status:** IMPLEMENTED & AUDITED  
**Date:** November 9, 2026  

---

## 1. REGULATORY AND OPERATIONAL CONTEXT

MangaPay operates as a financial technology platform under a registered Business Name in Nigeria. It leverages licensed infrastructure partners—specifically **Paystack** (for Dedicated Virtual Accounts, collections, and permitted transfers) and **VTpass** (for Value Added Services).

Under Nigerian regulatory standards (CBN AML/CFT Guidelines and tiered KYC regulations), financial accounts must enforce strict transaction and cumulative balance thresholds based on customer verification levels. As a technology provider:
- MangaPay must not permit unverified or partially verified users to transact beyond established regulatory ceilings.
- Limits must be enforced programmatically **at the server level**; client-side checks or UI guards are insufficient.
- Both **inbound deposit caps** (single transaction and maximum balance) and **outbound transfer caps** (daily cumulative totals) must be strictly enforced before ledger commitments are executed.

---

## 2. AUTHORITATIVE KYC TIER LIMITS MATRIX

The limits codified in [`backend/src/services/kyc.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/kyc.service.ts) represent the definitive operational rules for MangaPay:

| Tier Level | Verification Criteria | Max Single Deposit (₦) | Max Cumulative Balance (₦) | Max Daily Transfer Outflow (₦) |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Phone Number & Basic Profile (Unverified BVN/NIN) | **₦50,000.00** | **₦300,000.00** | **₦300,000.00** |
| **Tier 2** | Verified BVN **OR** Verified NIN | **₦200,000.00** | **₦1,000,000.00** | **₦500,000.00** |
| **Tier 3** | Verified BVN **AND** Verified NIN + Address Verification | **₦5,000,000.00** | **₦50,000,000.00** | **₦10,000,000.00** |

---

## 3. WEST AFRICA TIME (WAT, UTC+1) DAILY RESET BOUNDARY

### Temporal Architecture
Daily cumulative limits must be calculated across the customer's legal calendar day. Nigeria operates on **West Africa Time (WAT)**, which is UTC+1 year-round (no daylight saving time).

If a daily limit were calculated using standard UTC midnight, Nigerian customers would experience their limits resetting at **1:00 AM WAT**, creating a 1-hour discrepancy during which midnight transactions would be counted toward the previous day's allowance.

### Deterministic Implementation
The method `KYCService.getDailyResetWindow()` deterministically aligns the aggregation query window with Lagos midnight:
```typescript
static getDailyResetWindow(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  const watOffsetMs = 60 * 60 * 1000; // WAT is UTC+1
  const watTime = new Date(now.getTime() + watOffsetMs);

  const watYear = watTime.getUTCFullYear();
  const watMonth = watTime.getUTCMonth();
  const watDate = watTime.getUTCDate();

  // Start of day in WAT expressed as UTC Date
  const startOfWatDayUtc = new Date(Date.UTC(watYear, watMonth, watDate, 0, 0, 0, 0) - watOffsetMs);
  const endOfWatDayUtc = new Date(startOfWatDayUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

  return {
    startOfDay: startOfWatDayUtc,
    endOfDay: endOfWatDayUtc,
  };
}
```

---

## 4. SERVER-SIDE ENFORCEMENT POINTS

### Inbound Webhook Deposit Gate
In [`backend/src/services/webhook.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/webhook.service.ts), incoming Paystack `charge.success` events are processed through `KYCService.validateDeposit`:

```typescript
const kycValidation = await KYCService.validateDeposit(
  userId,
  amountNGN,
  currentLiveBalance,
  tx
);

if (!kycValidation.valid) {
  // 1. Record transaction as FAILED
  await tx.transaction.create({
    data: {
      userId,
      amount: amountNGN,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.FAILED,
      reference: paystackReference,
      description: `Deposit rejected: ${kycValidation.reason}`,
    },
  });

  // 2. Create security audit log
  await tx.auditLog.create({
    data: {
      actorId: userId,
      actorType: 'SYSTEM',
      action: 'KYC_DEPOSIT_LIMIT_EXCEEDED',
      resource: `deposits/${paystackReference}`,
      details: {
        reason: kycValidation.reason,
        amount: amountNGN,
        tier: kycValidation.tier,
        limits: kycValidation.limits,
      },
    },
  });

  return; // CRITICAL: Abort before crediting user wallet liability account!
}
```

### Outbound P2P Transfer Gate
In [`backend/src/services/wallet.service.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/services/wallet.service.ts), `transferFunds` executes validation before debiting the sender or crediting the recipient:
1. **Sender Check:** Evaluates `KYCService.validateTransfer(senderId, recipientId, amount, recipientLiveBalance, tx)`. Aggregates all successful transfers initiated by the sender since `startOfDay` (WAT). If `cumulativeToday + amount > senderTierLimit`, the transaction throws a descriptive error and rolls back.
2. **Recipient Check:** Evaluates whether `recipientLiveBalance + amount > recipientMaxBalanceCap`. If breached, the transfer is rejected to prevent exceeding the recipient's tier balance ceiling.

### Outbound Withdrawal Gate
In `requestWithdrawal`, the withdrawal request is validated against the user's daily transfer allowance before funds are moved into a `PENDING_WITHDRAWAL` reserve hold.

---

## 5. AUDIT AND VERIFICATION EVIDENCE

The test suite [`backend/scripts/test-sprint4-audit.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint4-audit.ts) executed the following test cases:

```
--- 1. Priority 1: KYC and Transaction Limits ---
  ✅ [PASS] Tier 1 single deposit exact limit (₦50,000) allowed
  ✅ [PASS] Tier 1 single deposit excess (₦50,000.01) rejected
  ✅ [PASS] Tier 1 cumulative balance reaching exactly ₦300,000 allowed
  ✅ [PASS] Tier 1 cumulative balance exceeding ₦300,000 rejected
  ✅ [PASS] Tier 2 single deposit limit (₦200,000) enforced
  ✅ [PASS] Tier 3 single deposit limit (₦5,000,000) enforced
  ✅ [PASS] Tier 1 cumulative daily transfer reaching ₦300,000 allowed
  ✅ [PASS] Tier 1 cumulative daily transfer exceeding ₦300,000 rejected
  ✅ [PASS] WAT (UTC+1) daily reset window correctly aligns to Lagos midnight
  ✅ [PASS] Webhook engine halts and denies wallet credit on KYC deposit breach
```

### Conclusion
KYC limits are completely enforced across all financial ingress and egress channels. System balances and customer liabilities are fully protected from unauthorized limit breaches.
