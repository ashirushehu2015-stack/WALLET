import { useState, useEffect } from "react";
import { CreditCard, Building, Phone, Copy, CheckCircle2, ShieldCheck, Lock, Loader2, Search } from "lucide-react";
import { formatNaira, NIGERIAN_BANKS } from "../api/api";

interface Props {
  open: boolean;
  amount: number;
  email?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = "card" | "transfer" | "ussd";

export default function PaystackModal({
  open,
  amount,
  email = "alex.okoye@example.com",
  onClose,
  onSuccess,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState("GTBank (Guaranty Trust Bank)");
  const [bankSearch, setBankSearch] = useState("");
  const [timer, setTimer] = useState(1799); // 30 mins

  const selectedBankObj = NIGERIAN_BANKS.find((b) => b.name === selectedBank) || NIGERIAN_BANKS[0];

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const fillDemoCard = () => {
    setCardNumber("5399 4100 8821 9012");
    setExpiry("12/28");
    setCvv("891");
  };

  const handlePay = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    onSuccess();
  };

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText("9988776655");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface text-text-primary w-full max-w-md rounded-[24px] shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-elevated p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
              PS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">Paystack</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                  TEST MODE
                </span>
              </div>
              <p className="text-xs text-text-secondary">{email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Pay MangaPay</p>
            <p className="font-extrabold text-lg text-emerald-600 tracking-tight">
              {formatNaira(amount)}
            </p>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="flex border-b border-border bg-surface text-xs font-semibold">
          {[
            { id: "card", label: "Card", icon: CreditCard },
            { id: "transfer", label: "Bank Transfer", icon: Building },
            { id: "ussd", label: "USSD", icon: Phone },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id as PaymentMethod)}
              className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 transition border-b-2 ${
                method === id
                  ? "border-emerald-600 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {method === "card" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Enter your card details</span>
                <button
                  type="button"
                  onClick={fillDemoCard}
                  className="text-emerald-600 hover:underline font-semibold"
                >
                  Use Demo Card
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full h-12 px-3.5 rounded-xl bg-elevated border border-border font-mono text-sm outline-none focus:border-emerald-600"
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full h-12 px-3.5 rounded-xl bg-elevated border border-border font-mono text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full h-12 px-3.5 rounded-xl bg-elevated border border-border font-mono text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          )}

          {method === "transfer" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                <p className="text-xs text-text-secondary mb-1">
                  Transfer exact amount to this dedicated account:
                </p>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Paystack / Wema Bank
                </p>
                <div className="my-2 flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold tracking-wider text-text-primary">
                    9988776655
                  </span>
                  <button
                    onClick={handleCopyAccount}
                    className="p-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary"
                  >
                    {copied ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Account expires in: <span className="font-mono font-bold text-amber-600">{timeFormatted}</span>
                </p>
              </div>
            </div>
          )}

          {method === "ussd" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Select your Bank
                </label>
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Search 30+ Nigerian Banks (e.g. OPay, Kuda, First Bank)..."
                    className="w-full h-10 px-3 text-xs rounded-xl bg-elevated border border-border text-text-primary focus:outline-none focus:border-emerald-600"
                  />
                  <Search className="absolute right-3 top-3 text-text-secondary" size={14} />
                </div>
              </div>

              <div className="max-h-44 overflow-y-auto grid grid-cols-2 gap-2 pr-1 custom-scrollbar">
                {NIGERIAN_BANKS.filter((b) =>
                  b.name.toLowerCase().includes(bankSearch.toLowerCase())
                ).map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => setSelectedBank(b.name)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                      selectedBank === b.name
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-elevated text-text-primary hover:bg-surface"
                    }`}
                  >
                    <span className="block truncate">{b.name}</span>
                    <span className="text-[10px] text-text-secondary font-mono">{b.code}</span>
                  </button>
                ))}
              </div>

              {selectedBankObj && (
                <div className="p-3 bg-elevated rounded-xl border border-border text-center">
                  <p className="text-xs text-text-secondary">Dial code on your mobile phone for {selectedBankObj.name}:</p>
                  <p className="font-mono font-bold text-sm mt-1 text-emerald-600">
                    {selectedBankObj.ussd}000*882#
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-elevated border-t border-border space-y-3">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>
                  {method === "transfer" ? "I Have Made The Transfer" : `Pay ${formatNaira(amount)}`}
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] text-text-secondary">
            <button
              onClick={onClose}
              className="hover:underline font-medium text-text-secondary"
            >
              Cancel Payment
            </button>
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>256-bit Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
