'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, CheckCircle, Star, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';

const TEMPLATES = [
  { id: 'modern',       name: 'Modern Professional', tag: 'Popular',  style: 'Modern',       ats: true,  exp: 'Mid-Senior', industries: ['Tech', 'Finance', 'Consulting'],     desc: 'Clean and contemporary design with a professional purple accent. Perfect for modern tech roles.', color: '#6C5CE7' },
  { id: 'clean',        name: 'Clean Professional',  tag: null,        style: 'Professional', ats: true,  exp: 'All levels', industries: ['Business', 'Management', 'Sales'],    desc: 'Timeless and minimal layout that works across all industries and experience levels.', color: '#0984e3' },
  { id: 'minimal',      name: 'Minimal',             tag: null,        style: 'Minimal',      ats: true,  exp: 'Junior-Mid', industries: ['Design', 'Marketing', 'Content'],     desc: 'Ultra-clean whitespace design that lets your content shine.', color: '#636e72' },
  { id: 'creative',     name: 'Creative',            tag: 'Trending',  style: 'Creative',     ats: false, exp: 'All levels', industries: ['Design', 'Media', 'Advertising'],    desc: 'Bold dark sidebar with colorful accents. Stands out in creative fields.', color: '#e17055' },
  { id: 'two-column',   name: 'Two Column',          tag: null,        style: 'Modern',       ats: true,  exp: 'Mid-Senior', industries: ['Engineering', 'Product', 'Data'],     desc: 'Efficient two-column layout that fits more content while remaining scannable.', color: '#00b894' },
  { id: 'executive',    name: 'Executive',           tag: null,        style: 'Professional', ats: true,  exp: 'Senior+',    industries: ['Leadership', 'C-Suite', 'Board'],     desc: 'Premium dark header banner for senior executives and board-level roles.', color: '#2d3436' },
];

const FILTER_TABS = ['All Templates', 'Modern', 'Professional', 'Creative', 'Minimal'];

