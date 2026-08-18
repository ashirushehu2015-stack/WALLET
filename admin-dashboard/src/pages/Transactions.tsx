import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, ArrowDownLeft, ArrowUpRight, Key } from 'lucide-react';
import { adminApi } from '../services/api';
import { JournalEntry } from '../types';

export const Transactions: React.FC = () => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);

  useEffect(() => {
    adminApi.getJournalEntries().then(setJournals);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Transactions & Idempotency Journal</h1>
        <p className="text-sm text-slate-400">All financial deposits, payouts, internal transfers, and idempotency protection records.</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-slate-200">Financial Activity Feed</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">100% Idempotent Guard Enabled</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Description</th>
                <th className="p-4">Status</th>
                <th className="p-4">Postings Count</th>
                <th className="p-4">Posted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {journals.map((j) => (
                <tr key={j.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4 font-bold text-cyan-400 flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-slate-500" />
                    {j.reference}
                  </td>
                  <td className="p-4 font-sans font-medium text-slate-200">{j.description}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {j.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{j.postings.length} entries</td>
                  <td className="p-4 text-slate-500">{new Date(j.postedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
