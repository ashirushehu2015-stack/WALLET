import React, { useState } from 'react';
import { X, ArrowUpRight, Building2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { PINModal } from './PINModal';

interface WithdrawBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (details: { reference: string; amount: number; bankName: string; accountNumber: string }) => void;
}

const SAVED_BANKS = [
  { bankName: 'Guaranty Trust Bank (GTB)', bankCode: '058', accountNumber: '0123456789', accountName: 'Alex User' },
  { bankName: 'Access Bank', bankCode: '044', accountNumber: '0011223344', accountName: 'Alex User' },
  { bankName: 'Zenith Bank', bankCode: '057', accountNumber: '2233445566', accountName: 'Alex User' },
];

export const WithdrawBottomSheet: React.FC<WithdrawBottomSheetProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [amount, setAmount] = useState('');
  const [isPinOpen, setIsPinOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentBank = SAVED_BANKS[selectedBankIdx];
  const platformFee = 100.0;

  const handleProceedReview = () => {
    setError('');
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a payout amount greater than 0.');
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
      const res = await api.withdraw({
        bankName: currentBank.bankName,
        bankCode: currentBank.bankCode,
        accountNumber: currentBank.accountNumber,
        accountName: currentBank.accountName,
        amount: num,
      });

      onSuccess({
        reference: res.data?.paystackTransferCode || `TRF-${Date.now()}`,
        amount: num,
        bankName: currentBank.bankName,
        accountNumber: currentBank.accountNumber,
      });

      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Withdrawal failed.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('form');
    setAmount('');
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
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">Withdraw Funds</h3>
                  <p className="text-xs text-[#78716C]">Outward bank transfer to your linked account</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-[#B91C1C]/10 border border-[#B91C1C]/30 rounded-xl flex items-center space-x-2 text-[#B91C1C] text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Select Bank Account */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Destination Bank Account
                </label>
                <div className="space-y-2">
                  {SAVED_BANKS.map((b, idx) => (
                    <div
                      key={b.accountNumber}
                      onClick={() => setSelectedBankIdx(idx)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedBankIdx === idx
                          ? 'bg-[#CCFBF1] border-[#0F766E] text-[#0F766E]'
                          : 'bg-[#F9F6F1] border-[#EDE8E0] text-[#1C1917] hover:bg-[#EDE8E0]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FFFFFF] border border-[#EDE8E0] flex items-center justify-center text-xs">
                          <Building2 className="w-5 h-5 text-[#0F766E]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{b.bankName}</p>
                          <p className="text-[11px] text-[#78716C] font-mono">
                            {b.accountNumber} • {b.accountName}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout Amount */}
              <div className="mb-6">
                <label className="block text-[12px] font-semibold text-[#78716C] uppercase tracking-wider mb-2">
                  Withdrawal Amount (NGN)
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
                <p className="text-[11px] text-[#78716C] mt-1.5 font-medium">
                  💡 Platform Fee: ₦100.00 | Total Required Deduction: ₦
                  {(parseFloat(amount || '0') + platformFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <button
                onClick={handleProceedReview}
                className="w-full h-14 bg-[#0F766E] hover:bg-[#0d6760] text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-base"
              >
                <span>Review Withdrawal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1C1917]">Review Withdrawal Details</h3>
                <p className="text-xs text-[#78716C]">Outward 2-Phase Hold & Paystack Commitment</p>
              </div>

              <div className="bg-[#F9F6F1] p-5 rounded-2xl border border-[#EDE8E0] space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Destination Bank</span>
                  <span className="font-bold text-[#1C1917]">{currentBank.bankName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Account Number</span>
                  <span className="font-mono text-[#1C1917]">{currentBank.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Payout Amount</span>
                  <span className="font-bold text-[#1C1917]">₦{parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Platform Withdrawal Fee</span>
                  <span className="font-bold text-[#1C1917]">₦100.00</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#78716C]">Estimated Delivery</span>
                  <span className="font-bold text-[#15803D]">Instant (Within 60s)</span>
                </div>
                <div className="pt-2 border-t border-[#EDE8E0] flex justify-between items-center">
                  <span className="text-xs font-semibold text-[#1C1917]">Total Deduction</span>
                  <span className="text-xl font-extrabold text-[#0F766E]">
                    ₦{(parseFloat(amount) + platformFee).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
                    <span>Authorize Payout with PIN</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setStep('form')}
                className="w-full mt-3 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] py-2"
              >
                ← Edit amount
              </button>
            </div>
          )}
        </div>
      </div>

      <PINModal
        isOpen={isPinOpen}
        title="Authorize Withdrawal"
        subtitle={`Confirm ₦${(parseFloat(amount || '0') + platformFee).toLocaleString()} payout`}
        onClose={() => setIsPinOpen(false)}
        onConfirm={handleConfirmPIN}
      />
    </>
  );
};
