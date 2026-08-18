import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import { UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('payvault_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserProfile = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getProfile();
      setUser(data.user);
    } catch (err) {
      console.error('Session expired or invalid token');
      localStorage.removeItem('payvault_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [token]);

  const handleAuthSuccess = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('payvault_token');
    setToken(null);
    setUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Securing session...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return view === 'login' ? (
      <Login
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={() => setView('register')}
      />
    ) : (
      <Register
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={() => setView('login')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16]">
      <Navbar user={user} onLogout={handleLogout} />
      <main>
        <Dashboard user={user} onRefreshProfile={fetchUserProfile} />
      </main>
    </div>
  );
};

export default App;
