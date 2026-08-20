import { useState } from "react";
import { X, CreditCard, Plus, Lock, Unlock, Eye, EyeOff, Sparkles } from "lucide-react";
import { formatNaira, type VirtualCard } from "../api/api";

interface Props {
  open: boolean;
  cards: VirtualCard[];
  onClose: () => void;
  onRequestFundCard: (cardId: string, amount: number) => void;
  onRequestCreateCard: (type: "VISA" | "MASTERCARD", currency: "NGN" | "USD", amount: number) => void;
  onToggleFreeze: (cardId: string) => void;
  balance: number;
}

export default function VirtualCardsModal({
  open,
  cards,
  onClose,
  onRequestFundCard,
  onRequestCreateCard,
  onToggleFreeze,
  balance,
}: Props) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);
  const [mode, setMode] = useState<"view" | "fund" | "create">("view");

  // Fund state
  const [fundAmount, setFundAmount] = useState("");

  // Create state
  const [createType, setCreateType] = useState<"VISA" | "MASTERCARD">("VISA");
  const [createCurrency, setCreateCurrency] = useState<"USD" | "NGN">("USD");
  const [createInitialFund, setCreateInitialFund] = useState("5000");

  if (!open) return null;

  const activeCard = cards[activeCardIndex] || cards[0];

  const handleFundSubmit = () => {
    const num = Number(fundAmount.replace(/,/g, "")) || 0;
    if (num < 500 || num > balance || !activeCard) return;
    onRequestFundCard(activeCard.id, num);
    setMode("view");
    setFundAmount("");
  };

  const handleCreateSubmit = () => {
    const num = Number(createInitialFund.replace(/,/g, "")) || 0;
    const fee = createCurrency === "USD" ? 3000 : 1000;
    if (num + fee > balance) return;
    onRequestCreateCard(createType, createCurrency, num);
    setMode("view");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface text-text-primary w-full max-w-md rounded-t-[24px] p-6 pb-8 shadow-soft max-h-[90vh] overflow-y-auto border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard className="text-accent" size={22} />
            <h3 className="text-lg font-semibold">Virtual Cards</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-elevated text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {mode === "view" && (
          <div className="space-y-5">
            {cards.length > 0 && activeCard ? (
              <>
                {/* Card Slider Selector if multiple */}
                {cards.length > 1 && (
                  <div className="flex gap-2 justify-center mb-2">
                    {cards.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setActiveCardIndex(i);
                          setFlipped(false);
                        }}
                        className={`h-2.5 rounded-full transition-all ${
                          activeCardIndex === i ? "w-8 bg-accent" : "w-2.5 bg-border"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* 3D Flip Card Container */}
                <div
                  onClick={() => setFlipped(!flipped)}
                  className="perspective-1000 cursor-pointer select-none group"
                >
                  <div
                    className={`relative w-full h-52 rounded-[20px] shadow-xl p-6 transition-transform duration-500 transform-style-3d ${
                      flipped ? "rotate-y-180" : ""
                    } ${
                      activeCard.currency === "USD"
                        ? "bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white"
                        : "bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-white"
                    } ${activeCard.isFrozen ? "opacity-65 grayscale" : ""}`}
                  >
                    {/* Front Face */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-lg tracking-wider font-mono">
                            MangaPay
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-medium backdrop-blur-md">
                            {activeCard.currency} Virtual
                          </span>
                        </div>
                        <span className="font-black text-xl italic tracking-tighter">
                          {activeCard.cardType}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] opacity-75 uppercase tracking-widest font-semibold mb-1">
                          Card Number (Tap to flip)
                        </p>
                        <p className="font-mono text-lg font-bold tracking-widest">
                          {showNumbers
                            ? activeCard.cardNumber
                            : `•••• •••• •••• ${activeCard.cardNumber.slice(-4)}`}
                        </p>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] opacity-75 uppercase tracking-wider">
                            Card Holder
                          </p>
                          <p className="font-semibold text-sm tracking-wide">
                            {activeCard.cardholderName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-75 uppercase tracking-wider">
                            Expires
                          </p>
                          <p className="font-mono font-semibold text-sm">
                            {activeCard.expiryMonth}/{activeCard.expiryYear}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Back Face */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden rotate-y-180">
                      <div className="w-full h-8 bg-black/50 -mx-6 mt-1" />
                      <div className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/70">CVV Security Code:</span>
                        <span className="font-mono font-bold text-sm tracking-widest text-emerald-400">
                          {showNumbers ? activeCard.cvv : "•••"}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/70 space-y-0.5">
                        <p className="font-semibold">Billing Address:</p>
                        <p className="truncate">{activeCard.billingAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setShowNumbers(!showNumbers)}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-elevated border border-border text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-accent"
                  >
                    {showNumbers ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{showNumbers ? "Hide Details" : "Reveal Details"}</span>
                  </button>

                  <button
                    onClick={() => onToggleFreeze(activeCard.id)}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      activeCard.isFrozen
                        ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : "bg-elevated border-border text-text-primary hover:border-accent"
                    }`}
                  >
                    {activeCard.isFrozen ? <Unlock size={16} /> : <Lock size={16} />}
                    <span>{activeCard.isFrozen ? "Unfreeze Card" : "Freeze Card"}</span>
                  </button>
                </div>

                {/* Card Balance Card */}
                <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary">Card Balance</p>
                    <p className="text-xl font-bold text-text-primary mt-0.5">
                      {activeCard.currency === "USD"
                        ? `$${activeCard.balance.toFixed(2)}`
                        : formatNaira(activeCard.balance)}
                    </p>
                  </div>
                  <button
                    onClick={() => setMode("fund")}
                    disabled={activeCard.isFrozen}
                    className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs disabled:opacity-40 hover:opacity-90"
                  >
                    Fund Card
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-text-secondary text-sm">
                No virtual cards yet. Create your first instant card below!
              </div>
            )}

            <button
              onClick={() => setMode("create")}
              className="w-full h-14 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/30 hover:bg-accent-soft/60 text-accent font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus size={20} />
              <span>Create New Virtual Card</span>
            </button>
          </div>
        )}

        {mode === "fund" && activeCard && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("view")}
              className="text-xs font-semibold text-accent hover:underline mb-2 block"
            >
              ← Back to Cards
            </button>
            <h4 className="font-semibold text-base">Fund Virtual Card</h4>
            <p className="text-xs text-text-secondary">
              Transfer funds from your wallet balance to {activeCard.currency} Card (****{activeCard.cardNumber.slice(-4)}).
            </p>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Amount (₦)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fundAmount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setFundAmount(v ? Number(v).toLocaleString() : "");
                }}
                placeholder="e.g. 5,000"
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-lg font-bold outline-none focus:border-accent"
              />
              <p className="text-[11px] text-text-secondary mt-1">
                Available Wallet Balance: {formatNaira(balance)}
              </p>
            </div>

            <button
              onClick={handleFundSubmit}
              disabled={!fundAmount || Number(fundAmount.replace(/,/g, "")) > balance}
              className="w-full h-14 rounded-2xl bg-accent text-white font-semibold disabled:opacity-40 hover:opacity-90"
            >
              Continue to PIN
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-4">
            <button
              onClick={() => setMode("view")}
              className="text-xs font-semibold text-accent hover:underline mb-2 block"
            >
              ← Back to Cards
            </button>
            <h4 className="font-semibold text-base">Create Virtual Card</h4>

            {/* Currency Choice */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Select Card Currency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "USD", name: "USD Virtual Card", desc: "For Netflix, Amazon, Apple" },
                  { id: "NGN", name: "NGN Virtual Card", desc: "For Jumia, Bolt, Local Sites" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCreateCurrency(c.id as "USD" | "NGN")}
                    className={`p-3 rounded-2xl border text-left text-xs transition ${
                      createCurrency === c.id
                        ? "bg-accent-soft border-accent text-accent font-semibold"
                        : "bg-elevated border-border text-text-primary"
                    }`}
                  >
                    <p className="font-bold">{c.name}</p>
                    <p className="text-[10px] opacity-80 mt-0.5">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Brand */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Card Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["VISA", "MASTERCARD"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCreateType(t as "VISA" | "MASTERCARD")}
                    className={`h-11 rounded-2xl border font-bold text-xs transition ${
                      createType === t
                        ? "bg-accent text-white border-accent"
                        : "bg-elevated border-border text-text-primary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Fund Amount */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Initial Fund Amount (₦)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={createInitialFund}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setCreateInitialFund(v ? Number(v).toLocaleString() : "");
                }}
                className="w-full h-12 px-4 rounded-2xl bg-elevated border border-border text-lg font-bold outline-none focus:border-accent"
              />
              <p className="text-[11px] text-text-secondary mt-1">
                Card Issuance Fee: {createCurrency === "USD" ? "₦3,000" : "₦1,000"}
              </p>
            </div>

            <button
              onClick={handleCreateSubmit}
              className="w-full h-14 rounded-2xl bg-accent text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Sparkles size={18} />
              <span>Create Card with PIN</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
