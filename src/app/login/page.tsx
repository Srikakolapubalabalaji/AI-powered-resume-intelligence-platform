'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, Zap, ArrowRight, GitBranch, Globe, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      toast.success('Welcome to BAGUPADU demo!');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to load demo. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-secondary)' }}>
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(108,92,231,0.12)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(162,155,254,0.08)', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '22px', fontWeight: 800, color: 'white', fontFamily: 'Outfit, sans-serif' }}>BAGUPADU</span>
          </div>

          <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Land Your<br />Dream Job Faster
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '40px' }}>
            AI-powered resume builder with ATS optimization, job matching, and interview coaching — everything you need to get hired.
          </p>

          {['✅ ATS Score Optimization', '🤖 Multi-LLM AI Chat Builder', '💼 Smart Job Matching', '🎤 Interview Coach'].map((f, i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', animation: `fadeIn 0.4s ease ${0.1 * i + 0.2}s both` }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{f}</span>
            </div>
          ))}

          <div style={{ marginTop: '48px', padding: '20px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Trusted by job seekers at</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Google · Meta · Amazon · Netflix · Apple</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.5s ease 0.1s both' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Sign in to your BAGUPADU account
          </p>

          <button
            id="demo-login-btn"
            onClick={handleDemo}
            disabled={demoLoading}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '20px', padding: '12px', borderRadius: 10, borderColor: 'rgba(108,92,231,0.3)', background: 'rgba(108,92,231,0.08)' }}
          >
            <span style={{ fontSize: '16px' }}>⚡</span>
            {demoLoading ? 'Loading demo...' : 'Try Demo — No signup needed'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Email</label>
              <input
                id="email-input"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer' }}>Forgot password?</span>
            </div>

            <button id="signin-btn" type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up free
            </Link>
          </p>

          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            {[
              { icon: Globe, label: 'Google' },
              { icon: GitBranch, label: 'GitHub' },
              { icon: Link2, label: 'LinkedIn' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                id={`oauth-${label.toLowerCase()}`}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '9px' }}
                onClick={() => toast('OAuth integration requires API keys. Use Demo to explore!')}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
