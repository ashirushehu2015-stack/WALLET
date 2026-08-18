import React, { useState } from 'react';
import { X, ArrowUpRight, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { api } from '../services/api';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Guaranty Trust Bank (GTB)', code: '058' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'OPay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
];

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTB)');
  const [bankCode, setBankCode] = useState('058');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleBankSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = NIGERIAN_BANKS.find((b) => b.name === e.target.value);
    if (selected) {
      setBankName(selected.name);
      setBankCode(selected.code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount);
    if (!accountNumber || accountNumber.length < 10 || !accountName || isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide complete bank account details and amount.');
      return;
    }

    setLoading(true);
    try {
      await api.requestWithdrawal({
        bankName,
        bankCode,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        amount: numAmount,
      });

      setSuccessMsg(`Withdrawal of ₦${numAmount.toLocaleString()} initiated! Status is PROCESSING.`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setAccountNumber('');
        setAccountName('');
        setAmount('');
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Withdrawal failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-700/60">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Withdraw to Bank</h3>
            <p className="text-xs text-slate-400">Outward 2-Phase Bank Payout (₦100 fee)</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-2 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-2 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Select Destination Bank
            </label>
            <select
              value={bankName}
              onChange={handleBankSelect}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              {NIGERIAN_BANKS.map((b) => (
                <option key={b.code} value={b.name} className="bg-slate-900 text-white">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Account Number (10 Digits)
            </label>
            <input
              type="text"
              placeholder="0123456789"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Account Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Payout Amount (NGN)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              💡 Platform Payout Fee: ₦100.00. Required Total: ₦
              {(parseFloat(amount || '0') + 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw to Bank</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
