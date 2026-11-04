import { NetworkName } from './vas.types';

export function validateAirtimeOrder(body: any): {
  isValid: boolean;
  error?: string;
  data?: {
    network: NetworkName;
    recipientPhone: string;
    amount: number;
    pin: string;
  };
} {
  const { network, recipientPhone, amount, pin } = body;

  const validNetworks: NetworkName[] = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
  if (!network || !validNetworks.includes(network.toUpperCase())) {
    return { isValid: false, error: 'Valid network is required (MTN, AIRTEL, GLO, 9MOBILE).' };
  }

  if (!recipientPhone || typeof recipientPhone !== 'string') {
    return { isValid: false, error: 'Recipient phone number is required.' };
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 50 || numAmount > 50000) {
    return { isValid: false, error: 'Amount must be a numeric value between ₦50 and ₦50,000.' };
  }

  if (!pin || String(pin).length !== 4) {
    return { isValid: false, error: '4-digit transaction PIN is required.' };
  }

  return {
    isValid: true,
    data: {
      network: network.toUpperCase() as NetworkName,
      recipientPhone: String(recipientPhone).trim(),
      amount: numAmount,
      pin: String(pin),
    },
  };
}

export function validateDataOrder(body: any): {
  isValid: boolean;
  error?: string;
  data?: {
    network: NetworkName;
    recipientPhone: string;
    variationCode: string;
    serviceId?: string;
    pin: string;
  };
} {
  const { network, recipientPhone, variationCode, serviceId, pin } = body;

  const validNetworks: NetworkName[] = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
  if (!network || !validNetworks.includes(network.toUpperCase())) {
    return { isValid: false, error: 'Valid network is required (MTN, AIRTEL, GLO, 9MOBILE).' };
  }

  if (!recipientPhone || typeof recipientPhone !== 'string') {
    return { isValid: false, error: 'Recipient phone number is required.' };
  }

  if (!variationCode || typeof variationCode !== 'string') {
    return { isValid: false, error: 'Data variation code is required.' };
  }

  if (!pin || String(pin).length !== 4) {
    return { isValid: false, error: '4-digit transaction PIN is required.' };
  }

  return {
    isValid: true,
    data: {
      network: network.toUpperCase() as NetworkName,
      recipientPhone: String(recipientPhone).trim(),
      variationCode: String(variationCode).trim(),
      serviceId: serviceId ? String(serviceId).trim() : undefined,
      pin: String(pin),
    },
  };
}
