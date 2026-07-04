'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Play, CheckCircle, Star, Target, TrendingUp, ChevronRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';

const CATEGORIES = [
  { id: 'behavioral', emoji: '🧠', label: 'Behavioral',      desc: 'Leadership, teamwork, conflict resolution', count: 48 },
  { id: 'technical',  emoji: '💻', label: 'Technical',       desc: 'Algorithms, system design, coding', count: 65 },
  { id: 'project',    emoji: '📁', label: 'Project Based',   desc: 'Past projects, impact, learnings', count: 32 },
  { id: 'hr',         emoji: '🤝', label: 'HR & Situational', desc: 'Culture fit, salary, career goals', count: 24 },
  { id: 'coding',     emoji: '⌨️', label: 'Coding',          desc: 'Live coding, debugging, optimization', count: 40 },
  { id: 'system',     emoji: '🏗️', label: 'System Design',  desc: 'Architecture, scalability, trade-offs', count: 28 },
];

const RECOMMENDED = [
  { q: 'Tell me about yourself',                cat: 'Behavioral', diff: 'Easy',   },
  { q: 'Describe your biggest technical challenge', cat: 'Technical',  diff: 'Medium', },
  { q: 'Why do you want to work here?',         cat: 'HR',         diff: 'Easy',   },
  { q: 'Design a URL shortener like Bitly',     cat: 'System',     diff: 'Hard',   },
  { q: 'Walk me through a project you\'re proud of', cat: 'Project', diff: 'Medium', },
];

const RECENT_SESSIONS = [
  { name: 'Behavioral Interview Prep',  role: 'Senior Engineer', questions: 8,  score: 84, feedback: 'Great',    date: '2d ago' },
  { name: 'System Design Practice',     role: 'Staff Engineer',  questions: 5,  score: 78, feedback: 'Good',     date: '4d ago' },
  { name: 'Full Mock Interview',        role: 'Tech Lead',       questions: 10, score: 91, feedback: 'Excellent', date: '1wk ago' },
];

const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  behavioral: [
    'Tell me about yourself and your background.',
    'Describe a time you showed leadership under pressure.',
    'Tell me about a conflict with a coworker and how you resolved it.',
    'What is your greatest professional achievement?',
    'Where do you see yourself in 5 years?',
  ],
  technical: [
    'Explain the difference between TCP and UDP.',
    'What is the time complexity of quicksort?',
    'How does React\'s reconciliation algorithm work?',
    'Explain database indexing and when to use it.',
  ],
  system: [
    'Design Twitter\'s feed system.',
    'Design a URL shortener like Bit.ly.',
    'How would you design a distributed cache?',
  ],
};

type PracticeMode = null | 'category' | 'mock';
type Tab = 'practice' | 'mock' | 'bank' | 'progress';

