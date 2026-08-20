import { useState } from "react";
import { X, User, Building2, Smartphone, Wallet, Search, CheckCircle2 } from "lucide-react";
import { formatNaira, NIGERIAN_BANKS, type BankInfo } from "../api/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (amount: number, to: string, note?: string) => Promise<void>;
  balance: number;
}

type DestinationType = "p2p" | "bank" | "mmo";

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
  const [destType, setDestType] = useState<DestinationType>("p2p");
  const [to, setTo] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankInfo>(NIGERIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const commercialBanks = NIGERIAN_BANKS.filter((b) => b.category === "Commercial");
  const mmoBanks = NIGERIAN_BANKS.filter((b) => b.category === "Fintech / MFB");

  const activeBankList = destType === "bank" ? commercialBanks : mmoBanks;
  const filteredActiveBanks = activeBankList.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const recipientDisplay =
    destType === "p2p"
      ? to
      : `${selectedBank.name} - ${accountNumber} (${to || "Verified Recipient"})`;

  const numeric = Number(amount.replace(/,/g, "")) || 0;
  const isAccountValid = destType === "p2p" ? to.trim().length >= 3 : accountNumber.length === 10;
  const canContinue = isAccountValid && numeric >= 100 && numeric <= balance;

  const reset = () => {
    setStep("form");
    setTo("");
    setAccountNumber("");
    setAmount("");
    setNote("");
    setBankSearch("");
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onSend(numeric, recipientDisplay, note || undefined);
      reset();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-t-[24px] p-6 pb-8 shadow-soft max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">
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
            {/* Mode Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-elevated rounded-2xl border border-border mb-4">
              <button
                type="button"
                onClick={() => {
                  setDestType("p2p");
                  setSelectedBank(NIGERIAN_BANKS[0]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  destType === "p2p"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Wallet size={14} />
                <span>MangaPay</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDestType("bank");
                  setSelectedBank(commercialBanks[0]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  destType === "bank"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Building2 size={14} />
                <span>Bank</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDestType("mmo");
                  setSelectedBank(mmoBanks[0]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  destType === "mmo"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Smartphone size={14} />
                <span>MMO / Wallet</span>
              </button>
            </div>

            {/* P2P Mode */}
            {destType === "p2p" && (
              <>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Recipient Tag or Wallet Phone Number
                </label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. @alex or 08031234567"
                  className="w-full h-12 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600 mb-3"
                />

                <p className="text-xs font-medium text-text-secondary mb-2">Recent contacts</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                  {CONTACTS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setTo(c.name)}
                      className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-elevated border border-border text-xs text-text-primary hover:border-emerald-600"
                    >
                      <User size={13} className="text-emerald-600" />
                      <span>{c.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Bank or MMO Mode */}
            {(destType === "bank" || destType === "mmo") && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Select {destType === "bank" ? "Commercial Bank" : "MMO / Fintech Operator"}
                  </label>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder={
                        destType === "bank"
                          ? "Search GTBank, Zenith, Access, First Bank..."
                          : "Search OPay, PalmPay, Moniepoint, Kuda..."
                      }
                      className="w-full h-10 px-3 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600"
                    />
                    <Search className="absolute right-3 top-3 text-text-secondary" size={14} />
                  </div>

                  <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 custom-scrollbar">
                    {filteredActiveBanks.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`p-2 rounded-xl border text-left text-xs font-semibold transition ${
                          selectedBank.name === b.name
                            ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                            : "border-border bg-elevated text-text-primary hover:bg-surface"
                        }`}
                      >
                        <span className="block truncate">{b.name}</span>
                        <span className="text-[10px] text-text-secondary font-mono">{b.code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    {destType === "bank" ? "Account Number" : "Account / Phone Number (10 digits)"}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setAccountNumber(v);
                      if (v.length === 10) setTo("Verified Account");
                    }}
                    placeholder="0123456789"
                    className="w-full h-12 px-4 rounded-xl bg-elevated border border-border text-sm font-mono text-text-primary outline-none focus:border-emerald-600"
                  />
                </div>

                {accountNumber.length === 10 && (
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Account Name: <strong className="font-bold">Verified Destination ({selectedBank.name})</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Amount Section */}
            <label className="block text-xs font-medium text-text-secondary mb-1">
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
              className="w-full h-13 px-4 rounded-2xl bg-elevated border border-border text-2xl font-bold text-text-primary outline-none focus:border-emerald-600 mb-1"
            />
            <p className="text-xs text-text-secondary mb-3">
              Available: {formatNaira(balance)}
            </p>

            <label className="block text-xs font-medium text-text-secondary mb-1">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for?"
              className="w-full h-11 px-4 text-xs rounded-xl bg-elevated border border-border text-text-primary outline-none focus:border-emerald-600 mb-5"
            />

            <button
              type="button"
              onClick={() => setStep("review")}
              disabled={!canContinue}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-40 shadow-sm transition"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="bg-elevated rounded-2xl p-4 space-y-3 mb-6 border border-border">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Destination Type</span>
                <span className="font-bold uppercase text-emerald-600">
                  {destType === "p2p" ? "MangaPay Wallet" : destType === "bank" ? "Commercial Bank" : "MMO / Fintech"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Recipient</span>
                <span className="font-semibold text-right max-w-[200px] truncate">{recipientDisplay}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Amount</span>
                <span className="font-bold text-base text-text-primary">{formatNaira(numeric)}</span>
              </div>
              {note && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Note</span>
                  <span className="italic">{note}</span>
                </div>
              )}
              <div className="flex justify-between text-xs border-t border-border pt-2.5">
                <span className="text-text-secondary">Transfer Fee</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-60 shadow-sm transition"
            >
              {loading ? "Sending Transfer…" : "Confirm & Transfer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

