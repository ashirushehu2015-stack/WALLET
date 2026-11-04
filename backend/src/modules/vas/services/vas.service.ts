import { prisma } from '../../../config/db';
import { logger } from '../../../config/logger';
import { NetworkName, NetworkMetadata, NormalizedDataPlan } from '../vas.types';
import { VASProviderFactory } from '../providers/provider.factory';
import { VASPricingService } from './pricing.service';
import { VASServiceType } from '@prisma/client';

export class VASService {
  /**
   * Retrieves active networks with current configuration
   */
  static async getNetworks(): Promise<NetworkMetadata[]> {
    const provider = VASProviderFactory.getDefaultProvider();
    return provider.getNetworks();
  }

  /**
   * Normalize Nigerian mobile numbers
   * Converts +23480..., 23480..., or 080... to standard 11-digit local string (080...)
   */
  static normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('234') && clean.length === 13) {
      clean = '0' + clean.slice(3);
    } else if (clean.length === 10 && !clean.startsWith('0')) {
      clean = '0' + clean;
    }

    if (clean.length !== 11 || !clean.startsWith('0')) {
      throw new Error(`Invalid Nigerian phone number: ${phone}. Must be an 11-digit mobile number.`);
    }

    return clean;
  }

  /**
   * Optional telecom network detection from mobile prefix
   */
  static detectNetwork(phoneNumber: string): NetworkName | null {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      const prefix = normalized.slice(0, 4);

      const mtnPrefixes = ['0803', '0806', '0703', '0706', '0903', '0906', '0813', '0816', '0810', '0814', '0913', '0916'];
      const airtelPrefixes = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'];
      const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
      const nineMobilePrefixes = ['0809', '0817', '0818', '0909', '0908'];

      if (mtnPrefixes.includes(prefix)) return 'MTN';
      if (airtelPrefixes.includes(prefix)) return 'AIRTEL';
      if (gloPrefixes.includes(prefix)) return 'GLO';
      if (nineMobilePrefixes.includes(prefix)) return '9MOBILE';

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch data plans from database cache or live provider fallback
   */
  static async getDataPlans(network: NetworkName): Promise<NormalizedDataPlan[]> {
    const providerRecord = await prisma.vASProvider.findUnique({
      where: { name: 'VTPASS' },
    });

    if (providerRecord) {
      const cachedProducts = await prisma.vASProduct.findMany({
        where: {
          providerId: providerRecord.id,
          network,
          serviceType: VASServiceType.DATA,
          isActive: true,
        },
        orderBy: { providerCost: 'asc' },
      });

      if (cachedProducts.length > 0) {
        return cachedProducts.map((p) => ({
          productId: p.id,
          network: p.network as NetworkName,
          serviceId: p.providerCode,
          variationCode: p.variationCode || '',
          name: p.name,
          description: p.description || undefined,
          dataAllowance: p.dataAllowance || undefined,
          validity: p.validity || undefined,
          providerCost: Number(p.providerCost),
          sellingPrice: Number(p.sellingPrice),
          isActive: p.isActive,
        }));
      }
    }

    // If cache is empty, fetch live from provider and asynchronously sync
    const provider = VASProviderFactory.getDefaultProvider();
    const livePlans = await provider.getDataPlans(network);

    if (providerRecord && livePlans.length > 0) {
      this.syncPlansForNetwork(providerRecord.id, network, livePlans).catch((err) =>
        logger.error(`Background catalogue sync failed for ${network}:`, err.message)
      );
    }

    return livePlans;
  }

  /**
   * Synchronize product catalogue from VTpass for a specific network
   */
  static async syncPlansForNetwork(
    providerId: string,
    network: NetworkName,
    plans: NormalizedDataPlan[]
  ): Promise<void> {
    for (const plan of plans) {
      await prisma.vASProduct.upsert({
        where: {
          providerId_serviceType_network_providerCode_variationCode: {
            providerId,
            serviceType: VASServiceType.DATA,
            network,
            providerCode: plan.serviceId,
            variationCode: plan.variationCode,
          },
        },
        update: {
          name: plan.name,
          dataAllowance: plan.dataAllowance,
          validity: plan.validity,
          providerCost: plan.providerCost,
          sellingPrice: plan.sellingPrice,
          isActive: true,
          lastSyncedAt: new Date(),
        },
        create: {
          providerId,
          serviceType: VASServiceType.DATA,
          network,
          providerCode: plan.serviceId,
          variationCode: plan.variationCode,
          name: plan.name,
          dataAllowance: plan.dataAllowance,
          validity: plan.validity,
          providerCost: plan.providerCost,
          sellingPrice: plan.sellingPrice,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  /**
   * Full catalogue sync across all networks
   */
  static async syncFullCatalogue(): Promise<{ syncedNetworks: string[]; totalPlans: number }> {
    const providerRecord = await prisma.vASProvider.upsert({
      where: { name: 'VTPASS' },
      update: { lastHealthCheck: new Date() },
      create: {
        name: 'VTPASS',
        baseUrl: process.env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api',
        environment: process.env.VTPASS_ENVIRONMENT || 'sandbox',
        isActive: true,
      },
    });

    const networks: NetworkName[] = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
    const provider = VASProviderFactory.getDefaultProvider();
    let total = 0;

    for (const net of networks) {
      const plans = await provider.getDataPlans(net);
      await this.syncPlansForNetwork(providerRecord.id, net, plans);
      total += plans.length;
    }

    logger.info(`Synchronized ${total} VAS products across ${networks.length} telecom networks from VTpass.`);
    return { syncedNetworks: networks, totalPlans: total };
  }
}
