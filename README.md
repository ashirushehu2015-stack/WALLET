# 🛡️ Enterprise Fintech Wallet & Double-Entry Ledger System

A production-grade, highly secure Fintech Wallet infrastructure built with **Node.js (TypeScript)**, **Express**, **PostgreSQL (Prisma)**, and integrated with **Paystack** for Dedicated Virtual Accounts (DVA), Customer Funding, and Bank Payouts. Includes a **React + Vite Admin Dashboard** for real-time double-entry ledger monitoring, webhook audits, and settlement reconciliation.

---

## 🏛️ System Architecture

```
               +-------------------------------------------------------+
               |                     YOUR WALLET                       |
               |                                                       |
               |  +---------------------+    +----------------------+  |
               |  |    User Accounts    |    |   KYC / Tiering      |  |
               |  +----------+----------+    +----------+-----------+  |
               |             |                          |              |
               |             v                          v              |
               |  +-------------------------------------------------+  |
               |  |             Wallet Accounts (User)              |  |
               |  +-------------------------+-----------------------+  |
               |                            |                          |
               |                            v                          |
               |  +-------------------------------------------------+  |
               |  |               DOUBLE-ENTRY LEDGER               |  |
               |  |  +-------------------+   +-------------------+  |  |
               |  |  |  Journal Entries  |   |  Ledger Postings  |  |  |
               |  |  +-------------------+   +-------------------+  |  |
               |  +-------------------------+-----------------------+  |
               |                            |                          |
               |    +-----------------------+---------------------+    |
               |    |                       |                     |    |
               |    v                       v                     v    |
               | +-------+            +------------+        +-----------+
               | |Deposits|           |Withdrawals |        | Transfers |
               | +---+---+            +-----+------+        +-----+-----+
               |     |                      |                     |    |
               |     +----------------------+---------------------+    |
               |                            |                          |
               |  +-------------------------v-----------------------+  |
               |  |  Idempotency | Webhook Processing | Audit Logs  |  |
               |  +-------------------------+-----------------------+  |
               |                            |                          |
               |  +-------------------------v-----------------------+  |
               |  |     Reconciliation Engine & Admin Dashboard     |  |
               |  +-------------------------------------------------+  |
               +----------------------------+--------------------------+
                                            |
                                            v (HMAC SHA-512 Signed API & Webhooks)
                                 +---------------------+
                                 |   PAYSTACK GATEWAY  |
                                 +----------+----------+
                                            |
                         +------------------+------------------+
                         |                  |                  |
                         v                  v                  v
                  +-------------+    +--------------+   +-------------+
                  |  DVA Auto-  |    | Deposit      |   | Bank Payout |
                  |  Generation |    | Notification |   | Transfers   |
                  +-------------+    +--------------+   +-------------+
```

---

## ⚖️ Double-Entry Ledger Principles

In this wallet system, money is never created out of nowhere or lost in arbitrary balance column increments. Every monetary event is governed by standard double-entry accounting where:

$$\sum \text{Debits} = \sum \text{Credits}$$

### Chart of Accounts Structure
1. **`LIABILITY` Accounts (User Wallets)**: Represents money owed by the platform to users.
   - Normal Balance: **CREDIT** (Increasing liability = Crediting user account).
2. **`ASSET` Accounts (Paystack Clearing Account)**: Represents funds held by Paystack/Bank clearing accounts on behalf of the platform.
   - Normal Balance: **DEBIT** (Increasing asset = Debiting clearing account).
3. **`INCOME` Accounts (Platform Transaction Fees)**: Revenue earned by the platform on transfers or payouts.
   - Normal Balance: **CREDIT**.
4. **`EXPENSE` Accounts (Paystack Gateway Fees)**: Processing charges paid to Paystack.
   - Normal Balance: **DEBIT**.

### Transaction Accounting Flows

#### 1. User Deposit via Paystack DVA (e.g. ₦10,000 Deposit, ₦100 Paystack Fee)
- **DEBIT**: `Paystack Clearing Account` (ASSET) $+\text{₦10,000}$
- **CREDIT**: `User Wallet Ledger Account` (LIABILITY) $+\text{₦9,900}$
- **CREDIT**: `Paystack Fee Reserve` (EXPENSE) $+\text{₦100}$
- *Verification*: $\text{Debits } (10,000) = \text{Credits } (9,900 + 100) = 10,000$

#### 2. Peer-to-Peer Internal Wallet Transfer (e.g. ₦5,000 from User A to User B)
- **DEBIT**: `User A Wallet Ledger Account` (LIABILITY) $-\text{₦5,000}$
- **CREDIT**: `User B Wallet Ledger Account` (LIABILITY) $+\text{₦5,000}$
- *Verification*: $\text{Debits } (5,000) = \text{Credits } (5,000)$

