'use client';
import AppWrapper from '@/components/AppWrapper';
import { useState, useEffect } from 'react';
import { Mail, Copy, Download, Edit3, Zap, RefreshCw, CheckSquare, Square, Loader2, AlertCircle, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Resume } from '@/lib/types';

const LETTER_TEMPLATES = ['Modern', 'Professional', 'Creative', 'Minimal'];

const INCLUDE_ITEMS = [
  'Highlight relevant skills & experience',
  'Showcase achievements with metrics',
  'Explain motivation for the role',
  'Include company research & culture fit',
];

export default function CoverLetterPage() {
  const { post, get } = useApi();
  const { user } = useAuth();

  // Resume selection
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Form
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [selectedTemplate, setSelectedTemplate] = useState('Modern');
  const [included, setIncluded] = useState([0, 1, 2, 3]);
  const [extra, setExtra] = useState('');
  const [autoJd, setAutoJd] = useState('');
  const [manualJd, setManualJd] = useState('');
  const [jdSource, setJdSource] = useState<'auto' | 'manual'>('auto');
  const [generatingJd, setGeneratingJd] = useState(false);

  // Output
  const [generated, setGenerated] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch (err) {
        console.error('Failed to auto-generate JD', err);
      } finally {
        setGeneratingJd(false);
      }
    };
    triggerGenerateJd();
  }, [selectedResumeId, post]);

  const toggleInclude = (i: number) => {
    setIncluded(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const generate = async () => {
    if (!jobTitle || !company) { toast.error('Please fill in the Job Title and Company fields.'); return; }
    if (!selectedResumeId && resumes.length > 0) { toast.error('Please select a resume.'); return; }

    const activeJd = jdSource === 'auto' ? autoJd : manualJd;
    if (!activeJd.trim()) {
      if (!selectedResumeId) {
        toast.error('Please select a resume to automatically generate a job description.');
        return;
      }
      setGenerating(true);
      toast.loading('Generating a matching job description first...', { id: 'jd-gen' });
      try {
        const jdRes = await post<{ jd: string }>('/api/ats-check/generate-jd', {
          resume_id: selectedResumeId,
        });
        if (jdRes.success && jdRes.data?.jd) {
          if (jdSource === 'auto') {
            setAutoJd(jdRes.data.jd);
          } else {
            setManualJd(jdRes.data.jd);
          }
          toast.success('Job description generated! Review and edit it on the left, then click "Generate Cover Letter" to continue.', { id: 'jd-gen', duration: 5000 });
        } else {
          toast.error(jdRes.error || 'Failed to auto-generate job description.', { id: 'jd-gen' });
        }
      } catch {
        toast.error('Failed to generate job description.', { id: 'jd-gen' });
      } finally {
        setGenerating(false);
      }
      return;
    }

    setGenerating(true);
    setError(null);
    setGenerated('');

    try {
      const res = await post<{ content: string }>('/api/cover-letter', {
        resume_id: selectedResumeId || undefined,
        job_title: jobTitle,
        company,
        tone,
        length,
        include_items: INCLUDE_ITEMS.filter((_, i) => included.includes(i)),
        extra_notes: extra,
        job_description: activeJd,
      });

      if (res.success && res.data?.content) {
        setGenerated(res.data.content);
        toast.success('Cover letter generated!');
      } else {
        setError(res.error || 'Cover letter generation failed. Please try again.');
        toast.error(res.error || 'Generation failed.');
      }
    } catch {
      const msg = 'An unexpected error occurred. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generated) { toast.error('Generate a cover letter first.'); return; }
    navigator.clipboard.writeText(generated);
    toast.success('Copied to clipboard!');
  };

  // Get the selected resume's parsed name for the letter header
  const selectedResume = resumes.find(r => r.id === selectedResumeId);
  const authorName = selectedResume?.parsed_data?.name || user?.name || '';
  const authorEmail = selectedResume?.parsed_data?.email || user?.email || '';
  const authorPhone = selectedResume?.parsed_data?.phone || '';
  const authorTitle = selectedResume?.parsed_data?.title || '';

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const headerBg = selectedTemplate === 'Modern'
    ? 'linear-gradient(135deg,#6C5CE7,#A29BFE)'
    : selectedTemplate === 'Professional' ? '#1a1a2e'
    : selectedTemplate === 'Creative' ? '#e17055' : '#f5f5fc';

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 20 }}>
      {/* Left form */}
      <div style={{ width: 340, flexShrink: 0 }}>
        <div className="page-header">
          <h1>Cover Letter</h1>
          <p>AI-generated, tailored to each role</p>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="input-label">Select Resume</label>
              {loadingResumes ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
                </div>
              ) : resumes.length === 0 ? (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No resumes yet — letter will be generic</span>
                </div>
              ) : (
                <select className="select" value={selectedResumeId} onChange={e => setSelectedResumeId(e.target.value)}>
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="input-label">Job Title *</label>
              <input className="input" placeholder="e.g. Senior Frontend Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Company *</label>
              <input className="input" placeholder="e.g. Stripe" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Job Description</span>
                {generatingJd && (
                  <span style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                  </span>
                )}
              </label>
              
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-tertiary)', padding: 3, borderRadius: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setJdSource('auto')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11.5,
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
                  type="button"
                  onClick={() => setJdSource('manual')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 11.5,
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

              <textarea
                className="textarea"
                rows={4}
                placeholder={
                  jdSource === 'auto'
                    ? "AI will generate a matching job description here..."
                    : "Paste target job description details here..."
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
                style={{ fontSize: 12.5 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="input-label">Tone</label>
                <select className="select" value={tone} onChange={e => setTone(e.target.value)}>
                  {['Professional', 'Casual', 'Enthusiastic', 'Confident'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Length</label>
                <select className="select" value={length} onChange={e => setLength(e.target.value)}>
                  {['Short', 'Medium', 'Long'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>What should we include?</p>
          {INCLUDE_ITEMS.map((item, i) => (
            <button key={i} onClick={() => toggleInclude(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}>
              {included.includes(i) ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <label className="input-label">Additional Information (Optional)</label>
          <textarea className="textarea" rows={3} placeholder="Any specific points to mention…" value={extra}
            onChange={e => { if (e.target.value.length <= 500) setExtra(e.target.value); }}
            style={{ marginBottom: 4 }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{extra.length}/500</p>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Template Style</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {LETTER_TEMPLATES.map(t => (
              <button key={t} onClick={() => setSelectedTemplate(t)}
                style={{ padding: '10px', borderRadius: 10, border: `2px solid ${selectedTemplate === t ? 'var(--primary)' : 'var(--border-color)'}`, background: selectedTemplate === t ? 'var(--primary-light)' : 'var(--bg-tertiary)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: selectedTemplate === t ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.18s' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating || (!jobTitle || !company)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
          {generating
            ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            : <><Zap size={16} /> Generate Cover Letter</>}
        </button>
      </div>

      {/* Right — Live preview */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Live Preview</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {generated && (
              <>
                <button onClick={() => setIsEditing(v => !v)} className="btn btn-secondary btn-sm">
                  <Edit3 size={13} /> {isEditing ? 'Done' : 'Edit'}
                </button>
                <button onClick={copyToClipboard} className="btn btn-secondary btn-sm">
                  <Copy size={13} /> Copy
                </button>
                <button onClick={() => toast.success('Downloading as PDF…')} className="btn btn-primary btn-sm">
                  <Download size={13} /> Download
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--error-bg)', border: '1px solid rgba(231,76,60,.2)', marginBottom: 14 }}>
            <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--error)', marginBottom: 3 }}>Generation Failed</p>
              <p style={{ fontSize: 13, color: 'var(--error)' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Empty state — nothing generated yet */}
        {!generated && !generating && !error && (
          <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mail size={28} color="white" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Ready to Generate</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.7 }}>
              Fill in the Job Title and Company on the left, then click "Generate Cover Letter" to create a personalized letter using your real resume data.
            </p>
            {resumes.length === 0 && !loadingResumes && (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                💡 Upload a resume first for the best results — the letter will reference your actual experience.
              </p>
            )}
          </div>
        )}

        {/* Generating skeleton */}
        {generating && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '28px 32px 18px', background: headerBg }}>
              <div style={{ height: 24, background: 'rgba(255,255,255,0.3)', borderRadius: 6, width: '40%', marginBottom: 8 }} />
              <div style={{ height: 14, background: 'rgba(255,255,255,0.2)', borderRadius: 4, width: '60%' }} />
            </div>
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[90, 75, 85, 65, 80, 70, 88, 60].map((w, i) => (
                <div key={i} style={{ height: 14, borderRadius: 4, background: 'linear-gradient(90deg,var(--border-color) 25%,var(--bg-tertiary) 50%,var(--border-color) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', width: `${w}%` }} />
              ))}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12.5 }}>Writing your cover letter…</span>
              </div>
            </div>
          </div>
        )}

        {/* Generated letter */}
        {generated && !generating && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Letter header — uses real resume data */}
            <div style={{ padding: '28px 32px 18px', background: headerBg, color: selectedTemplate === 'Minimal' ? 'var(--text-primary)' : 'white' }}>
              <p style={{ fontSize: 20, fontWeight: 800 }}>{authorName || '(Your Name)'}</p>
              {authorTitle && <p style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{authorTitle}</p>}
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {[authorEmail, authorPhone].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Letter body */}
            <div style={{ padding: '24px 32px' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{today}</p>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Hiring Manager</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{company}</p>

              {isEditing ? (
                <textarea
                  value={generated}
                  onChange={e => setGenerated(e.target.value)}
                  style={{ width: '100%', minHeight: 380, padding: '16px', borderRadius: 10, border: '1px solid var(--border-focus)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 13.5, resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)', lineHeight: 1.8 }}
                />
              ) : (
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                  {generated}
                </div>
              )}

              {/* Signature — uses real resume data */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 600 }}>{authorName || '(Your Name)'}</p>
                {authorEmail && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{authorEmail}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppWrapper>
  );
}
