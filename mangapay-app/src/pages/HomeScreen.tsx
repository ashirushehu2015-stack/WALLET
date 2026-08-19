import React, { useState } from 'react';
import { Eye, EyeOff, ArrowDownLeft, Send, ArrowUpRight, ChevronRight, ShieldCheck, User } from 'lucide-react';
import { UserProfile, WalletBalanceData, TransactionRecord } from '../types';

interface HomeScreenProps {
  user: UserProfile | null;
  balance: WalletBalanceData | null;
  transactions: TransactionRecord[];
  onOpenFund: () => void;
  onOpenSend: () => void;
  onOpenWithdraw: () => void;
  onSeeAllHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  balance,
  transactions,
  onOpenFund,
  onOpenSend,
  onOpenWithdraw,
  onSeeAllHistory,
}) => {
  const [showBalance, setShowBalance] = useState(true);

  // Default balance ₦248,500.00 if brand new
  const availableAmount = balance ? balance.availableBalance : 248500.0;

  // Greeting based on hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="pb-24 pt-4 px-4 sm:px-6 max-w-md mx-auto">
      {/* Header Greeting */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
            {greeting}, {user?.firstName || 'Alex'} 👋
          </h1>
          <p className="text-xs text-[#78716C] mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" /> Verified Wallet User
          </p>
        </div>
        <div className="w-11 h-11 rounded-full bg-[#CCFBF1] border border-[#0F766E]/30 flex items-center justify-center text-[#0F766E] font-bold text-sm shadow-sm">
          {user?.firstName ? `${user.firstName[0]}${user.lastName[0]}` : 'AU'}
        </div>
      </div>

      {/* Elevated Large Balance Card */}
      <div className="bg-[#F9F6F1] rounded-2xl p-6 border border-[#EDE8E0] milky-shadow mb-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            Available Balance
          </span>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-[#78716C] hover:text-[#1C1917] transition-colors p-1"
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="mb-2">
          <p className="text-3xl sm:text-4xl font-extrabold text-[#1C1917] tracking-tight">
            {showBalance ? `₦${availableAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••••'}
          </p>
        </div>

        {balance?.pendingHolds && balance.pendingHolds > 0 ? (
          <p className="text-[11px] text-[#B45309] font-medium mt-1">
            ⚠️ ₦{balance.pendingHolds.toLocaleString()} in pending payout holds
          </p>
        ) : null}
      </div>

      {/* Three Prominent Quick Action Buttons in a Row: Fund • Send • Withdraw */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button
          onClick={onOpenFund}
          className="bg-[#FFFFFF] hover:bg-[#F9F6F1] border border-[#EDE8E0] milky-shadow p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center transition-transform group-hover:scale-105">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-[#1C1917]">Fund</span>
        </button>

        <button
          onClick={onOpenSend}
          className="bg-[#0F766E] hover:bg-[#0d6760] text-white milky-shadow p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center transition-transform group-hover:scale-105">
            <Send className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-white">Send</span>
        </button>

        <button
          onClick={onOpenWithdraw}
          className="bg-[#FFFFFF] hover:bg-[#F9F6F1] border border-[#EDE8E0] milky-shadow p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F9F6F1] text-[#1C1917] flex items-center justify-center transition-transform group-hover:scale-105 border border-[#EDE8E0]">
            <ArrowUpRight className="w-6 h-6 text-[#0F766E]" />
          </div>
          <span className="text-xs font-bold text-[#1C1917]">Withdraw</span>
        </button>
      </div>

      {/* Recent Activity Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#1C1917]">Recent Activity</h3>
          <button
            onClick={onSeeAllHistory}
            className="text-xs font-semibold text-[#0F766E] hover:text-[#0d6760] flex items-center space-x-1"
          >
            <span>See all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#EDE8E0] rounded-2xl p-8 text-center milky-shadow">
            <p className="text-xs text-[#78716C]">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.slice(0, 6).map((tx) => {
              const isDeposit = tx.type === 'DEPOSIT';
              const isWithdrawal = tx.type === 'WITHDRAWAL';

              return (
                <div
                  key={tx.id}
                  className="bg-[#FFFFFF] hover:bg-[#F9F6F1] border border-[#EDE8E0] p-3.5 rounded-2xl flex items-center justify-between milky-shadow transition-all"
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
                      <p className="text-xs font-bold text-[#1C1917]">{tx.description}</p>
                      <p className="text-[10px] text-[#78716C] mt-0.5">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </div>
    </div>
  );
};
