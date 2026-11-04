export type TxStatus = "SUCCESS" | "PROCESSING" | "FAILED";
export type TxType = "FUND" | "SEND" | "WITHDRAW" | "UTILITY" | "VAS_AIRTIME" | "VAS_DATA" | "CARD_FUND" | "CARD_CREATE";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  fee?: number;
  description: string;
  counterparty?: string;
  reference: string;
  status: TxStatus;
  createdAt: string;
  categoryDetails?: string;
}

export interface BankInfo {
  name: string;
  code: string;
  ussd: string;
  category: "Commercial" | "Fintech / MFB" | "Non-Interest";
}

export const NIGERIAN_BANKS: BankInfo[] = [
  { name: "Access Bank", code: "044", ussd: "*901*", category: "Commercial" },
  { name: "Fidelity Bank", code: "070", ussd: "*770*", category: "Commercial" },
  { name: "First Bank of Nigeria", code: "011", ussd: "*894*", category: "Commercial" },
  { name: "FCMB (First City Monument Bank)", code: "214", ussd: "*329*", category: "Commercial" },
  { name: "GTBank (Guaranty Trust Bank)", code: "058", ussd: "*737*", category: "Commercial" },
  { name: "Union Bank of Nigeria", code: "032", ussd: "*826*", category: "Commercial" },
  { name: "United Bank for Africa (UBA)", code: "033", ussd: "*919*", category: "Commercial" },
  { name: "Zenith Bank", code: "057", ussd: "*966*", category: "Commercial" },
  { name: "Ecobank Nigeria", code: "050", ussd: "*326*", category: "Commercial" },
  { name: "Heritage Bank", code: "030", ussd: "*745*", category: "Commercial" },
  { name: "Keystone Bank", code: "082", ussd: "*7111*", category: "Commercial" },
  { name: "Polaris Bank", code: "076", ussd: "*833*", category: "Commercial" },
  { name: "Stanbic IBTC Bank", code: "221", ussd: "*909*", category: "Commercial" },
  { name: "Standard Chartered Bank", code: "068", ussd: "*977*", category: "Commercial" },
  { name: "Sterling Bank", code: "232", ussd: "*822*", category: "Commercial" },
  { name: "Titan Trust Bank", code: "102", ussd: "*922*", category: "Commercial" },
  { name: "Unity Bank", code: "215", ussd: "*7799*", category: "Commercial" },
  { name: "Wema Bank", code: "035", ussd: "*945*", category: "Commercial" },
  { name: "OPay Digital Services", code: "999992", ussd: "*955*", category: "Fintech / MFB" },
  { name: "Kuda Microfinance Bank", code: "50211", ussd: "*5583*", category: "Fintech / MFB" },
  { name: "PalmPay", code: "999991", ussd: "*861*", category: "Fintech / MFB" },
  { name: "Moniepoint Microfinance Bank", code: "50315", ussd: "*5573*", category: "Fintech / MFB" },
  { name: "VFD Microfinance Bank", code: "566", ussd: "*566*", category: "Fintech / MFB" },
  { name: "Rubies Bank", code: "125", ussd: "*125*", category: "Fintech / MFB" },
  { name: "Raven Bank", code: "51318", ussd: "*513*", category: "Fintech / MFB" },
  { name: "FairMoney MFB", code: "51310", ussd: "*513*", category: "Fintech / MFB" },
  { name: "Dot Microfinance Bank", code: "50162", ussd: "*501*", category: "Fintech / MFB" },
  { name: "Jaiz Bank", code: "301", ussd: "*773*", category: "Non-Interest" },
  { name: "TAJBank", code: "302", ussd: "*898*", category: "Non-Interest" },
  { name: "Lotus Bank", code: "303", ussd: "*5045*", category: "Non-Interest" },
];

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
}

export interface User {
  name: string;
  avatar: string;
  balance: number;
  tier: string;
  biometricEnabled: boolean;
  banks: BankAccount[];
  dva: { accountNumber: string; bankName: string };
}

export interface VirtualCard {
  id: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardType: "VISA" | "MASTERCARD";
  currency: "NGN" | "USD";
  balance: number;
  isFrozen: boolean;
  billingAddress: string;
  createdAt: string;
}

let balance = 248500;

