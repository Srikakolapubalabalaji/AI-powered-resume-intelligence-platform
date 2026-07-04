'use client';
import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import OnboardingTips from '@/components/OnboardingTips';

export default function AppWrapper({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      const seen = localStorage.getItem('bagupadu_tips_seen');
      if (!seen) {
        setTimeout(() => setTipsOpen(true), 800);
        localStorage.setItem('bagupadu_tips_seen', '1');
      }
    }
  }, [user]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar onOpenTips={() => setTipsOpen(true)} />
        <main className="app-content">
          {children}
        </main>
      </div>
      <OnboardingTips open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </div>
  );
}
