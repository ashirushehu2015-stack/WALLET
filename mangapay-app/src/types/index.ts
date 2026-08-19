export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'USER' | 'ADMIN';
  walletAccount?: {
    walletNumber: string;
    availableBalance: number;
    ledgerBalance: number;
    currency: string;
  };
  dva?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  };
}

export interface WalletBalanceData {
  availableBalance: number;
  pendingHolds: number;
  ledgerBalance: number;
  currency: string;
}

export interface TransactionRecord {
  id: string;
  reference: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  amount: number;
  fee: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  description: string;
  createdAt: string;
}

export type TabType = 'home' | 'history' | 'profile';
