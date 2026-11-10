import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AdminLogin } from './components/AdminLogin';
import { Overview } from './pages/Overview';
import { VASManagement } from './pages/VASManagement';
import { LedgerBrowser } from './pages/LedgerBrowser';
import { Transactions } from './pages/Transactions';
import { Webhooks } from './pages/Webhooks';
import { Reconciliation } from './pages/Reconciliation';
import { AuditLogs } from './pages/AuditLogs';
import { adminApi } from './services/api';
import { MetricsData } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => adminApi.isAuthenticated());
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!adminApi.isAuthenticated()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMetrics();
      setMetrics(data);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        adminApi.logout();
        setIsAuthenticated(false);
      } else {
        setError(err?.response?.data?.message || err.message || 'Failed to connect to ledger engine.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated, fetchMetrics]);

  const handleLogout = () => {
    adminApi.logout();
    setIsAuthenticated(false);
    setMetrics(null);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-slate-100">
      <Navbar onLogout={handleLogout} />

      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {error && activeTab === 'overview' && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {activeTab === 'overview' && <Overview metrics={metrics} />}
          {activeTab === 'vas' && <VASManagement />}
          {activeTab === 'ledger' && <LedgerBrowser />}
          {activeTab === 'transactions' && <Transactions />}
          {activeTab === 'webhooks' && <Webhooks />}
          {activeTab === 'reconciliation' && <Reconciliation />}
          {activeTab === 'audit-logs' && <AuditLogs />}
        </main>
      </div>
    </div>
  );
};

export default App;