export default function TemplatesPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All Templates');
  const [selected, setSelected] = useState(TEMPLATES[0]);
  const [current, setCurrent] = useState('modern');
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t => {
    const matchFilter = activeFilter === 'All Templates' || t.style === activeFilter;
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const useTemplate = (id: string) => {
    setCurrent(id);
    toast.success(`✅ "${TEMPLATES.find(t => t.id === id)?.name}" applied to your resume!`);
  };

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <h1>Resume Templates</h1>
          <p>Choose a professionally designed template — all rendered with your actual resume data</p>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tabs" style={{ borderBottom: 'none', gap: 4 }}>
            {FILTER_TABS.map(f => (
              <button key={f} className={`tab${activeFilter === f ? ' active' : ''}`}
                style={{ borderBottom: 'none', borderRadius: 'var(--radius-md)', background: activeFilter === f ? 'var(--primary-light)' : 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                onClick={() => setActiveFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="topbar-search" style={{ marginLeft: 'auto', width: 200 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Template grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
          {filtered.map(t => (
            <div key={t.id}
              onClick={() => setSelected(t)}
              style={{ borderRadius: 14, border: `2px solid ${selected.id === t.id ? t.color : 'var(--border-color)'}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg-secondary)' }}
              onMouseEnter={e => { if (selected.id !== t.id) e.currentTarget.style.borderColor = `${t.color}60`; }}
              onMouseLeave={e => { if (selected.id !== t.id) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>

              {/* Template preview thumbnail */}
              <div style={{ height: 160, background: `linear-gradient(135deg, ${t.color}15, ${t.color}05)`, position: 'relative', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: 10 }}>
                {/* Simulated resume layout */}
                {t.id === 'creative' ? (
                  <div style={{ display: 'flex', gap: 6, height: '100%' }}>
                    <div style={{ width: 50, background: t.color, borderRadius: 4, display: 'flex', flexDirection: 'column', padding: 5, gap: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,.3)', alignSelf: 'center' }} />
                      {[40,70,55,65].map((w,i) => <div key={i} style={{ height: 3, background: 'rgba(255,255,255,.3)', borderRadius: 2, width: `${w}%` }} />)}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ height: 10, background: 'var(--border-strong)', borderRadius: 2, width: '80%' }} />
                      <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 2, width: '60%', marginBottom: 6 }} />
                      {[90,75,85,65,80].map((w,i) => <div key={i} style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, width: `${w}%` }} />)}
                    </div>
                  </div>
                ) : t.id === 'executive' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
                    <div style={{ height: 36, background: t.color, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, background: 'rgba(255,255,255,.7)', borderRadius: 2, marginBottom: 4 }} />
                        <div style={{ height: 4, background: 'rgba(255,255,255,.4)', borderRadius: 2, width: '60%' }} />
                      </div>
                    </div>
                    {[90,75,85,65,80,70].map((w,i) => <div key={i} style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, width: `${w}%` }} />)}
                  </div>
                ) : t.id === 'two-column' ? (
                  <div style={{ display: 'flex', gap: 6, height: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ height: 8, background: t.color, borderRadius: 2, marginBottom: 4 }} />
                      {[90,75,65,80,55].map((w,i) => <div key={i} style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, width: `${w}%` }} />)}
                    </div>
                    <div style={{ width: 2, background: 'var(--border-color)' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {[70,85,60,75,90,55].map((w,i) => <div key={i} style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, width: `${w}%` }} />)}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                    <div style={{ borderBottom: `2px solid ${t.color}`, paddingBottom: 6, marginBottom: 4 }}>
                      <div style={{ height: 10, background: t.color, borderRadius: 2, width: '70%', marginBottom: 4 }} />
                      <div style={{ height: 5, background: 'var(--border-color)', borderRadius: 2, width: '50%' }} />
                    </div>
                    {[95,80,70,85,65,75,80,60].map((w,i) => <div key={i} style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, width: `${w}%` }} />)}
                  </div>
                )}
                {t.tag && <span className="badge badge-primary" style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}>{t.tag}</span>}
                {current === t.id && <span className="badge badge-success" style={{ position: 'absolute', top: 8, left: 8, fontSize: 10 }}><CheckCircle size={9} /> Selected</span>}
              </div>

              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t.name}</p>
                <button
                  onClick={e => { e.stopPropagation(); useTemplate(t.id); }}
                  className={`btn btn-sm ${current === t.id ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                  {current === t.id ? '✓ Selected' : 'Use Template'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right detail panel */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div className="card" style={{ position: 'sticky', top: 0 }}>
          {/* Large preview */}
          <div style={{ height: 240, background: `linear-gradient(135deg, ${selected.color}12, ${selected.color}05)`, borderRadius: '12px 12px 0 0', display: 'flex', flexDirection: 'column', padding: 16, gap: 5 }}>
            {selected.id === 'creative' ? (
              <div style={{ display: 'flex', gap: 10, height: '100%' }}>
                <div style={{ width: 70, background: selected.color, borderRadius: 6, display: 'flex', flexDirection: 'column', padding: 8, gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.3)', alignSelf: 'center' }} />
                  {[60,90,70,80].map((w,i) => <div key={i} style={{ height: 4, background: 'rgba(255,255,255,.3)', borderRadius: 2, width: `${w}%` }} />)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ height: 14, background: 'var(--border-strong)', borderRadius: 3, width: '80%' }} />
                  <div style={{ height: 8, background: 'var(--border-color)', borderRadius: 3, width: '60%', marginBottom: 8 }} />
                  {[90,75,85,65,80,70,85].map((w,i) => <div key={i} style={{ height: 5, background: 'var(--border-color)', borderRadius: 3, width: `${w}%` }} />)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
                <div style={{ borderBottom: `3px solid ${selected.color}`, paddingBottom: 8, marginBottom: 6 }}>
                  <div style={{ height: 14, background: selected.color, borderRadius: 3, width: '65%', marginBottom: 6 }} />
                  <div style={{ height: 7, background: 'var(--border-color)', borderRadius: 3, width: '45%' }} />
                </div>
                {[95,80,70,85,65,75,80,60,90,70].map((w,i) => <div key={i} style={{ height: 5, background: 'var(--border-color)', borderRadius: 3, width: `${w}%` }} />)}
              </div>
            )}
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{selected.name}</h3>
              {selected.tag && <span className="badge badge-primary" style={{ fontSize: 10 }}><Star size={9} /> {selected.tag}</span>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{selected.desc}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Style</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{selected.style}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Experience Level</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{selected.exp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ATS Friendly</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: selected.ats ? '#00b894' : '#e74c3c' }}>{selected.ats ? '✓ Yes' : '✗ Limited'}</span>
              </div>
            </div>

            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>Best suited for</p>
            <div className="chip-row" style={{ marginBottom: 14 }}>
              {selected.industries.map(ind => <span key={ind} className="tag" style={{ fontSize: 11 }}>{ind}</span>)}
            </div>

            <button onClick={() => useTemplate(selected.id)} className={`btn ${current === selected.id ? 'btn-secondary' : 'btn-primary'}`} style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
              {current === selected.id ? <><CheckCircle size={14} /> Currently Selected</> : <><LayoutTemplate size={14} /> Use This Template</>}
            </button>
            <button onClick={() => toast('Opening full-screen preview…')} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12.5 }}>
              Preview Full Screen ↗
            </button>
          </div>
        </div>
      </div>
    </div>
    </AppWrapper>
  );
}
