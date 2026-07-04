'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, FileText, MessageSquare, Target,
  Briefcase, LayoutTemplate, Mail, Bookmark, Mic, Settings,
  History, Plus, Crown, ChevronRight, Database
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

const NAV_MAIN = [
  { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/resumes',         icon: FileText,        label: 'Resumes' },
  { href: '/ai-chat',         icon: Zap,             label: 'Resume Optimizer', badge: 'AI' },
  { href: '/ats-checker',     icon: Target,          label: 'ATS Checker' },
  { href: '/job-matcher',     icon: Database,        label: 'Job Intelligence', badge: 'NEW' },
  { href: '/templates',       icon: LayoutTemplate,  label: 'Templates' },
  { href: '/cover-letter',    icon: Mail,            label: 'Cover Letter' },
  { href: '/saved-jobs',      icon: Bookmark,        label: 'Saved Jobs' },
  { href: '/interview-coach', icon: Mic,             label: 'Interview Coach' },
];

const NAV_ACCOUNT = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/history',  icon: History,  label: 'History' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" strokeWidth={2.5} />
        </div>
        <span className="sidebar-logo-text">BAGUPADU</span>
      </div>

      {/* New Resume CTA */}
      <div className="sidebar-new-btn">
        <Link href="/resumes?new=1" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
          <Plus size={15} strokeWidth={2.5} />
          New Resume
        </Link>
      </div>

      {/* Main Nav */}
      <div className="sidebar-nav">
        <p className="sidebar-section-label">Main</p>
        {NAV_MAIN.map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-item${isActive(href) ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && (
              <span style={{
                fontSize: '9px', fontWeight: 700, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)',
                color: 'white', padding: '1px 6px', borderRadius: 4
              }}>{badge}</span>
            )}
            {isActive(href) && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
          </Link>
        ))}

        <p className="sidebar-section-label" style={{ marginTop: 8 }}>Account</p>
        {NAV_ACCOUNT.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`sidebar-item${isActive(href) ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
          </Link>
        ))}
      </div>

      {/* Upgrade to Pro */}
      <div className="sidebar-pro">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Crown size={16} color="#fdcb6e" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Upgrade to Pro</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
          Unlock unlimited AI generations, advanced templates &amp; priority support
        </p>
        <Link href="/settings?tab=billing" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
          Upgrade Now
        </Link>
        {user && (
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
            Current plan: <strong style={{ color: 'var(--text-secondary)' }}>Free</strong>
          </p>
        )}
      </div>

      {/* User */}
      {user && (
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="topbar-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
              {user.avatar || user.name?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {user.name}
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
