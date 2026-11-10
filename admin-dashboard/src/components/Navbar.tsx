import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { adminApi } from '../services/api';

interface NavbarProps {
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const adminUser = adminApi.getAdminUser();
  const displayName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'System Administrator';
  const displayEmail = adminUser?.email || 'admin@mangapay.ng';
  const initials = adminUser ? `${adminUser.firstName?.[0] || 'A'}${adminUser.lastName?.[0] || 'D'}` : 'AD';

  return (
    <header className="h-16 border-b border-slate-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <div className="h-full w-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <span className="font-bold text-slate-100 tracking-tight text-lg">MANGAPAY ADMIN</span>
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Ledger v1.0
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-medium text-emerald-400">Ledger Engine Online</span>
        </div>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-200">{displayName}</p>
            <p className="text-[10px] text-slate-400">{displayEmail}</p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            className="h-9 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