let virtualCards: VirtualCard[] = [
  {
    id: "vc_1",
    cardholderName: "Alex Okoye",
    cardNumber: "4532 8901 2345 9812",
    expiryMonth: "08",
    expiryYear: "28",
    cvv: "492",
    cardType: "VISA",
    currency: "USD",
    balance: 45.0,
    isFrozen: false,
    billingAddress: "14 Broad Street, Marina, Lagos",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "vc_2",
    cardholderName: "Alex Okoye",
    cardNumber: "5399 4112 9084 3310",
    expiryMonth: "11",
    expiryYear: "27",
    cvv: "813",
    cardType: "MASTERCARD",
    currency: "NGN",
    balance: 15000.0,
    isFrozen: false,
    billingAddress: "14 Broad Street, Marina, Lagos",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
];

let transactions: Transaction[] = [
  {
    id: "tx1",
    type: "FUND",
    amount: 50000,
    description: "Wallet funding via Paystack",
    reference: "MP-FND-88421",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "tx2",
    type: "SEND",
    amount: 12500,
    description: "Sent to Chioma Okafor",
    counterparty: "Chioma Okafor",
    reference: "MP-SND-77310",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "tx3",
    type: "UTILITY",
    amount: 3000,
    description: "MTN 3GB Data Bundle",
    counterparty: "08031234567",
    reference: "MP-UTL-71923",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    categoryDetails: "Airtime & Data",
  },
  {
    id: "tx4",
    type: "WITHDRAW",
    amount: 30000,
    fee: 100,
    description: "Payout to GTBank ****4521",
    reference: "MP-WTH-66209",
    status: "PROCESSING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "tx5",
    type: "CARD_FUND",
    amount: 7500,
    description: "Funded USD Virtual Visa Card",
    reference: "MP-VCR-99120",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    categoryDetails: "Virtual Card",
  },
  {
    id: "tx6",
    type: "SEND",
    amount: 8500,
    description: "Sent to Tunde Bakare",
    counterparty: "Tunde Bakare",
    reference: "MP-SND-55198",
    status: "FAILED",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "tx7",
    type: "UTILITY",
    amount: 12000,
    description: "IKEDC Electricity Token",
    counterparty: "0418-9921-341",
    reference: "MP-UTL-34190",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    categoryDetails: "Electricity Token: 4921-0012-9843-1120",
  },
  {
    id: "tx8",
    type: "FUND",
    amount: 100000,
    description: "Wallet funding via Paystack",
    reference: "MP-FND-44087",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "tx9",
    type: "WITHDRAW",
    amount: 15000,
    fee: 100,
    description: "Payout to Access Bank ****8832",
    reference: "MP-WTH-33976",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "tx10",
    type: "UTILITY",
    amount: 9000,
    description: "DSTV Compact Subscription",
    counterparty: "7029182390",
    reference: "MP-UTL-10293",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    categoryDetails: "Cable TV",
  },
  {
    id: "tx11",
    type: "CARD_CREATE",
    amount: 2000,
    fee: 0,
    description: "Created Virtual NGN Mastercard",
    reference: "MP-VCR-11029",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
  {
    id: "tx12",
    type: "FUND",
    amount: 25000,
    description: "Bank Transfer via DVA",
    reference: "MP-FND-00912",
    status: "SUCCESS",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 150).toISOString(),
  },
];

const user: User = {
  name: "Alex",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  balance,
  tier: "Tier 1",
  biometricEnabled: true,
  banks: [
    { id: "b1", name: "Alex Okoye", accountNumber: "0123456789", bankName: "GTBank (Guaranty Trust Bank)" },
    { id: "b2", name: "Alex Okoye", accountNumber: "9876543210", bankName: "Access Bank" },
    { id: "b3", name: "Alex Okoye", accountNumber: "7012345678", bankName: "OPay Digital Services" },
    { id: "b4", name: "Alex Okoye", accountNumber: "8098765432", bankName: "PalmPay" },
    { id: "b5", name: "Alex Okoye", accountNumber: "5543210987", bankName: "Moniepoint Microfinance Bank" },
    { id: "b6", name: "Alex Okoye", accountNumber: "2019876543", bankName: "Kuda Microfinance Bank" },
  ],
  dva: { accountNumber: "9988776655", bankName: "Wema Bank (Paystack)" },
};

const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "https://wallet-ijx3.onrender.com/api/v1";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("mangapay_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function generateIdempotencyKey(): string {
  return `MP-KEY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export async function getUser(): Promise<User> {
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/balance`, {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.success && body.data) {
        balance = Number(body.data.availableBalance ?? body.data.balance ?? balance);
      }
    }
  } catch (e) {
    // Graceful fallback when backend is offline
  }
  await delay(150);
  return { ...user, balance };
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/transactions`, {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        const fetchedTxs: Transaction[] = body.data.map((tx: any) => ({
          id: tx.id || `tx_${Date.now()}`,
          type: (tx.type || "SEND") as TxType,
          amount: Number(tx.amount || 0),
          fee: tx.fee ? Number(tx.fee) : undefined,
          description: tx.description || tx.narration || "Transaction",
          counterparty: tx.recipientWalletNumber || tx.accountName || undefined,
          reference: tx.reference || tx.idempotencyKey || `MP-REF-${Date.now()}`,
          status: (tx.status || "SUCCESS") as TxStatus,
          createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
        }));
        if (fetchedTxs.length > 0) {
          // Merge fetched backend transactions with local mock transactions
          const existingIds = new Set(fetchedTxs.map((t) => t.id));
          const combined = [...fetchedTxs, ...transactions.filter((t) => !existingIds.has(t.id))];
          transactions = combined;
        }
      }
    }
  } catch (e) {
    // Fallback to local transactions
  }
  await delay(200);
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getVirtualCards(): Promise<VirtualCard[]> {
  await delay(200);
  return [...virtualCards];
}

export async function fundWallet(amount: number): Promise<Transaction> {
  await delay(800);
  balance += amount;
  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "FUND",
    amount,
    description: "Wallet funding via Paystack",
    reference: `MP-FND-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
  };
  transactions = [tx, ...transactions];
  return tx;
}

