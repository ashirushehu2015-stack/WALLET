import React, { useEffect, useState } from 'react';
import { RefreshCw, History, ArrowDownLeft, ArrowUpRight, Send, ReceiptText, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { UserProfile, WalletBalanceData, TransactionRecord } from '../types';
import { BalanceCard } from '../components/BalanceCard';
import { DVACard } from '../components/DVACard';
import { TransferModal } from '../components/TransferModal';
import { WithdrawalModal } from '../components/WithdrawalModal';

interface DashboardProps {
  user: UserProfile | null;
  onRefreshProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onRefreshProfile }) => {
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [balData, txData] = await Promise.all([
        api.getBalance(),
        api.getTransactions({ limit: 8 }),
      ]);
      setBalance(balData);
      setTransactions(txData.transactions);
      onRefreshProfile();
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Banner Greetings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Live double-entry ledger personal wallet overview
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center space-x-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-2xl border border-slate-800 text-xs font-semibold self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <BalanceCard
          balance={balance}
          walletNumber={user?.walletAccount?.walletNumber}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenWithdraw={() => setIsWithdrawOpen(true)}
        />
        <DVACard dva={user?.dva} />
      </div>

      {/* Recent Activity Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
          </div>
          <span className="text-xs text-slate-400">Live Ledger Feed</span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">No transactions recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Fund your account via bank transfer to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isDeposit = tx.type === 'DEPOSIT';
              const isWithdrawal = tx.type === 'WITHDRAWAL';

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDeposit
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isWithdrawal
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : isWithdrawal ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-extrabold ${
                        isDeposit ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                        tx.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : tx.status === 'PROCESSING' || tx.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-slate-700/60">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Transaction Receipt</h3>
              <p className="text-xs text-slate-400">{selectedTx.reference}</p>
            </div>

            <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="font-bold text-white uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="font-bold text-white">₦{selectedTx.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Fee</span>
                <span className="font-bold text-white">₦{selectedTx.fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-400">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-slate-300">{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Transfer & Withdrawal Modals */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <WithdrawalModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
