import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [recipientWalletNumber, setRecipientWalletNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount);
    if (!recipientWalletNumber || isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid recipient wallet number and amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendP2PTransfer({
        recipientWalletNumber: recipientWalletNumber.trim(),
        amount: numAmount,
        narration: narration.trim() || undefined,
      });

      setSuccessMsg(`Transfer of ₦${numAmount.toLocaleString()} to ${res.data.recipientName} successful!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setRecipientWalletNumber('');
        setAmount('');
        setNarration('');
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Transfer failed.');
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
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Send Money (P2P)</h3>
            <p className="text-xs text-slate-400">Instant internal wallet-to-wallet transfer</p>
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
              Recipient Wallet Number
            </label>
            <input
              type="text"
              placeholder="e.g. 1089283741"
              value={recipientWalletNumber}
              onChange={(e) => setRecipientWalletNumber(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Amount (NGN)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Narration / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner refund"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transfer Funds Instantly</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
