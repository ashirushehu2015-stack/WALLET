import React, { useState } from 'react';
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, Send, Sparkles } from 'lucide-react';
import { WalletBalanceData } from '../types';

interface BalanceCardProps {
  balance: WalletBalanceData | null;
  walletNumber?: string;
  onOpenTransfer: () => void;
  onOpenWithdraw: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  walletNumber,
  onOpenTransfer,
  onOpenWithdraw,
}) => {
  const [showBalance, setShowBalance] = useState(true);

  const available = balance?.availableBalance ?? 0;
  const holds = balance?.pendingHolds ?? 0;
  const ledger = balance?.ledgerBalance ?? 0;

  return (
    <div className="glass-card-indigo rounded-3xl p-6 sm:p-8 relative overflow-hidden glow-indigo">
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">Total Available Balance</span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {walletNumber && (
          <span className="text-xs font-mono bg-slate-900/60 px-3 py-1 rounded-full text-slate-300 border border-slate-700/50">
            Wallet #{walletNumber}
          </span>
        )}
      </div>

      <div className="mb-6">
        <div className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
          <span>{showBalance ? `₦${available.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••••'}</span>
          <span className="text-xs font-bold text-brand-300 uppercase tracking-widest">{balance?.currency || 'NGN'}</span>
        </div>
        {holds > 0 && (
          <p className="text-xs text-amber-400 mt-2 font-medium">
            ⚠️ ₦{holds.toLocaleString('en-NG', { minimumFractionDigits: 2 })} in pending payout holds
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:space-x-4 pt-4 border-t border-slate-700/40">
        <button
          onClick={onOpenTransfer}
          className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm px-5 py-3 rounded-2xl transition-all shadow-lg shadow-brand-600/30 hover:scale-[1.02]"
        >
          <Send className="w-4 h-4" />
          <span>Send Money</span>
        </button>

        <button
          onClick={onOpenWithdraw}
          className="flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold text-sm px-5 py-3 rounded-2xl transition-all border border-slate-700 hover:scale-[1.02]"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          <span>Withdraw</span>
        </button>
      </div>
    </div>
  );
};
