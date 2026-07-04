'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, Loader2, AlertCircle, RefreshCw, Briefcase,
  ExternalLink, Filter, X, ChevronDown, ChevronUp, ArrowUpDown,
  Bookmark, BookmarkCheck, Target, Clock, Zap, TrendingUp,
  CheckCircle, AlertTriangle, Sparkles, Shield, DollarSign,
  Star, ChevronRight, Globe, BarChart2, Calendar, Layers,
  Award, FileText, Lightbulb, Tag, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import type { Resume } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────
interface MatchBreakdown {
  skills_match: number;
  keyword_match: number;
  experience_match: number;
  title_match: number;
}
interface ScrapedJob {
  id: string; title: string; company: string;
  location?: string; job_type?: string; experience?: string;
  description?: string; skills?: string[];
  apply_url?: string; job_url?: string; salary?: string;
  source?: string; work_mode?: string; posted_date?: string;
  scraped_at?: string; match_score: number;
  match_breakdown?: MatchBreakdown;
  matched_skills?: string[]; missing_skills?: string[];
  matched_keywords?: string[]; missing_keywords?: string[];
  experience_gap?: string;
}
interface PlatformResult {
  platform: string;
  count: number;
  status?: string;
  error?: string;
  duration_ms?: number;
}
type SortField = 'match_score' | 'posted_date' | 'company' | 'title' | 'experience';
type DateFilter = 'any' | 'today' | 'week' | 'month';
interface AnalysisResult {
  strength: { label: string; color: string; description: string };
  skill_gap: { skill: string; have: boolean }[];
  all_job_skills: string[];
  ai_insights: {
    summary: string; why_apply: string[];
    skill_tips: string[]; application_strategy: string;
    red_flags: string[]; salary_insight: string;
  } | null;
  resume_skills: string[]; matched_skills: string[];
  missing_skills: string[]; score: number;
}

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  Naukri:    '#FF7555',
  Indeed:    '#003A9B',
  Glassdoor: '#0CAA41',
  Foundit:   '#E74C3C',
  Mock:      '#6C5CE7',
};

// Ordered list of supported platforms shown in the UI
const SUPPORTED_PLATFORM_NAMES = ['Naukri', 'Indeed', 'Glassdoor', 'Foundit'];

const KNOWN_DOMAINS: Record<string, string> = {
  google: 'google.com', microsoft: 'microsoft.com', amazon: 'amazon.com',
  meta: 'meta.com', apple: 'apple.com', netflix: 'netflix.com',
  stripe: 'stripe.com', notion: 'notion.so', vercel: 'vercel.com',
  shopify: 'shopify.com', airbnb: 'airbnb.com', github: 'github.com',
  figma: 'figma.com', slack: 'slack.com', zoom: 'zoom.us',
  atlassian: 'atlassian.com', datadog: 'datadoghq.com', linear: 'linear.app',
  infosys: 'infosys.com', wipro: 'wipro.com', tcs: 'tcs.com',
  hcl: 'hcltech.com', cognizant: 'cognizant.com', accenture: 'accenture.com',
  capgemini: 'capgemini.com', mphasis: 'mphasis.com', hexaware: 'hexaware.com',
  oracle: 'oracle.com', ibm: 'ibm.com', sap: 'sap.com', adobe: 'adobe.com',
  salesforce: 'salesforce.com', servicenow: 'servicenow.com',
  deloitte: 'deloitte.com', pwc: 'pwc.com', ey: 'ey.com', kpmg: 'kpmg.com',
};

const LOGO_PALETTE = ['#6C5CE7','#0077B5','#E74C3C','#00b894','#f0a500',
  '#4B9FD5','#F76428','#3DAA6E','#FF6B6B','#C74B50','#E37500','#FF7555'];

const EXP_LABELS = ['Fresher', '1–2 Yrs', '2–4 Yrs', '3–6 Yrs', '5+ Yrs', '8+ Yrs'];
const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
const JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Internship'];

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
const matchColor = (s: number) =>
  s >= 85 ? '#00b894' : s >= 70 ? '#6C5CE7' : s >= 55 ? '#f0a500' : '#e17055';
const matchLabel = (s: number) =>
  s >= 85 ? 'Excellent' : s >= 70 ? 'Great' : s >= 55 ? 'Good' : 'Partial';

function guessLogoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return LOGO_PALETTE[Math.abs(h) % LOGO_PALETTE.length];
}

function guessDomain(company: string): string {
  const key = company.toLowerCase()
    .replace(/\s+(technologies|tech|solutions|software|services|systems|consulting|ltd|pvt|inc|corp|llc|limited|group)\s*$/i, '')
    .replace(/[^a-z0-9]/g, '');
  return KNOWN_DOMAINS[key] || `${key}.com`;
}

function normalizeExp(raw?: string): string {
  if (!raw) return '—';
  const s = raw.toLowerCase().trim();
  if (/(fresher|entry.?level|no experience|0\s*(year|yr)|\bfresh\b)/i.test(s)) return 'Fresher';
  const range = s.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (range) {
    const lo = parseInt(range[1]), hi = parseInt(range[2]);
    if (lo === 0 && hi <= 1) return 'Fresher';
    if (lo <= 1 && hi <= 3) return '1–2 Yrs';
    if (lo <= 3 && hi <= 5) return '2–4 Yrs';
    if (lo <= 5 && hi <= 8) return '3–6 Yrs';
    if (lo >= 5) return '5+ Yrs';
    return `${lo}–${hi} Yrs`;
  }
  const plus = s.match(/(\d+)\+/);
  if (plus) {
    const n = parseInt(plus[1]);
    if (n === 0) return 'Fresher';
    if (n >= 8) return '8+ Yrs';
    if (n >= 5) return '5+ Yrs';
    return `${n}+ Yrs`;
  }
  if (/(senior|sr\.|lead|principal|staff)/i.test(s)) return '5+ Yrs';
  if (/(junior|jr\.|associate|mid)/i.test(s)) return '1–2 Yrs';
  const single = s.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1]);
    if (n === 0) return 'Fresher';
    if (n <= 2) return '1–2 Yrs';
    if (n <= 4) return '2–4 Yrs';
    if (n >= 8) return '8+ Yrs';
    return '5+ Yrs';
  }
  return raw;
}

function expFilterMatch(raw: string | undefined, labels: string[]): boolean {
  if (labels.length === 0) return true;
  if (!raw || raw === '—' || raw.trim() === '') return true; // lenient: let empty experience pass
  const norm = normalizeExp(raw);
  return labels.includes(norm) || labels.some(l => raw.toLowerCase().includes(l.toLowerCase()));
}

