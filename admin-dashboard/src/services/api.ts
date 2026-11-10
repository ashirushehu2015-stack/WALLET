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
const TOKEN_KEY = 'mangapay_admin_token';
const ADMIN_USER_KEY = 'mangapay_admin_user';

export const adminHttpClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically attach JWT Bearer token to all administrative requests
adminHttpClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  getAdminUser(): any | null {
    const raw = sessionStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  },

  /**
   * Explicit Administrator Login
   * Authenticates against backend /api/v1/auth/login and verifies ADMIN role.
   */
  async login(email: string, password: string): Promise<any> {
    const res = await axios.post('/api/v1/auth/login', { email, password });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Authentication failed');
    }
    const { token, user } = res.data.data;
    if (user.role !== 'ADMIN') {
      throw new Error('Access denied: Administrator role required to access this portal.');
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
  },

  // Strict API Calls - REMOVED: Silent mock fallbacks completely eliminated.
  async getMetrics(): Promise<MetricsData> {
    const res = await adminHttpClient.get(`${API_BASE}/metrics`);
    return res.data.data;
  },

  async getLedgerAccounts(): Promise<LedgerAccount[]> {
    const res = await adminHttpClient.get(`${API_BASE}/ledger-accounts`);
    return res.data.data;
  },

  async getJournalEntries(): Promise<JournalEntry[]> {
    const res = await adminHttpClient.get(`${API_BASE}/journal-entries`);
    return res.data.data;
  },

  async getWebhooks(): Promise<WebhookEvent[]> {
    const res = await adminHttpClient.get(`${API_BASE}/webhooks`);
    return res.data.data;
  },

  async triggerReconciliation(): Promise<any> {
    const res = await adminHttpClient.post(`${API_BASE}/reconcile`);
    return res.data.data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await adminHttpClient.get(`${API_BASE}/audit-logs`);
    return res.data.data;
  },

  async getVASDashboard(): Promise<VASDashboardData> {
    const res = await adminHttpClient.get(`${API_BASE}/vas/dashboard`);
    return res.data.data;
  },

  async getVASTransactions(params?: {
    network?: string;
    status?: string;
    serviceType?: string;
    search?: string;
  }): Promise<VASTransactionRecord[]> {
    const res = await adminHttpClient.get(`${API_BASE}/vas/transactions`, { params });
    return res.data.data.transactions;
  },

  async syncVASProducts(): Promise<{ message: string; count: number }> {
    const res = await adminHttpClient.post(`${API_BASE}/vas/products/sync`);
    return res.data;
  },

  async refundVASTransaction(data: { vasTransactionId: string; reason: string }): Promise<any> {
    const res = await adminHttpClient.post(`${API_BASE}/vas/refund`, data);
    return res.data;
  },

  async requeryVASTransaction(reference: string): Promise<any> {
    const res = await adminHttpClient.post(`/api/v1/vas/transactions/${reference}/requery`);
    return res.data;
  },

  // Deposit Suspense & Refund Operations
  async getSuspenseDeposits(): Promise<any[]> {
    const res = await adminHttpClient.get(`${API_BASE}/deposits/suspense`);
    return res.data.data;
  },

  async refundDeposit(id: string, data: { amount?: number; reason: string; dualApproved?: boolean }): Promise<any> {
    const res = await adminHttpClient.post(`${API_BASE}/deposits/${id}/refund`, data);
    return res.data;
  },

  // KYC Compliance Queue & Review
  async getKYCQueue(): Promise<any[]> {
    const res = await adminHttpClient.get(`${API_BASE}/kyc/queue`);
    return res.data.data;
  },

  async reviewKYC(id: string, data: { status: 'VERIFIED' | 'REJECTED'; tier?: string; rejectionReason?: string }): Promise<any> {
    const res = await adminHttpClient.post(`${API_BASE}/kyc/${id}/review`, data);
    return res.data;
  },
};
