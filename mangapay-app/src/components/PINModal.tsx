import React, { useState } from 'react';
import { X, Fingerprint, Lock, Delete } from 'lucide-react';

interface PINModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const PINModal: React.FC<PINModalProps> = ({
  isOpen,
  title = 'Confirm Security PIN',
  subtitle = 'Enter your 4-digit PIN to authorize transaction',
  onClose,
  onConfirm,
}) => {
  const [pin, setPin] = useState<string[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = [...pin, num];
      setPin(nextPin);
      setError('');

      if (nextPin.length === 4) {
        // Auto authorize when 4 digits entered
        setTimeout(() => {
          setPin([]);
          onConfirm();
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleBiometric = () => {
    // Simulate TouchID / FaceID instant biometric verification
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sheet-overlay animate-fade-in">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 animate-slide-up milky-shadow-lg relative border border-[#EDE8E0]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#78716C] hover:text-[#1C1917] transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-[#1C1917] tracking-tight">{title}</h3>
          <p className="text-xs text-[#78716C] mt-1">{subtitle}</p>
        </div>

        {/* PIN Indicator Dots */}
        <div className="flex justify-center space-x-4 mb-8">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all border ${
                pin.length > idx
                  ? 'bg-[#0F766E] border-[#0F766E] scale-110'
                  : 'bg-[#F9F6F1] border-[#EDE8E0]'
              }`}
            ></div>
          ))}
        </div>

        {error && <p className="text-center text-xs text-[#B91C1C] font-semibold mb-4">{error}</p>}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => handleKeyPress(n)}
              className="h-14 bg-[#F9F6F1] hover:bg-[#EDE8E0] active:scale-95 text-[#1C1917] font-bold text-xl rounded-2xl transition-all flex items-center justify-center"
            >
              {n}
            </button>
          ))}

          <button
            onClick={handleBiometric}
            className="h-14 bg-[#CCFBF1] hover:bg-[#99F6E4] active:scale-95 text-[#0F766E] rounded-2xl transition-all flex items-center justify-center"
            title="Biometric Authentication"
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 bg-[#F9F6F1] hover:bg-[#EDE8E0] active:scale-95 text-[#1C1917] font-bold text-xl rounded-2xl transition-all flex items-center justify-center"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="h-14 bg-[#F9F6F1] hover:bg-[#EDE8E0] active:scale-95 text-[#78716C] rounded-2xl transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-[11px] text-[#A8A29E]">
          🔒 Secured by MangaPay 256-bit Hardware Security
        </p>
      </div>
    </div>
  );
};
