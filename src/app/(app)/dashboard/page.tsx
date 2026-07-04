'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, TrendingUp, Eye, Briefcase, ArrowUpRight,
  Plus, Target, Mail, Zap, Clock, UploadCloud, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';

/* ─── Quick Actions (static, no data dependency) ─── */
const QUICK_ACTIONS = [
  { label: 'Upload New Resume',       desc: 'Parse & analyze instantly',        icon: UploadCloud, href: '/resumes',      color: '#6C5CE7' },
  { label: 'Optimize with AI',        desc: 'Improve your resume with AI',       icon: Zap,         href: '/ai-chat',      color: '#00b894' },
  { label: 'Run ATS Check',           desc: 'Score & analyze your resume',       icon: Target,      href: '/ats-checker',  color: '#0984e3' },
  { label: 'Find Job Matches',        desc: 'Scrape & match real jobs',          icon: Briefcase,   href: '/job-matcher',  color: '#e17055' },
  { label: 'Generate Cover Letter',   desc: 'AI-crafted in seconds',             icon: Mail,        href: '/cover-letter', color: '#fdcb6e' },
];

/* ─── Activity icon mapping ─── */
const ACTIVITY_ICONS: Record<string, { icon: typeof Target; color: string }> = {
  ats_check:      { icon: Target,      color: '#6C5CE7' },
  resume_upload:  { icon: FileText,    color: '#0984e3' },
  optimize:       { icon: Zap,         color: '#00b894' },
  cover_letter:   { icon: Mail,        color: '#0984e3' },
  job_match:      { icon: Briefcase,   color: '#fdcb6e' },
  download:       { icon: ArrowUpRight,color: '#A29BFE' },
  chat:           { icon: Zap,         color: '#00b894' },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const w = 80, h = 28;
  const coords = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-min)/(max-min||1))*h}`);
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AtsRing({ ats, label }: { ats: number; label: string }) {
  const color = ats >= 85 ? '#00b894' : ats >= 70 ? '#6C5CE7' : ats >= 55 ? '#fdcb6e' : '#ff7675';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width={32} height={32} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={16} cy={16} r={12} fill="none" stroke="var(--border-color)" strokeWidth={3} />
        <circle cx={16} cy={16} r={12} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={2*Math.PI*12} strokeDashoffset={2*Math.PI*12*(1-ats/100)} strokeLinecap="round" />
      </svg>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>{ats}</p>
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action, actionHref }: {
  icon: typeof FileText; title: string; desc: string; action?: string; actionHref?: string;
}) {
  const router = useRouter();
  return (
    <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon size={22} color="var(--text-muted)" />
      </div>
      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, lineHeight: 1.5, marginBottom: action ? 12 : 0 }}>{desc}</p>
      {action && actionHref && (
        <button className="btn btn-primary btn-sm" onClick={() => router.push(actionHref)}>
          {action}
        </button>
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { get } = useApi();
  const [dateRange, setDateRange] = useState('Last 30 days');


  interface DashStats {
    resumes_count: number;
    avg_ats_score: number;
    profile_views: number;
    jobs_matched: number;
    ats_trend: { day: string; score: number }[];
    top_skills: { name: string; value: number; color: string }[];
    job_match_summary: { label: string; count: number; pct: number; color: string }[];
    recent_resumes: { id: string; filename: string; ats_score?: number; status: string; updated_at: string; parsed_data?: { name?: string; title?: string } }[];
    activity_feed: { id: string; action_type: string; description: string; created_at: string }[];
  }

  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get('/api/dashboard').then(res => {
      if (res.success && res.data) setStats(res.data as DashStats);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [get]);

  const STAT_CARDS = [
    {
      label: 'Resumes Uploaded', value: stats?.resumes_count ?? 0,
      icon: FileText,  color: '#6C5CE7',
      empty: stats?.resumes_count === 0,
      spark: stats?.ats_trend?.map(t => t.score) ?? [],
    },
    {
      label: 'Avg. ATS Score', value: stats?.avg_ats_score ? `${stats.avg_ats_score}/100` : '—',
      icon: Target, color: '#00b894',
      empty: !stats?.avg_ats_score,
      spark: stats?.ats_trend?.map(t => t.score) ?? [],
    },
    {
      label: 'Profile Views', value: stats?.profile_views ?? 0,
      icon: Eye, color: '#0984e3',
      empty: !stats?.profile_views,
      spark: [],
    },
    {
      label: 'Jobs Matched', value: stats?.jobs_matched ?? 0,
      icon: Briefcase, color: '#e17055',
      empty: stats?.jobs_matched === 0,
      spark: [],
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', borderTopColor: '#6C5CE7', borderColor: 'rgba(108,92,231,0.2)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const isNewUser = stats?.resumes_count === 0;
  const trendData = stats?.ats_trend ?? [];
  const skillsData = stats?.top_skills ?? [];
  const jobMatchData = stats?.job_match_summary ?? [];
  const recentResumes = stats?.recent_resumes ?? [];
  const activityFeed = stats?.activity_feed ?? [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* New User Banner */}
      {isNewUser && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(108,92,231,0.1), rgba(162,155,254,0.05))', border: '1px solid rgba(108,92,231,0.2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UploadCloud size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Welcome to BAGUPADU! 🎉</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload your first resume to see your ATS score, skill breakdown, and job matches.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/resumes')}>
            <UploadCloud size={13} /> Upload Resume
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {STAT_CARDS.map(({ label, value, icon: Icon, color, spark }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <p className="stat-card-label" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <p className="stat-card-value">{value}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isNewUser ? 'No data yet' : 'From your resumes'}
              </span>
              {spark.length >= 2 && <Sparkline data={spark} color={color} />}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px 260px', gap: 16, marginBottom: 24, alignItems: 'start' }}>

        {/* ATS Trend */}
        <div className="card">
          <div className="card-header">
            <h3>ATS Score Trend</h3>
            <select className="select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
              value={dateRange} onChange={e => setDateRange(e.target.value)}>
              {['Last 7 days', 'Last 30 days', 'All time'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="card-body" style={{ padding: '12px 16px 8px' }}>
            {trendData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={dateRange === 'Last 7 days' ? trendData.slice(-7) : trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#6C5CE7" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingUp} title="No trend data yet" desc="Run ATS checks after uploading your resume to see your score trend over time." />
            )}
          </div>
        </div>

        {/* Top Skills */}
        <div className="card">
          <div className="card-header">
            <h3>Top Skills Detected</h3>
            {skillsData.length > 0 && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{skillsData.length} detected</span>}
          </div>
          <div className="card-body" style={{ padding: '10px 16px 16px' }}>
            {skillsData.length >= 2 ? (
              <>
                <PieChart width={248} height={110}>
                  <Pie data={skillsData} cx={124} cy={55} innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={2}>
                    {skillsData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {skillsData.slice(0, 4).map(s => (
                    <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon={Target} title="No skills detected" desc="Upload a resume with a skills section to see your skill distribution." />
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Clock size={14} color="var(--text-muted)" />
          </div>
          <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityFeed.length > 0 ? activityFeed.map(a => {
              const def = ACTIVITY_ICONS[a.action_type] || { icon: Zap, color: '#6C5CE7' };
              const Icon = def.icon;
              const timeAgo = new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={a.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${def.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={13} color={def.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{a.description}</p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo}</p>
                  </div>
                </div>
              );
            }) : (
              <EmptyState icon={Clock} title="No activity yet" desc="Your actions will appear here as you use BAGUPADU." />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px 280px', gap: 16 }}>

        {/* Recent Resumes */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Resumes</h3>
            <button onClick={() => router.push('/resumes')} style={{ fontSize: 12.5, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              View All →
            </button>
          </div>
          {recentResumes.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Resume</th><th>ATS Score</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  {recentResumes.map(r => {
                    const score = r.ats_score ?? 0;
                    const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Needs Work' : score > 0 ? 'Poor' : '—';
                    const updated = new Date(r.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    const displayName = r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename;
                    return (
                      <tr key={r.id} onClick={() => router.push('/resumes')} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <FileText size={14} color="var(--text-muted)" />
                            <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{displayName}</span>
                            {r.status === 'Optimized' && <span className="badge badge-primary" style={{ fontSize: 10 }}>AI Optimized</span>}
                          </div>
                        </td>
                        <td>{score > 0 ? <AtsRing ats={score} label={label} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                        <td><span className={`badge badge-${score >= 85 ? 'success' : score >= 70 ? 'primary' : 'muted'}`}>{r.status}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FileText} title="No resumes yet" desc="Upload your first resume to get started." action="Upload Resume" actionHref="/resumes" />
          )}
        </div>

        {/* Job Match Summary */}
        <div className="card">
          <div className="card-header">
            <h3>Job Match Summary</h3>
            {jobMatchData.length > 0 && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{stats?.jobs_matched} total</span>}
          </div>
          <div className="card-body">
            {jobMatchData.some(m => m.count > 0) ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {jobMatchData.map(m => (
                    <div key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.count} ({m.pct}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push('/job-matcher')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 12.5 }}>
                  <Briefcase size={14} /> View All Matches
                </button>
              </>
            ) : (
              <EmptyState icon={Briefcase} title="No job matches yet" desc="Run the Job Intelligence scraper to find matching positions." action="Find Jobs" actionHref="/job-matcher" />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h3>Quick Actions</h3></div>
          <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUICK_ACTIONS.map(({ label, desc, icon: Icon, href, color }) => (
              <button key={label} onClick={() => router.push(href)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = `${color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
                </div>
                <TrendingUp size={13} style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppWrapper>
      <DashboardContent />
    </AppWrapper>
  );
}
