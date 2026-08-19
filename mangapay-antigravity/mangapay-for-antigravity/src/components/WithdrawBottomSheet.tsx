import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { formatNaira } from "../api/api";

interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onWithdraw: (amount: number, bankId: string) => Promise<void>;
  balance: number;
  banks: Bank[];
}

export default function WithdrawBottomSheet({
  open,
  onClose,
  onWithdraw,
  balance,
  banks,
}: Props) {
  const [step, setStep] = useState<"form" | "review">("form");
  const [bankId, setBankId] = useState(banks[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const numeric = Number(amount.replace(/,/g, "")) || 0;
  const fee = 100;
  const total = numeric + fee;
  const canContinue =
    bankId && numeric >= 500 && total <= balance;

  const selected = banks.find((b) => b.id === bankId);

  const reset = () => {
    setStep("form");
    setAmount("");
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onWithdraw(numeric, bankId);
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-t-[24px] p-6 pb-8 shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">
            {step === "form" ? "Withdraw" : "Review Payout"}
          </h3>
          <button
            onClick={() => {
              if (step === "review") setStep("form");
              else {
                reset();
                onClose();
              }
            }}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {step === "form" ? (
          <>
            <label className="block text-sm text-text-secondary mb-1.5">
              Bank Account
            </label>
            <div className="space-y-2 mb-4">
              {banks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBankId(b.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition text-left ${
                    bankId === b.id
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-elevated"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center">
                    <Building2 size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{b.bankName}</p>
                    <p className="text-xs text-text-secondary">
                      {b.accountNumber} · {b.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <label className="block text-sm text-text-secondary mb-1.5">
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
              className="w-full h-14 px-4 rounded-2xl bg-elevated border border-border text-2xl font-semibold outline-none focus:border-accent mb-1"
            />
            <p className="text-xs text-text-secondary mb-6">
              Available: {formatNaira(balance)} · Min ₦500 · Fee ₦100
            </p>

            <button
              onClick={() => setStep("review")}
              disabled={!canContinue}
              className="w-full h-14 rounded-2xl bg-accent text-white font-semibold disabled:opacity-40"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="bg-elevated rounded-2xl p-4 space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Bank</span>
                <span className="font-medium">
                  {selected?.bankName} ****{selected?.accountNumber.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Amount</span>
                <span className="font-semibold">{formatNaira(numeric)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Platform fee</span>
                <span>{formatNaira(fee)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-text-secondary">Total debit</span>
                <span className="font-bold text-lg">{formatNaira(total)}</span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-accent text-white font-semibold disabled:opacity-60"
            >
              {loading ? "Processing…" : "Confirm Withdrawal"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
