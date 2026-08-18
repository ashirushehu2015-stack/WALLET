import React, { useState } from 'react';
import { Landmark, Copy, Check, ShieldCheck, ArrowDownLeft } from 'lucide-react';

interface DVACardProps {
  dva?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
  };
}

export const DVACard: React.FC<DVACardProps> = ({ dva }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!dva?.accountNumber) return;
    navigator.clipboard.writeText(dva.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card-emerald rounded-3xl p-6 sm:p-8 relative overflow-hidden glow-emerald">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Landmark className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
            Automated Deposit Account
          </span>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
          Instant Funding
        </span>
      </div>

      {dva ? (
        <div>
          <div className="mb-4">
            <p className="text-xs text-slate-400 font-medium">Bank Name</p>
            <p className="text-lg font-bold text-white">{dva.bankName}</p>
          </div>

          <div className="mb-4 flex items-center justify-between bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase">Account Number</p>
              <p className="text-2xl font-mono font-extrabold text-emerald-400 tracking-wider">
                {dva.accountNumber}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-2 rounded-xl border border-emerald-500/40 text-xs font-semibold transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium">Account Name</p>
            <p className="text-sm font-semibold text-slate-200">{dva.accountName}</p>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-400 mb-2">Dedicated Virtual Account is initializing...</p>
          <p className="text-xs text-slate-500">Paystack Automated Deposit Channel active.</p>
        </div>
      )}
    </div>
  );
};
