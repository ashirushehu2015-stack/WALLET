import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ArrowRightLeft,
  Webhook,
  Scale,
  ShieldAlert,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
    { id: 'ledger', label: 'Double-Entry Ledger', icon: BookOpen },
    { id: 'transactions', label: 'Transactions Journal', icon: ArrowRightLeft },
    { id: 'webhooks', label: 'Paystack Webhooks', icon: Webhook },
    { id: 'reconciliation', label: 'Reconciliation Audit', icon: Scale },
    { id: 'audit-logs', label: 'Security & Audit Logs', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070a11] min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="px-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Core Management</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 glass-card rounded-2xl border border-slate-800/80 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <FileText className="h-4 w-4" />
          <span className="text-xs font-semibold">Invariant Safeguard</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Double-Entry equation strictly enforced: <br />
          <span className="font-mono text-emerald-400 font-medium">∑ Debits = ∑ Credits</span>
        </p>
      </div>
    </aside>
  );
};
