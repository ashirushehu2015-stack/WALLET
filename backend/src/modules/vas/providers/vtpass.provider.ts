import axios, { AxiosInstance } from 'axios';
import { VASTransactionStatus } from '@prisma/client';
import { logger } from '../../../config/logger';
import {
  NetworkMetadata,
  NormalizedDataPlan,
  AirtimePurchaseParams,
  DataPurchaseParams,
  ProviderPurchaseResult,
  RequeryResult,
  ProviderBalanceResult,
  NetworkName,
} from '../vas.types';
import { IVASProvider } from './provider.interface';

export class VTPassProvider implements IVASProvider {
  readonly providerName = 'VTPASS';
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;
  private publicKey: string;
  private environment: string;

  constructor() {
    this.baseUrl = (process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api').replace(/\/$/, '');
    this.apiKey = process.env.VTPASS_API_KEY || '';
    this.secretKey = process.env.VTPASS_SECRET_KEY || '';
    this.publicKey = process.env.VTPASS_PUBLIC_KEY || '';
    this.environment = process.env.VTPASS_ENVIRONMENT || 'sandbox';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30s timeout per VTpass guidelines
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getAuthHeaders(includeSecret = true): Record<string, string> {
    const headers: Record<string, string> = {
      'api-key': this.apiKey,
    };
    if (this.publicKey) {
      headers['public-key'] = this.publicKey;
    }
    if (includeSecret && this.secretKey) {
      headers['secret-key'] = this.secretKey;
    }
    return headers;
  }

  /**
   * Generates a VTpass compliant request_id:
   * Format: YYYYMMDDHHmm + random alphanumeric string (minimum 8 chars)
   */
  generateRequestId(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(
      now.getMinutes()
    )}`;
    const randomSuffix = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
    return `${timestamp}${randomSuffix}`;
  }

  /**
   * Returns authoritative telecom network service configurations for VTpass
   */
  async getNetworks(): Promise<NetworkMetadata[]> {
    return [
      {
        id: 'MTN',
        name: 'MTN Nigeria',
        airtimeServiceId: 'mtn',
        dataServiceId: 'mtn-data',
        smeDataServiceId: 'mtn-sme-data',
        brandColor: '#FFCC00',
        minAirtime: 50,
        maxAirtime: 50000,
        isActive: true,
      },
      {
        id: 'AIRTEL',
        name: 'Airtel Nigeria',
        airtimeServiceId: 'airtel',
        dataServiceId: 'airtel-data',
        brandColor: '#E60000',
        minAirtime: 50,
        maxAirtime: 50000,
        isActive: true,
      },
      {
        id: 'GLO',
        name: 'Globacom (Glo)',
        airtimeServiceId: 'glo',
        dataServiceId: 'glo-data',
        smeDataServiceId: 'glo-sme-data',
        brandColor: '#2EB82E',
        minAirtime: 50,
        maxAirtime: 50000,
        isActive: true,
      },
      {
        id: '9MOBILE',
        name: '9mobile',
        airtimeServiceId: 'etisalat',
        dataServiceId: 'etisalat-data',
        brandColor: '#005C29',
        minAirtime: 50,
        maxAirtime: 50000,
        isActive: true,
      },
    ];
  }

  /**
   * Retrieves live data variations from VTpass product catalogue
   */
  async getDataPlans(network: NetworkName): Promise<NormalizedDataPlan[]> {
    const networks = await this.getNetworks();
    const netConfig = networks.find((n) => n.id === network);
    if (!netConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    const serviceId = netConfig.dataServiceId;

    try {
      if (!this.apiKey) {
        logger.warn('VTpass API Key not configured. Returning verified fallback plans for test environment.');
        return this.getFallbackPlans(network, serviceId);
      }

      const res = await this.client.get(`/service-variations?serviceID=${serviceId}`, {
        headers: this.getAuthHeaders(false),
      });

      const data = res.data;
      if (data.response_description !== '000' || !data.content?.varations) {
        logger.warn(`VTpass returned non-000 for ${serviceId}: ${data.response_description}`);
        return this.getFallbackPlans(network, serviceId);
      }

      const variations: any[] = data.content.varations;
      return variations.map((v) => {
        const cost = Number(v.variation_amount || 0);
        return {
          network,
          serviceId,
          variationCode: v.variation_code,
          name: v.name,
          dataAllowance: this.extractDataAllowance(v.name),
          validity: this.extractValidity(v.name),
          providerCost: cost,
          sellingPrice: cost, // Base selling price (pricing service applies margins)
          isActive: true,
        };
      });
    } catch (error: any) {
      logger.error(`Failed to fetch live VTpass data plans for ${network}:`, error.message);
      return this.getFallbackPlans(network, serviceId);
    }
  }

  /**
   * Executes an airtime recharge request to VTpass
   */
  async purchaseAirtime(params: AirtimePurchaseParams): Promise<ProviderPurchaseResult> {
    const networks = await this.getNetworks();
    const netConfig = networks.find((n) => n.id === params.network);
    if (!netConfig) {
      throw new Error(`Invalid network: ${params.network}`);
    }

    const serviceID = netConfig.airtimeServiceId;
    const payload = {
      request_id: params.requestId,
      serviceID,
      billersCode: params.recipientPhone,
      amount: params.amount,
      phone: params.customerPhone || params.recipientPhone,
    };

    logger.info(`Submitting VTpass Airtime purchase [${params.requestId}]: ${params.network} ₦${params.amount} to ${params.recipientPhone}`);

    try {
      if (!this.apiKey) {
        return this.simulateSandboxPurchase(params.requestId, params.amount);
      }

      const res = await this.client.post('/pay', payload, {
        headers: this.getAuthHeaders(true),
      });

      const data = res.data;
      return this.normalizeProviderResponse(params.requestId, data, params.amount);
    } catch (err: any) {
      logger.error(`VTpass Airtime API Network/Timeout Error [${params.requestId}]:`, err.message);
      // Under network error/timeout, do NOT declare failed! Set PENDING to trigger requery.
      return {
        providerName: this.providerName,
        providerReference: params.requestId,
        status: VASTransactionStatus.PENDING,
        responseCode: 'TIMEOUT_OR_NETWORK_ERROR',
        responseMessage: err.message || 'Network timeout communicating with VTpass',
        providerCost: params.amount,
        rawPayload: { error: err.message },
      };
    }
  }

  /**
   * Executes a mobile data purchase request to VTpass
   */
  async purchaseData(params: DataPurchaseParams): Promise<ProviderPurchaseResult> {
    const payload = {
      request_id: params.requestId,
      serviceID: params.serviceId,
      billersCode: params.recipientPhone,
      variation_code: params.variationCode,
      amount: params.amount,
      phone: params.customerPhone || params.recipientPhone,
    };

    logger.info(`Submitting VTpass Data purchase [${params.requestId}]: ${params.network} plan ${params.variationCode} to ${params.recipientPhone}`);

    try {
      if (!this.apiKey) {
        return this.simulateSandboxPurchase(params.requestId, params.amount);
      }

      const res = await this.client.post('/pay', payload, {
        headers: this.getAuthHeaders(true),
      });

      const data = res.data;
      return this.normalizeProviderResponse(params.requestId, data, params.amount);
    } catch (err: any) {
      logger.error(`VTpass Data API Network/Timeout Error [${params.requestId}]:`, err.message);
      return {
        providerName: this.providerName,
        providerReference: params.requestId,
        status: VASTransactionStatus.PENDING,
        responseCode: 'TIMEOUT_OR_NETWORK_ERROR',
        responseMessage: err.message || 'Network timeout communicating with VTpass',
        providerCost: params.amount,
        rawPayload: { error: err.message },
      };
    }
  }

  /**
   * Requery transaction status from VTpass
   */
  async verifyTransaction(providerReference: string): Promise<RequeryResult> {
    try {
      if (!this.apiKey) {
        return {
          providerReference,
          status: VASTransactionStatus.SUCCESSFUL,
          responseCode: '000',
          responseMessage: 'Sandbox Simulated Success Verification',
          rawPayload: { simulated: true },
        };
      }

      const res = await this.client.post(
        '/requery',
        { request_id: providerReference },
        { headers: this.getAuthHeaders(true) }
      );

      const data = res.data;
      const code = data.code || data.response_description;
      const statusDesc = data.content?.transactions?.status?.toLowerCase();

      let mappedStatus: VASTransactionStatus = VASTransactionStatus.PROCESSING;
      if (code === '000' && (statusDesc === 'delivered' || statusDesc === 'successful' || !statusDesc)) {
        mappedStatus = VASTransactionStatus.SUCCESSFUL;
      } else if (code === '099' || statusDesc === 'pending' || statusDesc === 'processing') {
        mappedStatus = VASTransactionStatus.PENDING;
      } else if (code === '016' || code === '015' || statusDesc === 'failed') {
        mappedStatus = VASTransactionStatus.FAILED;
      }

      return {
        providerReference,
        providerTransactionId: data.content?.transactions?.transactionId || data.transactionId,
        status: mappedStatus,
        responseCode: code || 'UNKNOWN',
        responseMessage: data.response_description || data.content?.transactions?.status || 'Status retrieved',
        rawPayload: data,
      };
    } catch (err: any) {
      logger.error(`VTpass Requery Error for [${providerReference}]:`, err.message);
      return {
        providerReference,
        status: VASTransactionStatus.REQUIRES_REVIEW,
        responseCode: 'REQUERY_ERROR',
        responseMessage: err.message,
        rawPayload: { error: err.message },
      };
    }
  }

  async getTransactionStatus(providerReference: string): Promise<RequeryResult> {
    return this.verifyTransaction(providerReference);
  }

  /**
   * Check floating balance at VTpass
   */
  async getProviderBalance(): Promise<ProviderBalanceResult> {
    try {
      if (!this.apiKey) {
        return {
          providerName: this.providerName,
          balance: 250000.0,
          currency: 'NGN',
          environment: this.environment,
        };
      }

      const res = await this.client.get('/balance', {
        headers: this.getAuthHeaders(true),
      });

      const balance = Number(res.data?.contents?.balance || res.data?.balance || 0);
      return {
        providerName: this.providerName,
        balance,
        currency: 'NGN',
        environment: this.environment,
      };
    } catch (err: any) {
      logger.error('Failed to get VTpass balance:', err.message);
      return {
        providerName: this.providerName,
        balance: 0,
        currency: 'NGN',
        environment: this.environment,
      };
    }
  }

  // --- Internal normalization & helper methods ---

  private normalizeProviderResponse(
    requestId: string,
    data: any,
    fallbackAmount: number
  ): ProviderPurchaseResult {
    const code = String(data.code || data.response_description || '');
    const transaction = data.content?.transactions;
    const providerTxId = transaction?.transactionId || data.transactionId;
    const statusDesc = transaction?.status?.toLowerCase();

    let status: VASTransactionStatus = VASTransactionStatus.PROCESSING;
    if (code === '000' && (statusDesc === 'delivered' || statusDesc === 'successful' || !statusDesc)) {
      status = VASTransactionStatus.SUCCESSFUL;
    } else if (code === '099' || statusDesc === 'pending' || statusDesc === 'processing') {
      status = VASTransactionStatus.PENDING;
    } else if (code === '016' || code === '015' || statusDesc === 'failed') {
      status = VASTransactionStatus.FAILED;
    } else {
      status = VASTransactionStatus.REQUIRES_REVIEW;
    }

    return {
      providerName: this.providerName,
      providerReference: requestId,
      providerTransactionId: providerTxId ? String(providerTxId) : undefined,
      status,
      responseCode: code,
      responseMessage: data.response_description || transaction?.status || 'Transaction processed',
      providerCost: Number(transaction?.amount || fallbackAmount),
      rawPayload: data,
    };
  }

  private simulateSandboxPurchase(requestId: string, amount: number): ProviderPurchaseResult {
    return {
      providerName: this.providerName,
      providerReference: requestId,
      providerTransactionId: `SIM_VTP_${Date.now()}`,
      status: VASTransactionStatus.SUCCESSFUL,
      responseCode: '000',
      responseMessage: 'TRANSACTION SUCCESSFUL (SANDBOX SIMULATION)',
      providerCost: amount,
      rawPayload: { simulated: true, amount },
    };
  }

  private extractDataAllowance(name: string): string {
    const match = name.match(/(\d+(\.\d+)?\s*(MB|GB|TB))/i);
    return match ? match[0] : '';
  }

  private extractValidity(name: string): string {
    const match = name.match(/(\d+\s*(day|days|month|months|week|weeks|hours|hrs))/i);
    return match ? match[0] : '30 Days';
  }

  private getFallbackPlans(network: NetworkName, serviceId: string): NormalizedDataPlan[] {
    const defaults: Record<NetworkName, { code: string; name: string; amount: number; validity: string }[]> = {
      MTN: [
        { code: 'm1024', name: 'MTN 1GB (Monthly)', amount: 1000, validity: '30 Days' },
        { code: 'm2500', name: 'MTN 2.5GB (Monthly)', amount: 1500, validity: '30 Days' },
        { code: 'm5000', name: 'MTN 5GB (Monthly)', amount: 2500, validity: '30 Days' },
        { code: 'm10000', name: 'MTN 10GB (Monthly)', amount: 4000, validity: '30 Days' },
      ],
      AIRTEL: [
        { code: 'airt-1000', name: 'Airtel 1.5GB (Monthly)', amount: 1000, validity: '30 Days' },
        { code: 'airt-1500', name: 'Airtel 3.5GB (Monthly)', amount: 1500, validity: '30 Days' },
        { code: 'airt-3000', name: 'Airtel 10GB (Monthly)', amount: 3000, validity: '30 Days' },
      ],
      GLO: [
        { code: 'glo1000', name: 'Glo 2.5GB (Monthly)', amount: 1000, validity: '30 Days' },
        { code: 'glo2000', name: 'Glo 5.8GB (Monthly)', amount: 2000, validity: '30 Days' },
        { code: 'glo3000', name: 'Glo 10GB (Monthly)', amount: 3000, validity: '30 Days' },
      ],
      '9MOBILE': [
        { code: '9mob-1000', name: '9mobile 1.5GB (Monthly)', amount: 1000, validity: '30 Days' },
        { code: '9mob-2000', name: '9mobile 4.5GB (Monthly)', amount: 2000, validity: '30 Days' },
      ],
    };

    const plans = defaults[network] || [];
    return plans.map((p) => ({
      network,
      serviceId,
      variationCode: p.code,
      name: p.name,
      dataAllowance: this.extractDataAllowance(p.name),
      validity: p.validity,
      providerCost: p.amount,
      sellingPrice: p.amount,
      isActive: true,
    }));
  }
}
