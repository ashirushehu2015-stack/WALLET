import React from 'react';
import { Home, History, User } from 'lucide-react';
import { TabType } from '../types';

interface BottomTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#FFFFFF] border-t border-[#EDE8E0] px-6 py-3 flex items-center justify-around z-40 shadow-card">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onSelectTab(t.id)}
            className={`flex flex-col items-center space-y-1 transition-all py-1 px-4 rounded-2xl ${
              isActive ? 'text-[#0F766E]' : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#CCFBF1]' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#0F766E]' : 'text-[#78716C]'}`} />
            </div>
            <span className={`text-[12px] font-semibold tracking-tight ${isActive ? 'text-[#0F766E]' : 'text-[#78716C]'}`}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