#### 3. Withdrawal / Bank Payout via Paystack (e.g. ₦2,000 Payout + ₦50 Platform Fee)
- **DEBIT**: `User Wallet Ledger Account` (LIABILITY) $+\text{₦2,050}$ (Reduces user balance)
- **CREDIT**: `Paystack Clearing Account` (ASSET) $+\text{₦2,000}$ (Funds leaving Paystack)
- **CREDIT**: `Platform Fee Revenue` (INCOME) $+\text{₦50}$ (Platform fee earned)
- *Verification*: $\text{Debits } (2,050) = \text{Credits } (2,000 + 50) = 2,050$

---

## 🗄️ Database Schema & Prisma Schema Summary

The database uses PostgreSQL with strict referential integrity, unique indices, and check constraints:

- **`users`**: Core identity & login credentials.
- **`kyc_records`**: BVN/NIN documents, tier limits (Tier 1, Tier 2, Tier 3).
- **`wallet_accounts`**: User wallet number, available balance (cached for speed), ledger account FK.
- **`ledger_accounts`**: System chart of accounts (Assets, Liabilities, Income, Expenses).
- **`journal_entries`**: Master transaction journal reference and descriptions.
- **`ledger_postings`**: Atomic debits and credits linked to journal entries.
- **`transactions`**: High-level unified transaction records with type, status, and idempotency key.
- **`dedicated_virtual_accounts`**: Paystack DVA details (Bank Name, Account Number, Customer Code).
- **`deposits`**: Paystack deposit audit records.
- **`withdrawals`**: Bank transfer payout requests and status updates.
- **`transfers`**: P2P wallet transfer records.
- **`idempotency_keys`**: Request deduplication store preventing double requests.
- **`webhook_events`**: Paystack webhook logs with duplicate event ID prevention.
- **`audit_logs`**: System audit trail (Actor, Action, IP, Details).
- **`reconciliation_records`**: Periodical reconciliation reports comparing Paystack vs Ledger balances.

---

## 🔒 Security & Protection Controls

1. **Idempotency Safeguard**: Every financial operation requires an `x-idempotency-key` header. Duplicate requests return cached responses without re-executing transactions.
2. **Atomic Ledger Transactions**: Database transaction locks (`SELECT ... FOR UPDATE`) prevent concurrent race conditions on wallet balances.
3. **Paystack HMAC Verification**: Paystack webhooks validate `x-paystack-signature` using HMAC-SHA512 with the secret key before processing.
4. **JWT & RBAC**: Role-based access control protecting User vs Admin endpoints.
5. **Audit Logging**: Comprehensive logging of user/admin sensitive actions.

---

## 📁 Project Structure

```
WALLET/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Comprehensive Prisma schema
│   │   └── seed.ts             # Chart of accounts seeding
│   ├── src/
│   │   ├── config/             # DB, Paystack, Logger configuration
│   │   ├── controllers/        # Auth, Wallet, Webhook, Admin controllers
│   │   ├── middlewares/        # Auth, Idempotency, HMAC verification
│   │   ├── routes/             # API routes
│   │   ├── services/           # Ledger Engine, Paystack API, Webhook, Recon
│   │   └── utils/              # Idempotency, HMAC Crypto, Reference Generators
│   ├── package.json
│   └── tsconfig.json
├── admin-dashboard/
│   ├── src/
│   │   ├── components/         # Metric cards, Navbar, Sidebar
│   │   ├── pages/              # Overview, Ledger Browser, Transactions, Webhooks, Reconciliation, Audit Logs
│   │   ├── services/           # API Client
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx
│   │   └── index.css           # Glassmorphism styling tokens
│   ├── package.json
│   └── vite.config.ts
├── package.json                # Monorepo root script runner
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js `v18.x` or higher
- PostgreSQL Database
- Paystack Account (Test / Live Secret & Public Keys)

### 2. Environment Setup
Copy `.env.example` in `backend/` to `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wallet_db?schema=public"
JWT_SECRET="your_super_secret_jwt_key_at_least_32_chars"
PAYSTACK_SECRET_KEY="sk_test_xxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxx"
PAYSTACK_WEBHOOK_SECRET="sk_test_xxx"
```

### 3. Database Migration & Seeding
In the `backend/` directory:

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Running the Backend Server
```bash
npm run dev
# Server starts on http://localhost:5000
```

### 5. Running the Admin Dashboard
In the `admin-dashboard/` directory:

```bash
cd admin-dashboard
npm install
npm run dev
# Dashboard starts on http://localhost:5173
```

---

## 🧪 Testing Webhooks & Reconciliation

1. **Paystack Webhook Endpoint**: `POST /api/v1/webhooks/paystack`
   - Include header `x-paystack-signature` generated with your `PAYSTACK_SECRET_KEY`.
2. **Reconciliation Trigger**: `POST /api/v1/admin/reconcile`
   - Scans Paystack total deposits and payouts against `journal_entries` and produces a discrepancy report.

---

## 📜 License
MIT License. Free to use for enterprise and production wallet builds.
