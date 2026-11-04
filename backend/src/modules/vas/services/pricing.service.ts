import { VASServiceType } from '@prisma/client';
import { NetworkName } from '../vas.types';

export interface PriceQuote {
  faceValue: number;
  providerCost: number;
  serviceFee: number;
  sellingPrice: number;
  profitAmount: number;
}

export class VASPricingService {
  /**
   * Airtime wholesale discount rates from provider (e.g. 2% wholesale commission)
   */
  private static AIRTIME_WHOLESALE_DISCOUNTS: Record<NetworkName, number> = {
    MTN: 0.02, // 2% discount
    AIRTEL: 0.02,
    GLO: 0.025, // 2.5% discount
    '9MOBILE': 0.025,
  };

  /**
   * Calculate authoritative price breakdown for Airtime purchase
   */
  static quoteAirtime(network: NetworkName, amount: number): PriceQuote {
    if (amount <= 0) {
      throw new Error('Airtime amount must be greater than zero.');
    }

    const discountRate = this.AIRTIME_WHOLESALE_DISCOUNTS[network] || 0.02;
    const providerCost = Math.round(amount * (1 - discountRate) * 100) / 100;
    const serviceFee = 0; // Free service fee for airtime
    const sellingPrice = amount;
    const profitAmount = Math.round((sellingPrice - providerCost) * 100) / 100;

    return {
      faceValue: amount,
      providerCost,
      serviceFee,
      sellingPrice,
      profitAmount,
    };
  }

  /**
   * Calculate authoritative price breakdown for Data bundle purchase
   */
  static quoteData(providerCost: number, customMarkup = 0): PriceQuote {
    if (providerCost <= 0) {
      throw new Error('Data plan cost must be greater than zero.');
    }

    // Default selling price equals provider cost + optional markup
    const serviceFee = 0;
    const sellingPrice = providerCost + customMarkup;
    const profitAmount = Math.round((sellingPrice - providerCost) * 100) / 100;

    return {
      faceValue: sellingPrice,
      providerCost,
      serviceFee,
      sellingPrice,
      profitAmount,
    };
  }
}
