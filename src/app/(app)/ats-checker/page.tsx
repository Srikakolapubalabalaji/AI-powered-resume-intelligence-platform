'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Target, CheckCircle, XCircle, ChevronDown, RefreshCw, Shield, AlertCircle, UploadCloud, Loader2, Sparkles, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Resume, ParsedResume, AtsSuggestion } from '@/lib/types';

interface AtsResult {
  id?: string;
  score: number;
  label: string;
  breakdown: {
    keyword_match: number;
    skills_match: number;
    experience_relevance: number;
    quantified_achievements?: number;
    content_quality: number;
    resume_structure: number;
    readability: number;
    profile_completeness: number;
    contact_info?: number;
    explanations?: {
      keyword_match: string;
      skills_match: string;
      experience_relevance: string;
      quantified_achievements: string;
      resume_structure: string;
      readability: string;
      profile_completeness: string;
      contact_info: string;
    };
  };
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: (string | AtsSuggestion)[];
  qualitative_available?: boolean;
  strengths?: string[];
  weaknesses?: string[];
  qualitative_error?: string;
  industry_relevance?: string;
}

// Word-level diff token
interface DiffToken {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

// Deterministic word-level diffing utility
function diffWords(one: string, two: string): DiffToken[] {
  const words1 = (one || '').split(/(\s+)/);
  const words2 = (two || '').split(/(\s+)/);
  
  const dp: number[][] = Array(words1.length + 1).fill(null).map(() => Array(words2.length + 1).fill(0));
  for (let i = 1; i <= words1.length; i++) {
    for (let j = 1; j <= words2.length; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = words1.length;
  let j = words2.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && words1[i - 1] === words2[j - 1]) {
      result.unshift({ type: 'unchanged', value: words1[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: words2[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: words1[i - 1] });
      i--;
    }
  }
  return result;
}

// Renders JSX for color-coded word highlights
function renderDiffText(original: string, optimized: string) {
  const diffs = diffWords(original, optimized);
  return (
    <span style={{ lineHeight: 1.6, fontSize: 13, color: 'var(--text-secondary)' }}>
      {diffs.map((token, idx) => {
        if (token.type === 'added') {
          return (
            <ins key={idx} style={{ background: 'rgba(0,184,148,0.15)', color: '#00b894', textDecoration: 'none', padding: '0 2px', borderRadius: 2, fontWeight: 500 }}>
              {token.value}
            </ins>
          );
        }
        if (token.type === 'removed') {
          return (
            <del key={idx} style={{ background: 'rgba(255,118,117,0.15)', color: '#ff7675', textDecoration: 'line-through', padding: '0 2px', borderRadius: 2 }}>
              {token.value}
            </del>
          );
        }
        return <span key={idx}>{token.value}</span>;
      })}
    </span>
  );
}

export default function AtsCheckerPage() {
  const router = useRouter();
  const { post, get } = useApi();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'Overview' | 'Keyword Match' | 'Suggestions' | 'Before vs After'>('Overview');
  
  // JD States
  const [autoJd, setAutoJd] = useState('');
  const [manualJd, setManualJd] = useState('');
  const [jdSource, setJdSource] = useState<'auto' | 'manual'>('auto');
  const [showJdInput, setShowJdInput] = useState(false);
  const [generatingJd, setGeneratingJd] = useState(false);
  const [showJdModal, setShowJdModal] = useState(false);

  // Resume selection
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Run scoring states
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimization comparison states
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<AtsResult | null>(null);
  const [optimizedResumeData, setOptimizedResumeData] = useState<ParsedResume | null>(null);
  const [originalResumeData, setOriginalResumeData] = useState<ParsedResume | null>(null);
  const [changesList, setChangesList] = useState<string[]>([]);

  useEffect(() => {
    get<Resume[]>('/api/resumes').then(res => {
      if (res.success && res.data) {
        setResumes(res.data);
        if (res.data.length > 0) setSelectedResumeId(res.data[0].id);
      }
    }).finally(() => setLoadingResumes(false));
  }, [get]);

  // Auto-generate JD when selectedResumeId changes
  useEffect(() => {
    if (!selectedResumeId) return;
    const triggerGenerateJd = async () => {
      setGeneratingJd(true);
      setAutoJd('');
      try {
        const res = await post<{ jd: string }>('/api/ats-check/generate-jd', {
          resume_id: selectedResumeId,
        });
        if (res.success && res.data?.jd) {
          setAutoJd(res.data.jd);
          setJdSource('auto');
          setShowJdInput(true);
        }
      } catch (err) {
        console.error('Failed to auto-generate JD', err);
      } finally {
        setGeneratingJd(false);
      }
    };
    triggerGenerateJd();
  }, [selectedResumeId]); // eslint-disable-line

  const runCheck = async () => {
    if (!selectedResumeId) {
      toast.error('Please select a resume first.');
      return;
    }
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    const activeJd = jdSource === 'auto' ? autoJd : manualJd;
    setRunning(true);
    setError(null);
    setResult(null);
    setOptimizedResult(null); // clear old optimizations when running new check
    setOptimizedResumeData(null);
    setActiveTab('Overview');
    try {
      const res = await post<AtsResult>('/api/ats-check', {
        resume_id: selectedResumeId,
        parsed_resume: selectedResume?.parsed_data || undefined,
        job_description: activeJd || undefined,
      });
      if (res.success && res.data) {
        setResult(res.data);
        toast.success(`ATS analysis complete — Score: ${res.data.score}/100`);
      } else {
        setError(res.error || 'ATS analysis failed. Please try again.');
        toast.error(res.error || 'Analysis failed.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unexpected error during analysis. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const optimizeResume = async () => {
    if (!selectedResumeId || !result) {
      toast.error('Please select a resume and run ATS check first.');
      return;
    }
    const selectedResume = resumes.find(r => r.id === selectedResumeId);
    if (!selectedResume) return;

    const activeJd = jdSource === 'auto' ? autoJd : manualJd;
    setOptimizing(true);
    setOptimizedResult(null);
    setOptimizedResumeData(null);
    setOriginalResumeData(selectedResume.parsed_data || null);

    try {
      const res = await post<any>('/api/optimize', {
        resume_id: selectedResumeId,
        job_description: activeJd || undefined,
      });

      if (res.success && res.data) {
        const { optimized, changes, optimizedId } = res.data;
        setOptimizedResumeData(optimized);
        setChangesList(changes || []);

        // Fetch ATS Score details of optimized version
        const optCheck = await post<AtsResult>('/api/ats-check', {
          resume_id: optimizedId,
          parsed_resume: optimized,
          job_description: activeJd || undefined,
        });

        if (optCheck.success && optCheck.data) {
          setOptimizedResult(optCheck.data);
          setActiveTab('Before vs After');
          toast.success(`Resume optimized successfully! Score boosted to ${optCheck.data.score}/100.`);
          // Re-fetch resumes to update client dropdowns and list scores
          get<Resume[]>('/api/resumes').then(rRes => {
            if (rRes.success && rRes.data) {
              setResumes(rRes.data);
            }
          });
        } else {
          toast.error('Failed to score optimized resume.');
        }
      } else {
        toast.error(res.error || 'AI Optimization failed.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred during AI optimization.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleCreateJdClick = () => {
    setShowJdModal(true);
  };

  const handleCreateJdOption = async (option: 'auto' | 'manual') => {
    setShowJdModal(false);
    if (option === 'manual') {
      setManualJd('');
      setJdSource('manual');
      setShowJdInput(true);
      toast.success('Ready to write manual job description.');
    } else {
      setGeneratingJd(true);
      setAutoJd('');
      setJdSource('auto');
      setShowJdInput(true);
      try {
        const res = await post<{ jd: string }>('/api/ats-check/generate-jd', {
          resume_id: selectedResumeId,
        });
        if (res.success && res.data?.jd) {
          setAutoJd(res.data.jd);
          toast.success('Successfully generated job description.');
        } else {
          toast.error(res.error || 'Failed to generate job description.');
        }
      } catch {
        toast.error('Failed to generate job description.');
      } finally {
        setGeneratingJd(false);
      }
    }
  };

  const circ = 2 * Math.PI * 60;
  const scoreColor = (s: number) => s >= 75 ? '#00b894' : s >= 55 ? '#6C5CE7' : s >= 30 ? '#fdcb6e' : '#ff7675';

  const tabsList = optimizedResult
    ? (['Overview', 'Keyword Match', 'Suggestions', 'Before vs After'] as const)
    : (['Overview', 'Keyword Match', 'Suggestions'] as const);

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header controls */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="input-label">Select Resume to Analyze</label>
              {loadingResumes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading resumes…
                </div>
              ) : resumes.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 13 }}>
                  <AlertCircle size={14} /> No resumes uploaded yet
                </div>
              ) : (
                <select className="select" value={selectedResumeId} onChange={e => { setSelectedResumeId(e.target.value); setOptimizedResult(null); }}>
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename}
                      {r.ats_score ? ` — ATS: ${r.ats_score}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="input-label">Job Description (Optional)</label>
              <button onClick={() => setShowJdInput(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', fontSize: 13.5, color: 'var(--text-muted)', width: '100%' }}>
                {showJdInput ? 'Hide JD Panel' : 'Job Description Options'} <ChevronDown size={14} />
              </button>
            </div>
            <button id="run-ats-btn" onClick={runCheck} disabled={running || resumes.length === 0} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
              {running
                ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                : <><Target size={15} /> Run ATS Analysis</>}
            </button>
          </div>

          {/* JD Switcher & Area */}
          {showJdInput && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', padding: 3, borderRadius: 8 }}>
                  <button
                    onClick={() => setJdSource('auto')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: jdSource === 'auto' ? 'var(--primary)' : 'transparent',
                      color: jdSource === 'auto' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    Auto-generated
                  </button>
                  <button
                    onClick={() => setJdSource('manual')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: jdSource === 'manual' ? 'var(--primary)' : 'transparent',
                      color: jdSource === 'manual' ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    Manual
                  </button>
                </div>

                {generatingJd ? (
                  <span style={{ fontSize: 11.5, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating matching job description...
                  </span>
                ) : jdSource === 'auto' && autoJd ? (
                  <span style={{ fontSize: 11.5, padding: '3px 8px', borderRadius: 20, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(0,184,148,0.2)', fontWeight: 500 }}>
                    ✨ AI-suggested JD based on your resume — edit freely or replace
                  </span>
                ) : null}

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleCreateJdClick}
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                    disabled={generatingJd || !selectedResumeId}
                  >
                    <Plus size={10} /> Create JD
                  </button>
                </div>
              </div>

              <textarea
                className="textarea"
                style={{ marginTop: 4, width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: 12.5 }}
                rows={6}
                placeholder={
                  jdSource === 'auto'
                    ? "AI will generate a matching job description here..."
                    : "Paste a job description here manually..."
                }
                value={jdSource === 'auto' ? autoJd : manualJd}
                onChange={(e) => {
                  if (jdSource === 'auto') {
                    setAutoJd(e.target.value);
                  } else {
                    setManualJd(e.target.value);
                  }
                }}
                disabled={generatingJd}
              />
            </div>
          )}

          {showJdModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
            }}>
              <div className="card" style={{
                width: '100%',
                maxWidth: 400,
                padding: 24,
                boxShadow: 'var(--shadow-xl)',
                background: 'var(--bg-elevated)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Create Alternate Job Description</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Choose how you would like to compose the new job description.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={() => handleCreateJdOption('auto')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  >
                    <Sparkles size={16} color="var(--primary)" /> Auto-generate using AI
                  </button>
                  <button
                    onClick={() => handleCreateJdOption('manual')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  >
                    <Plus size={16} color="#00b894" /> Write manually from scratch
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowJdModal(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {resumes.length === 0 && !loadingResumes && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <UploadCloud size={15} color="var(--primary)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Upload a resume first to run an ATS analysis.
              </span>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => router.push('/resumes')}>
                Upload Resume →
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--error-bg)', border: '1px solid rgba(231,76,60,.2)', marginBottom: 16 }}>
            <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--error)', marginBottom: 3 }}>Analysis Failed</p>
              <p style={{ fontSize: 13, color: 'var(--error)' }}>{error}</p>
              <button className="btn btn-sm" style={{ marginTop: 8, background: 'var(--error)', color: 'white', borderColor: 'transparent' }} onClick={runCheck}>
                Retry Analysis
              </button>
            </div>
          </div>
        )}

        {/* Empty/Placeholder State — before any run */}
        {!result && !error && !running && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Target size={28} color="white" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Run Your First ATS Analysis</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto' }}>
              Select a resume above and click "Run ATS Analysis" to get a detailed keyword match report, content quality score, and actionable suggestions.
            </p>
          </div>
        )}

        {/* Running loader */}
        {running && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Loader2 size={40} color="#6C5CE7" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: 15 }}>Analyzing resume…</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Running deterministic keyword and content checks</p>
          </div>
        )}

        {/* Optimizing Loader */}
        {optimizing && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Loader2 size={40} color="#00b894" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 700, fontSize: 15, color: '#00b894' }}>Optimizing Resume with AI...</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rewriting experience bullets, targeting keyword match rate, and injecting quantified metrics</p>
          </div>
        )}

        {/* Results */}
        {result && !running && !optimizing && (
          <div className="card">
            {result.qualitative_error && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(253,203,110,0.08)' }}>
                <AlertCircle size={14} color="#fdcb6e" />
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{result.qualitative_error}</span>
              </div>
            )}

            <div className="tabs" style={{ padding: '0 4px' }}>
              {tabsList.map(t => <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
            </div>

            <div style={{ padding: 20 }}>
              {/* OVERVIEW */}
              {activeTab === 'Overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 28, alignItems: 'start' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={70} cy={70} r={60} fill="none" stroke="var(--border-color)" strokeWidth={12} />
                        <circle cx={70} cy={70} r={60} fill="none" stroke={scoreColor(result.score)} strokeWidth={12}
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - result.score / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                        <p style={{ fontSize: 34, fontWeight: 900, color: scoreColor(result.score), lineHeight: 1 }}>{result.score}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: scoreColor(result.score), marginTop: 6 }}>{result.label}</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: `${scoreColor(result.score)}15`, border: `1px solid ${scoreColor(result.score)}30`, marginTop: 8 }}>
                      <Shield size={13} color={scoreColor(result.score)} />
                      <span style={{ fontSize: 11.5, color: scoreColor(result.score), fontWeight: 600 }}>
                        {result.score >= 55 ? 'ATS Compatible' : 'Needs Improvement'}
                      </span>
                    </div>
                    {result.score >= 75 && (
                      <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>Your resume is well-optimized for standard ATS screening systems.</p>
                    )}
                  </div>

                  <div>
                    {result.strengths && result.strengths.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#00b894', marginBottom: 8 }}>✅ Strengths</p>
                        {result.strengths.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <CheckCircle size={14} color="#00b894" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Score Breakdown</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                       {[
                         { label: 'Keyword Relevance',          pts: result.breakdown.keyword_match,                 max: 20, key: 'keyword_match' },
                         { label: 'Skills Matching',            pts: result.breakdown.skills_match,                  max: 20, key: 'skills_match' },
                         { label: 'Experience Relevance',       pts: result.breakdown.experience_relevance,          max: 15, key: 'experience_relevance' },
                         { label: 'Quantified Achievements',    pts: result.breakdown.quantified_achievements ?? 0,  max: 15, key: 'quantified_achievements' },
                         { label: 'Resume Formatting / Structure', pts: result.breakdown.resume_structure,            max: 10, key: 'resume_structure' },
                         { label: 'Section & Profile Completeness', pts: result.breakdown.profile_completeness,          max: 10, key: 'profile_completeness' },
                         { label: 'ATS Readability / Length',   pts: result.breakdown.readability,                   max: 5,  key: 'readability' },
                         { label: 'Contact Info Validation',    pts: result.breakdown.contact_info ?? 0,             max: 5,  key: 'contact_info' },
                       ].map(s => {
                         const pct = Math.round((s.pts / (s.max || 1)) * 100);
                         const color = pct >= 80 ? '#00b894' : pct >= 60 ? '#6C5CE7' : pct >= 40 ? '#fdcb6e' : '#ff7675';
                         const explanation = result.breakdown.explanations?.[s.key as keyof typeof result.breakdown.explanations];
                         
                         return (
                           <div key={s.label}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                               <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</span>
                               <span style={{ fontSize: 13, fontWeight: 700, color }}>{s.pts}/{s.max}</span>
                             </div>
                             <div className="progress-bar">
                               <div className="progress-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
                             </div>
                             {explanation && (
                               <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
                                 {explanation}
                               </p>
                             )}
                           </div>
                         );
                       })}
                     </div>
                  </div>
                </div>
              )}

              {/* KEYWORD MATCH */}
              {activeTab === 'Keyword Match' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: 'var(--success)' }}>
                      ✅ Matched Keywords ({result.matched_keywords.length})
                    </p>
                    {result.matched_keywords.length > 0 ? (
                      <div className="chip-row" style={{ marginBottom: 20 }}>
                        {result.matched_keywords.map(k => <span key={k} className="tag tag-success">{k}</span>)}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No matching keywords detected.</p>
                    )}

                    <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: 'var(--error)' }}>
                      ❌ Missing Keywords ({result.missing_keywords.length})
                    </p>
                    {result.missing_keywords.length > 0 ? (
                      <div className="chip-row">
                        {result.missing_keywords.map(k => <span key={k} className="tag tag-error">{k}</span>)}
                      </div>
                    ) : (
                      <p style={{ color: '#00b894', fontSize: 13, fontWeight: 600 }}>🎉 All expected keywords are present!</p>
                    )}
                  </div>
                  <div>
                    {result.weaknesses && result.weaknesses.length > 0 && (
                      <>
                        <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, color: '#e17055' }}>⚠️ Areas to Improve</p>
                        {result.weaknesses.map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <XCircle size={14} color="#e17055" style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{w}</p>
                          </div>
                        ))}
                      </>
                    )}
                    {result.industry_relevance && (
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', marginTop: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Industry Relevance</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.industry_relevance}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUGGESTIONS */}
              {activeTab === 'Suggestions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.suggestions.length > 0 ? result.suggestions.map((s, i) => {
                    const isObj = typeof s === 'object' && s !== null;
                    const text = isObj ? (s as any).text : s;
                    const impact = isObj ? (s as any).impact : null;
                    const section = isObj ? (s as any).section : null;

                    return (
                      <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{i + 1}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            {section && (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(108,92,231,0.08)', color: 'var(--primary)', fontWeight: 600 }}>
                                {section}
                              </span>
                            )}
                            {impact && (
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: impact.includes('+') ? 'rgba(0,184,148,0.08)' : 'var(--bg-secondary)', color: impact.includes('+') ? '#00b894' : 'var(--text-secondary)', fontWeight: 700 }}>
                                {impact.includes('+') ? `Impact: ${impact}` : impact}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</p>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, alignSelf: 'center' }} onClick={optimizeResume}>
                          Fix with AI
                        </button>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      <CheckCircle size={32} color="#00b894" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#00b894' }}>No major improvements needed!</p>
                      <p style={{ fontSize: 13, marginTop: 4 }}>Your resume is already well-optimized.</p>
                    </div>
                  )}
                </div>
              )}

              {/* BEFORE VS AFTER COMPARISON */}
              {activeTab === 'Before vs After' && optimizedResult && (() => {
                const scoreDiff = optimizedResult.score - result.score;
                const diffSign = scoreDiff > 0 ? '+' : '';
                const diffColor = scoreDiff > 0 ? '#00b894' : scoreDiff < 0 ? '#ff7675' : 'var(--text-secondary)';
                const diffPercent = result.score > 0 ? Math.round((scoreDiff / result.score) * 100) : 0;

                const keywordsAdded = optimizedResult.matched_keywords.filter(k => !result.matched_keywords.includes(k));
                const skillsAdded = (optimizedResumeData?.skills ?? []).filter(s => !(originalResumeData?.skills ?? []).some(os => os.toLowerCase() === s.toLowerCase()));
                
                const sectionsImproved: string[] = [];
                const categories = [
                  { label: 'Keyword Relevance',          key: 'keyword_match' },
                  { label: 'Skills Matching',            key: 'skills_match' },
                  { label: 'Experience Relevance',       key: 'experience_relevance' },
                  { label: 'Quantified Achievements',    key: 'quantified_achievements' },
                  { label: 'Resume Formatting / Structure', key: 'resume_structure' },
                  { label: 'Section & Profile Completeness', key: 'profile_completeness' },
                  { label: 'ATS Readability / Length',   key: 'readability' },
                  { label: 'Contact Info Validation',    key: 'contact_info' },
                ];
                categories.forEach(cat => {
                  const origVal = (result.breakdown[cat.key as keyof typeof result.breakdown] as number) || 0;
                  const optVal = (optimizedResult.breakdown[cat.key as keyof typeof optimizedResult.breakdown] as number) || 0;
                  if (optVal > origVal) {
                    sectionsImproved.push(`${cat.label} (+${optVal - origVal} pts)`);
                  } else if (optVal < origVal) {
                    sectionsImproved.push(`${cat.label} (${optVal - origVal} pts)`);
                  }
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Score improvement summary */}
                    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: 18, background: 'linear-gradient(135deg, rgba(108,92,231,0.04), rgba(0,184,148,0.04))', border: '1px solid var(--border-color)', borderRadius: 12 }}>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Original Score</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: scoreColor(result.score) }}>{result.score}</p>
                      </div>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Optimized Score</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: scoreColor(optimizedResult.score) }}>{optimizedResult.score}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Improvement</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: diffColor }}>
                          {diffSign}{scoreDiff} pts ({diffSign}{diffPercent}%)
                        </p>
                      </div>
                    </div>

                    {/* Improvement Metrics Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div className="card" style={{ padding: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                        <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>🔑 Keywords Added ({keywordsAdded.length})</p>
                        {keywordsAdded.length > 0 ? (
                          <div className="chip-row">
                            {keywordsAdded.map(k => <span key={k} className="tag tag-success" style={{ fontSize: 11 }}>{k}</span>)}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No keywords added.</p>
                        )}
                      </div>
                      
                      <div className="card" style={{ padding: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                        <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>🚀 Skills Added ({skillsAdded.length})</p>
                        {skillsAdded.length > 0 ? (
                          <div className="chip-row">
                            {skillsAdded.map(s => <span key={s} className="tag tag-success" style={{ fontSize: 11 }}>{s}</span>)}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No skills added.</p>
                        )}
                      </div>

                      <div className="card" style={{ padding: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                        <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>📈 Sections Improved ({sectionsImproved.length})</p>
                        {sectionsImproved.length > 0 ? (
                          <ul style={{ paddingLeft: 14, margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {sectionsImproved.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        ) : (
                          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No sections improved.</p>
                        )}
                      </div>
                    </div>

                    {/* Changes List */}
                    {changesList.length > 0 && (
                      <div className="card" style={{ padding: 16 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--primary)' }}>⚙️ Modifications Implemented by AI</h4>
                        <ul style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {changesList.map((c, i) => (
                            <li key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Color legend */}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 500, justifyContent: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(0,184,148,0.15)', border: '1px solid #00b894' }}></span>
                      <span style={{ color: '#00b894' }}>Added content</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(253,203,110,0.15)', border: '1px solid #fdcb6e' }}></span>
                      <span style={{ color: '#dca134' }}>Modified elements</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(255,118,117,0.15)', border: '1px solid #ff7675' }}></span>
                      <span style={{ color: '#ff7675' }}>Removed content</span>
                    </div>
                  </div>

                  {/* Section Diffs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Summary Diff */}
                    {originalResumeData?.summary && optimizedResumeData?.summary && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Professional Summary</h4>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--bg-secondary)', borderLeft: '3px solid #fdcb6e' }}>
                          {renderDiffText(originalResumeData.summary, optimizedResumeData.summary)}
                        </div>
                      </div>
                    )}

                    {/* Skills Diff */}
                    {originalResumeData?.skills && optimizedResumeData?.skills && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Core Skills Alignment</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--bg-secondary)' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Original Skills ({originalResumeData.skills.length})</p>
                            <div className="chip-row">
                              {originalResumeData.skills.map(s => {
                                const isRemoved = !optimizedResumeData.skills.some(os => os.toLowerCase() === s.toLowerCase());
                                return (
                                  <span key={s} className="tag" style={{
                                    background: isRemoved ? 'rgba(255,118,117,0.1)' : 'var(--bg-tertiary)',
                                    color: isRemoved ? '#ff7675' : 'var(--text-secondary)',
                                    textDecoration: isRemoved ? 'line-through' : 'none',
                                    border: isRemoved ? '1px solid rgba(255,118,117,0.2)' : '1px solid var(--border-color)'
                                  }}>
                                    {s}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: 'var(--bg-secondary)' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Optimized Skills ({optimizedResumeData.skills.length})</p>
                            <div className="chip-row">
                              {optimizedResumeData.skills.map(s => {
                                const isAdded = !originalResumeData.skills.some(os => os.toLowerCase() === s.toLowerCase());
                                return (
                                  <span key={s} className="tag" style={{
                                    background: isAdded ? 'rgba(0,184,148,0.1)' : 'var(--bg-tertiary)',
                                    color: isAdded ? '#00b894' : 'var(--text-secondary)',
                                    fontWeight: isAdded ? 600 : 400,
                                    border: isAdded ? '1px solid rgba(0,184,148,0.2)' : '1px solid var(--border-color)'
                                  }}>
                                    {isAdded && '+ '}{s}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Experience Bullets Diff */}
                    {originalResumeData?.experience && optimizedResumeData?.experience && (
                      <div>
                        <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Work Experience Bullet Points</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {optimizedResumeData.experience.map((optExp, expIdx) => {
                            const origExp = originalResumeData.experience[expIdx];
                            return (
                              <div key={expIdx} style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{optExp.title} @ {optExp.company}</span>
                                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{optExp.dates}</span>
                                </div>
                                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {optExp.bullets.map((optBullet, bulletIdx) => {
                                    const origBullet = origExp?.bullets?.[bulletIdx] || '';
                                    const isModified = origBullet && origBullet !== optBullet;
                                    const isAdded = !origBullet;

                                    return (
                                      <div key={bulletIdx} style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        background: isAdded ? 'rgba(0,184,148,0.03)' : isModified ? 'rgba(253,203,110,0.03)' : 'transparent',
                                        borderLeft: isAdded ? '3px solid #00b894' : isModified ? '3px solid #fdcb6e' : '1px solid transparent',
                                      }}>
                                        {isAdded ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#00b894', textTransform: 'uppercase', letterSpacing: '.06em' }}>[Added Bullet]</span>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{optBullet}</span>
                                          </div>
                                        ) : isModified ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#dca134', textTransform: 'uppercase', letterSpacing: '.06em' }}>[Modified Bullet]</span>
                                            {renderDiffText(origBullet, optBullet)}
                                          </div>
                                        ) : (
                                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{optBullet}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        {result && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-header"><h3>Keyword Summary</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#6C5CE7' }}>
                      {result.matched_keywords.length + result.missing_keywords.length > 0
                        ? `${Math.round((result.matched_keywords.length / (result.matched_keywords.length + result.missing_keywords.length)) * 100)}%`
                        : '—'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Match Rate</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#00b894' }}>{result.matched_keywords.length}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Matched</p>
                  </div>
                </div>
                {result.matched_keywords.length > 0 && (
                  <>
                    <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Top Matches</p>
                    <div className="chip-row" style={{ marginBottom: 8 }}>
                      {result.matched_keywords.slice(0, 6).map(k => <span key={k} className="tag tag-success" style={{ fontSize: 11 }}>{k}</span>)}
                    </div>
                  </>
                )}
                {result.missing_keywords.length > 0 && (
                  <>
                    <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Missing</p>
                    <div className="chip-row">
                      {result.missing_keywords.slice(0, 5).map(k => <span key={k} className="tag tag-error" style={{ fontSize: 11 }}>{k}</span>)}
                    </div>
                  </>
                )}
              </div>
            </div>

            {optimizing ? (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} disabled>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Optimizing…
              </button>
            ) : (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={optimizeResume} disabled={running}>
                <Sparkles size={14} /> Optimize with AI
              </button>
            )}
          </>
        )}
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={runCheck} disabled={running || optimizing || !selectedResumeId}>
          <RefreshCw size={14} /> {result ? 'Re-run Analysis' : 'Run Analysis'}
        </button>
      </div>
    </div>
    </AppWrapper>
  );
}
