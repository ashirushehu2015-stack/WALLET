import axios from 'axios';
import { PAYSTACK_CONFIG } from '../config/paystack';
import { logger } from '../config/logger';
import { isEncrypted, decryptIdentifier } from '../utils/encryption';

export type PaystackTransferStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'REVERSED'
  | 'UNKNOWN';

export class PaystackTimeoutError extends Error {
  public reference: string;
  constructor(message: string, reference: string) {
    super(message);
    this.name = 'PaystackTimeoutError';
    this.reference = reference;
  }
}

export class PaystackService {
  private static client = axios.create({
    baseURL: PAYSTACK_CONFIG.BASE_URL,
    timeout: 15000, // 15 second request timeout
    headers: {
      Authorization: `Bearer ${PAYSTACK_CONFIG.SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  /**
   * Create customer on Paystack
   */
  static async createCustomer(email: string, firstName: string, lastName: string, phone: string) {
    try {
      const response = await this.client.post('/customer', {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      return response.data.data;
    } catch (error: any) {
      logger.error('Paystack Customer Creation Error:', error?.response?.data || error.message);
      throw new Error(`Paystack Customer Creation Failed: ${error?.response?.data?.message || error.message}`);
    }
  }

  /**
   * Assign Dedicated Virtual Account (DVA) to Customer
   */
  static async createDedicatedVirtualAccount(customerCode: string, bvn?: string) {
    try {
      const plainBvn = bvn && isEncrypted(bvn) ? decryptIdentifier(bvn) : bvn;
      const response = await this.client.post('/dedicated_account', {
        customer: customerCode,
        preferred_bank: 'wema-bank',
        bvn: plainBvn || undefined,
      });
      return response.data.data;
    } catch (error: any) {
      logger.error('Paystack DVA Creation Error:', error?.response?.data || error.message);
      // In development mode only, provide fallback mock payload if test API key has no live banking partner assigned
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Providing development fallback DVA payload for local testing');
        return {
          account_number: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
          account_name: 'TEST WALLET DVA',
          bank: { name: 'Wema Bank', id: 20, code: '035' },
        };
      }
      throw new Error(`Paystack DVA Creation Failed: ${error?.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create Transfer Recipient for Outward Bank Payouts
   * STRICT: Never returns fabricated success or mock recipient on provider failure.
   */
  static async createTransferRecipient(name: string, accountNumber: string, bankCode: string) {
    try {
      const response = await this.client.post('/transferrecipient', {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      });
      return response.data.data;
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error.message;
      logger.error('Paystack Transfer Recipient Error:', errMsg);
      throw new Error(`Paystack Transfer Recipient Creation Failed: ${errMsg}`);
    }
  }

  /**
   * Initiate Outward Bank Transfer
   * STRICT: Never returns fabricated success responses. A provider error must never produce a successful result.
   */
  static async initiateTransfer(amount: number, recipientCode: string, reference: string, reason: string) {
    try {
      const response = await this.client.post('/transfer', {
        source: 'balance',
        amount: Math.round(amount * 100), // convert NGN to kobo
        recipient: recipientCode,
        reference,
        reason,
      });
      return response.data.data;
    } catch (error: any) {
      const isTimeout =
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response ||
        error.message?.toLowerCase().includes('timeout');

      const errMsg = error?.response?.data?.message || error.message;
      logger.error(`Paystack Initiate Transfer Error [Ref: ${reference}]:`, errMsg);

      if (isTimeout) {
        // Network timeout / ambiguous provider state: Do NOT treat as failed!
        throw new PaystackTimeoutError(
          `Paystack Transfer Ambiguous Timeout for Reference ${reference}. Status requery required before releasing funds.`,
          reference
        );
      }

      // Definitive provider failure (e.g. 400 Bad Request, 422 Unprocessable, Insufficient Balance)
      throw new Error(`Paystack Transfer Failed: ${errMsg}`);
    }
  }

  /**
   * Requery Transfer Status directly from Paystack API
   */
  static async verifyTransfer(reference: string): Promise<{
    status: PaystackTransferStatus;
    data?: any;
    rawStatus?: string;
  }> {
    try {
      const response = await this.client.get(`/transfer/verify/${encodeURIComponent(reference)}`);
      const transferData = response.data?.data;
      const rawStatus = (transferData?.status || '').toLowerCase();

      let mappedStatus: PaystackTransferStatus = 'UNKNOWN';
      if (rawStatus === 'success') {
        mappedStatus = 'SUCCESSFUL';
      } else if (rawStatus === 'pending') {
        mappedStatus = 'PENDING';
      } else if (rawStatus === 'processing') {
        mappedStatus = 'PROCESSING';
      } else if (rawStatus === 'failed' || rawStatus === 'rejected') {
        mappedStatus = 'FAILED';
      } else if (rawStatus === 'reversed') {
        mappedStatus = 'REVERSED';
      }

      return {
        status: mappedStatus,
        data: transferData,
        rawStatus,
      };
    } catch (error: any) {
      logger.error(`Paystack Verify Transfer Error [Ref: ${reference}]:`, error?.response?.data || error.message);
      return {
        status: 'UNKNOWN',
        rawStatus: error.message,
      };
    }
  }

  /**
   * Fetch Live Paystack Ledger / Account Balance
   */
  static async getAccountBalance(): Promise<{ currency: string; balance: number }[]> {
    try {
      const response = await this.client.get('/balance');
      const balances = response.data?.data;
      if (Array.isArray(balances)) {
        return balances.map((b: any) => ({
          currency: b.currency,
          balance: Number(b.balance) / 100, // convert kobo to NGN
        }));
      }
      return [];
    } catch (error: any) {
      logger.error('Paystack Balance Query Error:', error?.response?.data || error.message);
      throw new Error(`Paystack Balance Query Failed: ${error?.response?.data?.message || error.message}`);
    }
  }

  /**
   * Fetch Paystack External Transactions List (for line-item reconciliation)
   */
  static async fetchTransactions(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    perPage: number = 50
  ): Promise<{ transactions: any[]; meta: any; status: 'CONNECTED' | 'UNAVAILABLE' }> {
    try {
      const params: any = { page, perPage };
      if (startDate) params.from = startDate.toISOString();
      if (endDate) params.to = endDate.toISOString();

      const response = await this.client.get('/transaction', { params });
      return {
        transactions: response.data?.data || [],
        meta: response.data?.meta || {},
        status: 'CONNECTED',
      };
    } catch (error: any) {
      logger.warn('Paystack fetchTransactions Error:', error?.response?.data || error.message);
      return {
        transactions: [],
        meta: {},
        status: 'UNAVAILABLE',
      };
    }
  }

  /**
   * Fetch Paystack Settlement Batches
   */
  static async fetchSettlements(
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    perPage: number = 50
  ): Promise<{ settlements: any[]; meta: any; status: 'CONNECTED' | 'UNAVAILABLE' }> {
    try {
      const params: any = { page, perPage };
      if (startDate) params.from = startDate.toISOString();
      if (endDate) params.to = endDate.toISOString();

      const response = await this.client.get('/settlement', { params });
      return {
        settlements: response.data?.data || [],
        meta: response.data?.meta || {},
        status: 'CONNECTED',
      };
    } catch (error: any) {
      logger.warn('Paystack fetchSettlements Error:', error?.response?.data || error.message);
      return {
        settlements: [],
        meta: {},
        status: 'UNAVAILABLE',
      };
    }
  }

  /**
   * Fetch Transactions Linked to a Specific Paystack Settlement Batch
   */
  static async fetchSettlementTransactions(
    settlementId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<{ transactions: any[]; meta: any; status: 'CONNECTED' | 'UNAVAILABLE' }> {
    try {
      const response = await this.client.get(`/settlement/${encodeURIComponent(settlementId)}/transactions`, {
        params: { page, perPage },
      });
      return {
        transactions: response.data?.data || [],
        meta: response.data?.meta || {},
        status: 'CONNECTED',
      };
    } catch (error: any) {
      logger.warn(`Paystack fetchSettlementTransactions Error [Settlement: ${settlementId}]:`, error?.response?.data || error.message);
      return {
        transactions: [],
        meta: {},
        status: 'UNAVAILABLE',
      };
    }
  }

  /**
   * Initiate a refund on Paystack for a received transaction.
   * Used for deposit exceptions, over-limit holds, and administrative resolutions.
   */
  static async createRefund(
    transactionReference: string,
    amountNGN?: number,
    merchantNote?: string
  ): Promise<{ status: 'SUCCESS' | 'PENDING' | 'FAILED'; refundReference?: string; message?: string }> {
    try {
      const payload: any = {
        transaction: transactionReference,
        merchant_note: merchantNote || 'MangaPay administrative deposit refund',
      };
      if (amountNGN && amountNGN > 0) {
        payload.amount = Math.round(amountNGN * 100); // Kobo
      }

      const response = await this.client.post('/refund', payload);
      const data = response.data?.data;
      return {
        status: data?.status === 'processed' ? 'SUCCESS' : 'PENDING',
        refundReference: data?.id?.toString() || data?.reference || `REF_${Date.now()}`,
        message: response.data?.message || 'Refund initiated successfully',
      };
    } catch (error: any) {
      const errData = error?.response?.data;
      logger.warn(`Paystack Refund Notice [Tx: ${transactionReference}]:`, errData || error.message);

      return {
        status: 'FAILED',
        message: errData?.message || error.message || 'Payment gateway rejected refund request',
      };
    }
  }

  /**
   * Query identity provider (Paystack BVN Match API) to verify BVN and customer identity.
   * If sandbox/unconfigured, returns UNAVAILABLE or simulated result rather than fabricated success.
   */
  static async verifyBVN(
    bvn: string,
    accountNumber?: string,
    bankCode?: string
  ): Promise<{ verified: boolean; status: 'VERIFIED' | 'REJECTED' | 'UNAVAILABLE'; reason?: string }> {
    try {
      const plainBvn = isEncrypted(bvn) ? decryptIdentifier(bvn) : bvn;
      if (!plainBvn || !/^\d{11}$/.test(plainBvn.trim())) {
        return { verified: false, status: 'REJECTED', reason: 'BVN must be exactly 11 numeric digits.' };
      }

      if (accountNumber && bankCode) {
        const response = await this.client.post('/bvn/match', {
          bvn: plainBvn.trim(),
          account_number: accountNumber,
          bank_code: bankCode,
        });
        const isMatch = response.data?.data?.is_blacklisted === false;
        return {
          verified: isMatch,
          status: isMatch ? 'VERIFIED' : 'REJECTED',
          reason: isMatch ? undefined : 'BVN account details do not match.',
        };
      }

      const response = await this.client.get(`/bank/resolve_bvn/${encodeURIComponent(plainBvn.trim())}`);
      const data = response.data?.data;
      if (data && data.bvn === plainBvn.trim()) {
        return { verified: true, status: 'VERIFIED' };
      }
      return { verified: false, status: 'REJECTED', reason: 'BVN could not be verified by identity provider.' };
    } catch (error: any) {
      logger.warn(`Paystack BVN verification unavailable or rejected:`, error?.response?.data || error.message);
      return {
        verified: false,
        status: 'UNAVAILABLE',
        reason: error?.response?.data?.message || 'External identity verification provider is currently unavailable.',
      };
    }
  }
}
