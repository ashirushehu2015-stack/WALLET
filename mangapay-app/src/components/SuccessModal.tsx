import React from 'react';
import { CheckCircle2, X, Share2, ArrowRight } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  amount: number;
  subtitle: string;
  reference?: string;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  title,
  amount,
  subtitle,
  reference,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sheet-overlay p-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 animate-slide-up milky-shadow-lg relative border border-[#EDE8E0] text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#78716C] hover:text-[#1C1917] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-[#CCFBF1] text-[#15803D] flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-extrabold text-[#1C1917] tracking-tight">{title}</h3>
        <p className="text-xs text-[#78716C] mt-1 mb-4">{subtitle}</p>

        <div className="bg-[#F9F6F1] p-4 rounded-2xl border border-[#EDE8E0] mb-6">
          <p className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1">Total Amount</p>
          <p className="text-3xl font-extrabold text-[#0F766E]">
            ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
          {reference && (
            <p className="text-[10px] text-[#A8A29E] font-mono mt-2 pt-2 border-t border-[#EDE8E0]">
              Ref: {reference}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full h-13 bg-[#0F766E] hover:bg-[#0d6760] text-white font-bold rounded-xl transition-all shadow-soft flex items-center justify-center space-x-2 text-sm"
        >
          <span>Done</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
