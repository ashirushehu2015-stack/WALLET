import React, { useState } from 'react';
import { X, ArrowDownLeft, CreditCard, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface FundBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

export const FundBottomSheet: React.FC<FundBottomSheetProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'paystack'>('amount');
  const [cardNumber, setCardNumber] = useState('5399 •••• •••• 4210');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('882');

  if (!isOpen) return null;

  const quickChips = [1000, 5000, 10000, 20000];

  const handleSelectChip = (chipAmt: number) => {
    setSelectedChip(chipAmt);
    setAmount(chipAmt.toString());
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setSelectedChip(null);
  };

  const handleProceedToPaystack = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setStep('paystack');
  };

  const handlePaystackFund = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    setLoading(true);
    try {
      await api.fundWallet({ amount: num });
      setTimeout(() => {
        onSuccess(num);
        handleClose();
      }, 1200);
    } catch (err) {
      console.error('Funding failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('amount');
    setAmount('');
    setSelectedChip(null);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sheet-overlay">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-t-[24px] p-6 sm:p-8 animate-slide-up milky-shadow-lg relative border-t border-[#EDE8E0] max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-[#78716C] hover:text-[#1C1917] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-1.5 bg-[#EDE8E0] rounded-full mx-auto mb-6"></div>

        {step === 'amount' ? (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">Fund Wallet</h3>
                <p className="text-xs text-[#78716C]">Instant funding via Paystack Payment Sheet</p>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="mb-6">
              <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                Quick Select
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSelectChip(chip)}
                    className={`py-2.5 rounded-xl font-semibold text-xs transition-all border ${
                      selectedChip === chip
                        ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm'
                        : 'bg-[#F9F6F1] text-[#1C1917] border-[#EDE8E0] hover:bg-[#EDE8E0]'
                    }`}
                  >
                    ₦{(chip / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6">
              <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                Deposit Amount (NGN)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-lg font-bold text-[#1C1917]">₦</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full h-14 bg-[#F9F6F1] border border-[#EDE8E0] rounded-xl pl-9 pr-4 text-xl font-bold text-[#1C1917] focus:outline-none focus:border-[#0F766E] transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleProceedToPaystack}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full h-14 bg-[#0F766E] hover:bg-[#0d6760] disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-base"
            >
              <span>Continue to Payment</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">Paystack Gateway</h3>
                <p className="text-xs text-[#78716C]">Secure 256-bit SSL Payment</p>
              </div>
            </div>

            <div className="bg-[#F9F6F1] p-4 rounded-2xl border border-[#EDE8E0] mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#78716C]">Funding Amount</span>
                <span className="text-lg font-extrabold text-[#0F766E]">
                  ₦{parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#78716C]">
                <span>Gateway Fee</span>
                <span className="text-[#15803D] font-semibold">FREE</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full h-12 bg-[#FFFFFF] border border-[#EDE8E0] rounded-xl px-4 text-sm font-mono text-[#1C1917]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full h-12 bg-[#FFFFFF] border border-[#EDE8E0] rounded-xl px-4 text-sm font-mono text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1">
                    CVV
                  </label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full h-12 bg-[#FFFFFF] border border-[#EDE8E0] rounded-xl px-4 text-sm font-mono text-[#1C1917]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handlePaystackFund}
              disabled={loading}
              className="w-full h-14 bg-[#0F766E] hover:bg-[#0d6760] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Authorize ₦{parseFloat(amount).toLocaleString()} Payment</span>
                </>
              )}
            </button>

            <button
              onClick={() => setStep('amount')}
              className="w-full mt-3 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] py-2"
            >
              ← Back to amount
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
