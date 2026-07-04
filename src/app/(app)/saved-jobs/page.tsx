'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Grid, List, MapPin, Clock, BookmarkX, X, Target, Briefcase, Mail, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';

const SAVED_JOBS = [
  { id: 1, title: 'Senior Frontend Engineer',  company: 'Stripe',     logo: '💳', location: 'Remote',        type: 'Full-time', exp: '4–7 yrs', match: 96, saved: '2h ago',  mode: 'Remote' },
  { id: 2, title: 'Full Stack Developer',       company: 'Notion',     logo: '📓', location: 'San Francisco', type: 'Full-time', exp: '3–5 yrs', match: 91, saved: '1d ago',  mode: 'Hybrid' },
  { id: 3, title: 'Software Engineer II',        company: 'Figma',      logo: '🎨', location: 'New York',      type: 'Full-time', exp: '2–4 yrs', match: 87, saved: '3d ago',  mode: 'On-site' },
  { id: 4, title: 'React Developer',             company: 'Linear',     logo: '📐', location: 'Remote',        type: 'Full-time', exp: '3–5 yrs', match: 83, saved: '5d ago',  mode: 'Remote' },
  { id: 5, title: 'Staff Engineer',              company: 'Vercel',     logo: '▲',  location: 'Remote',        type: 'Full-time', exp: '7+ yrs',  match: 78, saved: '1wk ago', mode: 'Remote' },
];

const matchColor = (m: number) => m >= 90 ? '#00b894' : m >= 75 ? '#6C5CE7' : m >= 60 ? '#fdcb6e' : '#ff7675';

export default function SavedJobsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [jobs, setJobs] = useState(SAVED_JOBS);
  const [selected, setSelected] = useState<typeof SAVED_JOBS[0] | null>(SAVED_JOBS[0]);
  const [showProTip, setShowProTip] = useState(true);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase())
  );

  const removeJob = (id: number) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    if (selected?.id === id) setSelected(null);
    toast('Job removed from saved');
  };

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 0, height: 'calc(100vh - var(--topbar-height) - 56px)', minHeight: 0 }}>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingRight: selected ? 0 : 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, padding: '0 0 0 0', flexWrap: 'wrap' }}>
          <div className="topbar-search" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search saved jobs…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 150 }}>
            {['All Jobs', 'Remote Only', 'Full-time', 'Best Match'].map(f => <option key={f}>{f}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setViewMode('list')}><List size={15} /></button>
            <button className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setViewMode('grid')}><Grid size={15} /></button>
          </div>
          <button onClick={() => { setJobs([]); setSelected(null); toast('All jobs cleared'); }} className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}>
            Clear All
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>{filtered.length} saved job{filtered.length !== 1 ? 's' : ''}</p>

        {/* List view */}
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(job => (
              <div key={job.id}
                onClick={() => setSelected(job)}
                style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 14, background: 'var(--bg-secondary)', border: `1px solid ${selected?.id === job.id ? 'rgba(108,92,231,.4)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.18s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,92,231,.3)'}
                onMouseLeave={e => { if (selected?.id !== job.id) e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, border: '1px solid var(--border-color)' }}>
                  {job.logo}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{job.title}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{job.company} · <MapPin size={11} style={{ display: 'inline' }} /> {job.location}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${matchColor(job.match)}15`, border: `2px solid ${matchColor(job.match)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: matchColor(job.match) }}>{job.match}%</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="badge badge-muted">{job.mode}</span>
                    <span className="badge badge-muted">{job.type}</span>
                    <span className="badge badge-muted">{job.exp}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                      <Clock size={10} /> Saved {job.saved}
                    </span>
                    <button onClick={e => { e.stopPropagation(); removeJob(job.id); }} className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--error)' }} title="Remove">
                      <BookmarkX size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {filtered.map(job => (
              <div key={job.id} onClick={() => setSelected(job)}
                style={{ padding: 16, borderRadius: 14, background: 'var(--bg-secondary)', border: `1px solid ${selected?.id === job.id ? 'rgba(108,92,231,.4)' : 'var(--border-color)'}`, cursor: 'pointer', transition: 'all 0.18s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 28 }}>{job.logo}</div>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${matchColor(job.match)}15`, border: `2px solid ${matchColor(job.match)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: matchColor(job.match) }}>{job.match}%</span>
                  </div>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{job.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{job.company} · {job.location}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-muted" style={{ fontSize: 10 }}>{job.mode}</span>
                  <span className="badge badge-muted" style={{ fontSize: 10 }}>{job.exp}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="empty-state">
            <Briefcase size={40} />
            <h3>No saved jobs</h3>
            <p>Browse the Job Matcher and bookmark roles you're interested in</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/job-matcher')}>
              Find Jobs
            </button>
          </div>
        )}
      </div>

      {/* Right detail panel */}
      {selected && (
        <div className="detail-panel" style={{ width: 320 }}>
          <div className="detail-panel-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 26 }}>{selected.logo}</span>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700 }}>{selected.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.company}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon btn-sm"><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => toast('Opening job listing…')}>
                <ExternalLink size={12} /> View Job
              </button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => removeJob(selected.id)}>
                <BookmarkX size={12} /> Remove
              </button>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {/* Match gauge */}
            <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
              <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={45} cy={45} r={37} fill="none" stroke="var(--border-color)" strokeWidth={8} />
                <circle cx={45} cy={45} r={37} fill="none" stroke={matchColor(selected.match)} strokeWidth={8}
                  strokeDasharray={2*Math.PI*37} strokeDashoffset={2*Math.PI*37*(1-selected.match/100)} strokeLinecap="round" />
              </svg>
              <div style={{ marginTop: -60, marginBottom: 8 }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: matchColor(selected.match) }}>{selected.match}%</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: matchColor(selected.match) }}>
                {selected.match >= 90 ? 'Excellent Match' : selected.match >= 75 ? 'Great Match' : 'Good Match'}
              </p>
              <button style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 4 }}
                onClick={() => router.push('/job-matcher')}>
                View Match Details →
              </button>
            </div>

            {/* Job Insights */}
            <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Job Insights</p>
            {[
              { label: 'Experience Level',   value: 'Mid-Senior' },
              { label: 'Experience Required', value: selected.exp },
              { label: 'Employment Type',    value: selected.type },
              { label: 'Work Mode',          value: selected.mode },
              { label: 'Saved On',           value: selected.saved + ' ago' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            {/* Actions */}
            <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', margin: '16px 0 8px' }}>Actions</p>
            {[
              { label: 'Customize Resume',  icon: Target, action: () => router.push('/ai-chat') },
              { label: 'Generate Cover Letter', icon: Mail, action: () => router.push('/cover-letter') },
              { label: 'View in Job Matcher',   icon: Briefcase, action: () => router.push('/job-matcher') },
            ].map(({ label, icon: Icon, action }) => (
              <button key={label} onClick={action}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', width: '100%', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <Icon size={14} /> {label}
              </button>
            ))}

            {/* Pro tip */}
            {showProTip && (
              <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--primary-light)', border: '1px solid rgba(108,92,231,.2)', position: 'relative' }}>
                <button onClick={() => setShowProTip(false)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                  <X size={13} />
                </button>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>💡 Pro Tip</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Customize your resume specifically for this role to increase your match score by 15–25%
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AppWrapper>
  );
}
