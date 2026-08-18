import React from 'react';
import { ShieldCheck, Bell, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <div className="h-full w-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-100 tracking-tight text-lg">FINTECH WALLET</span>
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Ledger v1.0
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-medium text-emerald-400">Paystack Production Connected</span>
        </div>

        <button className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center">
            AD
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200">System Administrator</p>
            <p className="text-[10px] text-slate-400">admin@fintechwallet.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};