function workModeMatch(job: ScrapedJob, modes: string[]): boolean {
  if (modes.length === 0) return true;
  if (!job.work_mode || job.work_mode.trim() === '') return true; // lenient: let empty work mode pass
  const wm = (job.work_mode || '').toLowerCase();
  return modes.some(m => wm.includes(m.toLowerCase()));
}

function jobTypeMatch(job: ScrapedJob, types: string[]): boolean {
  if (types.length === 0) return true;
  if (!job.job_type || job.job_type.trim() === '') return true; // lenient: let empty job type pass
  const jt = (job.job_type || '').toLowerCase();
  return types.some(t => jt.includes(t.toLowerCase()));
}

function withinDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr || dateStr === 'Recently' || dateStr === '—' || dateStr.trim() === '') return true; // lenient: let missing date pass
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return true;
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  return diff <= days && diff >= 0;
}

function formatRel(d?: string): string {
  if (!d) return '—';
  if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return d;
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return '1d ago';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 14) return '1w ago';
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}
function formatDate(d?: string): string {
  if (!d) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(d))
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  return d;
}

const TECH_RE = /\b(React|Vue|Angular|TypeScript|JavaScript|Python|Java|Go|Golang|Node\.js|Next\.js|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|CI\/CD|Git|Linux|Agile|Scrum|Spring|Django|Flutter|Kotlin|Swift|Kafka|Elasticsearch|Spark|Scala|Ruby|PHP|Laravel|C\+\+|C#|\.NET|LLM|LangChain|OpenAI|GPT|NLP|Pandas|NumPy|TensorFlow|PyTorch|Scikit|Tableau|Figma|Selenium|Cypress|Playwright|Jira|HTML|CSS|Tailwind|Redux|FastAPI|NestJS)\b/gi;
function extractSkills(desc?: string): string[] {
  if (!desc) return [];
  return [...new Set((desc.match(TECH_RE) || []).map(s => s.trim()))];
}
function getJobSkills(job: ScrapedJob): string[] {
  return [...new Set([...(job.skills || []), ...extractSkills(job.description)])];
}

// ─────────────────────────────────────────────────────────────
//  Company Logo
// ─────────────────────────────────────────────────────────────
function CompanyLogo({ company, size = 36 }: { company: string; size?: number }) {
  const [err, setErr] = useState(false);
  const domain = guessDomain(company);
  const color  = guessLogoColor(company);
  const letter = company.trim()[0]?.toUpperCase() || '?';
  const r = Math.round(size * 0.28);

  if (!err) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}?size=${size * 2}`}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'contain', background: '#fff', border: '1px solid var(--border-color)', display: 'block' }}
        alt={company}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: r, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: size * 0.38, color: '#fff', letterSpacing: '-0.5px' }}>
      {letter}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Skills Cell with tooltip
// ─────────────────────────────────────────────────────────────
function SkillsCell({ skills, matchedSkills }: { skills: string[]; matchedSkills?: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const top4 = skills.slice(0, 4);
  const rest = skills.slice(4);
  const matchSet = new Set((matchedSkills || []).map(s => s.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (skills.length === 0) return <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>—</span>;

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }} ref={ref}>
      {top4.map(s => {
        const have = matchSet.has(s.toLowerCase());
        return (
          <span key={s} style={{
            padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap',
            background: have ? 'rgba(0,184,148,0.1)' : 'var(--bg-tertiary)',
            color: have ? '#00b894' : 'var(--text-secondary)',
            border: `1px solid ${have ? 'rgba(0,184,148,0.25)' : 'var(--border-color)'}`,
          }}>{s}</span>
        );
      })}
      {rest.length > 0 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            style={{ fontSize: 10.5, color: '#6C5CE7', fontWeight: 700, background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer' }}
          >+{rest.length}</button>
          {open && (
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50, minWidth: 200, maxWidth: 280,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10,
              boxShadow: 'var(--shadow-md)', padding: 10, display: 'flex', flexWrap: 'wrap', gap: 5,
            }}>
              {rest.map(s => {
                const have = matchSet.has(s.toLowerCase());
                return (
                  <span key={s} style={{
                    padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                    background: have ? 'rgba(0,184,148,0.1)' : 'var(--bg-tertiary)',
                    color: have ? '#00b894' : 'var(--text-secondary)',
                    border: `1px solid ${have ? 'rgba(0,184,148,0.25)' : 'var(--border-color)'}`,
                  }}>{s}</span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -12, right: -12, width: 64, height: 64, borderRadius: '50%', background: `${color}12`, pointerEvents: 'none' }} />
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${color}28` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 900, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sort Table Header
// ─────────────────────────────────────────────────────────────
function SortTh({ label, field, current, dir, onSort, style }: {
  label: string; field: SortField; current: SortField;
  dir: 'asc' | 'desc'; onSort: (f: SortField) => void; style?: React.CSSProperties;
}) {
  const active = current === field;
  return (
    <th onClick={() => onSort(field)} style={{
      padding: '11px 13px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap', userSelect: 'none',
      color: active ? '#6C5CE7' : 'var(--text-muted)', cursor: 'pointer',
      background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)',
      position: 'sticky', top: 0, zIndex: 10, ...style,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowUpDown size={10} style={{ opacity: 0.35 }} />}
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────
//  Match Ring Badge
// ─────────────────────────────────────────────────────────────
function MatchRing({ score }: { score: number }) {
  const color = matchColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${color}12`, border: `2.5px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 900, color, lineHeight: 1 }}>{score}%</span>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{matchLabel(score)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Detail Panel  (comprehensive 3-tab panel)
// ─────────────────────────────────────────────────────────────
function DetailPanel({ job, savedIds, onToggleSave, onClose, resumeId }: {
  job: ScrapedJob; savedIds: string[]; onToggleSave: (j: ScrapedJob) => void;
  onClose: () => void; resumeId: string;
}) {
  const { post } = useApi();
  const [tab, setTab] = useState<'details' | 'analysis' | 'improve'>('details');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const color = matchColor(job.match_score);
  const bd = job.match_breakdown;
  const allSkills = getJobSkills(job);
  const applyUrl = (job.apply_url && job.apply_url !== '#') ? job.apply_url : job.job_url;
  const saved = savedIds.includes(job.id);
  const platformColor = PLATFORM_COLORS[job.source || ''] || '#6C5CE7';

  const atsScore = job.match_score;
  const atsGrade =
    atsScore >= 85 ? { label: 'Excellent', color: '#00b894' } :
    atsScore >= 70 ? { label: 'Good', color: '#6C5CE7' } :
    atsScore >= 55 ? { label: 'Fair', color: '#f0a500' } :
    { label: 'Needs Work', color: '#e17055' };

  const loadAnalysis = useCallback(async () => {
    if (analysis || loadingAI) return;
    setLoadingAI(true);
    try {
      const res = await post<AnalysisResult>('/api/jobs/analyze', {
        resume_id: resumeId || undefined,
        job_title: job.title, company: job.company,
        description: job.description, skills: job.skills,
        experience: job.experience, location: job.location,
        match_score: job.match_score,
        matched_skills: job.matched_skills,
        missing_skills: job.missing_skills,
      });
      if (res.success && res.data) setAnalysis(res.data);
    } catch {/* silent */}
    finally { setLoadingAI(false); }
  }, [analysis, loadingAI, post, resumeId, job]);

  useEffect(() => {
    if (tab === 'analysis' || tab === 'improve') loadAnalysis();
  }, [tab, loadAnalysis]);

  const TABS = [
    { id: 'details', label: 'Job Details', icon: <FileText size={12} /> },
    { id: 'analysis', label: 'AI Analysis', icon: <Sparkles size={12} /> },
    { id: 'improve', label: 'Improve', icon: <Lightbulb size={12} /> },
  ] as const;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }} />

      <div style={{
        position: 'relative', width: 580, maxWidth: '95vw', height: '100vh', zIndex: 1,
        background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column', animation: 'panelSlide 0.22s ease',
        boxShadow: '-16px 0 64px rgba(0,0,0,0.15)',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CompanyLogo company={job.company} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, marginBottom: 3, color: 'var(--text-primary)' }}>{job.title}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>
                <strong>{job.company}</strong>
                {job.location && <> · <MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {job.location}</>}
              </p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {job.source && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: `${platformColor}18`, color: platformColor, border: `1px solid ${platformColor}30` }}>{job.source}</span>}
                {job.job_type && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>{job.job_type}</span>}
                {job.work_mode && <span className="badge badge-muted" style={{ fontSize: 10.5 }}>{job.work_mode}</span>}
                {normalizeExp(job.experience) !== '—' && <span className="badge badge-muted" style={{ fontSize: 10.5 }}><Target size={8} /> {normalizeExp(job.experience)}</span>}
                {job.posted_date && <span className="badge badge-muted" style={{ fontSize: 10.5 }}><Clock size={8} /> {formatDate(job.posted_date)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <MatchRing score={job.match_score} />
              <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex' }}>
                <X size={14} color="var(--text-secondary)" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#6C5CE7' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2.5px solid #6C5CE7' : '2.5px solid transparent',
              transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
            }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

          {/* ── DETAILS TAB ── */}
          {tab === 'details' && (
            <div>
              {/* Match Score breakdown */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: `${color}07`, border: `1px solid ${color}22`, marginBottom: 18 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${color}14`, border: `3px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{job.match_score}%</span>
                    <span style={{ fontSize: 8.5, fontWeight: 700, color, opacity: 0.8, marginTop: 2, textTransform: 'uppercase' }}>{matchLabel(job.match_score)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    {bd && ([['Skills', 'skills_match', 40], ['Keywords', 'keyword_match', 25], ['Experience', 'experience_match', 20], ['Title', 'title_match', 15]] as const).map(([l, k, m]) => {
                      const v = bd[k as keyof MatchBreakdown] ?? 0;
                      return (
                        <div key={l} style={{ marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{l}</span>
                            <span style={{ fontSize: 11, color, fontWeight: 700 }}>{v}/{m}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 3, background: 'var(--border-color)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(v / m * 100)}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ATS Compatibility */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: `${atsGrade.color}07`, border: `1px solid ${atsGrade.color}22`, marginBottom: 18 }}>
                <Award size={18} color={atsGrade.color} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ATS Compatibility</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: atsGrade.color }}>{atsScore}% — {atsGrade.label}</p>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 180, textAlign: 'right' }}>
                  {atsScore >= 70 ? 'Your resume is likely to pass ATS screening.' : 'Add missing skills to improve ATS pass rate.'}
                </div>
              </div>

              {/* Matched Skills */}
              {(job.matched_skills?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, color: '#00b894' }}><CheckCircle size={13} /> Skills You Have ({job.matched_skills!.length})</p>
                  <div className="chip-row">
                    {job.matched_skills!.map(s => <span key={s} className="tag" style={{ background: 'rgba(0,184,148,0.1)', color: '#00b894', border: '1px solid rgba(0,184,148,0.25)', textTransform: 'capitalize', fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {(job.missing_skills?.length ?? 0) > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, color: '#f0a500' }}><Zap size={13} /> Skills to Acquire ({job.missing_skills!.length})</p>
                  <div className="chip-row">
                    {job.missing_skills!.map(s => <span key={s} className="tag" style={{ background: 'rgba(240,165,0,0.1)', color: '#b8860b', border: '1px solid rgba(240,165,0,0.3)', textTransform: 'capitalize', fontSize: 11 }}>{s}</span>)}
                  </div>
                </div>
              )}

              {/* All Skills */}
              {allSkills.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>All Required Skills ({allSkills.length})</p>
                  <div className="chip-row">
                    {allSkills.map(s => {
                      const have = job.matched_skills?.some(m => m.toLowerCase() === s.toLowerCase());
                      return <span key={s} className="tag" style={{ background: have ? 'rgba(0,184,148,0.08)' : 'var(--bg-tertiary)', color: have ? '#00b894' : 'var(--text-secondary)', border: `1px solid ${have ? 'rgba(0,184,148,0.2)' : 'var(--border-color)'}`, fontSize: 11 }}>{s}</span>;
                    })}
                  </div>
                </div>
              )}

              {/* Experience info */}
              {job.experience && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Target size={16} color="#6C5CE7" />
                  <div>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Experience Required</p>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{job.experience}</p>
                    {job.experience_gap && job.experience_gap !== 'Unknown' && (
                      <span style={{ fontSize: 11, color: job.experience_gap === 'Qualified' ? '#00b894' : '#f0a500', fontWeight: 600 }}>
                        {job.experience_gap === 'Qualified' ? '✓ You qualify' : `${job.experience_gap}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Full Job Description */}
              {job.description ? (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={12} /> Full Job Description</p>
                  <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{job.description}</p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <Briefcase size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No description available</p>
                  {applyUrl && <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: 12, display: 'inline-flex' }}>View Full Posting <ExternalLink size={11} /></a>}
                </div>
              )}
            </div>
          )}

          {/* ── ANALYSIS TAB ── */}
          {tab === 'analysis' && (
            <>
              {loadingAI ? (
                <div style={{ textAlign: 'center', padding: '52px 20px' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulseRing 1.5s ease infinite' }}>
                    <Sparkles size={22} color="white" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Generating AI Analysis…</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>Comparing your resume against this role</p>
                </div>
              ) : analysis ? (
                <>
                  {/* Strength */}
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: `${analysis.strength.color}08`, border: `1px solid ${analysis.strength.color}22`, marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${analysis.strength.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={18} color={analysis.strength.color} fill={analysis.strength.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: analysis.strength.color, marginBottom: 2 }}>{analysis.strength.label}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{analysis.strength.description}</p>
                    </div>
                  </div>

                  {analysis.ai_insights ? (
                    <>
                      {/* Summary */}
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginBottom: 14 }}>
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: '#6C5CE7', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}><Sparkles size={11} /> AI Summary</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{analysis.ai_insights.summary}</p>
                      </div>

                      {/* Why Apply */}
                      {analysis.ai_insights.why_apply?.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} color="#00b894" /> Why This Role Fits You</p>
                          {analysis.ai_insights.why_apply.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <span style={{ color: '#00b894', fontWeight: 800, flexShrink: 0 }}>✓</span>
                              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Application Strategy */}
                      {analysis.ai_insights.application_strategy && (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.2)', marginBottom: 14 }}>
                          <p style={{ fontSize: 10.5, fontWeight: 700, color: '#6C5CE7', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}><Shield size={11} /> Application Strategy</p>
                          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{analysis.ai_insights.application_strategy}</p>
                        </div>
                      )}

                      {/* Salary */}
                      {analysis.ai_insights.salary_insight && (
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,184,148,0.06)', border: '1px solid rgba(0,184,148,0.2)', marginBottom: 14 }}>
                          <p style={{ fontSize: 10.5, fontWeight: 700, color: '#00b894', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11} /> Salary Insight</p>
                          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{analysis.ai_insights.salary_insight}</p>
                        </div>
                      )}

                      {/* Red Flags */}
                      {(analysis.ai_insights.red_flags?.filter(f => f.trim()).length ?? 0) > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, color: '#e74c3c' }}><AlertTriangle size={13} /> Potential Concerns</p>
                          {analysis.ai_insights.red_flags.filter(f => f.trim()).map((f, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                              <span style={{ color: '#e74c3c', flexShrink: 0 }}>⚠</span>
                              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)', marginBottom: 14 }}>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                          Connect an AI provider in <strong>Settings → AI Configuration</strong> to unlock personalized insights, application strategy, and salary estimates.
                        </p>
                      </div>
                      {/* Skill Gap visual */}
                      {analysis.skill_gap.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Skill Coverage ({analysis.skill_gap.filter(s => s.have).length}/{analysis.skill_gap.length})</p>
                          {analysis.skill_gap.slice(0, 12).map(item => (
                            <div key={item.skill} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.have ? '#00b894' : '#e74c3c', flexShrink: 0 }} />
                              <span style={{ fontSize: 12.5, flex: 1, color: 'var(--text-secondary)', fontWeight: item.have ? 600 : 400 }}>{item.skill}</span>
                              <span style={{ fontSize: 11, color: item.have ? '#00b894' : '#e74c3c', fontWeight: 600 }}>{item.have ? 'Have' : 'Missing'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={28} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                  <p style={{ fontSize: 13 }}>Analysis unavailable</p>
                  <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={loadAnalysis}>Retry</button>
                </div>
              )}
            </>
          )}

          {/* ── IMPROVE TAB ── */}
          {tab === 'improve' && (
            <>
              {loadingAI ? (
                <div style={{ textAlign: 'center', padding: '52px 20px' }}>
                  <Loader2 size={28} color="#6C5CE7" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Building improvement suggestions…</p>
                </div>
              ) : (
                <>
                  {/* ATS Score Panel */}
                  <div style={{ padding: '16px', borderRadius: 12, background: `${atsGrade.color}07`, border: `1px solid ${atsGrade.color}22`, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${atsGrade.color}14`, border: `2.5px solid ${atsGrade.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: atsGrade.color }}>{atsScore}%</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: atsGrade.color }}>ATS Score: {atsGrade.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Your resume's compatibility with this job's ATS</p>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${atsScore}%`, background: `linear-gradient(90deg, ${atsGrade.color}88, ${atsGrade.color})`, borderRadius: 6, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>

                  {/* Resume Improvement Suggestions */}
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}><Lightbulb size={13} color="#f0a500" /> Resume Improvement Suggestions</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(job.missing_skills?.length ?? 0) > 0 && (
                        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>① Add Missing Skills to Your Resume</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Include <strong>{job.missing_skills!.slice(0, 4).join(', ')}</strong>{job.missing_skills!.length > 4 ? ` and ${job.missing_skills!.length - 4} more` : ''} in your skills section and experience bullets.
                          </p>
                        </div>
                      )}
                      {(job.missing_keywords?.length ?? 0) > 0 && (
                        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>② Use ATS-Friendly Keywords</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            Weave these keywords naturally into your experience: <strong>{job.missing_keywords!.slice(0, 5).join(', ')}</strong>.
                          </p>
                        </div>
                      )}
                      {job.experience_gap && job.experience_gap !== 'Qualified' && job.experience_gap !== 'Unknown' && (
                        <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>③ Address Experience Gap</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            You appear {job.experience_gap === 'Overqualified' ? 'overqualified' : 'under-qualified'} for this role. {job.experience_gap === 'Overqualified' ? 'Tailor your resume to match the level, or highlight management interest.' : 'Emphasize relevant projects and accelerated growth in your cover letter.'}
                          </p>
                        </div>
                      )}
                      <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>④ Tailor Your Professional Summary</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          Customize your summary to mention <strong>{job.title}</strong> and reference <strong>{job.company}</strong>'s specific domain and key technologies.
                        </p>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⑤ Quantify Your Impact</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          Add measurable outcomes to each experience bullet — percentages, user counts, cost savings, or performance improvements.
                        </p>
                      </div>
                      {analysis?.ai_insights?.skill_tips?.length && analysis.ai_insights.skill_tips.map((tip, i) => (
                        <div key={i} style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(108,92,231,0.05)', border: '1px solid rgba(108,92,231,0.15)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#6C5CE7' }}>⑥ AI Tip {i + 1}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shortcut actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { toast('Opening ATS Checker…'); setTimeout(() => window.open('/ats-checker', '_blank'), 300); }}>
                      <Target size={12} /> ATS Check
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { toast('Opening Cover Letter…'); setTimeout(() => window.open('/cover-letter', '_blank'), 300); }}>
                      <FileText size={12} /> Cover Letter
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, background: 'var(--bg-tertiary)', flexShrink: 0 }}>
          {applyUrl ? (
            <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }} onClick={() => toast.success('Opening job application…')}>
              Apply Now <ExternalLink size={13} />
            </a>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => toast('No apply URL available.')}>Apply Now →</button>
          )}
          <button className={`btn ${saved ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => onToggleSave(job)}>
            {saved ? <><BookmarkCheck size={14} /> Saved</> : <><Bookmark size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────
export default function JobMatcherPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [jobs, setJobs]               = useState<ScrapedJob[]>([]);
  const [selected, setSelected]       = useState<ScrapedJob | null>(null);
  const [loading, setLoading]         = useState(false);
  const [hasScraped, setHasScraped]   = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeErrorType, setScrapeErrorType] = useState<string | null>(null);
  const [savedIds, setSavedIds]       = useState<string[]>([]);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);

  const [resumes, setResumes]         = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [jobTitle, setJobTitle]       = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch]           = useState('');
  const [minScore, setMinScore]       = useState(0);
  const [filterExp, setFilterExp]     = useState<string[]>([]);
  const [filterModes, setFilterModes] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterCities, setFilterCities] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [filterDate, setFilterDate]   = useState<DateFilter>('any');
  const [sortField, setSortField]     = useState<SortField>('match_score');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');

  const CITIES = [...new Set(jobs.map(j => j.location?.split(',')[0]).filter(Boolean) as string[])].slice(0, 8);

  useEffect(() => {
    get<Resume[]>('/api/resumes').then(res => {
      if (res.success && res.data?.length) { setResumes(res.data); setSelectedResumeId(res.data[0].id); }
    }).finally(() => setLoadingResumes(false));
  }, [get]);

  const handleSort = useCallback((f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  }, [sortField]);

  const toggleArr = <T,>(arr: T[], setArr: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
    setArr(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val]);

  const clearFilters = () => {
    setSearch(''); setMinScore(0); setFilterExp([]); setFilterModes([]);
    setFilterTypes([]); setFilterCities([]); setFilterPlatforms([]); setFilterDate('any');
  };

  const activeFilterCount = [
    minScore > 0, filterExp.length, filterModes.length, filterTypes.length,
    filterCities.length, filterPlatforms.length, filterDate !== 'any',
  ].filter(Boolean).length;

  const displayedJobs = useMemo(() => {
    let r = [...jobs];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(j => j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) ||
        j.skills?.some(s => s.toLowerCase().includes(q)) || j.location?.toLowerCase().includes(q));
    }
    if (minScore > 0) r = r.filter(j => j.match_score >= minScore);

    r.sort((a, b) => {
      if (sortField === 'match_score') return sortDir === 'asc' ? a.match_score - b.match_score : b.match_score - a.match_score;
      let av = '', bv = '';
      if (sortField === 'posted_date') { av = a.posted_date || ''; bv = b.posted_date || ''; }
      else if (sortField === 'company') { av = a.company || ''; bv = b.company || ''; }
      else if (sortField === 'title')   { av = a.title || ''; bv = b.title || ''; }
      else if (sortField === 'experience') { av = a.experience || ''; bv = b.experience || ''; }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    console.log('[Frontend] displayedJobs calculated. Input count:', jobs.length, 'Output count (after filter):', r.length);
    return r;
  }, [jobs, search, minScore, sortField, sortDir]);

  // Stats
  const todayJobs = useMemo(() => jobs.filter(j => withinDays(j.posted_date, 1)).length, [jobs]);
  const avgScore  = useMemo(() => jobs.length ? Math.round(jobs.reduce((s, j) => s + j.match_score, 0) / jobs.length) : 0, [jobs]);

  const scrapeJobs = useCallback(async () => {
    setLoading(true); setScrapeError(null); setScrapeErrorType(null);
    setJobs([]); setSelected(null); setPlatformResults([]);
    try {
      const res = await post<{
        jobs: ScrapedJob[]; total: number; platform_results?: PlatformResult[];
        message?: string; error_type?: string; resume_skills?: string[];
      }>('/api/jobs/scrape', { 
        job_title: jobTitle || undefined, 
        resume_id: selectedResumeId || undefined,
        locations: filterCities,
        platforms: filterPlatforms,
        experience: filterExp,
        work_modes: filterModes,
        job_types: filterTypes,
        posted_date: filterDate,
      });

      console.log('[Frontend] API Response:', res);

      if (res.success && res.data) {
        if (res.data.resume_skills) setResumeSkills(res.data.resume_skills);
        if (res.data.platform_results) setPlatformResults(res.data.platform_results);
        if (res.data.jobs?.length > 0) {
          const seen = new Set<string>();
          const deduped = res.data.jobs.filter(j => {
            const key = `${j.title?.toLowerCase()}|${j.company?.toLowerCase()}|${j.apply_url?.toLowerCase()}`;
            if (seen.has(key)) return false; seen.add(key); return true;
          });
          console.log('[Frontend] Storing jobs in state (deduped):', deduped.length);
          setJobs(deduped); setSelected(deduped[0]); setHasScraped(true);
          toast.success(`Found ${deduped.length} jobs across ${res.data.platform_results?.length || 1} platforms`);
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        } else {
          setScrapeError(res.data.message || 'No jobs found. Try a different title.'); setScrapeErrorType('ZERO_RESULTS'); setHasScraped(true);
        }
      } else {
        setScrapeError(res.error || 'Scraping failed.');
        // @ts-ignore
        setScrapeErrorType(res.error_type || 'FAILURE');
        // @ts-ignore
        if (res.platform_results) setPlatformResults(res.platform_results);
      }
    } catch { 
      setScrapeError('Unexpected error. Please try again.'); 
      setScrapeErrorType('FAILURE'); 
    }
    finally { setLoading(false); }
  }, [post, jobTitle, selectedResumeId, filterCities, filterPlatforms, filterExp, filterModes, filterTypes, filterDate]);

  const toggleSave = (job: ScrapedJob) => {
    const s = savedIds.includes(job.id);
    setSavedIds(p => s ? p.filter(x => x !== job.id) : [...p, job.id]);
    toast(s ? 'Removed from saved' : '💾 Job saved!');
  };

  const allPlatformNames = SUPPORTED_PLATFORM_NAMES;

  return (
    <AppWrapper>
      {selected && <DetailPanel job={selected} savedIds={savedIds} onToggleSave={toggleSave} onClose={() => setSelected(null)} resumeId={selectedResumeId} />}

      <div className="fade-in">

        {/* ─── Page Header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 20px rgba(108,92,231,0.38)' }}>
            <Briefcase size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 21, fontWeight: 900, fontFamily: 'var(--font-display)', marginBottom: 2 }}>Job Intelligence</h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>AI-powered job matching across 5 major platforms · Tailored to your resume</p>
          </div>
          {resumeSkills.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)' }}>
              <Zap size={13} color="#6C5CE7" />
              <span style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 700 }}>{resumeSkills.length} skills detected</span>
            </div>
          )}
        </div>

        {/* ─── Stats Cards (shown when jobs loaded) ─── */}
        {jobs.length > 0 && (
          <div ref={resultsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            <StatCard label="Total Jobs" value={jobs.length} icon={<Briefcase size={18} color="#6C5CE7" />} color="#6C5CE7" sub="Deduplicated" />
            <StatCard label="Today's Jobs" value={todayJobs || '—'} icon={<Calendar size={18} color="#00b894" />} color="#00b894" sub="Posted today" />
            <StatCard label="Avg Match Score" value={`${avgScore}%`} icon={<BarChart2 size={18} color="#f0a500" />} color="#f0a500" sub={matchLabel(avgScore)} />
            <StatCard label="Platforms" value={platformResults.length || allPlatformNames.length} icon={<Globe size={18} color="#4B9FD5" />} color="#4B9FD5" sub="Sources searched" />
          </div>
        )}

        {/* ─── Control & Filter Card ─── */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          {/* Step 1: Resume & Job Title */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <label className="input-label" style={{ fontWeight: 700 }}>1. Select Resume</label>
              {loadingResumes ? (
                <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
                </div>
              ) : resumes.length === 0 ? (
                <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                  <AlertCircle size={13} /> <button onClick={() => router.push('/resumes')} style={{ color: '#6C5CE7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Upload a resume</button>
                </div>
              ) : (
                <select className="select" value={selectedResumeId} onChange={e => setSelectedResumeId(e.target.value)}>
                  {resumes.map(r => <option key={r.id} value={r.id}>{r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename}</option>)}
                </select>
              )}
            </div>

            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <label className="input-label" style={{ fontWeight: 700 }}>2. Job Title <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
              <input className="input" placeholder="e.g. React Developer" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && selectedResumeId && (filterCities.length > 0 || filterPlatforms.length > 0 || filterExp.length > 0 || filterModes.length > 0 || filterTypes.length > 0 || minScore > 0 || filterDate !== 'any') && scrapeJobs()} />
            </div>
          </div>

          {/* Step 2: Always-Visible Filters */}
          <div style={{ marginBottom: 18 }}>
            <p className="input-label" style={{ fontWeight: 700, marginBottom: 12 }}>3. Configure Job Filters</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {/* Location (Pre-set) */}
              <div>
                <label style={filterLabelStyle}>Location</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {['Hyderabad', 'Bangalore', 'Chennai', 'Pune'].map(c => {
                    const a = filterCities.includes(c);
                    return <button key={c} onClick={() => toggleArr(filterCities, setFilterCities, c)} style={chipStyle(a, '#E37500')}>{c}</button>;
                  })}
                </div>
              </div>

              {/* Experience Required */}
              <div>
                <label style={filterLabelStyle}>Experience Level</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {EXP_LABELS.map(e => {
                    const a = filterExp.includes(e);
                    return <button key={e} onClick={() => toggleArr(filterExp, setFilterExp, e)} style={chipStyle(a, '#6C5CE7')}>{e}</button>;
                  })}
                </div>
              </div>

              {/* Work Mode */}
              <div>
                <label style={filterLabelStyle}>Work Mode</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {WORK_MODES.map(m => {
                    const a = filterModes.includes(m);
                    return <button key={m} onClick={() => toggleArr(filterModes, setFilterModes, m)} style={chipStyle(a, '#00b894')}>{m}</button>;
                  })}
                </div>
              </div>

              {/* Employment Type */}
              <div>
                <label style={filterLabelStyle}>Employment Type</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {JOB_TYPES.map(t => {
                    const a = filterTypes.includes(t);
                    return <button key={t} onClick={() => toggleArr(filterTypes, setFilterTypes, t)} style={chipStyle(a, '#f0a500')}>{t}</button>;
                  })}
                </div>
              </div>

              {/* Date Posted */}
              <div>
                <label style={filterLabelStyle}>Date Posted</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {([['any','Any'],['today','Today'],['week','This Week'],['month','This Month']] as [DateFilter,string][]).map(([val,label]) => (
                    <button key={val} onClick={() => setFilterDate(val)} style={chipStyle(filterDate === val, '#4B9FD5')}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label style={filterLabelStyle}>Platforms</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {allPlatformNames.map(p => {
                    const a = filterPlatforms.includes(p);
                    const col = PLATFORM_COLORS[p] || '#6C5CE7';
                    return <button key={p} onClick={() => toggleArr(filterPlatforms, setFilterPlatforms, p)} style={chipStyle(a, col)}>{p}</button>;
                  })}
                </div>
              </div>

              {/* Min Match Score */}
              <div>
                <label style={filterLabelStyle}>Min Match Score: <span style={{ color: '#6C5CE7' }}>{minScore}%</span></label>
                <input type="range" min={0} max={90} step={5} value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ width: '100%', accentColor: '#6C5CE7' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}><span>0%</span><span>90%</span></div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              {!(filterCities.length > 0 || filterPlatforms.length > 0 || filterExp.length > 0 || filterModes.length > 0 || filterTypes.length > 0 || minScore > 0 || filterDate !== 'any') ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} color="#6C5CE7" /> Select at least one filter above to enable the Find Jobs scan.
                </p>
              ) : (
                <p style={{ fontSize: 13, color: '#00b894', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Ready! Select "Find Jobs" to start matching.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {activeFilterCount > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  <X size={12} /> Reset Filters
                </button>
              )}
              
              {(filterCities.length > 0 || filterPlatforms.length > 0 || filterExp.length > 0 || filterModes.length > 0 || filterTypes.length > 0 || minScore > 0 || filterDate !== 'any') && (
                <button id="scrape-jobs-btn" className="btn btn-primary" onClick={scrapeJobs} disabled={loading || !selectedResumeId} style={{ minWidth: 140 }}>
                  {loading ? (
                    <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Scanning…</>
                  ) : hasScraped ? (
                    <><RefreshCw size={14} /> Refresh Jobs</>
                  ) : (
                    <><TrendingUp size={14} /> Find Jobs</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Platform source pills */}
          {platformResults.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Platforms Status:</span>
              {platformResults.map(pr => {
                const color = PLATFORM_COLORS[pr.platform] || '#6C5CE7';
                let statusLabel = '';
                let statusStyle = {};
                
                if (pr.status === 'success' || pr.status === 'no_results') {
                  statusLabel = `✅ ${pr.count} Job${pr.count === 1 ? '' : 's'}`;
                  statusStyle = { color: '#00b894', background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)' };
                } else if (pr.status === 'timeout') {
                  statusLabel = '⚠ Timeout';
                  statusStyle = { color: '#f0a500', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)' };
                } else {
                  // error / rate_limited / quota_exceeded etc.
                  let errText = 'Error';
                  if (pr.status === 'quota_exceeded') errText = 'Quota Exceeded';
                  else if (pr.status === 'email_not_verified') errText = 'Email Not Verified';
                  else if (pr.status === 'rate_limited') errText = 'Rate Limited';
                  else if (pr.status === 'api_error') errText = 'API Error';
                  
                  statusLabel = `❌ ${errText}`;
                  statusStyle = { color: '#e74c3c', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' };
                }

                return (
                  <span
                    key={pr.platform}
                    title={pr.error || undefined}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: pr.error ? 'help' : 'default',
                      ...statusStyle
                    }}
                  >
                    <span style={{ color }}>{pr.platform}</span>
                    <span>{statusLabel}</span>
                  </span>
                );
              })}
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>· {jobs.length} total matched</span>
            </div>
          )}
        </div>

        {/* ─── Error ─── */}
        {scrapeError && !loading && (
          <div style={{ display: 'flex', gap: 12, padding: '16px 18px', borderRadius: 12, marginBottom: 16, background: scrapeErrorType === 'ZERO_RESULTS' ? 'rgba(240,165,0,0.06)' : 'var(--error-bg)', border: scrapeErrorType === 'ZERO_RESULTS' ? '1px solid rgba(240,165,0,0.25)' : '1px solid rgba(231,76,60,0.2)' }}>
            <AlertCircle size={18} color={scrapeErrorType === 'ZERO_RESULTS' ? '#f0a500' : 'var(--error)'} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              {scrapeErrorType === 'NO_APIFY_TOKEN' ? (
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4, color: 'var(--text-primary)' }}>
                    Live Job Scraping Disabled
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                    Connect your Apify account to enable live job scraping.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      Create Apify Account
                    </a>
                    <a href="https://console.apify.com/account#/integrations" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      Get API Key
                    </a>
                    <button className="btn btn-primary btn-sm" onClick={() => router.push('/settings?tab=apify')}>
                      Configure in Settings
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                    {scrapeErrorType === 'ZERO_RESULTS' ? 'No Jobs Found' : 'Scraper Error'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{scrapeError}</p>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" style={{ background: '#f0a500', color: 'white', borderColor: 'transparent' }} onClick={scrapeJobs}>Retry</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Loading ─── */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 8px 28px rgba(108,92,231,0.4)', animation: 'pulseRing 1.5s ease infinite' }}>
              <Loader2 size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Scanning 4 Job Platforms…</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 26px', lineHeight: 1.7 }}>
              {resumeSkills.length > 0 ? `Using ${resumeSkills.length} skills from your resume to find the best matches.` : 'Querying Naukri, Indeed, Glassdoor, and Foundit.'} This takes 20–60 seconds.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 580, margin: '0 auto' }}>
              {allPlatformNames.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: `${PLATFORM_COLORS[p]}12`, border: `1px solid ${PLATFORM_COLORS[p]}28` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORM_COLORS[p], animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: PLATFORM_COLORS[p] }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Empty State ─── */}
        {!loading && jobs.length === 0 && !scrapeError && (
          <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 8px 28px rgba(108,92,231,0.35)' }}>
              <Briefcase size={32} color="white" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10, fontFamily: 'var(--font-display)' }}>Find Your Perfect Job</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 30px' }}>
              Select your resume and click <strong>Find Jobs</strong>. Our AI scans <strong>4 major platforms</strong> and ranks every result by how well it matches your skills, experience, and career goals.
            </p>
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 30 }}>
              {allPlatformNames.map(p => (
                <span key={p} style={{ padding: '4px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: `${PLATFORM_COLORS[p]}14`, color: PLATFORM_COLORS[p], border: `1px solid ${PLATFORM_COLORS[p]}28` }}>{p}</span>
              ))}
            </div>
            <button className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 14.5 }} onClick={scrapeJobs} disabled={loading || !selectedResumeId}>
              <TrendingUp size={16} /> Find Jobs Now
            </button>
            {!selectedResumeId && <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-muted)' }}>Upload a resume first → <button onClick={() => router.push('/resumes')} style={{ color: '#6C5CE7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Resumes</button></p>}
          </div>
        )}

        {/* ─── Results Table ─── */}
        {!loading && displayedJobs.length > 0 && (
          <>
            {/* Search + stats row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="topbar-search" style={{ flex: '1 1 220px', minWidth: 180 }}>
                <Search size={14} color="var(--text-muted)" />
                <input id="job-search" placeholder="Search title, company, skill, location…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}><X size={13} color="var(--text-muted)" /></button>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { label: '85%+', count: jobs.filter(j => j.match_score >= 85).length, color: '#00b894' },
                  { label: '70–84%', count: jobs.filter(j => j.match_score >= 70 && j.match_score < 85).length, color: '#6C5CE7' },
                  { label: '<70%', count: jobs.filter(j => j.match_score < 70).length, color: '#f0a500' },
                ].filter(s => s.count > 0).map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${s.color}12`, border: `1px solid ${s.color}28` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{s.count} {s.label}</span>
                  </div>
                ))}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{displayedJobs.length}/{jobs.length} jobs</span>
              </div>
            </div>

            {/* Banner if jobs < 20 */}
            {jobs.length > 0 && jobs.length < 20 && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(75,159,213,0.06)', border: '1px solid rgba(75,159,213,0.22)', marginBottom: 12, alignItems: 'center' }}>
                <Info size={14} color="#4B9FD5" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
                  Only {jobs.length} active jobs matched your filters.
                </p>
              </div>
            )}

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th style={thBase}>Company</th>
                      <SortTh label="Job Role"    field="title"       current={sortField} dir={sortDir} onSort={handleSort} style={{ minWidth: 190 }} />
                      <th style={thBase}>Location</th>
                      <SortTh label="Experience"  field="experience"  current={sortField} dir={sortDir} onSort={handleSort} style={{ width: 110 }} />
                      <th style={thBase}>Key Skills</th>
                      <th style={thBase}>Platform</th>
                      <SortTh label="Posted"      field="posted_date" current={sortField} dir={sortDir} onSort={handleSort} style={{ width: 80 }} />
                      <th style={{ ...thBase, textAlign: 'center', width: 88 }}>Apply</th>
                      <SortTh label="Match"       field="match_score" current={sortField} dir={sortDir} onSort={handleSort} style={{ width: 88, textAlign: 'center' as const }} />
                    </tr>
                  </thead>
                  <tbody>
                    {displayedJobs.map((job, idx) => {
                      const allSkills = getJobSkills(job);
                      const platformColor = PLATFORM_COLORS[job.source || ''] || '#6C5CE7';
                      const isSelected = selected?.id === job.id;
                      const applyUrl = (job.apply_url && job.apply_url !== '#') ? job.apply_url : job.job_url;

                      return (
                        <tr
                          key={job.id}
                          onClick={() => setSelected(job)}
                          className="ji-row"
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(108,92,231,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                            borderLeft: isSelected ? '3px solid #6C5CE7' : '3px solid transparent',
                            transition: 'all 0.14s',
                          }}
                        >
                          {/* Company */}
                          <td style={tdBase}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <CompanyLogo company={job.company} size={32} />
                              <div>
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{job.company}</p>
                                {job.work_mode && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{job.work_mode}</p>}
                              </div>
                            </div>
                          </td>

                          {/* Job Role */}
                          <td style={tdBase}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{job.title}</p>
                            {job.job_type && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{job.job_type}</p>}
                          </td>

                          {/* Location */}
                          <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              {job.location ? <><MapPin size={10} style={{ flexShrink: 0 }} />{job.location.split(',')[0]}</> : '—'}
                            </span>
                          </td>

                          {/* Experience */}
                          <td style={tdBase}>
                            {(() => {
                              const norm = normalizeExp(job.experience);
                              const expColor = norm === 'Fresher' ? '#00b894' : norm.includes('1–2') ? '#6C5CE7' : norm.includes('2–4') ? '#f0a500' : norm.includes('5+') || norm.includes('8+') ? '#e74c3c' : 'var(--text-secondary)';
                              return norm === '—'
                                ? <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>—</span>
                                : <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${expColor}14`, color: expColor, border: `1px solid ${expColor}28`, whiteSpace: 'nowrap', display: 'inline-block' }}>{norm}</span>;
                            })()}
                          </td>

                          {/* Key Skills */}
                          <td style={tdBase}>
                            <SkillsCell skills={allSkills} matchedSkills={job.matched_skills} />
                          </td>

                          {/* Platform */}
                          <td style={tdBase}>
                            <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 700, background: `${platformColor}14`, color: platformColor, border: `1px solid ${platformColor}28`, whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {job.source || '—'}
                            </span>
                          </td>

                          {/* Posted */}
                          <td style={tdBase}>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatRel(job.posted_date)}</span>
                          </td>

                          {/* Apply */}
                          <td style={{ ...tdBase, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                              {applyUrl ? (
                                <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm"
                                  style={{ padding: '4px 10px', fontSize: 11, textDecoration: 'none' }}
                                  onClick={() => toast.success('Opening job posting…')}>
                                  Apply <ExternalLink size={10} />
                                </a>
                              ) : (
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setSelected(job)}>
                                  View <ChevronRight size={10} />
                                </button>
                              )}
                              <button onClick={() => toggleSave(job)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border-color)', background: savedIds.includes(job.id) ? 'rgba(108,92,231,0.1)' : 'var(--bg-primary)', cursor: 'pointer', display: 'flex' }}>
                                {savedIds.includes(job.id) ? <BookmarkCheck size={12} color="#6C5CE7" /> : <Bookmark size={12} color="var(--text-muted)" />}
                              </button>
                            </div>
                          </td>

                          {/* Match Score */}
                          <td style={{ ...tdBase, textAlign: 'center' }}>
                            <MatchRing score={job.match_score} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {displayedJobs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-muted)' }}>
                    <Filter size={28} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                    <p style={{ fontSize: 13, fontWeight: 600 }}>No jobs match your filters</p>
                    <button className="btn btn-sm btn-secondary" style={{ marginTop: 10 }} onClick={clearFilters}>Clear Filters</button>
                  </div>
                )}
              </div>

              {/* Table footer */}
              <div style={{ padding: '11px 18px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing {displayedJobs.length} of {jobs.length} jobs · Click any row for full details &amp; AI analysis
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/ats-checker')}><Target size={12} /> ATS Check</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push('/cover-letter')}><FileText size={12} /> Cover Letter</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes panelSlide { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulseRing  { 0%,100% { box-shadow: 0 8px 28px rgba(108,92,231,0.4); } 50% { box-shadow: 0 8px 40px rgba(108,92,231,0.65); } }
        @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ji-row:hover { background: var(--bg-hover) !important; }
        @media (max-width: 900px) {
          .ji-stats { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </AppWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
//  Style helpers
// ─────────────────────────────────────────────────────────────
const thBase: React.CSSProperties = {
  padding: '11px 13px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', whiteSpace: 'nowrap', color: 'var(--text-muted)',
  background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)',
  position: 'sticky', top: 0, zIndex: 10,
};
const tdBase: React.CSSProperties = {
  padding: '11px 13px', borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle',
};
const filterLabelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 7,
};
const chipStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  border: '1px solid', transition: 'all 0.15s',
  background: active ? color : 'var(--bg-primary)',
  color: active ? 'white' : 'var(--text-secondary)',
  borderColor: active ? color : 'var(--border-color)',
});
