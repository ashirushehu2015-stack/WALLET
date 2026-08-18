export interface MetricsData {
  userCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  trialBalance: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
    isBalanced: boolean;
  };
  ledgerAccountsCount: number;
}

export interface LedgerAccount {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currency: string;
  description?: string;
  createdAt: string;
  walletAccount?: {
    walletNumber: string;
    availableBalance: number;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  postings?: LedgerPosting[];
}

export interface LedgerPosting {
  id: string;
  journalEntryId: string;
  ledgerAccountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  createdAt: string;
  ledgerAccount?: LedgerAccount;
}

export interface JournalEntry {
  id: string;
  reference: string;
  description: string;
  status: 'POSTED' | 'REVERSED';
  postedAt: string;
  createdAt: string;
  postings: LedgerPosting[];
}

export interface WebhookEvent {
  id: string;
  eventId: string;
  eventType: string;
  payload: any;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  action: string;
  resource: string;
  ipAddress?: string;
  details?: any;
  createdAt: string;
  actor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}
