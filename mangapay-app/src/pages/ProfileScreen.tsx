import React, { useState } from 'react';
import { User, ShieldCheck, Lock, Fingerprint, Landmark, Headphones, LogOut, Copy, Check, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileScreenProps {
  user: UserProfile | null;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout }) => {
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [copiedDva, setCopiedDva] = useState(false);

  const handleCopyDva = () => {
    if (!user?.dva?.accountNumber) return;
    navigator.clipboard.writeText(user.dva.accountNumber);
    setCopiedDva(true);
    setTimeout(() => setCopiedDva(false), 2000);
  };

  return (
    <div className="pb-28 pt-4 px-4 sm:px-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">Account & Profile</h1>
        <p className="text-xs text-[#78716C] mt-0.5">Manage security, linked accounts, and wallet details</p>
      </div>

      {/* User Info Header Card */}
      <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#EDE8E0] milky-shadow mb-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#CCFBF1] text-[#0F766E] font-extrabold text-xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#0F766E]/30">
          {user?.firstName ? `${user.firstName[0]}${user.lastName[0]}` : 'AU'}
        </div>
        <h2 className="text-lg font-bold text-[#1C1917]">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-xs text-[#78716C] mt-0.5">{user?.email}</p>
        <div className="inline-flex items-center space-x-1 bg-[#CCFBF1] text-[#0F766E] text-[11px] font-bold px-3 py-1 rounded-full mt-3 border border-[#0F766E]/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tier 1 KYC Verified</span>
        </div>
      </div>

      {/* Dedicated Virtual Account Card */}
      <div className="bg-[#F9F6F1] rounded-2xl p-5 border border-[#EDE8E0] milky-shadow mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
            Automated Deposit Bank Account
          </span>
          <span className="text-[10px] bg-[#CCFBF1] text-[#0F766E] px-2.5 py-0.5 rounded-full font-bold">
            Paystack DVA
          </span>
        </div>

        {user?.dva ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#1C1917]">{user.dva.bankName}</p>
              <p className="text-lg font-mono font-extrabold text-[#0F766E] tracking-wider mt-0.5">
                {user.dva.accountNumber}
              </p>
              <p className="text-[10px] text-[#78716C]">{user.dva.accountName}</p>
            </div>
            <button
              onClick={handleCopyDva}
              className="flex items-center space-x-1 bg-[#FFFFFF] hover:bg-[#EDE8E0] text-[#1C1917] border border-[#EDE8E0] px-3 py-2 rounded-xl text-xs font-bold transition-all"
            >
              {copiedDva ? <Check className="w-4 h-4 text-[#15803D]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedDva ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ) : (
          <div className="text-xs text-[#78716C]">Wema Bank (Paystack Automated Channel)</div>
        )}
      </div>

      {/* Security & Settings Menu */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#EDE8E0] milky-shadow divide-y divide-[#EDE8E0] mb-6">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F9F6F1] text-[#0F766E] flex items-center justify-center border border-[#EDE8E0]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917]">4-Digit Transaction PIN</p>
              <p className="text-[10px] text-[#78716C]">Required for transfers & payouts</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#0F766E]">Active</span>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F9F6F1] text-[#0F766E] flex items-center justify-center border border-[#EDE8E0]">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917]">Biometric Authentication</p>
              <p className="text-[10px] text-[#78716C]">Face ID / Touch ID confirmation</p>
            </div>
          </div>
          <button
            onClick={() => setBiometricsEnabled(!biometricsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              biometricsEnabled ? 'bg-[#0F766E]' : 'bg-[#EDE8E0]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 ${
                biometricsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>

        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F9F6F1] transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F9F6F1] text-[#0F766E] flex items-center justify-center border border-[#EDE8E0]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917]">Linked Bank Accounts</p>
              <p className="text-[10px] text-[#78716C]">3 accounts connected</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#78716C]" />
        </div>

        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F9F6F1] transition-colors">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#F9F6F1] text-[#0F766E] flex items-center justify-center border border-[#EDE8E0]">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1C1917]">Help & Support</p>
              <p className="text-[10px] text-[#78716C]">24/7 Priority Support Chat</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#78716C]" />
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full h-13 bg-[#FFFFFF] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#EDE8E0] font-bold rounded-2xl transition-all milky-shadow flex items-center justify-center space-x-2 text-xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of MangaPay</span>
      </button>
    </div>
  );
};
