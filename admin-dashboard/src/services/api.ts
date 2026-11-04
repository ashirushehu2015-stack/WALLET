import axios from 'axios';
import {
  MetricsData,
  LedgerAccount,
  JournalEntry,
  WebhookEvent,
  AuditLog,
  VASDashboardData,
  VASTransactionRecord,
} from '../types';

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
          name: 'VTPASS_CLEARING_ASSET',
          type: 'ASSET',
          currency: 'NGN',
          description: 'VTpass VTU service clearing account',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-5',
          name: 'VAS_COMMISSION_INCOME',
          type: 'INCOME',
          currency: 'NGN',
          description: 'Platform commission earned from Airtime & Data sales',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'acc-6',
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
              ledgerAccountId: 'acc-6',
              entryType: 'CREDIT',
              amount: 50000.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-6', name: 'USER_LIABILITY_10928374', type: 'LIABILITY', currency: 'NGN', createdAt: '' },
            },
          ],
        },
        {
          id: 'je-102',
          reference: 'VAS-JRN-20261104-001',
          description: 'MTN Airtime Purchase (08031234567) [Wholesale: N1960.00, Comm: N40.00]',
          status: 'POSTED',
          postedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          postings: [
            {
              id: 'p-3',
              journalEntryId: 'je-102',
              ledgerAccountId: 'acc-6',
              entryType: 'DEBIT',
              amount: 2000.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-6', name: 'USER_LIABILITY_10928374', type: 'LIABILITY', currency: 'NGN', createdAt: '' },
            },
            {
              id: 'p-4',
              journalEntryId: 'je-102',
              ledgerAccountId: 'acc-4',
              entryType: 'CREDIT',
              amount: 1960.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-4', name: 'VTPASS_CLEARING_ASSET', type: 'ASSET', currency: 'NGN', createdAt: '' },
            },
            {
              id: 'p-5',
              journalEntryId: 'je-102',
              ledgerAccountId: 'acc-5',
              entryType: 'CREDIT',
              amount: 40.0,
              createdAt: new Date().toISOString(),
              ledgerAccount: { id: 'acc-5', name: 'VAS_COMMISSION_INCOME', type: 'INCOME', currency: 'NGN', createdAt: '' },
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
          id: 'wh-1',
          eventId: 'evt_991823',
          eventType: 'charge.success',
          payload: { reference: 'PAY-827192', amount: 5000000, channel: 'dedicated_nuban' },
          status: 'PROCESSED',
          processedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'wh-2',
          eventId: 'evt_991824',
          eventType: 'transfer.success',
          payload: { reference: 'WTH-L1029', amount: 2000000 },
          status: 'PROCESSED',
          processedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  async triggerReconciliation(): Promise<any> {
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

  async getVASDashboard(): Promise<VASDashboardData> {
    try {
      const res = await axios.get(`${API_BASE}/vas/dashboard`);
      return res.data.data;
    } catch {
      return {
        overview: {
          totalTransactions: 28,
          successfulTransactions: 26,
          failedTransactions: 1,
          pendingTransactions: 1,
          grossSales: 64500.0,
          providerCost: 62887.5,
          grossProfit: 1612.5,
          successRate: 92.8,
        },
        providerBalance: {
          provider: 'VTPASS',
          balance: 148500.0,
          currency: 'NGN',
          environment: 'sandbox',
        },
        recentTransactions: [
          {
            id: 'vas-1',
            reference: 'VAS-MTN-20261104-101',
            serviceType: 'AIRTIME',
            network: 'MTN',
            recipientPhone: '08031234567',
            productName: 'MTN Airtime Recharge',
            faceValue: 2000,
            providerCost: 1960,
            serviceFee: 0,
            totalAmount: 2000,
            walletDebitAmount: 2000,
            status: 'SUCCESS',
            operatorReference: 'OP-MTN-881923',
            createdAt: new Date().toISOString(),
            user: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          },
          {
            id: 'vas-2',
            reference: 'VAS-AIR-20261104-102',
            serviceType: 'DATA',
            network: 'AIRTEL',
            recipientPhone: '08029876543',
            productName: 'Airtel 1.5GB (Monthly)',
            faceValue: 1200,
            providerCost: 1176,
            serviceFee: 0,
            totalAmount: 1200,
            walletDebitAmount: 1200,
            status: 'SUCCESS',
            operatorReference: 'OP-AIR-771239',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            user: { id: 'u2', firstName: 'Amina', lastName: 'Bello', email: 'amina@example.com' },
          },
        ],
      };
    }
  },

  async getVASTransactions(params?: {
    network?: string;
    status?: string;
    serviceType?: string;
    search?: string;
  }): Promise<VASTransactionRecord[]> {
    try {
      const res = await axios.get(`${API_BASE}/vas/transactions`, { params });
      return res.data.data.transactions;
    } catch {
      return [];
    }
  },

  async syncVASProducts(): Promise<{ message: string; count: number }> {
    const res = await axios.post(`${API_BASE}/vas/products/sync`);
    return res.data;
  },

  async refundVASTransaction(data: { vasTransactionId: string; reason: string }): Promise<any> {
    const res = await axios.post(`${API_BASE}/vas/refund`, data);
    return res.data;
  },

  async requeryVASTransaction(reference: string): Promise<any> {
    const res = await axios.post(`/api/v1/vas/transactions/${reference}/requery`);
    return res.data;
  },
};
