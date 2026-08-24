import { useState, useEffect, useCallback } from "react";
import BottomTabs from "./components/BottomTabs";
import HomeScreen from "./screens/HomeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen";
import FundBottomSheet from "./components/FundBottomSheet";
import SendBottomSheet from "./components/SendBottomSheet";
import WithdrawBottomSheet from "./components/WithdrawBottomSheet";
import ServicesBottomSheet from "./components/ServicesBottomSheet";
import VirtualCardsModal from "./components/VirtualCardsModal";
import PaystackModal from "./components/PaystackModal";
import PINModal from "./components/PINModal";
import SuccessModal from "./components/SuccessModal";
import OnboardingFlow from "./components/OnboardingFlow";
import AgentApp from "./agent/AgentApp";
import {
  getUser,
  getTransactions,
  getVirtualCards,
  fundWallet,
  sendMoney,
  withdraw,
  payUtilityBill,
  fundVirtualCard,
  createVirtualCard,
  toggleVirtualCardStatus,
  addBankAccount,
  type User,
  type Transaction,
  type VirtualCard,
} from "./api/api";

type Tab = "home" | "history" | "profile";
type PendingAction =
  | { type: "send"; amount: number; to: string; note?: string }
  | { type: "withdraw"; amount: number; bankId: string }
  | {
      type: "utility";
      category: string;
      provider: string;
      targetAccount: string;
      amount: number;
      packageTitle?: string;
    }
  | { type: "card_fund"; cardId: string; amount: number }
  | { type: "card_create"; cardType: "VISA" | "MASTERCARD"; currency: "NGN" | "USD"; initialFund: number }
  | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [virtualCards, setVirtualCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Sheets & Modals State
  const [fundOpen, setFundOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [virtualCardsOpen, setVirtualCardsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(true);
  const [agentModeOpen, setAgentModeOpen] = useState(false);

  // Paystack Modal State
  const [paystackOpen, setPaystackOpen] = useState(false);
  const [paystackAmount, setPaystackAmount] = useState(0);

  // PIN & Action State
  const [pinOpen, setPinOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [success, setSuccess] = useState<{
    title: string;
    amount?: number;
    reference?: string;
    message?: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    const [u, txs, vcs] = await Promise.all([
      getUser(),
      getTransactions(),
      getVirtualCards(),
    ]);
    setUser(u);
    setTransactions(txs);
    setVirtualCards(vcs);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleToggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Initiate Paystack checkout popup
  const handleInitiatePaystack = (amount: number) => {
    setPaystackAmount(amount);
    setPaystackOpen(true);
  };

  // When Paystack checkout succeeds
  const handlePaystackSuccess = async () => {
    setPaystackOpen(false);
    const tx = await fundWallet(paystackAmount);
    await refresh();
    setSuccess({
      title: "Wallet Funded",
      amount: paystackAmount,
      reference: tx.reference,
      message: "Funds are now available in your MangaPay wallet.",
    });
  };

  const requestSend = async (amount: number, to: string, note?: string) => {
    setPending({ type: "send", amount, to, note });
    setSendOpen(false);
    setPinOpen(true);
  };

  const requestWithdraw = async (amount: number, bankId: string) => {
    setPending({ type: "withdraw", amount, bankId });
    setWithdrawOpen(false);
    setPinOpen(true);
  };

  const requestPayUtility = (params: {
    category: string;
    provider: string;
    targetAccount: string;
    amount: number;
    packageTitle?: string;
  }) => {
    setPending({
      type: "utility",
      category: params.category,
      provider: params.provider,
      targetAccount: params.targetAccount,
      amount: params.amount,
      packageTitle: params.packageTitle,
    });
    setServicesOpen(false);
    setPinOpen(true);
  };

  const requestFundCard = (cardId: string, amount: number) => {
    setPending({ type: "card_fund", cardId, amount });
    setVirtualCardsOpen(false);
    setPinOpen(true);
  };

  const requestCreateCard = (
    cardType: "VISA" | "MASTERCARD",
    currency: "NGN" | "USD",
    initialFund: number
  ) => {
    setPending({ type: "card_create", cardType, currency, initialFund });
    setVirtualCardsOpen(false);
    setPinOpen(true);
  };

  const handleToggleFreezeCard = async (cardId: string) => {
    await toggleVirtualCardStatus(cardId);
    await refresh();
  };

  const handleAddBank = async (
    bankName: string,
    accountNumber: string,
    name: string
  ) => {
    await addBankAccount(bankName, accountNumber, name);
    await refresh();
  };

  const onPinSuccess = async () => {
    setPinOpen(false);
    if (!pending) return;

    try {
      if (pending.type === "send") {
        const tx = await sendMoney(pending.amount, pending.to, pending.note);
        await refresh();
        setSuccess({
          title: "Money Sent",
          amount: pending.amount,
          reference: tx.reference,
          message: `Successfully transferred to ${pending.to}`,
        });
      } else if (pending.type === "withdraw") {
        const tx = await withdraw(pending.amount, pending.bankId);
        await refresh();
        setSuccess({
          title: "Withdrawal Initiated",
          amount: pending.amount,
          reference: tx.reference,
          message: "Payout is being processed. Usually completes in minutes.",
        });
      } else if (pending.type === "utility") {
        const tx = await payUtilityBill(
          pending.category,
          pending.provider,
          pending.targetAccount,
          pending.amount,
          pending.packageTitle
        );
        await refresh();
        setSuccess({
          title: `${pending.category} Paid`,
          amount: pending.amount,
          reference: tx.reference,
          message: `Payment successful for ${pending.provider} (${pending.targetAccount}).`,
        });
      } else if (pending.type === "card_fund") {
        const tx = await fundVirtualCard(pending.cardId, pending.amount);
        await refresh();
        setSuccess({
          title: "Virtual Card Funded",
          amount: pending.amount,
          reference: tx.reference,
          message: "Card balance has been updated.",
        });
      } else if (pending.type === "card_create") {
        const { tx } = await createVirtualCard(
          pending.cardType,
          pending.currency,
          pending.initialFund
        );
        await refresh();
        setSuccess({
          title: "Virtual Card Created",
          amount: tx.amount,
          reference: tx.reference,
          message: `Your Virtual ${pending.currency} ${pending.cardType} is active!`,
        });
      }
    } catch (e: any) {
      setSuccess({
        title: "Transaction Failed",
        message: e.message || "Something went wrong",
      });
    } finally {
      setPending(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background text-text-primary">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-text-primary transition-colors duration-250">
      {tab === "home" && (
        <HomeScreen
          user={user}
          transactions={transactions}
          onFund={() => setFundOpen(true)}
          onSend={() => setSendOpen(true)}
          onWithdraw={() => setWithdrawOpen(true)}
          onOpenServices={() => setServicesOpen(true)}
          onOpenVirtualCards={() => setVirtualCardsOpen(true)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onOpenAgent={() => setAgentModeOpen(true)}
          onRefresh={refresh}
        />
      )}
      {tab === "history" && <HistoryScreen transactions={transactions} />}
      {tab === "profile" && (
        <ProfileScreen
          user={user}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onToggleBiometric={() => {}}
          onAddBank={handleAddBank}
          onLogOut={() => {
            localStorage.removeItem("mangapay_token");
            localStorage.removeItem("mangapay_onboarded");
            setOnboardingOpen(true);
            setTab("home");
          }}
        />
      )}

      <BottomTabs active={tab} onChange={setTab} />

      <FundBottomSheet
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        onInitiatePaystack={handleInitiatePaystack}
      />
      <SendBottomSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSend={requestSend}
        balance={user.balance}
      />
      <WithdrawBottomSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onWithdraw={requestWithdraw}
        balance={user.balance}
        banks={user.banks}
      />
      <ServicesBottomSheet
        open={servicesOpen}
        onClose={() => setServicesOpen(false)}
        onRequestPay={requestPayUtility}
        balance={user.balance}
      />
      <VirtualCardsModal
        open={virtualCardsOpen}
        cards={virtualCards}
        onClose={() => setVirtualCardsOpen(false)}
        onRequestFundCard={requestFundCard}
        onRequestCreateCard={requestCreateCard}
        onToggleFreeze={handleToggleFreezeCard}
        balance={user.balance}
      />

      <PaystackModal
        open={paystackOpen}
        amount={paystackAmount}
        onClose={() => setPaystackOpen(false)}
        onSuccess={handlePaystackSuccess}
      />

      <PINModal
        open={pinOpen}
        onClose={() => {
          setPinOpen(false);
          setPending(null);
        }}
        onSuccess={onPinSuccess}
        title={
          pending?.type === "send"
            ? "Confirm Transfer"
            : pending?.type === "withdraw"
            ? "Confirm Withdrawal"
            : pending?.type === "utility"
            ? `Confirm ${pending.category} Payment`
            : pending?.type === "card_fund"
            ? "Confirm Card Funding"
            : "Confirm Card Creation"
        }
        biometricEnabled={user.biometricEnabled}
      />

      <SuccessModal
        open={!!success}
        onClose={() => setSuccess(null)}
        title={success?.title || ""}
        amount={success?.amount}
        reference={success?.reference}
        message={success?.message}
      />

      <OnboardingFlow
        open={onboardingOpen}
        onClose={() => {
          localStorage.setItem("mangapay_onboarded", "true");
          setOnboardingOpen(false);
        }}
        onCompleteOnboarding={(data) => {
          localStorage.setItem("mangapay_onboarded", "true");
          if (user) {
            setUser({
              ...user,
              name: `${data.firstName} ${data.lastName}`,
              tier: data.kycTier,
            });
          }
          setSuccess({
            title: "Welcome to MangaPay!",
            message: `Account created successfully (${data.kycTier}). Ready to use!`,
          });
        }}
      />

      {agentModeOpen && (
        <AgentApp onExitAgentMode={() => setAgentModeOpen(false)} />
      )}
    </div>
  );
}

