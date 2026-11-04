import { VASTransactionStatus, VASServiceType } from '@prisma/client';

export type NetworkName = 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';

export interface NetworkMetadata {
  id: NetworkName;
  name: string;
  airtimeServiceId: string;
  dataServiceId: string;
  smeDataServiceId?: string;
  brandColor: string;
  minAirtime: number;
  maxAirtime: number;
  isActive: boolean;
}

export interface NormalizedDataPlan {
  productId?: string;
  network: NetworkName;
  serviceId: string;
  variationCode: string;
  name: string;
  description?: string;
  dataAllowance?: string;
  validity?: string;
  providerCost: number;
  sellingPrice: number;
  isActive: boolean;
}

export interface AirtimePurchaseParams {
  network: NetworkName;
  recipientPhone: string;
  amount: number;
  customerPhone?: string;
  internalReference: string;
  requestId: string;
}

export interface DataPurchaseParams {
  network: NetworkName;
  recipientPhone: string;
  amount: number;
  variationCode: string;
  serviceId: string;
  customerPhone?: string;
  internalReference: string;
  requestId: string;
}

export interface ProviderPurchaseResult {
  providerName: string;
  providerReference: string; // request_id sent to provider
  providerTransactionId?: string; // transactionId returned by provider
  status: VASTransactionStatus;
  responseCode: string;
  responseMessage: string;
  providerCost: number;
  rawPayload: any;
}

export interface RequeryResult {
  providerReference: string;
  providerTransactionId?: string;
  status: VASTransactionStatus;
  responseCode: string;
  responseMessage: string;
  rawPayload: any;
}

export interface ProviderBalanceResult {
  providerName: string;
  balance: number;
  currency: string;
  environment: string;
}
