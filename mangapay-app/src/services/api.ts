import axios from 'axios';
import { UserProfile, WalletBalanceData, TransactionRecord } from '../types';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mangapay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  async register(data: { email: string; firstName: string; lastName: string; phoneNumber: string; password: string }): Promise<{ token: string; user: any }> {
    const res = await apiClient.post('/auth/register', data);
    return res.data.data;
  },

  async login(data: { email: string; password: string }): Promise<{ token: string; user: any }> {
    const res = await apiClient.post('/auth/login', data);
    return res.data.data;
  },

  async getProfile(): Promise<UserProfile> {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  async getBalance(): Promise<WalletBalanceData> {
    const res = await apiClient.get('/wallet/balance');
    return res.data.data;
  },

  async getTransactions(params?: { page?: number; limit?: number; type?: string; status?: string }): Promise<{ transactions: TransactionRecord[] }> {
    const res = await apiClient.get('/wallet/transactions', { params });
    return res.data.data;
  },

  async fundWallet(data: { amount: number; paymentMethod?: string }) {
    // Simulated Paystack webhook deposit for instant demo funding
    const res = await apiClient.post('/webhooks/paystack', {
      event: 'charge.success',
      id: `evt_manga_fund_${Date.now()}`,
      data: {
        reference: `PAY-MANGA-${Date.now()}`,
        amount: data.amount * 100, // in Kobo
        fees: 0,
        customer: { customer_code: 'CUS_MANGAPAY_DEMO' },
      },
    });
    return res.data;
  },

  async sendP2P(data: { recipientWalletNumber: string; amount: number; narration?: string }) {
    const res = await apiClient.post('/wallet/transfer', data, {
      headers: { 'x-idempotency-key': `IDEM_P2P_${Date.now()}` },
    });
    return res.data;
  },

  async withdraw(data: { bankName: string; accountNumber: string; accountName: string; bankCode?: string; amount: number }) {
    const res = await apiClient.post('/wallet/withdraw', data, {
      headers: { 'x-idempotency-key': `IDEM_WTH_${Date.now()}` },
    });
    return res.data;
  },
};
