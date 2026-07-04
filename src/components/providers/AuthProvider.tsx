'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  location?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  preferences?: {
    theme: string;
    default_template: string;
    writing_tone: string;
    currency: string;
    notifications: {
      resumeUpdates: boolean;
      jobMatches: boolean;
      appReminders: boolean;
      productUpdates: boolean;
    };
  };
  isDemo?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER: User = {
  id: 'demo-001',
  name: 'Demo User',
  email: 'demo@bagupadu.io',
  avatar: 'DU',
  location: '',
  plan: 'free',
  preferences: {
    theme: 'light',
    default_template: 'Modern Professional',
    writing_tone: 'Professional',
    currency: 'USD',
    notifications: { resumeUpdates: true, jobMatches: true, appReminders: false, productUpdates: true },
  },
  isDemo: true,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bagupadu_user');
    setTimeout(() => {
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {}
      }
      setIsLoading(false);
    }, 0);
  }, []);

  const persist = (u: User | null) => {
    if (u) localStorage.setItem('bagupadu_user', JSON.stringify(u));
    else localStorage.removeItem('bagupadu_user');
  };

  const login = async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 900));
    if (password.length < 4) throw { response: { data: { error: 'Invalid credentials' } } };
    const namePart = email.split('@')[0];
    const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._-]/g, ' ');
    const u: User = {
      id: `user-${Date.now()}`,
      name, email,
      avatar: name.slice(0, 2).toUpperCase(),
      plan: 'free',
      preferences: DEMO_USER.preferences,
    };
    setUser(u);
    persist(u);
  };

  const loginDemo = async () => {
    await new Promise(r => setTimeout(r, 600));
    setUser(DEMO_USER);
    persist(DEMO_USER);
  };

  const logout = () => {
    setUser(null);
    persist(null);
    localStorage.removeItem('bagupadu_tips_seen');
  };

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    persist(updated);
    // Sync to API
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(updates),
      });
    } catch {}
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, loginDemo, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
