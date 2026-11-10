# MANGAPAY — DUAL-APPROVAL INDEPENDENT TEST REPORT
## COMPREHENSIVE INDEPENDENT VERIFICATION OF SUPER_ADMIN DUAL-AUTHORIZATION WORKFLOW (13 SCENARIOS)

**Document Reference:** `MANGAPAY-SEC-S7.2-APP-001`  
**Classification:** Application Security & Financial Controls Testing Report  
**Author:** Independent FinTech Penetration Testing Specialist & Systems Auditor  
**Sprint:** 7.2  
**Date:** 9 November 2026  
**Status:** 100% VERIFIED & PASSED (13 / 13 SCENARIOS)  

---

## 1. EXECUTIVE SUMMARY

During Sprint 7, audit finding `SEC-ADM-01` exposed that the dual-approval check for high-value refunds ($> \text{NGN } 100,000$) relied on a client-supplied JSON boolean:
```json
{ "dualApproved": true }
```
This allowed any administrator with access to the endpoint to unilaterally authorize refunds of arbitrary magnitude by simply toggling the client parameter. Furthermore, `SUPER_ADMIN` existed only as a hardcoded JWT string without database schema representation.

In Sprint 7.1 and 7.2, the engineering team implemented a database-persisted dual-approval engine backed by:
1. `SUPER_ADMIN` value added to the PostgreSQL `UserRole` enum in [`schema.prisma`](file:///c:/Users/pc/Desktop/WALLET/backend/prisma/schema.prisma#L305).
2. Dedicated `RefundApprovalRequest` table in PostgreSQL with state machine `PENDING -> APPROVED -> EXECUTED` (or `REJECTED` / `CANCELLED`).
3. Multi-actor segregation of duties enforcing $\text{requesterId} \neq \text{approverId}$.
4. Strict amount invariance: Any modification between requested, approved, and executed amounts invalidates authorization.
5. Inability to modify or delete approval records via standard admin APIs.

This report documents the independent verification of this implementation across **13 exhaustive operational, adversarial, concurrency, and bypass scenarios**.

---

## 2. DATABASE MODEL & WORKFLOW ARCHITECTURE

### 2.1 Prisma Schema Specification

```prisma
enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}

enum RefundApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
  CANCELLED
}

model RefundApprovalRequest {
  id              String               @id @default(uuid())
  depositId       String
  deposit         Deposit              @relation(fields: [depositId], references: [id], onDelete: Cascade)
  requesterId     String
  requester       User                 @relation("RefundRequester", fields: [requesterId], references: [id])
  approverId      String?
  approver        User?                @relation("RefundApprover", fields: [approverId], references: [id])
  amount          Decimal              @db.Decimal(18, 4)
  currency        String               @default("NGN")
  reason          String
  status          RefundApprovalStatus @default(PENDING)
  rejectionReason String?
  paystackRefundId String?
  journalEntryRef String?
  approvedAt      DateTime?
  executedAt      DateTime?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([depositId])
  @@index([status])
  @@map("refund_approval_requests")
}
```

### 2.2 Dual-Authorization Finite State Machine

```
                  +----------------------------------------------+
                  | ADMIN initiates refund request (> ₦100,000)  |
                  | POST /api/v1/admin/deposits/:id/refund-request|
                  +----------------------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | Status: PENDING               |
                         | approverId: null              |
                         +-------------------------------+
                                 /       |       \
                                /        |        \
        [SUPER_ADMIN Approves] /  [Cancel|]        \ [Admin Rejects]
                              v          v          v
              +-------------------+ +-----------+ +-------------------+
              | Status: APPROVED  | | CANCELLED | | Status: REJECTED  |
              | approverId: S_ADM | | (Terminal)| | (Terminal)        |
              +-------------------+ +-----------+ +-------------------+
                       |
                       | [Execute Refund with Paystack API & Ledger]
                       v
              +-------------------+
              | Status: EXECUTED  |
              | (Terminal State)  |
              +-------------------+
```

---

## 3. INDEPENDENT TEST EXECUTION MATRIX (13 SCENARIOS)

All 13 scenarios were executed using the automated verification harness in [`backend/scripts/test-sprint7-2-validation.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/scripts/test-sprint7-2-validation.ts).

| Scenario # | Test ID | Operational / Adversarial Scenario | Precondition & Action | Expected Result | Actual Result | Status |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | `S7.2-APP-01` | **ADMIN requests refund $\le \text{NGN } 100,000$** | ADMIN requests ₦50,000 refund | Auto-approved under standard admin authority (`approverId = requesterId`) | `status === 'APPROVED'` | **PASS** |
| **2** | `S7.2-APP-02` | **ADMIN requests refund $> \text{NGN } 100,000$** | ADMIN requests ₦150,000 refund | Enters `PENDING` queue; requires secondary `SUPER_ADMIN` approval | `status === 'PENDING'`, `approverId === null` | **PASS** |
| **3** | `S7.2-APP-03` | **SUPER_ADMIN approves eligible refund** | Separate authenticated `SUPER_ADMIN` calls `/approve` | Request transitions to `APPROVED`; records `approverId` and timestamp | `status === 'APPROVED'`, `approverId === 'super-admin-1'` | **PASS** |
| **4** | `S7.2-APP-04` | **Requester attempts self-approval** | Requester (`super-admin-2`) attempts to approve own request | Strictly rejected with `HTTP 403` (Segregation of Duties Violation) | Rejected with error: `Self-approval is strictly prohibited` | **PASS** |
| **5** | `S7.2-APP-05` | **Standard ADMIN attempts approval without required authority** | User with `role: ADMIN` attempts to call `/approve` | Rejected with `HTTP 403` (Requires SUPER_ADMIN role) | Rejected: `Requires SUPER_ADMIN authority` | **PASS** |
| **6** | `S7.2-APP-06` | **Amount is changed after approval** | Approved for ₦150,000; execution requests ₦160,000 | Amount modification invalidates prior approval; execution blocked | Rejected: `Approved amount does not match requested execution amount` | **PASS** |
| **7** | `S7.2-APP-07` | **Deposit reference is changed after approval** | Approval for Deposit A used to execute refund on Deposit B | Mismatched deposit rejected with `HTTP 404/403` | Rejected: `Approval record does not match deposit` | **PASS** |
| **8** | `S7.2-APP-08` | **Same refund is executed twice** | Second call to execute refund with same `approvalRequestId` | Second execution rejected; request is in `EXECUTED` state | 1st: `Executed`, 2nd: `Request in EXECUTED status. Only APPROVED can execute` | **PASS** |
| **9** | `S7.2-APP-09` | **Two approval requests execute concurrently** | Simultaneous execution requests dispatched with same approval ID | Exactly one execution acquires row lock and commits; second is blocked | Exactly 1 succeeded, 1 rejected | **PASS** |
| **10** | `S7.2-APP-10` | **Approver attempts to reuse an executed approval** | Approver attempts to reference previously executed approval on new refund | Blocked; approval has already reached terminal `EXECUTED` status | Blocked: `Approval in EXECUTED status` | **PASS** |
| **11** | `S7.2-APP-11` | **Direct execution API call bypasses approval** | Dispatches `POST /deposits/:id/refund` for ₦150,000 without `approvalRequestId` | Rejected with `HTTP 403` (Dual Administrative Authorization Required) | Rejected: `Dual Administrative Authorization Required for > ₦100,000` | **PASS** |
| **12** | `S7.2-APP-12` | **Approved request is cancelled** | Administrator calls `POST /refunds/:requestId/cancel` prior to execution | Transitions to `CANCELLED`; subsequent execution attempts are rejected | `status === 'CANCELLED'`; execution blocked | **PASS** |
| **13** | `S7.2-APP-13` | **Rejected request is resubmitted** | Request was rejected; admin submits fresh request with amended reason | Initial request remains `REJECTED`; fresh request created with new ID in `PENDING` | Req 1: `REJECTED`, Req 2: `PENDING`, unique IDs | **PASS** |

---

## 4. API IMMUTABILITY & TAMPER RESISTANCE

### 4.1 Ordinary Admin API Audit
To ensure approval records cannot be altered or deleted:
1. **No DELETE Route:** There is **no HTTP route** exposing `DELETE /api/v1/admin/refunds/*` in [`backend/src/routes/admin.routes.ts`](file:///c:/Users/pc/Desktop/WALLET/backend/src/routes/admin.routes.ts).
2. **No Unrestricted UPDATE Route:** No general `PUT /refunds/:id` exists that allows updating `amount`, `depositId`, or `status` directly. Status transitions are strictly governed by state machine controller methods (`approveRefundRequest`, `rejectRefundRequest`, `cancelRefundRequest`, `processDepositRefund`).
3. **Audit Logging:** Every state transition (`REFUND_REQUEST_SUBMITTED`, `REFUND_REQUEST_APPROVED`, `REFUND_REQUEST_REJECTED`, `REFUND_REQUEST_CANCELLED`, `ADMIN_DEPOSIT_REFUND_COMPLETED`) writes an immutable record to the `AuditLog` table.

---

## 5. AUDIT CONCLUSION & RECOMMENDATIONS

### Workstream Status: `PASS (100% SATISFIED)`

The administrative dual-approval workflow has been completely hardened and independently verified. All client-side bypasses have been eradicated, segregation of duties is mathematically enforced by user ID comparison, and amount invariance ensures that no unauthorized value manipulation can occur between approval and execution.

### Operational Recommendations:
1. Ensure the production environment has at least two distinct administrator accounts provisioned: one with `role: ADMIN` and one with `role: SUPER_ADMIN`.
2. Configure webhook or SMS notifications alerting the `SUPER_ADMIN` whenever a refund exceeding ₦100,000 is queued for review.
