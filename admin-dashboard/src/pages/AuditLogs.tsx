import React, { useEffect, useState } from 'react';
import { ShieldAlert, Terminal } from 'lucide-react';
import { adminApi } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    adminApi.getAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Security & System Audit Logs</h1>
        <p className="text-sm text-slate-400">Complete immutable record of all administrative actions, system events, and API activity.</p>
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-cyan-400" />
          <h3 className="font-bold text-slate-200">System Activity Stream</h3>
        </div>

        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-900/40 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                    {log.actorType}
                  </span>
                  <span className="font-bold text-slate-200">{log.action}</span>
                  <span className="text-slate-500">[{log.resource}]</span>
                </div>
                <span className="text-slate-500 text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
              </div>

              {log.details && (
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-slate-400 text-[11px]">
                  {JSON.stringify(log.details)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
