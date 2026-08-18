import axios from 'axios';
import { UserProfile, WalletBalanceData, TransactionRecord, PaginationData } from '../types';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add Authorization header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('payvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth API
  async register(data: { email: string; firstName: string; lastName: string; phoneNumber: string; password: string }) {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },

  async getProfile(): Promise<{ user: UserProfile }> {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },

  // Wallet API
  async getBalance(): Promise<WalletBalanceData> {
    const res = await apiClient.get('/wallet/balance');
    return res.data.data;
  },

  async getTransactions(params?: { page?: number; limit?: number; type?: string; status?: string }): Promise<{ transactions: TransactionRecord[]; pagination: PaginationData }> {
    const res = await apiClient.get('/wallet/transactions', { params });
    return res.data.data;
  },

  async sendP2PTransfer(data: { recipientWalletNumber: string; amount: number; narration?: string }) {
    const idempotencyKey = `IDEM_P2P_${Date.now()}`;
    const res = await apiClient.post('/wallet/transfer', data, {
      headers: { 'x-idempotency-key': idempotencyKey },
    });
    return res.data;
  },

  async requestWithdrawal(data: { bankName: string; accountNumber: string; accountName: string; bankCode?: string; amount: number }) {
    const idempotencyKey = `IDEM_WTH_${Date.now()}`;
    const res = await apiClient.post('/wallet/withdraw', data, {
      headers: { 'x-idempotency-key': idempotencyKey },
    });
    return res.data;
  },
};
