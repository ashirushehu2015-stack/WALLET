import axios from 'axios';
import { MetricsData, LedgerAccount, JournalEntry, WebhookEvent, AuditLog } from '../types';

const API_BASE = '/api/v1/admin';

export const adminApi = {
  async getMetrics(): Promise<MetricsData> {
    try {
      const res = await axios.get(`${API_BASE}/metrics`);
      return res.data.data;
    } catch {
      // Mock Fallback for Demo
      return {
        userCount: 142,
        totalDeposits: 4850000.0,
        totalWithdrawals: 1240000.0,
        trialBalance: {
          totalDebits: 6090000.0,
          totalCredits: 6090000.0,
          difference: 0.0,
          isBalanced: true,
        },
        ledgerAccountsCount: 146,
      };
    }
  },

  async getLedgerAccounts(): Promise<LedgerAccount[]> {
    try {
      const res = await axios.get(`${API_BASE}/ledger-accounts`);
      return res.data.data;
    } catch {
      return [
        {
          id: 'acc-1',
          name: 'PAYSTACK_CLEARING_ASSET',
          type: 'ASSET',
          currency: 'NGN',
          description: 'Paystack settlement clearing account',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-2',
          name: 'PLATFORM_FEE_INCOME',
          type: 'INCOME',
          currency: 'NGN',
          description: 'Revenue earned from withdrawal fees',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-3',
          name: 'PAYSTACK_FEE_EXPENSE',
          type: 'EXPENSE',
          currency: 'NGN',
          description: 'Paystack gateway deposit charges',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-4',
          name: 'USER_LIABILITY_10928374',
          type: 'LIABILITY',
          currency: 'NGN',
          description: 'User Wallet #10928374 (John Doe)',
          createdAt: new Date().toISOString(),
          walletAccount: {
            walletNumber: '10928374',
            availableBalance: 361000.0,
            user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          },
        },
      ];
    }
  },

  async getJournalEntries(): Promise<JournalEntry[]> {
    try {
      const res = await axios.get(`${API_BASE}/journal-entries`);
      return res.data.data;
    } catch {
      return [
        {
          id: 'je-101',
          reference: 'DEP-L29K8-9A81',
          description: 'Deposit via Paystack DVA [Ref: PAY-827192]',
          status: 'POSTED',
          postedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          postings: [
            {
              id: 'p-1',
              journalEntryId: 'je-101',
              ledgerAccountId: 'acc-1',
              entryType: 'DEBIT',
              amount: 50000.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-1', name: 'PAYSTACK_CLEARING_ASSET', type: 'ASSET', currency: 'NGN', createdAt: '' },
            },
            {
              id: 'p-2',
              journalEntryId: 'je-101',
              ledgerAccountId: 'acc-4',
              entryType: 'CREDIT',
              amount: 49250.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-4', name: 'USER_LIABILITY_10928374', type: 'LIABILITY', currency: 'NGN', createdAt: '' },
            },
            {
              id: 'p-3',
              journalEntryId: 'je-101',
              ledgerAccountId: 'acc-2',
              entryType: 'CREDIT',
              amount: 750.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-2', name: 'PLATFORM_FEE_INCOME', type: 'INCOME', currency: 'NGN', createdAt: '' },
            },
          ],
        },
      ];
    }
  },

  async getWebhooks(): Promise<WebhookEvent[]> {
    try {
      const res = await axios.get(`${API_BASE}/webhooks`);
      return res.data.data;
    } catch {
      return [
        {
          id: 'wb-1',
          eventId: 'evt_charge_99812',
          eventType: 'charge.success',
          payload: { event: 'charge.success', data: { reference: 'PAY-827192', amount: 5000000, fees: 75000 } },
          status: 'PROCESSED',
          processedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'wb-2',
          eventId: 'evt_trf_00192',
          eventType: 'transfer.success',
          payload: { event: 'transfer.success', data: { reference: 'WTH-L29K8-1029', transfer_code: 'TRF_9281' } },
          status: 'PROCESSED',
          processedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  async triggerReconciliation() {
    try {
      const res = await axios.post(`${API_BASE}/reconcile`);
      return res.data.data;
    } catch {
      return {
        reconciliationId: 'rec-001',
        periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
        totalDeposits: 4850000.0,
        totalPayouts: 1240000.0,
        trialBalance: {
          totalDebits: 6090000.0,
          totalCredits: 6090000.0,
          difference: 0.0,
          isBalanced: true,
        },
        status: 'MATCHED',
      };
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await axios.get(`${API_BASE}/audit-logs`);
      return res.data.data;
    } catch {
      return [
        {
          id: 'log-1',
          actorType: 'SYSTEM',
          action: 'POST_JOURNAL_ENTRY',
          resource: 'journal_entries/DEP-L29K8-9A81',
          ipAddress: '127.0.0.1',
          details: { reference: 'DEP-L29K8-9A81', amount: 50000.0 },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log-2',
          actorType: 'ADMIN',
          action: 'TRIGGER_RECONCILIATION',
          resource: 'reconciliation_records',
          ipAddress: '102.89.23.11',
          details: { status: 'MATCHED' },
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },
};
