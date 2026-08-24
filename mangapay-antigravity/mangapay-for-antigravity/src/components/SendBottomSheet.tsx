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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
              <div className="space-y-3.5 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-text-secondary">
                      Select {destType === "bank" ? "Commercial Bank" : "MMO / Fintech Operator"}
                    </label>
                  </div>

                  {/* Selected Bank Card (When Dropdown Closed) OR Search Input Box (When Dropdown Open) */}
                  {!isDropdownOpen && selectedBank ? (
                    <div className="flex items-center justify-between h-13 rounded-2xl bg-surface border-2 border-emerald-600/70 px-3.5 shadow-xs transition">
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <div className="w-8 h-8 rounded-xl bg-[#0A7A4B] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {selectedBank.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-text-primary truncate">
                            {selectedBank.name}
                          </p>
                          <span className="text-[10px] font-bold text-emerald-600 font-mono">
                            Code: {selectedBank.code}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(true);
                          setBankSearch("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0A7A4B] text-xs font-extrabold border border-emerald-200 hover:bg-emerald-100 transition shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center h-12 rounded-xl bg-elevated border-2 border-emerald-600 px-3.5 bg-surface transition">
                        <Building2 size={16} className="text-emerald-600 mr-2.5 shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={bankSearch}
                          onChange={(e) => setBankSearch(e.target.value)}
                          placeholder={
                            destType === "bank"
                              ? "Type to search bank (GTBank, Zenith, FCMB...)"
                              : "Type to search operator (OPay, PalmPay, Kuda...)"
                          }
                          className="w-full bg-transparent text-xs font-semibold outline-none text-text-primary placeholder:text-text-secondary"
                        />
                        {bankSearch ? (
                          <button
                            type="button"
                            onClick={() => setBankSearch("")}
                            className="p-1 text-text-secondary hover:text-text-primary shrink-0"
                          >
                            <X size={14} />
                          </button>
                        ) : (
                          <Search className="text-text-secondary shrink-0" size={15} />
                        )}
                      </div>

                      {/* Dropdown list when searching */}
                      <div className="max-h-48 overflow-y-auto space-y-1 p-1.5 rounded-xl border border-border bg-surface shadow-md no-scrollbar">
                        {filteredActiveBanks.length > 0 ? (
                          filteredActiveBanks.map((b) => (
                            <button
                              key={b.name}
                              type="button"
                              onClick={() => {
                                setSelectedBank(b);
                                setBankSearch(b.name);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-border hover:bg-elevated text-left text-xs font-semibold transition group"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                                <div className="w-7 h-7 rounded-lg bg-elevated group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-black border border-border transition">
                                  {b.name.charAt(0)}
                                </div>
                                <span className="truncate text-xs font-bold text-text-primary">
                                  {b.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-elevated border border-border shrink-0 text-text-secondary">
                                {b.code}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs font-medium text-text-secondary">
                            No bank matching "{bankSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

