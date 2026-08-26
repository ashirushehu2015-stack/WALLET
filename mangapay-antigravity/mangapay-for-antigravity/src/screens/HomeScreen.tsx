import { useState } from "react";
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownLeft, Smartphone, CreditCard, Zap, Tv, ChevronRight } from "lucide-react";
import {
  formatNaira,
  formatRelative,
  type Transaction,
  type User,
} from "../api/api";

interface Props {
  user: User;
  transactions: Transaction[];
  onFund: () => void;
  onSend: () => void;
  onWithdraw: () => void;
  onOpenServices: () => void;
  onOpenVirtualCards: () => void;
  onOpenOnboarding?: () => void;
  onOpenAgent?: () => void;
  onInstallApp?: () => void;
  onRefresh: () => void;
}

export default function HomeScreen({
  user,
  transactions,
  onFund,
  onSend,
  onWithdraw,
  onOpenServices,
  onOpenVirtualCards,
  onOpenOnboarding,
  onOpenAgent,
  onInstallApp,
}: Props) {
  const [hidden, setHidden] = useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const recent = transactions.slice(0, 5);

  const statusColor = (s: string) => {
    if (s === "SUCCESS") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400";
    if (s === "PROCESSING") return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400";
    return "text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400";
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
            src="/app_logo_interchanged.jpg"
            alt="MangaPay Logo"
            className="w-10 h-10 rounded-2xl object-cover shadow-xs border border-emerald-500/20"
          />
          <div>
            <p className="text-xs text-text-secondary font-medium">{greeting},</p>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">{user.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onInstallApp && (
            <button
              onClick={onInstallApp}
              className="px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0A7A4B] text-[11px] font-extrabold shadow-xs hover:bg-emerald-100 transition flex items-center gap-1"
            >
              <span>📲 Install App</span>
            </button>
          )}
          {onOpenAgent && (
            <button
              onClick={onOpenAgent}
              className="px-3 py-1.5 rounded-full bg-[#0A7A4B] text-white text-[11px] font-bold shadow-xs hover:bg-[#08633d] transition flex items-center gap-1"
            >
              <span>💼 Agent App</span>
            </button>
          )}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              <span>🚀 Splash</span>
            </button>
          )}
          <img
            src={user.avatar}
            alt=""
            className="w-11 h-11 rounded-full bg-elevated border border-border shadow-sm object-cover"
          />
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-surface rounded-[20px] p-5 shadow-soft border border-border mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-text-secondary font-medium">Available Balance</p>
          <button
            onClick={() => setHidden(!hidden)}
            className="p-1.5 rounded-full hover:bg-elevated text-text-secondary transition"
          >
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-3xl font-bold tracking-tight text-text-primary">
          {hidden ? "••••••••" : formatNaira(user.balance)}
        </p>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <span>DVA: {user.dva.accountNumber}</span>
          <span className="font-medium text-accent">{user.dva.bankName}</span>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Fund", icon: Plus, action: onFund, color: "bg-accent text-white shadow-sm" },
          { label: "Send", icon: ArrowUpRight, action: onSend, color: "bg-elevated text-text-primary border border-border" },
          { label: "Withdraw", icon: ArrowDownLeft, action: onWithdraw, color: "bg-elevated text-text-primary border border-border" },
        ].map(({ label, icon: Icon, action, color }) => (
          <button
            key={label}
            onClick={action}
            className={`flex flex-col items-center justify-center gap-2 h-20 rounded-[16px] font-semibold text-xs transition active:scale-95 ${color}`}
          >
            <Icon size={22} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-text-primary">Quick Services</h2>
          <button
            onClick={onOpenServices}
            className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Airtime", icon: Smartphone, action: onOpenServices },
            { label: "Data", icon: Zap, action: onOpenServices },
            { label: "Cable TV", icon: Tv, action: onOpenServices },
            { label: "Virtual Card", icon: CreditCard, action: onOpenVirtualCards },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center justify-center py-3.5 px-2 bg-surface rounded-[16px] border border-border text-center hover:border-accent transition active:scale-95"
            >
              <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-1.5">
                <Icon size={18} />
              </div>
              <span className="text-[11px] font-semibold text-text-primary leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Virtual Cards Banner Promo */}
      <div
        onClick={onOpenVirtualCards}
        className="bg-gradient-to-r from-teal-900 to-emerald-800 text-white rounded-[20px] p-4 mb-6 shadow-md cursor-pointer flex items-center justify-between hover:opacity-95 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <CreditCard size={20} className="text-teal-200" />
          </div>
          <div>
            <p className="font-bold text-xs">MangaPay Virtual Visa & Mastercard</p>
            <p className="text-[11px] text-teal-100/80">Shop globally without limits</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-teal-200" />
      </div>

      {/* Recent Activity */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-text-primary">Recent Activity</h2>
      </div>
      <div className="space-y-2">
        {recent.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8">
            No transactions yet
          </p>
        )}
        {recent.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border hover:border-accent/40 transition"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                tx.type === "FUND"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : tx.type === "SEND"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                  : tx.type === "UTILITY"
                  ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
              }`}
            >
              {tx.type === "FUND" ? (
                <Plus size={18} />
              ) : tx.type === "SEND" ? (
                <ArrowUpRight size={18} />
              ) : tx.type === "UTILITY" ? (
                <Zap size={18} />
              ) : (
                <ArrowDownLeft size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{tx.description}</p>
              <p className="text-[11px] text-text-secondary">
                {formatRelative(tx.createdAt)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`text-xs font-bold ${
                  tx.type === "FUND" ? "text-emerald-600 dark:text-emerald-400" : "text-text-primary"
                }`}
              >
                {tx.type === "FUND" ? "+" : "-"}
                {formatNaira(tx.amount)}
              </p>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor(
                  tx.status
                )}`}
              >
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

