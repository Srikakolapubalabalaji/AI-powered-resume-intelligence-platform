'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  User, Crown, Settings, Bell, Link2, Shield, Database,
  Palette, Globe, Trash2, X, ChevronRight, CheckCircle, Sun, Moon, Monitor, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';

const SECTIONS = [
  { id: 'profile',      icon: User,      label: 'Profile' },
  { id: 'billing',      icon: Crown,     label: 'Plan & Billing' },
  { id: 'ai',           icon: Sparkles,  label: 'AI & API Settings' },
  { id: 'apify',        icon: Link2,     label: 'Apify Integration' },
  { id: 'prefs',        icon: Settings,  label: 'Preferences' },
  { id: 'notifs',       icon: Bell,      label: 'Notifications' },
  { id: 'integrations', icon: Link2,     label: 'Integrations' },
  { id: 'privacy',      icon: Shield,    label: 'Privacy & Security' },
  { id: 'data',         icon: Database,  label: 'Data & Export' },
  { id: 'appearance',   icon: Palette,   label: 'Appearance' },
  { id: 'language',     icon: Globe,     label: 'Language' },
];

type Theme = 'Light' | 'Dark' | 'System';

function SettingsContent() {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const [section, setSection] = useState(searchParams.get('tab') || 'profile');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [location, setLocation] = useState('San Francisco, CA');
  const [theme, setTheme] = useState<Theme>('Light');
  const [writingTone, setWritingTone] = useState('Professional');
  const [currency, setCurrency] = useState('USD');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [notifs, setNotifs] = useState({ resumeUpdates: true, jobMatches: true, appReminders: false, productUpdates: true });

  // AI & API States
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [activeLlm, setActiveLlm] = useState<'claude' | 'openai' | 'groq' | 'gemini'>('claude');
  const [apifyKey, setApifyKey] = useState('');
  const [apifyActorId, setApifyActorId] = useState('curious_coder~linkedin-jobs-scraper');
  const [appMode, setAppMode] = useState<'mock' | 'live'>('mock');
  const [apifyKeyConfigured, setApifyKeyConfigured] = useState(false);

  const [anthropicStatus, setAnthropicStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [openaiStatus, setOpenaiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [groqStatus, setGroqStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [apifyStatus, setApifyStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const [anthropicMsg, setAnthropicMsg] = useState('');
  const [openaiMsg, setOpenaiMsg] = useState('');
  const [groqMsg, setGroqMsg] = useState('');
  const [geminiMsg, setGeminiMsg] = useState('');
  const [apifyMsg, setApifyMsg] = useState('');

  // Sync user data after auth loads or db settings load
  useEffect(() => {
    if (user?.id) {
      fetch('/api/settings', {
        headers: { 'x-user-id': user.id }
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            const dbUser = json.data;
            if (dbUser.name) setName(dbUser.name);
            if (dbUser.email) setEmail(dbUser.email);
            if (dbUser.anthropic_key) setAnthropicKey(dbUser.anthropic_key);
            if (dbUser.openai_key) setOpenaiKey(dbUser.openai_key);
            if (dbUser.groq_key) setGroqKey(dbUser.groq_key);
            if (dbUser.gemini_key) setGeminiKey(dbUser.gemini_key);
            if (dbUser.active_llm) setActiveLlm(dbUser.active_llm);
            if (dbUser.apify_key) setApifyKey(dbUser.apify_key);
            if (dbUser.apify_actor_id) setApifyActorId(dbUser.apify_actor_id);
            if (dbUser.app_mode) setAppMode(dbUser.app_mode);
            setApifyKeyConfigured(!!dbUser.apify_key_configured);
            if (dbUser.apify_key_configured) {
              setApifyStatus('success');
              setApifyMsg('Apify API token is securely connected.');
            }
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'System') {
      root.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', t.toLowerCase());
    }
    localStorage.setItem('bagupadu_theme', t.toLowerCase());
    setTheme(t);
    toast.success(`Theme set to ${t}`);
  };

  const testConnection = async (provider: 'anthropic' | 'openai' | 'groq' | 'gemini' | 'apify', key: string) => {
    const setStatus = 
      provider === 'anthropic' ? setAnthropicStatus :
      provider === 'openai' ? setOpenaiStatus :
      provider === 'groq' ? setGroqStatus :
      provider === 'gemini' ? setGeminiStatus :
      setApifyStatus;
      
    const setMsg = 
      provider === 'anthropic' ? setAnthropicMsg :
      provider === 'openai' ? setOpenaiMsg :
      provider === 'groq' ? setGroqMsg :
      provider === 'gemini' ? setGeminiMsg :
      setApifyMsg;

    setStatus('testing');
    setMsg('');

    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo-001' },
        body: JSON.stringify({ provider, key }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus('success');
        setMsg(json.message || 'Connection successful!');
      } else {
        setStatus('error');
        setMsg(json.error || 'Connection failed.');
      }
    } catch {
      setStatus('error');
      setMsg('Network error: failed to reach connection endpoint.');
    }
  };

  const handleSaveKeys = async () => {
    try {
      await updateUser({
        // @ts-ignore
        anthropic_key: anthropicKey,
        // @ts-ignore
        openai_key: openaiKey,
        // @ts-ignore
        groq_key: groqKey,
        // @ts-ignore
        gemini_key: geminiKey,
        // @ts-ignore
        active_llm: activeLlm,
        // @ts-ignore
        apify_key: apifyKey,
        // @ts-ignore
        apify_actor_id: apifyActorId,
      });
      toast.success('API credentials saved successfully!');
    } catch {
      toast.error('Failed to save API credentials.');
    }
  };

  const handleSaveApifyKey = async () => {
    try {
      await updateUser({
        // @ts-ignore
        apify_key: apifyKey,
        // @ts-ignore
        apify_actor_id: apifyActorId,
      });
      setApifyKeyConfigured(apifyKey.trim() !== '' && apifyKey !== '••••••••••••••••');
      toast.success('Apify configuration saved successfully!');
    } catch {
      toast.error('Failed to save Apify settings.');
    }
  };

  const handleSaveMode = async (mode: 'mock' | 'live') => {
    try {
      setAppMode(mode);
      await updateUser({
        // @ts-ignore
        app_mode: mode
      });
      toast.success(`App Mode set to ${mode === 'live' ? 'Live AI Mode' : 'Simulated (Mock)'}`);
    } catch {
      toast.error('Failed to update App Mode.');
    }
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`toggle ${on ? 'on' : ''}`} />
  );

  const Row = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: desc ? 3 : 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 20 }}>{children}</div>
    </div>
  );

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 20, maxWidth: 900 }}>
      {/* Left nav */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Settings</p>
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setSection(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                background: section === id ? 'var(--primary-light)' : 'transparent',
                color: section === id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: section === id ? 600 : 400, fontSize: 13.5 }}
              onMouseEnter={e => { if (section !== id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (section !== id) e.currentTarget.style.background = 'transparent'; }}>
              <Icon size={15} />
              {label}
              {section === id && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: .5 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* PROFILE */}
        {section === 'profile' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Profile</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your personal information and account details</p>
            </div>
            <div className="card" style={{ padding: 24 }}>
              {/* Avatar */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'white', lineHeight: '72px' }}>
                  {user?.avatar || 'AJ'}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{name}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{email}</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => toast('Avatar upload — requires file storage integration')}>
                    Change Avatar
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="input-label">Full Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Email Address</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Location</label>
                  <input className="input" placeholder="City, Country" value={location} onChange={e => setLocation(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => toast.success('Profile saved!')}>
                  <CheckCircle size={15} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BILLING */}
        {section === 'billing' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Plan & Billing</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Manage your subscription and payment details</p>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Free Plan</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>5 AI generations/month · 1 resume · Basic templates</p>
                </div>
                <span className="badge badge-muted">Current Plan</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={() => toast('Redirecting to payment…')}>
                <Crown size={16} /> Upgrade to Pro — $12/month
              </button>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Pro Plan Includes</p>
              {['Unlimited AI resume generations', 'All premium templates', 'Priority support', 'Advanced ATS analysis', 'Voice interview coaching', 'LinkedIn & GitHub integrations'].map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={15} color="#00b894" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI SETTINGS */}
        {section === 'ai' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>AI & API Settings</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Configure your API integrations and application mode</p>
            
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={16} color="var(--primary)" /> App Mode Configuration
              </h3>
              <Row label="Execution Mode" desc="Choose whether to use simulated mock data or live AI calls (requires API keys)">
                <select className="select" style={{ width: 180 }} value={appMode} onChange={e => handleSaveMode(e.target.value as 'mock' | 'live')}>
                  <option value="mock">Simulated (Mock)</option>
                  <option value="live">Live AI Mode</option>
                </select>
              </Row>
              <Row label="Active LLM Provider" desc="Select the model provider that powers all AI-dependent features app-wide">
                <select className="select" style={{ width: 180 }} value={activeLlm} onChange={e => setActiveLlm(e.target.value as any)}>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="groq">Groq (Llama 3)</option>
                  <option value="gemini">Gemini (Google)</option>
                </select>
              </Row>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--primary)" /> Integration Credentials
              </h3>
              
              {/* Anthropic Claude */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 700 }}>Anthropic Claude API Key</label>
                  {anthropicStatus === 'success' && <span className="tag tag-success" style={{ fontSize: 11 }}>✓ Connected</span>}
                  {anthropicStatus === 'error' && <span className="tag tag-error" style={{ fontSize: 11 }}>✗ Connection Failed</span>}
                  {anthropicStatus === 'testing' && <span className="tag tag-muted" style={{ fontSize: 11 }}>Testing...</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="password" placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection('anthropic', anthropicKey)} disabled={anthropicStatus === 'testing'}>
                    Test
                  </button>
                </div>
                {anthropicMsg && <p style={{ fontSize: 11.5, color: anthropicStatus === 'success' ? '#00b894' : '#ff7675', marginTop: 6 }}>{anthropicMsg}</p>}
              </div>

              {/* OpenAI API Key */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 700 }}>OpenAI API Key</label>
                  {openaiStatus === 'success' && <span className="tag tag-success" style={{ fontSize: 11 }}>✓ Connected</span>}
                  {openaiStatus === 'error' && <span className="tag tag-error" style={{ fontSize: 11 }}>✗ Connection Failed</span>}
                  {openaiStatus === 'testing' && <span className="tag tag-muted" style={{ fontSize: 11 }}>Testing...</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="password" placeholder="sk-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection('openai', openaiKey)} disabled={openaiStatus === 'testing'}>
                    Test
                  </button>
                </div>
                {openaiMsg && <p style={{ fontSize: 11.5, color: openaiStatus === 'success' ? '#00b894' : '#ff7675', marginTop: 6 }}>{openaiMsg}</p>}
              </div>

              {/* Groq API Key */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 700 }}>Groq API Key</label>
                  {groqStatus === 'success' && <span className="tag tag-success" style={{ fontSize: 11 }}>✓ Connected</span>}
                  {groqStatus === 'error' && <span className="tag tag-error" style={{ fontSize: 11 }}>✗ Connection Failed</span>}
                  {groqStatus === 'testing' && <span className="tag tag-muted" style={{ fontSize: 11 }}>Testing...</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="password" placeholder="gsk_..." value={groqKey} onChange={e => setGroqKey(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection('groq', groqKey)} disabled={groqStatus === 'testing'}>
                    Test
                  </button>
                </div>
                {groqMsg && <p style={{ fontSize: 11.5, color: groqStatus === 'success' ? '#00b894' : '#ff7675', marginTop: 6 }}>{groqMsg}</p>}
              </div>

              {/* Gemini API Key */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 700 }}>Gemini API Key</label>
                  {geminiStatus === 'success' && <span className="tag tag-success" style={{ fontSize: 11 }}>✓ Connected</span>}
                  {geminiStatus === 'error' && <span className="tag tag-error" style={{ fontSize: 11 }}>✗ Connection Failed</span>}
                  {geminiStatus === 'testing' && <span className="tag tag-muted" style={{ fontSize: 11 }}>Testing...</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="password" placeholder="AIzaSy..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection('gemini', geminiKey)} disabled={geminiStatus === 'testing'}>
                    Test
                  </button>
                </div>
                {geminiMsg && <p style={{ fontSize: 11.5, color: geminiStatus === 'success' ? '#00b894' : '#ff7675', marginTop: 6 }}>{geminiMsg}</p>}
              </div>

              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleSaveKeys}>
                <CheckCircle size={15} /> Save API Credentials
              </button>
            </div>
          </div>
        )}

        {/* APIFY INTEGRATION */}
        {section === 'apify' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Apify Integration</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Configure your personal Apify account to enable live job scraping</p>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={16} color="var(--primary)" /> What is Apify?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                Apify is a web scraping and automation cloud platform. We use it to trigger automated browser scripts (Actors) that search major job sites in real-time. By connecting your own Apify account, your searches run directly on your own free monthly resource quota, ensuring maximum independence and scraping speed.
              </p>

              <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: 22 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Quick Setup Guide</h4>
                <ol style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 18 }}>
                  <li>Create a free account on <a href="https://apify.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Apify.com</a>.</li>
                  <li>In your Apify console, go to <strong>Settings → Integrations → API</strong>.</li>
                  <li>Copy your <strong>Personal API Token</strong>.</li>
                  <li>Paste the token into the input below.</li>
                  <li>Click <strong>Test Connection</strong> to verify, then click <strong>Save API Key</strong>.</li>
                </ol>
              </div>

              {!apifyKeyConfigured && (
                <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={15} /> Connect your Apify account to enable live job scraping.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: 700 }}>Apify API Token</label>
                  {apifyStatus === 'success' && <span className="tag tag-success" style={{ fontSize: 11 }}>✓ Connected</span>}
                  {apifyStatus === 'error' && <span className="tag tag-error" style={{ fontSize: 11 }}>✗ Connection Failed</span>}
                  {apifyStatus === 'testing' && <span className="tag tag-muted" style={{ fontSize: 11 }}>Testing...</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input className="input" type="password" placeholder="apify_api_..." value={apifyKey} onChange={e => setApifyKey(e.target.value)} style={{ flex: 1 }} />
                  <button className="btn btn-secondary btn-sm" onClick={() => testConnection('apify', apifyKey)} disabled={apifyStatus === 'testing'}>
                    Test Connection
                  </button>
                </div>
                {apifyMsg && <p style={{ fontSize: 11.5, color: apifyStatus === 'success' ? '#00b894' : '#ff7675', marginTop: 6 }}>{apifyMsg}</p>}
              </div>

              {/* Apify Actor ID */}
              <div style={{ marginBottom: 22, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <label className="input-label" style={{ fontWeight: 700 }}>LinkedIn Scraper Actor ID (Advanced)</label>
                <input className="input" placeholder="e.g. curious_coder~linkedin-jobs-scraper" value={apifyActorId} onChange={e => setApifyActorId(e.target.value)} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Optional. Left blank to use the default optimized matching scraper actor.</p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
                <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  Create Apify Account
                </a>
                <a href="https://console.apify.com/account#/integrations" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  Get API Key
                </a>
                <button className="btn btn-primary btn-sm" onClick={handleSaveApifyKey} disabled={apifyStatus === 'testing'}>
                  <CheckCircle size={13} /> Save API Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES */}
        {section === 'prefs' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Preferences</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Customize your BAGUPADU experience</p>
            <div className="card" style={{ padding: '0 20px' }}>
              <Row label="AI Writing Tone" desc="Default tone for AI-generated content">
                <select className="select" style={{ width: 160 }} value={writingTone} onChange={e => setWritingTone(e.target.value)}>
                  {['Professional', 'Casual', 'Confident', 'Enthusiastic', 'Formal'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="Default Currency" desc="Used for salary expectations">
                <select className="select" style={{ width: 100 }} value={currency} onChange={e => setCurrency(e.target.value)}>
                  {['USD', 'EUR', 'GBP', 'INR', 'CAD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Row>
              <Row label="Default Resume" desc="Resume used in new AI chat sessions">
                <select className="select" style={{ width: 200 }}>
                  <option>Software Engineer Resume</option>
                  <option>Full Stack Developer CV</option>
                </select>
              </Row>
              <Row label="Default Template" desc="Template applied to new resumes">
                <select className="select" style={{ width: 180 }}>
                  <option>Modern Professional</option>
                  <option>Clean Professional</option>
                  <option>Minimal</option>
                </select>
              </Row>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => toast.success('Preferences saved!')}>
                <CheckCircle size={15} /> Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {section === 'notifs' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Notifications</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Control what emails and alerts you receive</p>
            <div className="card" style={{ padding: '0 20px' }}>
              {([
                ['resumeUpdates', 'Resume Updates', 'When your resume is optimized or analyzed'],
                ['jobMatches',    'Job Matches',    'When new jobs match your profile'],
                ['appReminders', 'Application Reminders', 'Reminders to follow up on saved jobs'],
                ['productUpdates','Product Updates', 'New features, tips, and announcements'],
              ] as const).map(([key, label, desc]) => (
                <Row key={key} label={label} desc={desc}>
                  <Toggle on={notifs[key]} onToggle={() => {
                    setNotifs(n => ({ ...n, [key]: !n[key] }));
                    toast(`${label} notifications ${notifs[key] ? 'disabled' : 'enabled'}`);
                  }} />
                </Row>
              ))}
            </div>
          </div>
        )}

        {/* INTEGRATIONS */}
        {section === 'integrations' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Integrations</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Connect external services to enhance your resume</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'LinkedIn',     emoji: '💼', desc: 'Import work history, skills, and endorsements', connected: false },
                { name: 'GitHub',       emoji: '🐙', desc: 'Import repositories and contributions',          connected: false },
                { name: 'Google Drive', emoji: '📁', desc: 'Access and sync your resume documents',           connected: false },
                { name: 'Dropbox',      emoji: '📦', desc: 'Access files stored in Dropbox',                 connected: false },
              ].map(int => (
                <div key={int.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                  <span style={{ fontSize: 28 }}>{int.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{int.name}</p>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{int.desc}</p>
                  </div>
                  <button className={`btn btn-sm ${int.connected ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toast(`Connecting to ${int.name}… (OAuth integration requires API keys)`)}>
                    {int.connected ? 'Connected ✓' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRIVACY */}
        {section === 'privacy' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Privacy & Security</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Manage your account security and data privacy</p>
            <div className="card" style={{ padding: '0 20px', marginBottom: 20 }}>
              <Row label="Change Password" desc="Update your account password">
                <button className="btn btn-secondary btn-sm" onClick={() => toast('Password change email sent!')}>Change Password</button>
              </Row>
              <Row label="Two-Factor Authentication" desc="Add an extra layer of security">
                <button className="btn btn-secondary btn-sm" onClick={() => toast('2FA setup — requires authentication app')}>Enable 2FA</button>
              </Row>
              <Row label="Active Sessions" desc="Manage devices logged into your account">
                <button className="btn btn-secondary btn-sm" onClick={() => toast('1 active session')}>View Sessions</button>
              </Row>
            </div>

            {/* Danger zone */}
            <div style={{ padding: 20, borderRadius: 14, border: '1px solid rgba(231,76,60,.3)', background: 'rgba(231,76,60,.04)' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--error)', marginBottom: 4 }}>Danger Zone</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="btn btn-danger" onClick={() => setDeleteModal(true)}>
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* DATA */}
        {section === 'data' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Data & Export</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Download or manage your data</p>
            <div className="card" style={{ padding: '0 20px' }}>
              {[
                { label: 'Export All Resumes',     desc: 'Download all your resumes as a ZIP file' },
                { label: 'Export Cover Letters',   desc: 'Download all cover letters as a ZIP file' },
                { label: 'Export Account Data',    desc: 'Full data export including history and settings' },
                { label: 'Export ATS Reports',     desc: 'All ATS analysis reports as PDFs' },
              ].map(({ label, desc }) => (
                <Row key={label} label={label} desc={desc}>
                  <button className="btn btn-secondary btn-sm" onClick={() => toast.success(`Preparing ${label}…`)}>Export</button>
                </Row>
              ))}
            </div>
          </div>
        )}

        {/* APPEARANCE */}
        {section === 'appearance' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Appearance</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choose how BAGUPADU looks for you</p>
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Theme</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {([
                  ['Light', Sun, '#f5f5fc'],
                  ['Dark', Moon, '#0A0A16'],
                  ['System', Monitor, 'linear-gradient(135deg,#f5f5fc 50%,#0A0A16 50%)'],
                ] as const).map(([t, Icon, bg]) => (
                  <button key={t} onClick={() => applyTheme(t as Theme)}
                    style={{ padding: '20px 16px', borderRadius: 14, border: `2px solid ${theme === t ? 'var(--primary)' : 'var(--border-color)'}`, background: theme === t ? 'var(--primary-light)' : 'var(--bg-tertiary)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s' }}>
                    <div style={{ width: 48, height: 32, borderRadius: 8, background: bg, margin: '0 auto 10px', border: '1px solid var(--border-color)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon size={14} color={theme === t ? 'var(--primary)' : 'var(--text-secondary)'} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme === t ? 'var(--primary)' : 'var(--text-secondary)' }}>{t}</span>
                    </div>
                    {theme === t && <CheckCircle size={14} color="var(--primary)" style={{ margin: '6px auto 0', display: 'block' }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LANGUAGE */}
        {section === 'language' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Language</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Choose your preferred language</p>
            <div className="card" style={{ padding: 24 }}>
              <label className="input-label">Display Language</label>
              <select className="select" style={{ maxWidth: 280 }}>
                {['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Portuguese', 'Hindi', 'Japanese'].map(l => <option key={l}>{l}</option>)}
              </select>
              <button className="btn btn-primary" style={{ marginTop: 16, alignSelf: 'flex-start' }} onClick={() => toast.success('Language saved!')}>
                Save Language
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {deleteModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--error)' }}>Delete Account</h3>
              <button onClick={() => { setDeleteModal(false); setDeleteConfirmText(''); }} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
                This will permanently delete your account, all resumes, cover letters, ATS reports, and history. <strong>This cannot be undone.</strong>
              </p>
              <label className="input-label">Type <strong>DELETE</strong> to confirm</label>
              <input className="input" placeholder="DELETE" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDeleteModal(false); setDeleteConfirmText(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => { toast.error('Account deletion submitted'); setDeleteModal(false); }}>
                <Trash2 size={14} /> Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppWrapper>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
        </div>
      </AppWrapper>
    }>
      <SettingsContent />
    </Suspense>
  );
}