export async function sendMoney(
  amount: number,
  to: string,
  note?: string
): Promise<Transaction> {
  if (amount > balance) throw new Error("Insufficient balance");

  try {
    const res = await fetch(`${API_BASE_URL}/wallet/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": generateIdempotencyKey(),
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        recipientWalletNumber: to,
        amount,
        narration: note || `Transfer to ${to}`,
      }),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success) {
        balance -= amount;
        const tx: Transaction = {
          id: body.data?.id || `tx${Date.now()}`,
          type: "SEND",
          amount,
          description: note || `Sent to ${to}`,
          counterparty: to,
          reference: body.data?.reference || `MP-SND-${Math.floor(Math.random() * 90000 + 10000)}`,
          status: "SUCCESS",
          createdAt: new Date().toISOString(),
        };
        transactions = [tx, ...transactions];
        return tx;
      }
    }
  } catch (e) {
    // Fallback to local logic if backend request fails
  }

  await delay(800);
  balance -= amount;
  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "SEND",
    amount,
    description: note || `Sent to ${to}`,
    counterparty: to,
    reference: `MP-SND-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
  };
  transactions = [tx, ...transactions];
  return tx;
}

export async function withdraw(
  amount: number,
  bankId: string
): Promise<Transaction> {
  const fee = 100;
  if (amount + fee > balance) throw new Error("Insufficient balance");
  const bank = user.banks.find((b) => b.id === bankId);

  try {
    const res = await fetch(`${API_BASE_URL}/wallet/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": generateIdempotencyKey(),
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        bankName: bank?.bankName || "GTBank",
        accountNumber: bank?.accountNumber || "0123456789",
        accountName: bank?.name || user.name,
        bankCode: "035",
        amount,
      }),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success) {
        balance -= amount + fee;
        const tx: Transaction = {
          id: body.data?.id || `tx${Date.now()}`,
          type: "WITHDRAW",
          amount,
          fee,
          description: `Payout to ${bank?.bankName || "Bank"} ****${bank?.accountNumber.slice(-4)}`,
          reference: body.data?.paystackTransferCode || `MP-WTH-${Math.floor(Math.random() * 90000 + 10000)}`,
          status: "PROCESSING",
          createdAt: new Date().toISOString(),
        };
        transactions = [tx, ...transactions];
        return tx;
      }
    }
  } catch (e) {
    // Fallback to local logic
  }

  await delay(800);
  balance -= amount + fee;
  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "WITHDRAW",
    amount,
    fee,
    description: `Payout to ${bank?.bankName || "Bank"} ****${bank?.accountNumber.slice(-4)}`,
    reference: `MP-WTH-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "PROCESSING",
    createdAt: new Date().toISOString(),
  };
  transactions = [tx, ...transactions];
  return tx;
}


export async function payUtilityBill(
  category: string,
  provider: string,
  targetAccount: string,
  amount: number,
  packageTitle?: string
): Promise<Transaction> {
  await delay(1000);
  if (amount > balance) throw new Error("Insufficient balance");
  balance -= amount;

  let desc = `${provider} ${packageTitle || category}`;
  let categoryDetails = `${category} - ${targetAccount}`;
  if (category === "Electricity") {
    const token = Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join("-");
    categoryDetails = `Meter Token: ${token}`;
  }

  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "UTILITY",
    amount,
    description: desc,
    counterparty: targetAccount,
    reference: `MP-UTL-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
    categoryDetails,
  };
  transactions = [tx, ...transactions];
  return tx;
}

export async function fundVirtualCard(
  cardId: string,
  amount: number
): Promise<Transaction> {
  await delay(900);
  if (amount > balance) throw new Error("Insufficient balance");
  const card = virtualCards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found");
  if (card.isFrozen) throw new Error("Card is currently frozen");

  balance -= amount;
  // If USD card, convert rough NGN equivalent for card balance preview (e.g. 1 USD = 1500 NGN)
  const addition = card.currency === "USD" ? amount / 1500 : amount;
  card.balance += addition;

  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "CARD_FUND",
    amount,
    description: `Funded ${card.currency} Virtual ${card.cardType} ****${card.cardNumber.slice(-4)}`,
    reference: `MP-VCR-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
    categoryDetails: `Card ID: ${cardId}`,
  };
  transactions = [tx, ...transactions];
  return tx;
}

export async function createVirtualCard(
  cardType: "VISA" | "MASTERCARD",
  currency: "NGN" | "USD",
  initialFund: number
): Promise<{ card: VirtualCard; tx: Transaction }> {
  await delay(1100);
  const cardCreationFee = currency === "USD" ? 3000 : 1000;
  const totalDeduction = initialFund + cardCreationFee;
  if (totalDeduction > balance) throw new Error("Insufficient balance");

  balance -= totalDeduction;

  const newCard: VirtualCard = {
    id: `vc_${Date.now()}`,
    cardholderName: `${user.name} Okoye`,
    cardNumber: `4${Math.floor(100 + Math.random() * 899)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`,
    expiryMonth: String(Math.floor(Math.random() * 12) + 1).padStart(2, "0"),
    expiryYear: "29",
    cvv: String(Math.floor(Math.random() * 899) + 100),
    cardType,
    currency,
    balance: currency === "USD" ? initialFund / 1500 : initialFund,
    isFrozen: false,
    billingAddress: "14 Broad Street, Marina, Lagos",
    createdAt: new Date().toISOString(),
  };

  virtualCards = [newCard, ...virtualCards];

  const tx: Transaction = {
    id: `tx${Date.now()}`,
    type: "CARD_CREATE",
    amount: totalDeduction,
    fee: cardCreationFee,
    description: `Created Virtual ${currency} ${cardType} Card`,
    reference: `MP-VCR-${Math.floor(Math.random() * 90000 + 10000)}`,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
    categoryDetails: `Card ****${newCard.cardNumber.slice(-4)}`,
  };
  transactions = [tx, ...transactions];

  return { card: newCard, tx };
}

export async function toggleVirtualCardStatus(cardId: string): Promise<boolean> {
  await delay(400);
  const card = virtualCards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found");
  card.isFrozen = !card.isFrozen;
  return card.isFrozen;
}

export async function addBankAccount(
  bankName: string,
  accountNumber: string,
  accountName: string
): Promise<BankAccount> {
  await delay(700);
  const newBank: BankAccount = {
    id: `b${Date.now()}`,
    bankName,
    accountNumber,
    name: accountName,
  };
  user.banks.push(newBank);
  return newBank;
}

export function formatNaira(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatRelative(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}



// --- VALUE-ADDED SERVICES (VAS) API CLIENT ---

export interface VASNetwork {
  id: string;
  name: string;
  airtimeServiceId: string;
  dataServiceId: string;
  brandColor: string;
  minAirtime: number;
  maxAirtime: number;
  isActive: boolean;
}

export interface VASDataPlan {
  productId?: string;
  network: string;
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

export interface VASTxReceipt {
  receiptNumber: string;
  transactionReference: string;
  providerReference?: string;
  date: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  network: string;
  recipientPhone: string;
  amount: number;
  fee: number;
  totalAmountPaid: number;
  status: string;
}

export async function getVASNetworks(): Promise<VASNetwork[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/vas/networks`, {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data;
      }
    }
  } catch (e) {
    // fallback
  }

  return [
    { id: "MTN", name: "MTN Nigeria", airtimeServiceId: "mtn", dataServiceId: "mtn-data", brandColor: "#FFCC00", minAirtime: 50, maxAirtime: 50000, isActive: true },
    { id: "AIRTEL", name: "Airtel Nigeria", airtimeServiceId: "airtel", dataServiceId: "airtel-data", brandColor: "#E60000", minAirtime: 50, maxAirtime: 50000, isActive: true },
    { id: "GLO", name: "Globacom (Glo)", airtimeServiceId: "glo", dataServiceId: "glo-data", brandColor: "#2EB82E", minAirtime: 50, maxAirtime: 50000, isActive: true },
    { id: "9MOBILE", name: "9mobile", airtimeServiceId: "etisalat", dataServiceId: "etisalat-data", brandColor: "#005C29", minAirtime: 50, maxAirtime: 50000, isActive: true },
  ];
}

export async function getVASDataPlans(network: string): Promise<VASDataPlan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/vas/data/plans/${network}`, {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data;
      }
    }
  } catch (e) {
    // fallback
  }

  const fallbacks: Record<string, VASDataPlan[]> = {
    MTN: [
      { network: "MTN", serviceId: "mtn-data", variationCode: "m1024", name: "MTN 1GB (Monthly)", dataAllowance: "1GB", validity: "30 Days", providerCost: 1000, sellingPrice: 1000, isActive: true },
      { network: "MTN", serviceId: "mtn-data", variationCode: "m2500", name: "MTN 2.5GB (Monthly)", dataAllowance: "2.5GB", validity: "30 Days", providerCost: 1500, sellingPrice: 1500, isActive: true },
      { network: "MTN", serviceId: "mtn-data", variationCode: "m5000", name: "MTN 5GB (Monthly)", dataAllowance: "5GB", validity: "30 Days", providerCost: 2500, sellingPrice: 2500, isActive: true },
      { network: "MTN", serviceId: "mtn-data", variationCode: "m10000", name: "MTN 10GB (Monthly)", dataAllowance: "10GB", validity: "30 Days", providerCost: 4000, sellingPrice: 4000, isActive: true },
    ],
    AIRTEL: [
      { network: "AIRTEL", serviceId: "airtel-data", variationCode: "airt-1000", name: "Airtel 1.5GB (Monthly)", dataAllowance: "1.5GB", validity: "30 Days", providerCost: 1000, sellingPrice: 1000, isActive: true },
      { network: "AIRTEL", serviceId: "airtel-data", variationCode: "airt-1500", name: "Airtel 3.5GB (Monthly)", dataAllowance: "3.5GB", validity: "30 Days", providerCost: 1500, sellingPrice: 1500, isActive: true },
      { network: "AIRTEL", serviceId: "airtel-data", variationCode: "airt-3000", name: "Airtel 10GB (Monthly)", dataAllowance: "10GB", validity: "30 Days", providerCost: 3000, sellingPrice: 3000, isActive: true },
    ],
    GLO: [
      { network: "GLO", serviceId: "glo-data", variationCode: "glo1000", name: "Glo 2.5GB (Monthly)", dataAllowance: "2.5GB", validity: "30 Days", providerCost: 1000, sellingPrice: 1000, isActive: true },
      { network: "GLO", serviceId: "glo-data", variationCode: "glo2000", name: "Glo 5.8GB (Monthly)", dataAllowance: "5.8GB", validity: "30 Days", providerCost: 2000, sellingPrice: 2000, isActive: true },
      { network: "GLO", serviceId: "glo-data", variationCode: "glo3000", name: "Glo 10GB (Monthly)", dataAllowance: "10GB", validity: "30 Days", providerCost: 3000, sellingPrice: 3000, isActive: true },
    ],
    "9MOBILE": [
      { network: "9MOBILE", serviceId: "etisalat-data", variationCode: "9mob-1000", name: "9mobile 1.5GB (Monthly)", dataAllowance: "1.5GB", validity: "30 Days", providerCost: 1000, sellingPrice: 1000, isActive: true },
      { network: "9MOBILE", serviceId: "etisalat-data", variationCode: "9mob-2000", name: "9mobile 4.5GB (Monthly)", dataAllowance: "4.5GB", validity: "30 Days", providerCost: 2000, sellingPrice: 2000, isActive: true },
    ],
  };

  return fallbacks[network] || fallbacks.MTN;
}

export async function purchaseAirtime(data: {
  network: string;
  recipientPhone: string;
  amount: number;
  pin: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/vas/airtime/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": generateIdempotencyKey(),
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Airtime purchase failed.");
  }
  return body.data;
}

export async function purchaseData(data: {
  network: string;
  recipientPhone: string;
  variationCode: string;
  serviceId?: string;
  pin: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/vas/data/purchase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": generateIdempotencyKey(),
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Data subscription failed.");
  }
  return body.data;
}

export async function getVASTransactionReceipt(reference: string): Promise<VASTxReceipt> {
  const res = await fetch(`${API_BASE_URL}/vas/transactions/${reference}`, {
    headers: getAuthHeader(),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Receipt not found.");
  }
  return body.data.receipt;
}
