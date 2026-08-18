import React, { useState } from 'react';
import { Scale, RefreshCw, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../services/api';

export const Reconciliation: React.FC = () => {
  const [recon, setRecon] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleRunReconciliation = async () => {
    setLoading(true);
    try {
      const data = await adminApi.triggerReconciliation();
      setRecon(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Reconciliation Engine</h1>
          <p className="text-sm text-slate-400">Audit system ledger against Paystack clearing settlements.</p>
        </div>

        <button
          onClick={handleRunReconciliation}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Auditing Ledger...' : 'Run Automated Audit'}</span>
        </button>
      </div>

      {recon && (
        <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-lg">Reconciliation Audit Result</h3>
                <p className="text-xs text-slate-400">ID: {recon.reconciliationId}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-full">
              {recon.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-sans">Total Ledger Deposits</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                ₦{recon.totalDeposits.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-sans">Total Ledger Payouts</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">
                ₦{recon.totalPayouts.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-sans">Ledger Discrepancy</span>
              <p className="text-xl font-bold text-slate-200 mt-1">
                ₦{recon.trialBalance.difference.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
