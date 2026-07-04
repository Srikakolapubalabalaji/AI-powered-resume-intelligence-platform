'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle, Zap, Target, UploadCloud, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import type { AtsScore } from '@/lib/types';

const TABS = ['All', 'Content', 'Keywords', 'Format', 'Skills'] as const;

interface Suggestion { id: string; cat: string; priority: string; text: string; source: 'ats' | 'ai'; }

function categorizeSuggestion(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('keyword') || t.includes('missing') || t.includes('job description')) return 'Keywords';
  if (t.includes('skill')) return 'Skills';
  if (t.includes('format') || t.includes('section') || t.includes('contact') || t.includes('email') || t.includes('phone') || t.includes('name')) return 'Format';
  return 'Content';
}

function priorityFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('add') || t.includes('missing') || t.includes('no ')) return 'High';
  if (t.includes('improve') || t.includes('expand') || t.includes('consider')) return 'Medium';
  return 'Low';
}

const priorityColor = (p: string) => p === 'High' ? '#e74c3c' : p === 'Medium' ? '#fdcb6e' : '#00b894';

export default function SuggestionsPage() {
  const router = useRouter();
  const { get } = useApi();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('All');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [latestAts, setLatestAts] = useState<AtsScore | null>(null);

  useEffect(() => {
    get<AtsScore[]>('/api/ats-check').then(res => {
      // Try getting the last ATS report from resumes list since there's no dedicated endpoint for all scores
    }).catch(() => {}).finally(() => setLoading(false));

    // Get resumes, then the last ATS check from the most recent resume
    get<{ id: string; ats_score?: number; parsed_data?: { name?: string } }[]>('/api/resumes').then(res => {
      if (!res.success || !res.data || res.data.length === 0) { setLoading(false); return; }
      // The latest ATS report is available from the last uploaded resume's score
      // In a real DB flow this would be a separate query. For now, read from dashboard stats.
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [get]);

  // Build suggestions from last ATS result stored in sessionStorage (set by ATS Checker page)
  useEffect(() => {
    const stored = sessionStorage.getItem('bagupadu_last_ats');
    if (stored) {
      try {
        const ats = JSON.parse(stored) as { score: number; suggestions: string[]; matched_keywords: string[]; missing_keywords: string[] };
        const built: Suggestion[] = ats.suggestions.map((text, i) => ({
          id: `s${i}`,
          cat: categorizeSuggestion(text),
          priority: priorityFromText(text),
          text,
          source: 'ats',
        }));
        setSuggestions(built);
        setLoading(false);
      } catch {}
    } else {
      setLoading(false);
    }
  }, []);

  const toggle = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filtered = suggestions.filter(s => activeTab === 'All' || s.cat === activeTab);

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <h1>ATS Suggestions</h1>
          <p>Actionable improvements from your last ATS analysis</p>
        </div>

        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {TABS.map(t => <button key={t} className={`tab${activeTab===t?' active':''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
        </div>

        {/* Loading */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={32} color="#6C5CE7" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading suggestions…</p>
          </div>
        )}

        {/* Empty state — no ATS run yet */}
        {!loading && suggestions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '56px 32px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6C5CE7,#A29BFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lightbulb size={28} color="white" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No Suggestions Yet</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.7 }}>
              Suggestions are generated from your ATS analysis. Run an ATS check on your resume to see personalized, data-driven improvement recommendations here.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => router.push('/resumes')}>
                <UploadCloud size={14} /> Upload Resume
              </button>
              <button className="btn btn-primary" onClick={() => router.push('/ats-checker')}>
                <Target size={14} /> Run ATS Analysis
              </button>
            </div>
          </div>
        )}

        {/* Suggestions accordion */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(s => (
              <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => toggle(s.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Lightbulb size={16} color={priorityColor(s.priority)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${priorityColor(s.priority)}18`, color: priorityColor(s.priority) }}>{s.priority} Priority</span>
                        <span className="badge badge-muted" style={{ fontSize: 10 }}>{s.cat}</span>
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.text}</p>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {expanded.includes(s.id) ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                  </div>
                </div>
                {expanded.includes(s.id) && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => { toast.success('Opening AI Chat with this suggestion…'); router.push('/ai-chat'); }}>
                        <Zap size={14} /> Fix with AI Chat
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/ats-checker')}>
                        Re-run ATS Check →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && suggestions.length > 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No suggestions in the "{activeTab}" category.</p>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setActiveTab('All')}>View all suggestions</button>
          </div>
        )}

        {/* CTA */}
        {!loading && suggestions.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => router.push('/ai-chat')}>
              <Zap size={16} /> Fix All with AI
            </button>
            <button className="btn btn-secondary" onClick={() => router.push('/ats-checker')}>
              <Target size={14} /> Re-run ATS Analysis
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h3>Suggestions Summary</h3></div>
          <div className="card-body">
            {suggestions.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#6C5CE7' }}>{suggestions.length}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Suggestions</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#e74c3c' }}>
                      {suggestions.filter(s => s.priority === 'High').length}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>High Priority</p>
                  </div>
                </div>
                {TABS.slice(1).map(cat => {
                  const count = suggestions.filter(s => s.cat === cat).length;
                  return count > 0 ? (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{count}</span>
                      </div>
                      <div className="progress-bar" style={{ height: 5 }}>
                        <div className="progress-fill" style={{ width: `${(count / suggestions.length) * 100}%`, background: '#6C5CE7' }} />
                      </div>
                    </div>
                  ) : null;
                })}
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Run an ATS analysis to see suggestions.
              </p>
            )}
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }} onClick={() => router.push('/ats-checker')}>
          <Target size={14} /> Run ATS Analysis
        </button>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/ai-chat')}>
          <Zap size={14} /> Optimize with AI
        </button>
      </div>
    </div>
    </AppWrapper>
  );
}
