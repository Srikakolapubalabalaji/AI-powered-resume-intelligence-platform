'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Sun, Moon, Monitor, Bell, HelpCircle, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/resumes':         'My Resumes',
  '/ai-chat':         'Resume Optimizer',
  '/ats-checker':     'ATS Checker',
  '/ats-comparison':  'ATS Score Comparison',
  '/job-matcher':     'Job Matcher',
  '/suggestions':     'Suggestions',
  '/templates':       'Templates',
  '/cover-letter':    'Cover Letter',
  '/saved-jobs':      'Saved Jobs',
  '/interview-coach': 'Interview Coach',
  '/history':         'History',
  '/settings':        'Settings',
};

type Theme = 'light' | 'dark' | 'system';

interface TopbarProps {
  onOpenTips?: () => void;
}

export default function Topbar({ onOpenTips }: TopbarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('light');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const title = PAGE_TITLES[pathname] || 'BAGUPADU';

  const applyTheme = (t: Theme, save = true) => {
    const root = document.documentElement;
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', t);
    }
    if (save) localStorage.setItem('bagupadu_theme', t);
  };

  useEffect(() => {
    const saved = localStorage.getItem('bagupadu_theme') as Theme | null;
    if (saved) {
      applyTheme(saved, false);
      setTimeout(() => {
        setTheme(saved);
      }, 0);
    }
  }, []);

  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    applyTheme(next);
    toast(`Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`, { icon: next === 'dark' ? '🌙' : next === 'system' ? '💻' : '☀️' });
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <header className="app-topbar">
      {/* Page title */}
      <h1 className="topbar-title">{title}</h1>

      {/* Greeting on dashboard */}
      {pathname === '/dashboard' && user && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginRight: 8 }}>
          Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user.name?.split(' ')[0]}</strong> 👋
        </p>
      )}

      {/* Search */}
      <div className="topbar-search">
        <Search size={14} color="var(--text-muted)" />
        <input
          placeholder="Search resumes, jobs..."
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchVal.trim()) {
              toast(`Searching for "${searchVal}"...`);
            }
          }}
        />
      </div>

      <div className="topbar-actions">
        {/* Tips */}
        <button
          id="tips-btn"
          className="topbar-icon-btn"
          onClick={onOpenTips}
          title="Tips & Onboarding"
        >
          <HelpCircle size={17} />
        </button>

        {/* Notifications */}
        <button className="topbar-icon-btn" style={{ position: 'relative' }} title="Notifications"
          onClick={() => toast('3 new notifications')}>
          <Bell size={17} />
          <span style={{
            position: 'absolute', top: 5, right: 5, width: 7, height: 7,
            borderRadius: '50%', background: '#e74c3c', border: '1.5px solid var(--bg-topbar)'
          }} />
        </button>

        {/* AI Chat quick access */}
        <button
          id="ai-chat-btn"
          className="btn btn-primary btn-sm"
          style={{ fontSize: 12, gap: 5 }}
          onClick={() => router.push('/ai-chat')}
        >
          <span style={{ fontSize: 13 }}>✨</span>
          Resume Optimizer
        </button>

        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          className="topbar-icon-btn"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={17} />
        </button>

        {/* Avatar / user menu */}
        <div style={{ position: 'relative' }}>
          <button
            id="user-avatar-btn"
            className="topbar-avatar"
            onClick={() => setShowUserMenu(v => !v)}
            title={user?.name}
          >
            {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || '?'}
          </button>

          {showUserMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowUserMenu(false)} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                borderRadius: 12, boxShadow: 'var(--shadow-lg)', width: 200, zIndex: 999,
                padding: '6px', animation: 'scaleIn 0.15s ease'
              }}>
                <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{user?.name}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{user?.email}</p>
                  {user?.isDemo && (
                    <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>DEMO</span>
                  )}
                </div>
                {[
                  { icon: User, label: 'Profile', href: '/settings?tab=profile' },
                  { icon: Settings, label: 'Settings', href: '/settings' },
                ].map(({ icon: Icon, label, href }) => (
                  <button key={label} onClick={() => { router.push(href); setShowUserMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 4, paddingTop: 4 }}>
                  <button onClick={handleLogout}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, color: 'var(--error)', fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--error-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