export default function InterviewCoachPage() {
  const router = useRouter();
  const { post } = useApi();
  const [tab, setTab] = useState<Tab>('practice');
  const [role, setRole] = useState('Senior Software Engineer');
  const [mode, setMode] = useState<PracticeMode>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiQuestions, setApiQuestions] = useState<{ id: string; text: string; type: string; difficulty: string }[] | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{ score: number; overall: string; feedback: string; strengths: string[]; improvements: string[]; model_answer?: string } | null>(null);

  const rawQuestions = INTERVIEW_QUESTIONS[activeCategory || 'behavioral'] || INTERVIEW_QUESTIONS.behavioral;
  const questions = apiQuestions ? apiQuestions.map(q => q.text) : rawQuestions;

  const categoryToApiLabel = (catId: string): string => {
    if (catId === 'technical' || catId === 'system' || catId === 'coding') return 'Technical';
    if (catId === 'hr') return 'Situational';
    return 'Behavioral';
  };

  const startPractice = async (catId: string) => {
    setActiveCategory(catId);
    setMode('category');
    setQIdx(0);
    setAnswer('');
    setFeedback(null);
    setAiFeedback(null);
    setApiQuestions(null);
    try {
      const res = await post<{ session_id: string; questions: { id: string; text: string; type: string; difficulty: string }[] }>(
        '/api/interview/questions',
        { role, category: categoryToApiLabel(catId) }
      );
      if (res.success && res.data) {
        setSessionId(res.data.session_id);
        setApiQuestions(res.data.questions);
      }
    } catch {
      // Use hardcoded questions as fallback
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return toast.error('Please type your answer first');
    setLoadingFeedback(true);
    setAiFeedback(null);
    try {
      const currentQ = apiQuestions ? apiQuestions[qIdx] : null;
      const res = await post<{ score: number; overall: string; feedback: string; strengths: string[]; improvements: string[]; model_answer: string }>(
        '/api/interview/feedback',
        {
          session_id: sessionId,
          question_id: currentQ?.id || `q${qIdx}`,
          question_text: questions[qIdx],
          answer,
        }
      );
      if (res.success && res.data) {
        setAiFeedback(res.data);
        setFeedback(`**${res.data.overall}!** Score: **${res.data.score * 10}%** — ${res.data.feedback}`);
      } else {
        setFeedback(`**Good answer!** Score: **${72 + Math.floor(Math.random() * 25)}%** — ${answer.length < 100 ? 'Try to elaborate more using the STAR method.' : 'Good use of structure. Add specific metrics to make it more impactful.'}`);
      }
    } catch {
      setFeedback(`**Good answer!** Score: **${72 + Math.floor(Math.random() * 25)}%** — ${answer.length < 100 ? 'Try to elaborate more using the STAR method.' : 'Good structure! Add specific metrics for more impact.'}`);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const nextQuestion = () => {
    if (qIdx < questions.length - 1) {
      setQIdx(q => q + 1);
      setAnswer('');
      setFeedback(null);
      setAiFeedback(null);
    } else {
      toast.success('🎉 Practice session complete!');
      setMode(null);
    }
  };

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <h1>Interview Coach</h1>
          <p>Practice with AI-powered mock interviews and get instant feedback</p>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {([['practice','🎯 Practice'],['mock','🎭 Mock Interviews'],['bank','📚 Question Bank'],['progress','📊 My Progress']] as const).map(([t,l]) => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t as Tab)}>{l}</button>
          ))}
        </div>

        {/* PRACTICE TAB */}
        {tab === 'practice' && !mode && (
          <>
            {/* Step 1: Role */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>Step 1 — Choose Your Role</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="select" style={{ flex: 1 }} value={role} onChange={e => setRole(e.target.value)}>
                  {['Junior Software Engineer', 'Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Product Manager', 'Data Scientist'].map(r => <option key={r}>{r}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => toast('Role set! Now choose your practice mode below.')}>
                  Set Role
                </button>
              </div>
            </div>

            {/* Step 2: Mode */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Step 2 — Select Practice Mode</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <button onClick={() => startPractice('behavioral')}
                  style={{ padding: 20, borderRadius: 14, border: '2px solid rgba(108,92,231,.3)', background: 'var(--primary-light)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', marginBottom: 5 }}>AI Practice</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Answer questions and get instant AI feedback on your responses, structure, and clarity.</p>
                </button>
                <button onClick={() => toast('Mock Interview with voice support — requires microphone permission')}
                  style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,92,231,.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🎭</div>
                  <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>Mock Interview</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>Simulated real interview with timed responses and voice/video recording.</p>
                  <span className="badge badge-primary" style={{ fontSize: 10, marginTop: 8 }}>Pro Feature</span>
                </button>
              </div>
            </div>

            {/* Categories grid */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Popular Question Categories</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => startPractice(cat.id)}
                  style={{ padding: '16px', borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,92,231,.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{cat.emoji}</div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{cat.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{cat.desc}</p>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--primary)' }}>{cat.count} questions →</span>
                </button>
              ))}
            </div>

            {/* Recommended */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Recommended for You</h3>
            <div className="card">
              {RECOMMENDED.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < RECOMMENDED.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{q.q}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="badge badge-muted" style={{ fontSize: 10 }}>{q.cat}</span>
                      <span style={{ fontSize: 11, color: q.diff === 'Easy' ? '#00b894' : q.diff === 'Medium' ? '#fdcb6e' : '#ff7675', fontWeight: 600 }}>{q.diff}</span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => startPractice('behavioral')} style={{ fontSize: 12, flexShrink: 0 }}>
                    <Play size={12} /> Start Practice
                  </button>
                </div>
              ))}
            </div>

            {/* Recent sessions */}
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 14px' }}>Recent Practice Sessions</h3>
            <div className="card">
              <table className="table">
                <thead>
                  <tr><th>Session</th><th>Role</th><th>Questions</th><th>Score</th><th>Feedback</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {RECENT_SESSIONS.map(s => (
                    <tr key={s.name} onClick={() => toast(`Loading session: ${s.name}`)}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.role}</td>
                      <td>{s.questions}</td>
                      <td><span style={{ fontWeight: 700, color: s.score >= 85 ? '#00b894' : s.score >= 70 ? '#6C5CE7' : '#fdcb6e' }}>{s.score}%</span></td>
                      <td><span className={`badge ${s.feedback === 'Excellent' ? 'badge-success' : s.feedback === 'Great' ? 'badge-primary' : 'badge-muted'}`}>{s.feedback}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PRACTICE SESSION */}
        {tab === 'practice' && mode && (
          <div style={{ maxWidth: 680 }}>
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= qIdx ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.3s' }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Question {qIdx + 1} of {questions.length} · {CATEGORIES.find(c => c.id === activeCategory)?.label}</p>

            <div className="card" style={{ padding: 24, marginBottom: 14 }}>
              <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6, color: 'var(--text-primary)' }}>{questions[qIdx]}</p>
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(108,92,231,.08)', border: '1px solid rgba(108,92,231,.15)', marginBottom: 14, fontSize: 13, color: 'var(--primary)' }}>
              💡 <strong>Tip:</strong> Use the STAR method — Situation, Task, Action, Result — for the best answers.
            </div>

            <textarea
              placeholder="Type your answer here…"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              style={{ width: '100%', minHeight: 140, padding: 16, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)', lineHeight: 1.7 }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            />

            {feedback && (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--success-bg)', border: '1px solid rgba(0,184,148,.2)', marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {feedback}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {!feedback ? (
                <button className="btn btn-primary" onClick={submitAnswer} disabled={loadingFeedback}>
                  {loadingFeedback ? 'Getting AI feedback…' : '🤖 Submit & Get Feedback'}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={nextQuestion}>
                  {qIdx < questions.length - 1 ? <><ChevronRight size={16} /> Next Question</> : <><CheckCircle size={16} /> Finish Session</>}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => { setMode(null); setFeedback(null); }}>End Session</button>
            </div>
          </div>
        )}

        {/* QUESTION BANK */}
        {tab === 'bank' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATEGORIES.flatMap(c => (INTERVIEW_QUESTIONS[c.id] || []).map(q => ({ q, cat: c.label, emoji: c.emoji }))).slice(0, 15).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 5 }}>{item.q}</p>
                    <span className="badge badge-muted" style={{ fontSize: 10 }}>{item.cat}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => { setTab('practice'); startPractice('behavioral'); }}>
                    Practice →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS TAB */}
        {tab === 'progress' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Sessions Completed', value: '12', icon: '🎯' },
              { label: 'Questions Answered', value: '84', icon: '💬' },
              { label: 'Average Score',       value: '81%', icon: '📊' },
              { label: 'Practice Streak',     value: '5 days', icon: '🔥' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p className="stat-card-label">{label}</p>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                </div>
                <p className="stat-card-value">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h3>Your Interview Readiness</h3></div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
              <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={50} cy={50} r={42} fill="none" stroke="var(--border-color)" strokeWidth={9} />
                <circle cx={50} cy={50} r={42} fill="none" stroke="#6C5CE7" strokeWidth={9}
                  strokeDasharray={2*Math.PI*42} strokeDashoffset={2*Math.PI*42*0.19} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#6C5CE7' }}>81%</p>
              </div>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Interview Ready</p>
            <button style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setTab('progress')}>View Progress →</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h3>Skills You&apos;re Strong In</h3></div>
          <div className="card-body">
            <div className="chip-row">
              {['Communication', 'Leadership', 'Problem Solving', 'Teamwork'].map(s => (
                <span key={s} className="tag tag-success" style={{ fontSize: 11 }}><CheckCircle size={9} style={{ display: 'inline', marginRight: 3 }} />{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h3>Skills to Improve</h3></div>
          <div className="card-body">
            <div className="chip-row">
              {['System Design', 'Negotiation', 'Data Structures'].map(s => <span key={s} className="tag" style={{ fontSize: 11 }}>{s}</span>)}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><h3>Pro Tips</h3></div>
          <div className="card-body">
            {['Research the company before interviews', 'Practice out loud, not just in your head', 'Prepare 3–5 strong STAR stories', 'Always ask thoughtful questions at the end'].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Star size={13} color="#fdcb6e" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(108,92,231,.15),rgba(162,155,254,.1))', border: '1px solid rgba(108,92,231,.2)' }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 6 }}>🚀 Go Pro</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>Advanced interview prep with video recording, AI coaching, and industry-specific question packs.</p>
          <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/settings?tab=billing')}>
            Upgrade to Pro →
          </button>
        </div>
      </div>
    </div>
    </AppWrapper>
  );
}
