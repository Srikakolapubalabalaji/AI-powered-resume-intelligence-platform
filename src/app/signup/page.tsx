'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Eye, EyeOff, Zap, ArrowRight, User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Account created! Welcome to BAGUPADU 🎉');
      router.push('/dashboard');
    } catch {
      toast.error('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#ff7675', '#fdcb6e', '#00b894'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Left branding */}
      <div style={{
        flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'rgba(108,92,231,0.1)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(162,155,254,0.07)', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={22} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '22px', fontWeight: 800, color: 'white', fontFamily: 'Outfit, sans-serif' }}>BAGUPADU</span>
          </div>

          <h2 style={{ fontSize: '34px', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Your Career<br />Starts Here
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '40px' }}>
            Join thousands of professionals who have landed their dream jobs with our AI-powered tools.
          </p>

          {[
            { emoji: '🚀', title: 'Get hired 3x faster', sub: 'With ATS-optimized resumes' },
            { emoji: '🧠', title: 'AI-powered builder', sub: 'Powered by GPT-4, Claude & more' },
            { emoji: '🎯', title: 'Smart job matching', sub: 'Personalized job recommendations' },
          ].map(({ emoji, title, sub }, i) => (
            <div key={title} style={{ display: 'flex', gap: '14px', marginBottom: '20px', animation: `fadeIn 0.4s ease ${0.1 * i + 0.2}s both` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,92,231,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>{emoji}</div>
              <div>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{title}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'var(--bg-primary)' }}>
        <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.5s ease 0.1s both' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>Create your account</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '14px' }}>
            Free forever. No credit card required.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="signup-name"
                  type="text"
                  className="input"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="signup-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ paddingLeft: '40px' }}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingLeft: '40px', paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength */}
              {form.password.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor[strength] : 'var(--border-color)', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'var(--text-secondary)' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="signup-confirm"
                  type="password"
                  className="input"
                  placeholder="Confirm your password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  style={{ paddingLeft: '40px', borderColor: form.confirm && form.confirm !== form.password ? 'var(--error)' : undefined }}
                />
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              By signing up, you agree to our{' '}
              <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Terms of Service</span>
              {' '}and{' '}
              <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            <button id="signup-submit-btn" type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
