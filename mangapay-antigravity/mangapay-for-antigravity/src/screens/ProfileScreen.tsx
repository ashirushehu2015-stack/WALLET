import { useState } from "react";
import {
  Shield,
  Building2,
  CreditCard,
  Fingerprint,
  ChevronRight,
  BadgeCheck,
  Moon,
  Sun,
  Plus,
  X,
} from "lucide-react";
import type { User } from "../api/api";

interface Props {
  user: User;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  onToggleBiometric: (enabled: boolean) => void;
  onAddBank: (bankName: string, accountNumber: string, name: string) => Promise<void>;
}

export default function ProfileScreen({
  user,
  darkMode,
  onToggleDarkMode,
  onToggleBiometric,
  onAddBank,
}: Props) {
  const [bio, setBio] = useState(user.biometricEnabled);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [bankName, setBankName] = useState("Kuda Bank");
  const [accountNumber, setAccountNumber] = useState("");
  const [adding, setAdding] = useState(false);

  const toggleBio = () => {
    const next = !bio;
    setBio(next);
    onToggleBiometric(next);
  };

  const handleAddBankSubmit = async () => {
    if (accountNumber.length !== 10) return;
    setAdding(true);
    try {
      await onAddBank(bankName, accountNumber, `${user.name} Okoye`);
      setAccountNumber("");
      setAddBankOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="pb-28 px-4 pt-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-6">Profile & Settings</h1>

      {/* Avatar & Name */}
      <div className="flex flex-col items-center mb-8">
        <img
          src={user.avatar}
          alt=""
          className="w-20 h-20 rounded-full bg-elevated border-2 border-border mb-3 shadow-soft object-cover"
        />
        <h2 className="text-lg font-bold">{user.name} Okoye</h2>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-accent bg-accent-soft px-3 py-1 rounded-full">
          <BadgeCheck size={16} />
          <span>{user.tier} KYC Verified</span>
        </div>
      </div>

      {/* Preferences & Appearance */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
          Appearance & Security
        </h3>
        <div className="bg-surface rounded-[20px] border border-border divide-y divide-border shadow-soft">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => onToggleDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-elevated/50 transition rounded-t-[20px]"
          >
            {darkMode ? <Moon size={18} className="text-accent" /> : <Sun size={18} className="text-accent" />}
            <div className="flex-1">
              <p className="text-xs font-semibold">Dark Mode (Soft Espresso)</p>
              <p className="text-[11px] text-text-secondary">
                {darkMode ? "Soft dark warm theme active" : "Default milky light theme active"}
              </p>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition relative ${
                darkMode ? "bg-accent" : "bg-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

          {/* Biometrics */}
          <button
            onClick={toggleBio}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-elevated/50 transition rounded-b-[20px]"
          >
            <Fingerprint size={18} className="text-accent" />
            <div className="flex-1">
              <p className="text-xs font-semibold">Biometric Authentication</p>
              <p className="text-[11px] text-text-secondary">
                Use Touch ID / Face ID for transfer approval
              </p>
            </div>
            <div
              className={`w-11 h-6 rounded-full transition relative ${
                bio ? "bg-accent" : "bg-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  bio ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>
      </section>

      {/* Account section */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-1">
          Account Verification & DVA
        </h3>
        <div className="bg-surface rounded-[20px] border border-border divide-y divide-border shadow-soft">
          <div className="flex items-center gap-3 p-4">
            <Shield size={18} className="text-accent" />
            <div className="flex-1">
              <p className="text-xs font-semibold">KYC Status</p>
              <p className="text-[11px] text-text-secondary">Tier 1 · Daily Limit ₦500,000</p>
            </div>
            <ChevronRight size={16} className="text-text-secondary" />
          </div>
          <div className="flex items-center gap-3 p-4">
            <CreditCard size={18} className="text-accent" />
            <div className="flex-1">
              <p className="text-xs font-semibold">Paystack DVA Account</p>
              <p className="text-[11px] font-mono text-text-secondary">
                {user.dva.accountNumber} · {user.dva.bankName}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Linked Banks */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Linked Bank Accounts
          </h3>
          <button
            onClick={() => setAddBankOpen(true)}
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Add Bank</span>
          </button>
        </div>

        <div className="bg-surface rounded-[20px] border border-border divide-y divide-border shadow-soft">
          {user.banks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4">
              <Building2 size={18} className="text-accent" />
              <div className="flex-1">
                <p className="text-xs font-semibold">{b.bankName}</p>
                <p className="text-[11px] font-mono text-text-secondary">
                  {b.accountNumber} · {b.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Bank Modal */}
      {addBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface text-text-primary w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Add Linked Bank</h3>
              <button onClick={() => setAddBankOpen(false)} className="p-1 rounded-full hover:bg-elevated">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Select Bank
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-elevated border border-border text-xs font-semibold outline-none focus:border-accent"
                >
                  {["Kuda Bank", "OPay", "Palmpay", "Zenith Bank", "FirstBank", "Stanbic IBTC"].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Account Number (10 digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0123456789"
                  className="w-full h-11 px-3 rounded-xl bg-elevated border border-border text-sm font-mono outline-none focus:border-accent"
                />
              </div>

              <div className="p-3 bg-elevated rounded-xl border border-border text-xs text-text-secondary">
                Account Name: <span className="font-semibold text-text-primary">{user.name} Okoye</span>
              </div>
            </div>

            <button
              onClick={handleAddBankSubmit}
              disabled={accountNumber.length !== 10 || adding}
              className="mt-5 w-full h-12 rounded-xl bg-accent text-white font-semibold text-xs disabled:opacity-40 hover:opacity-90"
            >
              {adding ? "Linking Bank Account..." : "Link Bank Account"}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-text-secondary mt-8">
        MangaPay v1.2 · Antigravity Edition
      </p>
    </div>
  );
}

