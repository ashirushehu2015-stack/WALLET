import React, { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  Wifi,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Layers,
  TrendingUp,
  Server,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { adminApi } from '../services/api';
import { VASDashboardData, VASTransactionRecord } from '../types';

export const VASManagement: React.FC = () => {
  const [data, setData] = useState<VASDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [networkFilter, setNetworkFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');

  // Refund Modal State
  const [selectedTxForRefund, setSelectedTxForRefund] = useState<VASTransactionRecord | null>(null);
  const [refundReason, setRefundReason] = useState('Service delivery failed / manual customer claim');
  const [refunding, setRefunding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Requery State
  const [requeryingRef, setRequeryingRef] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getVASDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncCatalogue = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await adminApi.syncVASProducts();
      setSyncMessage(`Sync completed: ${res.count || 'all'} data plans up-to-date with VTpass`);
      setTimeout(() => setSyncMessage(null), 5000);
      fetchData();
    } catch (e: any) {
      setSyncMessage(e.message || 'Product sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRequery = async (reference: string) => {
    setRequeryingRef(reference);
    try {
      const res = await adminApi.requeryVASTransaction(reference);
      setActionSuccess(`Transaction ${reference} status requery: ${res.data?.status || 'UPDATED'}`);
      setTimeout(() => setActionSuccess(null), 5000);
      fetchData();
    } catch (e: any) {
      alert(`Requery failed: ${e.message || 'Network error'}`);
    } finally {
      setRequeryingRef(null);
    }
  };

  const handleExecuteRefund = async () => {
    if (!selectedTxForRefund) return;
    setRefunding(true);
    try {
      await adminApi.refundVASTransaction({
        vasTransactionId: selectedTxForRefund.id,
        reason: refundReason,
      });
      setSelectedTxForRefund(null);
      setActionSuccess(`Refund of ₦${selectedTxForRefund.totalAmount.toLocaleString()} credited back to user liability`);
      setTimeout(() => setActionSuccess(null), 5000);
      fetchData();
    } catch (e: any) {
      alert(`Refund failed: ${e.response?.data?.message || e.message}`);
    } finally {
      setRefunding(false);
    }
  };

  const transactions = useMemo(() => {
    if (!data?.recentTransactions) return [];
    return data.recentTransactions.filter((tx) => {
      if (networkFilter !== 'ALL' && tx.network !== networkFilter) return false;
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
      if (serviceTypeFilter !== 'ALL' && tx.serviceType !== serviceTypeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesRef = tx.reference.toLowerCase().includes(s);
        const matchesPhone = tx.recipientPhone.includes(s);
        const matchesUser =
          tx.user?.email.toLowerCase().includes(s) ||
          `${tx.user?.firstName} ${tx.user?.lastName}`.toLowerCase().includes(s);
        return matchesRef || matchesPhone || matchesUser;
      }
      return true;
    });
  }, [data, networkFilter, statusFilter, serviceTypeFilter, search]);

  const networkBadgeColor = (net: string) => {
    switch (net.toUpperCase()) {
      case 'MTN':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'AIRTEL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'GLO':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case '9MOBILE':
        return 'bg-lime-500/10 text-lime-400 border-lime-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> SUCCESS
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 animate-spin" /> PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <RotateCcw className="w-3 h-3" /> REFUNDED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Value Added Services (VAS)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              VTpass Live Integration
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time VTpass airtime recharge, mobile data subscriptions, wholesale clearing & double-entry reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSyncCatalogue}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
            Sync Telecom Products
          </button>
        </div>
      </div>

      {/* Sync / Action Notification Alert */}
      {syncMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Gross VAS Volume</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            ₦{Number(data?.overview.grossSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            Total customer payments for Airtime & Data
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Platform Gross Profit</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₦{Number(data?.overview.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">
            Wholesale commissions credited to <span className="font-mono text-cyan-400">VAS_COMMISSION_INCOME</span>
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">VTpass Clearing Balance</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            ₦{Number(data?.providerBalance.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Provider Account</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-purple-300 border border-purple-500/30">
              {data?.providerBalance.environment || 'SANDBOX'}
            </span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Telecom Success Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-100 font-mono">
            {Number(data?.overview.successRate || 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500">
            {data?.overview.successfulTransactions || 0} Successful · {data?.overview.pendingTransactions || 0} Pending · {data?.overview.failedTransactions || 0} Failed
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search reference, recipient phone, or customer email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Network Filter */}
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Networks</option>
            <option value="MTN">MTN Nigeria</option>
            <option value="AIRTEL">Airtel Nigeria</option>
            <option value="GLO">Globacom (Glo)</option>
            <option value="9MOBILE">9mobile</option>
          </select>

          {/* Service Type Filter */}
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Services</option>
            <option value="AIRTIME">Airtime Recharge</option>
            <option value="DATA">Mobile Data</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Transactions Journal Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">VAS Transactions Journal</h3>
            <p className="text-[11px] text-slate-500">
              Authoritative double-entry ledger records with provider wholesale tracking
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-200">{transactions.length}</strong> records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070a11] text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Reference / Service</th>
                <th className="px-4 py-3.5">Network</th>
                <th className="px-4 py-3.5">Recipient / Product</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5 text-right">Debit (Face)</th>
                <th className="px-4 py-3.5 text-right">Provider Cost</th>
                <th className="px-4 py-3.5 text-right">Platform Margin</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Loading VAS transactions...' : 'No transactions matching your criteria.'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const margin = tx.totalAmount - tx.providerCost;
                  const isPending = tx.status === 'PENDING';
                  const isFailedOrDisputed = tx.status === 'FAILED' || (tx.status === 'SUCCESS' && !tx.refund);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition">
                      {/* Reference & Service */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-semibold text-slate-200">{tx.reference}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          {tx.serviceType === 'AIRTIME' ? (
                            <Smartphone className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Wifi className="w-3 h-3 text-indigo-400" />
                          )}
                          <span>{tx.serviceType}</span>
                        </div>
                      </td>

                      {/* Network */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${networkBadgeColor(
                            tx.network
                          )}`}
                        >
                          {tx.network}
                        </span>
                      </td>

                      {/* Recipient & Product */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-200">{tx.recipientPhone}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {tx.productName || 'Standard Airtime'}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200 truncate max-w-[120px]">
                          {tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'Direct Customer'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {tx.user?.email}
                        </div>
                      </td>

                      {/* Face Value */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-200">
                        ₦{Number(tx.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Wholesale Cost */}
                      <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                        ₦{Number(tx.providerCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Margin */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                        +₦{Number(margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">{statusBadge(tx.status)}</td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {isPending && (
                          <button
                            onClick={() => handleRequery(tx.reference)}
                            disabled={requeryingRef === tx.reference}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition"
                          >
                            {requeryingRef === tx.reference ? 'Checking…' : 'Requery'}
                          </button>
                        )}

                        {tx.status !== 'REFUNDED' && (
                          <button
                            onClick={() => setSelectedTxForRefund(tx)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Refund Authorization Modal */}
      {selectedTxForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#0b0f19] border border-slate-800 text-slate-100 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Authorize Compensating Refund</h3>
                <p className="text-xs text-slate-400">Double-entry reversal with customer liability credit</p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Reference</span>
                <span className="font-mono font-semibold text-slate-200">{selectedTxForRefund.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Phone</span>
                <span className="font-mono text-slate-200">{selectedTxForRefund.recipientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Refund</span>
                <span className="font-mono font-bold text-base text-rose-400">
                  ₦{Number(selectedTxForRefund.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clearing Reversal</span>
                <span className="font-mono text-purple-400">VTPASS_CLEARING_ASSET</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Audit Justification / Dispute Reason
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-rose-500/50"
                placeholder="State the audit reason for triggering this refund..."
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setSelectedTxForRefund(null)}
                className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefund}
                disabled={refunding}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {refunding ? 'Reversing...' : 'Confirm Atomic Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
