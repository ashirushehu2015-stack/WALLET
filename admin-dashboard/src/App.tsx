import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { LedgerBrowser } from './pages/LedgerBrowser';
import { Transactions } from './pages/Transactions';
import { Webhooks } from './pages/Webhooks';
import { Reconciliation } from './pages/Reconciliation';
import { AuditLogs } from './pages/AuditLogs';
import { adminApi } from './services/api';
import { MetricsData } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    adminApi.getMetrics().then(setMetrics);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && <Overview metrics={metrics} />}
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
