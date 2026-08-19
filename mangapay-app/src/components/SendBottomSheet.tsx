import React, { useState } from 'react';
import { X, Send, Search, UserCheck, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { PINModal } from './PINModal';

interface SendBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (details: { reference: string; amount: number; recipientName: string }) => void;
}

const DEMO_CONTACTS = [
  { walletNumber: '8877665544', name: 'Bob Recipient', phone: '08033334444' },
  { walletNumber: '9911223344', name: 'Alice Sender', phone: '08011112222' },
  { walletNumber: '7766554433', name: 'HoldCommit Tester', phone: '08099881122' },
];

export const SendBottomSheet: React.FC<SendBottomSheetProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [recipientWallet, setRecipientWallet] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectContact = (c: { walletNumber: string; name: string }) => {
    setRecipientWallet(c.walletNumber);
    setRecipientName(c.name);
  };

  const handleProceedReview = () => {
    setError('');
    const num = parseFloat(amount);
    if (!recipientWallet || isNaN(num) || num <= 0) {
      setError('Please select a recipient wallet and enter an amount greater than 0.');
      return;
    }
    setStep('review');
  };

  const handleConfirmPIN = async () => {
    setIsPinOpen(false);
    setLoading(true);
    setError('');

    const num = parseFloat(amount);
    try {
      const res = await api.sendP2P({
        recipientWalletNumber: recipientWallet.trim(),
        amount: num,
        narration: narration.trim() || undefined,
      });

      onSuccess({
        reference: res.data?.reference || `P2P-${Date.now()}`,
        amount: num,
        recipientName: res.data?.recipientName || recipientName || 'MangaPay User',
      });

      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Transfer failed.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('form');
    setRecipientWallet('');
    setRecipientName('');
    setAmount('');
    setNarration('');
    setError('');
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sheet-overlay">
        <div className="w-full max-w-md bg-[#FFFFFF] rounded-t-[24px] p-6 sm:p-8 animate-slide-up milky-shadow-lg relative border-t border-[#EDE8E0] max-h-[90vh] overflow-y-auto">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 text-[#78716C] hover:text-[#1C1917] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-1.5 bg-[#EDE8E0] rounded-full mx-auto mb-6"></div>

          {step === 'form' ? (
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">Send Money</h3>
                  <p className="text-xs text-[#78716C]">Instant zero-fee MangaPay P2P transfer</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-[#B91C1C]/10 border border-[#B91C1C]/30 rounded-xl flex items-center space-x-2 text-[#B91C1C] text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Quick Contact Selection */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Frequent Recipients
                </label>
                <div className="space-y-2">
                  {DEMO_CONTACTS.map((c) => (
                    <div
                      key={c.walletNumber}
                      onClick={() => handleSelectContact(c)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        recipientWallet === c.walletNumber
                          ? 'bg-[#CCFBF1] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#F9F6F1] border-[#EDE8E0] text-[#1C1917] hover:bg-[#EDE8E0]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#EDE8E0] flex items-center justify-center text-xs font-bold">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{c.name}</p>
                          <p className="text-[10px] text-[#78716C] font-mono">#{c.walletNumber}</p>
                        </div>
                      </div>
                      {recipientWallet === c.walletNumber && <UserCheck className="w-4 h-4 text-[#0F766E]" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recipient Input */}
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Recipient Wallet Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8877665544"
                  value={recipientWallet}
                  onChange={(e) => {
                    setRecipientWallet(e.target.value);
                    setRecipientName('');
                  }}
                  className="w-full h-13 bg-[#F9F6F1] border border-[#EDE8E0] rounded-xl px-4 text-sm font-mono text-[#1C1917] focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Transfer Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-bold text-[#1C1917]">₦</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-13 bg-[#F9F6F1] border border-[#EDE8E0] rounded-xl pl-9 pr-4 text-lg font-bold text-[#1C1917] focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lunch money"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full h-13 bg-[#F9F6F1] border border-[#EDE8E0] rounded-xl px-4 text-sm text-[#1C1917] focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <button
                onClick={handleProceedReview}
                className="w-full h-14 bg-[#0F766E] hover:bg-[#0d6760] text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-base"
              >
                <span>Review Transfer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1C1917]">Review Transfer Details</h3>
                <p className="text-xs text-[#78716C]">Double check parameters before PIN authorization</p>
              </div>

              <div className="bg-[#F9F6F1] p-5 rounded-2xl border border-[#EDE8E0] space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Recipient Name</span>
                  <span className="font-bold text-[#1C1917]">{recipientName || 'MangaPay User'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Wallet Number</span>
                  <span className="font-mono text-[#1C1917]">#{recipientWallet}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Transfer Fee</span>
                  <span className="font-bold text-[#15803D]">₦0.00 (Free)</span>
                </div>
                <div className="pt-2 border-t border-[#EDE8E0] flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#1C1917]">Total Amount</span>
                  <span className="text-xl font-extrabold text-[#0F766E]">
                    ₦{parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsPinOpen(true)}
                disabled={loading}
                className="w-full h-14 bg-[#0F766E] hover:bg-[#0d6760] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-base"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Confirm & Enter PIN</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setStep('form')}
                className="w-full mt-3 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] py-2"
              >
                ← Edit details
              </button>
            </div>
          )}
        </div>
      </div>

      <PINModal
        isOpen={isPinOpen}
        title="Authorize Transfer"
        subtitle={`Confirm ₦${parseFloat(amount || '0').toLocaleString()} transfer`}
        onClose={() => setIsPinOpen(false)}
        onConfirm={handleConfirmPIN}
      />
    </>
  );
};
