import React, { useEffect, useState } from 'react';
import { BookOpen, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { adminApi } from '../services/api';
import { LedgerAccount, JournalEntry } from '../types';

export const LedgerBrowser: React.FC = () => {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    adminApi.getLedgerAccounts().then(setAccounts);
    adminApi.getJournalEntries().then(setJournals);
  }, []);

  const filteredAccounts = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Double-Entry Ledger Browser</h1>
        <p className="text-sm text-slate-400">Inspect system Chart of Accounts and atomic Journal Entries.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter ledger accounts by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Chart of Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => (
          <div key={acc.id} className="glass-card p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {acc.type}
              </span>
              <span className="text-[11px] text-slate-500">{acc.currency}</span>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 text-sm truncate">{acc.name}</h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{acc.description || 'System account'}</p>
            </div>

            {acc.walletAccount && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Wallet #{acc.walletAccount.walletNumber}</span>
                <span className="text-emerald-400 font-bold">
                  ₦{acc.walletAccount.availableBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Journal Entries List */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-400" />
          <h3 className="font-bold text-slate-200">Recent Journal Entries</h3>
        </div>

        <div className="divide-y divide-slate-800/60">
          {journals.map((je) => (
            <div key={je.id} className="p-4 hover:bg-slate-900/40 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {je.reference}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">{je.description}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {je.status}
                </span>
              </div>

              {/* Postings Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                {je.postings.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-lg flex items-center justify-between ${
                      p.entryType === 'DEBIT'
                        ? 'bg-rose-500/5 border border-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {p.entryType === 'DEBIT' ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span className="font-semibold">{p.entryType}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[160px]">
                        {p.ledgerAccount?.name || p.ledgerAccountId}
                      </span>
                    </div>
                    <span className="font-bold">
                      ₦{Number(p.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
