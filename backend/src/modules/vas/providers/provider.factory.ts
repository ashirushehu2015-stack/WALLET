import { IVASProvider } from './provider.interface';
import { VTPassProvider } from './vtpass.provider';

export class VASProviderFactory {
  private static providers: Map<string, IVASProvider> = new Map();

  static getProvider(providerName = 'VTPASS'): IVASProvider {
    const key = providerName.toUpperCase();
    if (!this.providers.has(key)) {
      if (key === 'VTPASS') {
        this.providers.set(key, new VTPassProvider());
      } else {
        throw new Error(`Unsupported VAS provider: ${providerName}`);
      }
    }
    return this.providers.get(key)!;
  }

  static getDefaultProvider(): IVASProvider {
    return this.getProvider('VTPASS');
  }
}
