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

export interface IVASProvider {
  readonly providerName: string;

  /**
   * Returns list of supported telecom networks with configuration and status
   */
  getNetworks(): Promise<NetworkMetadata[]>;

  /**
   * Retrieves normalized data plans for a given telecommunication network
   */
  getDataPlans(network: NetworkName): Promise<NormalizedDataPlan[]>;

  /**
   * Executes an airtime recharge request to the provider
   */
  purchaseAirtime(params: AirtimePurchaseParams): Promise<ProviderPurchaseResult>;

  /**
   * Executes a mobile data subscription request to the provider
   */
  purchaseData(params: DataPurchaseParams): Promise<ProviderPurchaseResult>;

  /**
   * Verifies/Requeries the state of a transaction using the provider reference (requestId)
   */
  verifyTransaction(providerReference: string): Promise<RequeryResult>;

  /**
   * Requeries transaction status alias
   */
  getTransactionStatus(providerReference: string): Promise<RequeryResult>;

  /**
   * Retrieves provider prefunded floating account balance
   */
  getProviderBalance(): Promise<ProviderBalanceResult>;

  /**
   * Generates a compliant unique request_id required by the provider format
   */
  generateRequestId(): string;
}
