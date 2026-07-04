'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Target, Briefcase, Mail, Bookmark, Mic, History } from 'lucide-react';

const TIPS = [
  {
    icon: Target,
    color: '#6C5CE7',
    title: 'Improve Your ATS Score',
    desc: 'Upload your resume and paste a job description to get an instant ATS compatibility score. Our AI analyzes keyword density, formatting, and content quality.',
    tip: 'Aim for an ATS score of 80+ for best results. Most Fortune 500 companies use ATS software to filter resumes.',
    link: '/ats-checker',
    linkLabel: 'Open ATS Checker →',
  },
  {
    icon: Briefcase,
    color: '#00b894',
    title: 'Use Job Matcher',
    desc: 'Paste a job description into the Job Matcher to see exactly how well your resume matches the role — with a percentage score and skills breakdown.',
    tip: 'Update your resume based on missing keywords shown in the Job Matcher to significantly boost your match score.',
    link: '/job-matcher',
    linkLabel: 'Find Job Matches →',
  },
  {
    icon: Mail,
    color: '#0984e3',
    title: 'Create a Strong Cover Letter',
    desc: 'Our AI generates personalized cover letters tailored to each company and role. Choose from Professional, Casual, Enthusiastic, or Confident tone.',
    tip: 'Customize the tone per application — use "Confident" for startups, "Professional" for corporate roles.',
    link: '/cover-letter',
    linkLabel: 'Generate Cover Letter →',
  },
  {
    icon: Bookmark,
    color: '#e17055',
    title: 'Save Jobs You Like',
    desc: 'Bookmark interesting job listings and organize them in Saved Jobs. Track your application status and access all saved roles in one place.',
    tip: 'Add mental notes on why a job is a good fit — this helps when customizing your resume for each application.',
    link: '/saved-jobs',
    linkLabel: 'View Saved Jobs →',
  },
  {
    icon: Mic,
    color: '#6C5CE7',
    title: 'Prepare with Interview Coach',
    desc: 'Practice with AI-powered mock interviews. Get instant feedback on your answers, pace, and clarity. Choose from Behavioral, Technical, and more.',
    tip: 'Practice at least 3 sessions per week — consistency is key to interview confidence.',
    link: '/interview-coach',
    linkLabel: 'Start Practicing →',
  },
  {
    icon: History,
    color: '#fdcb6e',
    title: 'Track Your History',
    desc: 'Every resume you create, ATS check you run, cover letter generated, and job matched is saved in History with full details and download access.',
    tip: 'Use the filter tabs (Resumes, ATS Checks, AI Chat, etc.) to quickly find specific items in your history.',
    link: '/history',
    linkLabel: 'View History →',
  },
];

interface OnboardingTipsProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingTips({ open, onClose }: OnboardingTipsProps) {
  const [prevOpen, setPrevOpen] = useState(open);
  const [step, setStep] = useState(0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    setStep(0);
  }

  if (!open) return null;

  const tip = TIPS[step];
  const Icon = tip.icon;
  const isLast = step === TIPS.length - 1;

  return (
    <div className="tips-overlay" onClick={onClose}>
      <div className="tips-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tip.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={tip.color} />
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Tip {step + 1} of {TIPS.length}
              </p>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{tip.title}</h3>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            {tip.desc}
          </p>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${tip.color}10`, border: `1px solid ${tip.color}22` }}>
            <p style={{ fontSize: 12.5, color: tip.color, fontWeight: 600, marginBottom: 4 }}>💡 Pro Tip</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip.tip}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '0 20px 14px' }}>
          {TIPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === step ? tip.color : 'var(--border-strong)', transition: 'all 0.25s ease' }} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn btn-secondary btn-sm"
            style={{ gap: 5, opacity: step === 0 ? 0 : 1 }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <a href={tip.link} onClick={onClose}
            style={{ fontSize: 12.5, color: tip.color, fontWeight: 600, textDecoration: 'none' }}>
            {tip.linkLabel}
          </a>

          {isLast ? (
            <button onClick={onClose} className="btn btn-primary btn-sm">Got it! 🎉</button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary btn-sm" style={{ gap: 5 }}>
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
