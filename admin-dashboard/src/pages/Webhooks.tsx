import React, { useEffect, useState } from 'react';
import { Webhook, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminApi } from '../services/api';
import { WebhookEvent } from '../types';

export const Webhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);

  useEffect(() => {
    adminApi.getWebhooks().then(setWebhooks);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Paystack Webhooks Audit Log</h1>
        <p className="text-sm text-slate-400">Incoming HMAC-SHA512 signed Paystack events (`charge.success`, `transfer.success`).</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-cyan-400" />
            <h3 className="font-bold text-slate-200">Incoming Event Monitor</h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> HMAC-SHA512 Signature Validated
          </div>
        </div>

        <div className="divide-y divide-slate-800/60">
          {webhooks.map((wb) => (
            <div key={wb.id} className="p-4 hover:bg-slate-900/40 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                    {wb.eventType}
                  </span>
                  <span className="font-mono text-xs text-slate-400">ID: {wb.eventId}</span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    wb.status === 'PROCESSED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {wb.status}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <pre>{JSON.stringify(wb.payload, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
