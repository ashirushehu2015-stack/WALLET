import React, { useState } from 'react';
import { Search, ArrowDownLeft, Send, ArrowUpRight, Filter, ReceiptText } from 'lucide-react';
import { TransactionRecord } from '../types';

interface HistoryScreenProps {
  transactions: TransactionRecord[];
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ transactions }) => {
  const [filter, setFilter] = useState<'ALL' | 'DEPOSIT' | 'TRANSFER' | 'WITHDRAWAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesFilter = filter === 'ALL' || tx.type === filter;
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">Transaction History</h1>
        <p className="text-xs text-[#78716C] mt-0.5">Filter and search your double-entry ledger activity</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#78716C]" />
        <input
          type="text"
          placeholder="Search by description or reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 bg-[#FFFFFF] border border-[#EDE8E0] rounded-xl pl-10 pr-4 text-xs text-[#1C1917] focus:outline-none focus:border-[#0F766E] milky-shadow"
        />
      </div>

      {/* Filter Tabs Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {[
          { id: 'ALL', label: 'All Activity' },
          { id: 'DEPOSIT', label: 'Funded' },
          { id: 'TRANSFER', label: 'Sent' },
          { id: 'WITHDRAWAL', label: 'Withdrawn' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilter(chip.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              filter === chip.id
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                : 'bg-[#FFFFFF] text-[#78716C] border-[#EDE8E0] hover:bg-[#F9F6F1]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#EDE8E0] rounded-2xl p-10 text-center milky-shadow">
          <p className="text-xs font-semibold text-[#78716C]">No matching transactions found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => {
            const isDeposit = tx.type === 'DEPOSIT';
            const isWithdrawal = tx.type === 'WITHDRAWAL';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="bg-[#FFFFFF] hover:bg-[#F9F6F1] border border-[#EDE8E0] p-4 rounded-2xl flex items-center justify-between milky-shadow transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDeposit
                        ? 'bg-[#CCFBF1] text-[#0F766E]'
                        : isWithdrawal
                        ? 'bg-[#FEF3C7] text-[#B45309]'
                        : 'bg-[#F9F6F1] text-[#1C1917]'
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
                    <p className="text-xs font-bold text-[#1C1917] group-hover:text-[#0F766E] transition-colors">
                      {tx.description}
                    </p>
                    <p className="text-[10px] text-[#78716C] mt-0.5">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xs font-extrabold ${
                      isDeposit ? 'text-[#15803D]' : 'text-[#1C1917]'
                    }`}
                  >
                    {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      tx.status === 'SUCCESS'
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : tx.status === 'PROCESSING' || tx.status === 'PENDING'
                        ? 'bg-[#FEF3C7] text-[#B45309]'
                        : 'bg-[#FEE2E2] text-[#B91C1C]'
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

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sheet-overlay p-4">
          <div className="w-full max-w-sm bg-[#FFFFFF] rounded-3xl p-6 shadow-2xl relative border border-[#EDE8E0] text-center">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-5 right-5 text-[#78716C] hover:text-[#1C1917]"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1C1917]">MangaPay Receipt</h3>
              <p className="text-[11px] text-[#78716C] font-mono mt-0.5">{selectedTx.reference}</p>
            </div>

            <div className="space-y-3 bg-[#F9F6F1] p-4 rounded-2xl border border-[#EDE8E0] text-xs mb-6 text-left">
              <div className="flex justify-between">
                <span className="text-[#78716C]">Transaction Type</span>
                <span className="font-bold text-[#1C1917] uppercase">{selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Amount</span>
                <span className="font-bold text-[#1C1917]">₦{selectedTx.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Platform Fee</span>
                <span className="font-bold text-[#1C1917]">₦{selectedTx.fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Status</span>
                <span className="font-bold text-[#15803D]">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#78716C]">Date & Time</span>
                <span className="text-[#1C1917]">{new Date(selectedTx.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full h-12 bg-[#0F766E] hover:bg-[#0d6760] text-white font-bold rounded-xl text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
