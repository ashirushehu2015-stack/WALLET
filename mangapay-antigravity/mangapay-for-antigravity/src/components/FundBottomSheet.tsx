import { useState } from "react";
import { X, CreditCard, ShieldCheck } from "lucide-react";
import { formatNaira } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onInitiatePaystack: (amount: number) => void;
}

const QUICK = [1000, 5000, 10000, 20000, 50000];

export default function FundBottomSheet({ open, onClose, onInitiatePaystack }: Props) {
  const [amount, setAmount] = useState("");

  if (!open) return null;

  const numeric = Number(amount.replace(/,/g, "")) || 0;

  const handleProceed = () => {
    if (numeric < 100) return;
    onInitiatePaystack(numeric);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-all">
      <div className="bg-surface text-text-primary w-full max-w-md rounded-t-[24px] p-6 pb-8 shadow-soft max-h-[90vh] overflow-y-auto border-t border-border">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Fund Wallet</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        <label className="block text-sm text-text-secondary mb-1.5 font-medium">
          Amount (₦)
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            setAmount(v ? Number(v).toLocaleString() : "");
          }}
          placeholder="0"
          className="w-full h-14 px-4 rounded-2xl bg-elevated border border-border text-2xl font-semibold text-text-primary outline-none focus:border-accent"
        />

        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q.toLocaleString())}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                numeric === q
                  ? "bg-accent text-white border-accent shadow-sm"
                  : "bg-elevated border-border text-text-primary hover:border-accent"
              }`}
            >
              {formatNaira(q).replace(".00", "")}
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-accent-soft flex items-start gap-3">
          <CreditCard size={20} className="text-accent mt-0.5 shrink-0" />
          <div className="text-sm text-text-primary">
            <div className="flex items-center gap-1 font-semibold">
              <span>Pay with Paystack</span>
              <ShieldCheck size={14} className="text-accent" />
            </div>
            <p className="text-text-secondary text-xs mt-0.5">
              Secure Checkout with Card, Bank Transfer (DVA), or USSD.
            </p>
          </div>
        </div>

        <button
          onClick={handleProceed}
          disabled={numeric < 100}
          className="mt-6 w-full h-14 rounded-2xl bg-accent text-white font-semibold disabled:opacity-40 hover:opacity-90 transition active:scale-[0.99]"
        >
          {`Proceed to Pay ${formatNaira(numeric || 0)}`}
        </button>
      </div>
    </div>
  );
}

