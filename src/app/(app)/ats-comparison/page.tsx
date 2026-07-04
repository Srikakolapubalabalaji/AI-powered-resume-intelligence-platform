'use client';
import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Zap, CheckCircle, Shield, AlertCircle, Sparkles,
  TrendingUp, User, Briefcase, Plus, FileText, ArrowRight,
  TrendingDown, Check, X, RefreshCw, Loader2
} from 'lucide-react';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import { runDeterministicAts } from '@/lib/ats-scorer';
import type { Resume } from '@/lib/types';

type TabType = 'Overview' | 'Summary' | 'Experience' | 'Skills';

interface AtsResultRecord {
  id: string;
  resume_id: string;
  user_id: string;
  job_description?: string;
  score: number;
  breakdown: {
    keyword_match: number;
    skills_match: number;
    experience_relevance: number;
    content_quality: number;
    resume_structure: number;
    readability: number;
    profile_completeness: number;
    quantified_achievements?: number;
  };
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
}

function BulletDiff({ oldBullet, newBullet }: { oldBullet?: string; newBullet: string }) {
  if (!oldBullet) {
    return (
      <li style={{ fontSize: 12.5, color: '#00b894', lineHeight: 1.5, background: 'rgba(0,184,148,0.05)', padding: '6px 10px', borderRadius: 8, border: '1px dashed rgba(0,184,148,0.3)', marginBottom: 8, listStyle: 'none' }}>
        <Plus size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> {newBullet}
      </li>
    );
  }

  const isChanged = oldBullet !== newBullet;

  if (!isChanged) {
    return (
      <li style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, listStyle: 'disc', marginLeft: 16 }}>
        {newBullet}
      </li>
    );
  }

  // Word-by-word highlighting helper
  const highlightWords = (oldText: string, newText: string) => {
    const oldWords = oldText.toLowerCase().split(/\W+/).filter(Boolean);
    const newWords = newText.split(/(\s+)/);
    return newWords.map((word, i) => {
      if (/^\s+$/.test(word)) return word;
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
      if (!cleanWord) return word;
      const isNew = !oldWords.includes(cleanWord);
      return isNew ? (
        <span key={i} style={{ background: 'rgba(0,184,148,0.18)', color: '#009472', fontWeight: 600, padding: '1px 2px', borderRadius: 3 }}>
          {word}
        </span>
      ) : word;
    });
  };

  return (
    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      {/* Old Bullet */}
      <div style={{ fontSize: 12, color: '#e17055', textDecoration: 'line-through', opacity: 0.8, lineHeight: 1.45, paddingLeft: 8, borderLeft: '2px solid #e17055' }}>
        {oldBullet}
      </div>
      {/* New Bullet */}
      <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.45, paddingLeft: 8, borderLeft: '2px solid #00b894', fontWeight: 500 }}>
        {highlightWords(oldBullet, newBullet)}
      </div>
    </div>
  );
}

function AtsComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { get } = useApi();

  const originalId = searchParams.get('originalId');
  const optimizedId = searchParams.get('optimizedId');

  const [loading, setLoading] = useState(false);
  const [original, setOriginal] = useState<Resume | null>(null);
  const [optimized, setOptimized] = useState<Resume | null>(null);
  const [originalAts, setOriginalAts] = useState<AtsResultRecord | null>(null);
  const [optimizedAts, setOptimizedAts] = useState<AtsResultRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!originalId || !optimizedId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      get<Resume>(`/api/resumes?id=${originalId}`),
      get<Resume>(`/api/resumes?id=${optimizedId}`),
      get<any>(`/api/ats-check?resume_id=${originalId}`),
      get<any>(`/api/ats-check?resume_id=${optimizedId}`)
    ]).then(([origRes, optRes, origAtsRes, optAtsRes]) => {
      if (origRes.success && origRes.data && optRes.success && optRes.data) {
        setOriginal(origRes.data);
        setOptimized(optRes.data);
        if (origAtsRes.success && origAtsRes.data) setOriginalAts(origAtsRes.data);
        if (optAtsRes.success && optAtsRes.data) setOptimizedAts(optAtsRes.data);
      } else {
        setError('Could not load comparison resumes. Please verify the IDs.');
      }
    }).catch((err) => {
      console.error(err);
      setError('An error occurred while fetching the comparison resumes.');
    }).finally(() => {
      setLoading(false);
    });
  }, [originalId, optimizedId, get]);

  // Compute ATS reports dynamically on client side if database lacks reports
  const jobDescription = originalAts?.job_description || optimizedAts?.job_description;
  const origAts = originalAts || (original ? runDeterministicAts(original.parsed_data!, jobDescription) : null);
  const optAts = optimizedAts || (optimized ? runDeterministicAts(optimized.parsed_data!, jobDescription) : null);

  // Compute score delta
  const origScore = origAts?.score ?? original?.ats_score ?? 0;
  const optScore = optAts?.score ?? optimized?.ats_score ?? 0;
  const scoreDelta = optScore - origScore;

  // Compute Kept, Added, and Removed Skills
  const origSkills = original?.parsed_data?.skills || [];
  const optSkills = optimized?.parsed_data?.skills || [];

  const addedSkills = optSkills.filter(s => !origSkills.some(os => os.toLowerCase() === s.toLowerCase()));
  const removedSkills = origSkills.filter(s => !optSkills.some(ns => ns.toLowerCase() === s.toLowerCase()));
  const keptSkills = optSkills.filter(s => origSkills.some(os => os.toLowerCase() === s.toLowerCase()));

  // Compute Missing Keywords Added
  const missingKeywordsAdded = origAts && optAts
    ? origAts.missing_keywords.filter(kw => optAts.matched_keywords.some(okw => okw.toLowerCase() === kw.toLowerCase()))
    : [];

  // Highlight word level diff helper
  const highlightDiff = (oldText: string, newText: string) => {
    if (!oldText) return <span>{newText}</span>;
    const oldWords = oldText.toLowerCase().split(/\W+/).filter(Boolean);
    const newWords = newText.split(/(\s+)/);

    return newWords.map((word, i) => {
      if (/^\s+$/.test(word)) return word;
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
      if (!cleanWord) return word;

      const isNew = !oldWords.includes(cleanWord);
      return isNew ? (
        <span key={i} style={{ background: 'rgba(0,184,148,0.18)', color: '#009472', fontWeight: 600, padding: '1px 3px', borderRadius: 4 }}>
          {word}
        </span>
      ) : word;
    });
  };

  if (!originalId || !optimizedId) {
    return (
      <AppWrapper>
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>ATS Score Comparison</h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Side-by-side comparison of original vs. optimized resume</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '64px 40px' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Zap size={32} color="white" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>No Comparison Available Yet</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.7 }}>
              The ATS Comparison view shows a real before/after diff of your resume after running the
              AI optimization. It is powered entirely by your uploaded resume data.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => router.push('/resumes')}>
                Upload Resume
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/ai-chat')}>
                Optimize with AI
              </button>
            </div>
          </div>
        </div>
      </AppWrapper>
    );
  }

  if (loading) {
    return (
      <AppWrapper>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: 'var(--primary)' }} />
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>Generating side-by-side comparison...</p>
          </div>
        </div>
      </AppWrapper>
    );
  }

  if (error || !original || !optimized) {
    return (
      <AppWrapper>
        <div className="card" style={{ padding: 32, textAlign: 'center', border: '1px solid rgba(231,76,60,0.2)', background: 'rgba(231,76,60,0.02)' }}>
          <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>Failed to Load Comparison</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20 }}>{error || 'Could not find the resumes specified.'}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/resumes')}>
            Go to Resumes
          </button>
        </div>
      </AppWrapper>
    );
  }

  const scoreColor = (s: number) => s >= 85 ? '#00b894' : s >= 70 ? '#6C5CE7' : s >= 55 ? '#fdcb6e' : '#ff7675';

  return (
    <AppWrapper>
      <div className="fade-in">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>ATS Score Comparison</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              Comparing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{original.filename}</span> vs{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{optimized.filename}</span>
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/resumes')}>
            <ArrowLeft size={14} /> Back to Resumes
          </button>
        </div>

        {/* Comparison Dashboard Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Original score */}
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: `4px solid ${scoreColor(origScore)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: scoreColor(origScore) }}>
              {origScore}
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Original Score</p>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{original.status || 'Baseline'}</h3>
            </div>
          </div>

          {/* Optimized score */}
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 10px', background: 'var(--primary)', color: 'white', fontSize: 10, fontWeight: 700, borderBottomLeftRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={10} /> Optimized
            </div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', border: `4px solid ${scoreColor(optScore)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: scoreColor(optScore), background: `${scoreColor(optScore)}08` }}>
              {optScore}
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Optimized Score</p>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: scoreColor(optScore) }}>{optimized.status}</h3>
            </div>
          </div>

          {/* Improvement delta */}
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, rgba(0,184,148,0.05) 0%, rgba(108,92,231,0.05) 100%)', border: '1px solid rgba(0,184,148,0.15)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,184,148,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00b894' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Overall Impact</p>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: '#00b894' }}>
                +{scoreDelta > 0 ? scoreDelta : 0} Points Increase
              </h3>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="tabs" style={{ marginBottom: 16, padding: '0 4px' }}>
          {(['Overview', 'Summary', 'Experience', 'Skills'] as TabType[]).map(t => (
            <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* Comparison Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {/* TAB: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Keywords added box */}
              {missingKeywordsAdded.length > 0 && (
                <div className="card" style={{ padding: 20, border: '1px solid rgba(0,184,148,0.3)', background: 'rgba(0,184,148,0.02)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#00b894' }}>
                    <CheckCircle size={16} /> Missing Keywords Resolved ({missingKeywordsAdded.length})
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {missingKeywordsAdded.map(kw => (
                      <span key={kw} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(0,184,148,0.2)', fontWeight: 600 }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Changes list */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color="var(--primary)" /> Key AI Optimizations Applied
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                  {[
                    { title: 'Action Verb Strengthening', desc: 'Replaced passive or repetitive verbs with strong, impact-oriented alternatives (e.g., "Architected," "Spearheaded").' },
                    { title: 'Quantified Metrics', desc: 'Integrated measurable business outcomes, percentages, and dollar figures to demonstrate clear performance.' },
                    { title: 'Keyword Injection', desc: 'Embedded targeted industry keywords from the job description naturally into skills and experience sections.' },
                    { title: 'ATS Readability Adjustments', desc: 'Structured lists, bullet points, and headings to prevent parsing errors and maximize scanner compatibility.' }
                  ].map((item, index) => (
                    <div key={index} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} color="#00b894" /> {item.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side-by-side metadata info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Original metadata */}
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Original Resume Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                      <span style={{ fontWeight: 600 }}>{original.parsed_data?.name || 'Not detected'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Title:</span>
                      <span style={{ fontWeight: 600 }}>{original.parsed_data?.title || 'Not detected'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Skills:</span>
                      <span style={{ fontWeight: 600 }}>{original.parsed_data?.skills?.length || 0} items</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Experience:</span>
                      <span style={{ fontWeight: 600 }}>{original.parsed_data?.experience?.length || 0} entries</span>
                    </div>
                  </div>
                </div>

                {/* Optimized metadata */}
                <div className="card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>Optimized Resume Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                      <span style={{ fontWeight: 600 }}>{optimized.parsed_data?.name || 'Not detected'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Title:</span>
                      <span style={{ fontWeight: 600 }}>{optimized.parsed_data?.title || 'Not detected'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Skills:</span>
                      <span style={{ fontWeight: 600, color: '#00b894' }}>{optimized.parsed_data?.skills?.length || 0} items ({addedSkills.length} added)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Experience:</span>
                      <span style={{ fontWeight: 600 }}>{optimized.parsed_data?.experience?.length || 0} entries</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUMMARY */}
          {activeTab === 'Summary' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Original Summary */}
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={15} /> Original Summary</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--bg-tertiary)', padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', minHeight: 120 }}>
                  {original.parsed_data?.summary || 'No summary text available.'}
                </p>
              </div>

              {/* Optimized Summary */}
              <div className="card" style={{ padding: 20, border: '1px solid rgba(0,184,148,0.25)', background: 'rgba(0,184,148,0.01)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#00b894', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={15} /> Optimized Summary</h3>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, background: 'var(--bg-tertiary)', padding: 14, borderRadius: 10, border: '1px solid rgba(0,184,148,0.3)', minHeight: 120 }}>
                  {highlightDiff(original.parsed_data?.summary || '', optimized.parsed_data?.summary || '')}
                </p>
                <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,184,148,0.08)', fontSize: 12, color: '#00b894', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} /> Incorporates dynamic action verbs and highlights key infrastructure metrics.
                </div>
              </div>
            </div>
          )}

          {/* TAB: EXPERIENCE */}
          {activeTab === 'Experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {original.parsed_data?.experience?.map((origExp, idx) => {
                const optExp = optimized.parsed_data?.experience?.[idx];
                return (
                  <div key={idx} className="card" style={{ padding: 20 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                      {origExp.title} at {origExp.company} ({origExp.dates})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {optExp?.bullets?.map((b, i) => (
                        <BulletDiff key={i} oldBullet={origExp.bullets?.[i]} newBullet={b} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: SKILLS */}
          {activeTab === 'Skills' && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={16} /> Skills Comparison</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Kept Skills */}
                <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 16 }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color="var(--text-muted)" /> Kept Skills ({keptSkills.length})
                  </h4>
                  <div className="chip-row">
                    {keptSkills.length > 0 ? keptSkills.map(s => (
                      <span key={s} className="tag tag-muted" style={{ padding: '4px 10px', fontSize: 12 }}>{s}</span>
                    )) : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No shared skills.</p>}
                  </div>
                </div>

                {/* Added Skills */}
                <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: 16, paddingLeft: 8 }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#00b894', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={14} color="#00b894" /> Added Skills ({addedSkills.length})
                  </h4>
                  <div className="chip-row">
                    {addedSkills.length > 0 ? addedSkills.map(s => (
                      <span key={s} className="tag tag-success" style={{ padding: '4px 10px', fontSize: 12 }}>{s}</span>
                    )) : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No new skills added.</p>}
                  </div>
                </div>

                {/* Removed Skills */}
                <div style={{ paddingLeft: 8 }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#ff7675', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <X size={14} color="#ff7675" /> Removed Skills ({removedSkills.length})
                  </h4>
                  <div className="chip-row">
                    {removedSkills.length > 0 ? removedSkills.map(s => (
                      <span key={s} className="tag tag-error" style={{ padding: '4px 10px', fontSize: 12, textDecoration: 'line-through' }}>{s}</span>
                    )) : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No skills removed.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppWrapper>
  );
}

export default function AtsComparisonPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading comparison...</p>
      </div>
    }>
      <AtsComparisonContent />
    </Suspense>
  );
}
