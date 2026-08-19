import { useState } from "react";
import { X, User } from "lucide-react";
import { formatNaira } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (amount: number, to: string, note?: string) => Promise<void>;
  balance: number;
}

const CONTACTS = [
  { name: "Chioma Okafor", wallet: "0803 *** 4521" },
  { name: "Tunde Bakare", wallet: "0901 *** 8832" },
  { name: "Amina Yusuf", wallet: "0706 *** 1190" },
];

export default function SendBottomSheet({
  open,
  onClose,
  onSend,
  balance,
}: Props) {
  const [step, setStep] = useState<"form" | "review">("form");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const numeric = Number(amount.replace(/,/g, "")) || 0;
  const canContinue = to.trim().length > 2 && numeric >= 100 && numeric <= balance;

  const reset = () => {
    setStep("form");
    setTo("");
    setAmount("");
    setNote("");
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSend(numeric, to, note || undefined);
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
            {step === "form" ? "Send Money" : "Review Transfer"}
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
              Recipient
            </label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Name or wallet number"
              className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border outline-none focus:border-accent mb-3"
            />

            <p className="text-xs text-text-secondary mb-2">Recent contacts</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
              {CONTACTS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setTo(c.name)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-elevated border border-border text-sm"
                >
                  <User size={14} className="text-accent" />
                  {c.name.split(" ")[0]}
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
            <p className="text-xs text-text-secondary mb-4">
              Available: {formatNaira(balance)}
            </p>

            <label className="block text-sm text-text-secondary mb-1.5">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border outline-none focus:border-accent mb-6"
            />

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
                <span className="text-text-secondary">To</span>
                <span className="font-medium">{to}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Amount</span>
                <span className="font-semibold text-lg">{formatNaira(numeric)}</span>
              </div>
              {note && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Note</span>
                  <span>{note}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-text-secondary">Fee</span>
                <span className="text-accent">Free</span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-accent text-white font-semibold disabled:opacity-60"
            >
              {loading ? "Sending…" : "Confirm & Send"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
