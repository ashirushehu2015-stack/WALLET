import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import { UserProfile, WalletBalanceData, TransactionRecord, TabType } from './types';
import { BottomTabs } from './components/BottomTabs';
import { FundBottomSheet } from './components/FundBottomSheet';
import { SendBottomSheet } from './components/SendBottomSheet';
import { WithdrawBottomSheet } from './components/WithdrawBottomSheet';
import { SuccessModal } from './components/SuccessModal';
import { HomeScreen } from './pages/HomeScreen';
import { HistoryScreen } from './pages/HistoryScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { Smartphone, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<WalletBalanceData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bottom Sheets & Success Modal States
  const [isFundOpen, setIsFundOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [successData, setSuccessData] = useState<{
    isOpen: boolean;
    title: string;
    amount: number;
    subtitle: string;
    reference?: string;
  }>({
    isOpen: false,
    title: '',
    amount: 0,
    subtitle: '',
  });

  const loadAppData = async () => {
    setLoading(true);
    try {
      // Auto register / login demo user if token is missing
      let token = localStorage.getItem('mangapay_token');
      if (!token) {
        try {
          const authRes = await api.login({
            email: 'alice.p2p@example.com',
            password: 'Password123!',
          });
          if (authRes.token) {
            token = authRes.token;
            localStorage.setItem('mangapay_token', authRes.token);
          }
        } catch {
          const regRes = await api.register({
            email: `alex_${Date.now()}@mangapay.app`,
            firstName: 'Alex',
            lastName: 'User',
            phoneNumber: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
            password: 'Password123!',
          });
          if (regRes.token) {
            token = regRes.token;
            localStorage.setItem('mangapay_token', regRes.token);
          }
        }
      }

      const [profileData, balData, txData] = await Promise.all([
        api.getProfile(),
        api.getBalance(),
        api.getTransactions({ limit: 15 }),
      ]);

      setUser(profileData);
      setBalance(balData);
      setTransactions(txData.transactions || []);
    } catch (err) {
      console.error('Failed to load MangaPay data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, []);

  const handleFundSuccess = (fundedAmount: number) => {
    setSuccessData({
      isOpen: true,
      title: 'Wallet Funded Successfully!',
      amount: fundedAmount,
      subtitle: 'Paystack deposit credited to your ledger available balance.',
    });
    loadAppData();
  };

  const handleSendSuccess = (details: { reference: string; amount: number; recipientName: string }) => {
    setSuccessData({
      isOpen: true,
      title: 'Money Sent!',
      amount: details.amount,
      subtitle: `Instant zero-fee transfer to ${details.recipientName}`,
      reference: details.reference,
    });
    loadAppData();
  };

  const handleWithdrawSuccess = (details: { reference: string; amount: number; bankName: string }) => {
    setSuccessData({
      isOpen: true,
      title: 'Withdrawal Initiated',
      amount: details.amount,
      subtitle: `Outward payout to ${details.bankName} is processing.`,
      reference: details.reference,
    });
    loadAppData();
  };

  const handleLogout = () => {
    localStorage.removeItem('mangapay_token');
    setUser(null);
    setBalance(null);
    setTransactions([]);
    loadAppData();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex justify-center selection:bg-[#CCFBF1]">
      {/* Mobile Device Frame Container */}
      <div className="w-full max-w-md bg-[#FDFBF7] min-h-screen relative flex flex-col border-x border-[#EDE8E0] shadow-soft">
        {/* Top Status Bar Indicator */}
        <div className="h-10 bg-[#FDFBF7] px-6 flex items-center justify-between text-[11px] font-bold text-[#78716C] border-b border-[#EDE8E0]/40 sticky top-0 z-30">
          <span>9:41</span>
          <div className="flex items-center space-x-1.5 text-[#0F766E]">
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[10px] tracking-wide uppercase">MangaPay 5G</span>
          </div>
        </div>

        {/* Main Content Screens */}
        <main className="flex-1">
          {loading && !user ? (
            <div className="py-32 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-[#78716C]">Loading MangaPay Wallet...</p>
            </div>
          ) : activeTab === 'home' ? (
            <HomeScreen
              user={user}
              balance={balance}
              transactions={transactions}
              onOpenFund={() => setIsFundOpen(true)}
              onOpenSend={() => setIsSendOpen(true)}
              onOpenWithdraw={() => setIsWithdrawOpen(true)}
              onSeeAllHistory={() => setActiveTab('history')}
            />
          ) : activeTab === 'history' ? (
            <HistoryScreen transactions={transactions} />
          ) : (
            <ProfileScreen user={user} onLogout={handleLogout} />
          )}
        </main>

        {/* Bottom Tab Bar */}
        <BottomTabs activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>

      {/* Bottom Sheets & Modals */}
      <FundBottomSheet
        isOpen={isFundOpen}
        onClose={() => setIsFundOpen(false)}
        onSuccess={handleFundSuccess}
      />
      <SendBottomSheet
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        onSuccess={handleSendSuccess}
      />
      <WithdrawBottomSheet
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={handleWithdrawSuccess}
      />
      <SuccessModal
        isOpen={successData.isOpen}
        title={successData.title}
        amount={successData.amount}
        subtitle={successData.subtitle}
        reference={successData.reference}
        onClose={() => setSuccessData((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default App;
