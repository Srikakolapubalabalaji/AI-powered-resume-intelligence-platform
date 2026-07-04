'use client';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText, Eye, Download, Sparkles, AlertCircle, Loader2,
  X, Trash2, Plus, Zap, CheckCircle, Printer, Edit3, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Resume } from '@/lib/types';

/* ─────────────────────────────────────────────
   TYPES & DEFAULT STATE
   ───────────────────────────────────────────── */
interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

interface EducationItem {
  degree: string;
  institution: string;
  dates: string;
}

interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

interface ResumeData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects?: ProjectItem[];
  certifications?: string[];
}

const EMPTY_RESUME_DATA: ResumeData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

const TEMPLATES = [
  { id: 'modern', name: 'Modern Professional', accent: '#6C5CE7' },
  { id: 'minimalist', name: 'Tech Minimalist', accent: '#00b894' },
  { id: 'executive', name: 'Creative Executive', accent: '#0984e3' },
];

/* ─────────────────────────────────────────────
   WORD-LEVEL DIFF ENGINE
   ───────────────────────────────────────────── */
function diffWords(oldStr: string, newStr: string) {
  const oldWords = oldStr.split(/(\s+)/).filter(Boolean);
  const newWords = newStr.split(/(\s+)/).filter(Boolean);
  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  interface Edit { type: 'added' | 'removed' | 'none' | 'modified'; oldWord?: string; newWord?: string; }
  const edits: Edit[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1].toLowerCase() === newWords[j - 1].toLowerCase()) {
      edits.unshift({ type: 'none', oldWord: oldWords[i - 1], newWord: newWords[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.unshift({ type: 'added', newWord: newWords[j - 1] });
      j--;
    } else {
      edits.unshift({ type: 'removed', oldWord: oldWords[i - 1] });
      i--;
    }
  }
  const merged: Edit[] = [];
  let k = 0;
  while (k < edits.length) {
    if (k < edits.length - 1 && edits[k].type === 'removed' && edits[k + 1].type === 'added') {
      merged.push({ type: 'modified', oldWord: edits[k].oldWord, newWord: edits[k + 1].newWord });
      k += 2;
    } else {
      merged.push(edits[k]);
      k++;
    }
  }
  return merged;
}

function DiffText({ oldText, newText, mode }: { oldText: string; newText: string; mode: 'original' | 'optimized' }) {
  if (!oldText) {
    if (mode === 'original') return null;
    return <span style={{ background: '#e6fcf5', color: '#0ca678', border: '1px solid #c3fae8', padding: '1px 3px', borderRadius: 4, fontWeight: 600 }}>{newText}</span>;
  }
  if (!newText) {
    if (mode === 'optimized') return null;
    return <span style={{ background: '#fff5f5', color: '#f03e3e', border: '1px solid #ffe3e3', padding: '1px 3px', borderRadius: 4, textDecoration: 'line-through' }}>{oldText}</span>;
  }
  const edits = diffWords(oldText, newText);
  return (
    <>
      {edits.map((edit, idx) => {
        if (edit.type === 'none') return <span key={idx}>{mode === 'original' ? edit.oldWord : edit.newWord}</span>;
        if (edit.type === 'modified') {
          const text = mode === 'original' ? edit.oldWord : edit.newWord;
          return <span key={idx} style={{ background: '#fff9db', color: '#f08c00', border: '1px solid #ffd43b', padding: '1px 3px', borderRadius: 4, fontWeight: 600 }}>{text}</span>;
        }
        if (edit.type === 'added') {
          if (mode === 'original') return null;
          return <span key={idx} style={{ background: '#e6fcf5', color: '#0ca678', border: '1px solid #c3fae8', padding: '1px 3px', borderRadius: 4, fontWeight: 600 }}>{edit.newWord}</span>;
        }
        if (edit.type === 'removed') {
          if (mode === 'optimized') return null;
          return <span key={idx} style={{ background: '#fff5f5', color: '#f03e3e', border: '1px solid #ffe3e3', padding: '1px 3px', borderRadius: 4, textDecoration: 'line-through' }}>{edit.oldWord}</span>;
        }
        return null;
      })}
    </>
  );
}

/* ─────────────────────────────────────────────
   STYLED RESUME CARD
   ───────────────────────────────────────────── */
function StyledResumeCard({
  data, templateId, diffMode, compareData,
}: {
  data: ResumeData; templateId: string;
  diffMode?: 'original' | 'optimized'; compareData?: ResumeData;
}) {
  const activeTemplate = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const accent = activeTemplate.accent;
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join(' • ');

  const dText = (val: string | undefined, compareVal: string | undefined) => {
    if (!diffMode || !compareData) return val || '';
    const oldT = diffMode === 'original' ? (val || '') : (compareVal || '');
    const newT = diffMode === 'optimized' ? (val || '') : (compareVal || '');
    return <DiffText oldText={oldT} newText={newT} mode={diffMode} />;
  };

  const dBullet = (bullet: string, expIdx: number, bulletIdx: number) => {
    if (!diffMode || !compareData) return bullet;
    const compExp = compareData.experience?.[expIdx];
    const compBullet = compExp?.bullets?.[bulletIdx] || '';
    const oldT = diffMode === 'original' ? bullet : compBullet;
    const newT = diffMode === 'optimized' ? bullet : compBullet;
    return <DiffText oldText={oldT} newText={newT} mode={diffMode} />;
  };

  const dProjectField = (val: string | undefined, projIdx: number, field: 'name' | 'description' | 'url') => {
    if (!diffMode || !compareData) return val || '';
    const compProj = compareData.projects?.[projIdx];
    const compVal = compProj?.[field] || '';
    const oldT = diffMode === 'original' ? (val || '') : compVal;
    const newT = diffMode === 'optimized' ? (val || '') : compVal;
    return <DiffText oldText={oldT} newText={newT} mode={diffMode} />;
  };

  const dCert = (cert: string, certIdx: number) => {
    if (!diffMode || !compareData) return cert;
    const compCert = compareData.certifications?.[certIdx] || '';
    const oldT = diffMode === 'original' ? cert : compCert;
    const newT = diffMode === 'optimized' ? cert : compCert;
    return <DiffText oldText={oldT} newText={newT} mode={diffMode} />;
  };

  const renderSkill = (skill: string) => {
    let style: any = { fontSize: 8.5, padding: '2px 6px', borderRadius: 4, background: `${accent}10`, color: accent, fontWeight: 600 };
    if (diffMode && compareData) {
      const inCompare = compareData.skills?.some(s => s.toLowerCase() === skill.toLowerCase());
      if (!inCompare) {
        if (diffMode === 'original') {
          style = { ...style, background: '#fff5f5', color: '#f03e3e', border: '1px solid #ffe3e3', textDecoration: 'line-through' };
        } else {
          style = { ...style, background: '#e6fcf5', color: '#0ca678', border: '1px solid #c3fae8' };
        }
      }
    }
    return <span key={skill} style={style}>{skill}</span>;
  };

  // Modern Template
  if (templateId === 'modern') {
    return (
      <div style={{ padding: '24px', background: 'white', color: '#1a1a24', fontFamily: 'Calibri, Arial, sans-serif', fontSize: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderRadius: 8, minHeight: '840px' }}>
        <div style={{ borderBottom: `2.5px solid ${accent}`, paddingBottom: 10, marginBottom: 12, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 3px 0', color: '#111', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dText(data.name, compareData?.name) || 'Your Name'}</h2>
          <p style={{ fontSize: 12, color: accent, fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dText(data.title, compareData?.title) || 'Professional Title'}</p>
          {contact && <p style={{ fontSize: 9.5, color: '#555', margin: 0, lineHeight: 1.4 }}>{contact}</p>}
        </div>
        {data.summary && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Professional Summary</h3><p style={{ fontSize: 9.5, color: '#333', lineHeight: 1.5, margin: 0, textAlign: 'justify' }}>{dText(data.summary, compareData?.summary)}</p></div>}
        {data.experience && data.experience.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Professional Experience</h3>{data.experience.map((e, idx) => (<div key={idx} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 10 }}><span>{dText(e.title, compareData?.experience?.[idx]?.title)}</span>{e.dates && <span style={{ color: '#555', fontSize: 9 }}>{dText(e.dates, compareData?.experience?.[idx]?.dates)}</span>}</div><p style={{ fontSize: 9, color: '#666', fontStyle: 'italic', margin: '2px 0 4px 0' }}>{dText(e.company, compareData?.experience?.[idx]?.company)}</p>{e.bullets && e.bullets.length > 0 && <ul style={{ paddingLeft: 12, margin: 0 }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 9, color: '#333', marginBottom: 2, lineHeight: 1.4 }}>{dBullet(b, idx, j)}</li>)}</ul>}</div>))}</div>}
        {data.skills && data.skills.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Key Skills</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{data.skills.map(s => renderSkill(s))}</div></div>}
        {data.education && data.education.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Education</h3>{data.education.map((edu, idx) => (<div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginBottom: 4 }}><div><span style={{ fontWeight: 700 }}>{dText(edu.degree, compareData?.education?.[idx]?.degree)}</span>{edu.institution && <span style={{ color: '#555' }}> · {dText(edu.institution, compareData?.education?.[idx]?.institution)}</span>}</div>{edu.dates && <span style={{ color: '#666', fontSize: 8.5 }}>{dText(edu.dates, compareData?.education?.[idx]?.dates)}</span>}</div>))}</div>}
        {data.certifications && data.certifications.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Certifications</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{data.certifications.map((c, idx) => <span key={idx} style={{ fontSize: 8.5, padding: '2px 5px', border: `1px solid ${accent}30`, borderRadius: 4, color: '#444' }}>{dCert(c, idx)}</span>)}</div></div>}
        {data.projects && data.projects.length > 0 && <div><h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}30`, paddingBottom: 2, marginBottom: 5 }}>Projects</h3>{data.projects.map((p, idx) => (<div key={idx} style={{ marginBottom: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 9.5 }}><span>{dProjectField(p.name, idx, 'name')} {p.url && <span style={{ fontWeight: 400, color: accent, fontSize: 8 }}>({dProjectField(p.url, idx, 'url')})</span>}</span></div><p style={{ fontSize: 9, color: '#444', margin: '2px 0 2px 0', lineHeight: 1.4 }}>{dProjectField(p.description, idx, 'description')}</p>{p.technologies && p.technologies.length > 0 && <p style={{ fontSize: 8, color: '#666', margin: 0 }}>Tech: {p.technologies.join(', ')}</p>}</div>))}</div>}
      </div>
    );
  }

  // Tech Minimalist
  if (templateId === 'minimalist') {
    return (
      <div style={{ padding: '24px', background: 'white', color: '#2d3436', fontFamily: 'Arial, sans-serif', fontSize: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderRadius: 8, minHeight: '840px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid var(--border-color)`, paddingBottom: 12, marginBottom: 12 }}>
          <div><h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#2d3436' }}>{dText(data.name, compareData?.name) || 'Your Name'}</h2><p style={{ fontSize: 11, color: accent, fontWeight: 600, margin: '2px 0 0 0' }}>{dText(data.title, compareData?.title) || 'Professional Title'}</p></div>
          <div style={{ textAlign: 'right', fontSize: 9, color: '#636e72', lineHeight: 1.45 }}>{data.email && <div>{data.email}</div>}{data.phone && <div>{data.phone}</div>}{data.location && <div>{data.location}</div>}{data.linkedin && <div>{data.linkedin}</div>}</div>
        </div>
        {data.summary && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 9.5, fontWeight: 700, color: accent, margin: '0 0 4px 0' }}>Summary</h3><p style={{ fontSize: 9.5, color: '#2d3436', lineHeight: 1.45, margin: 0 }}>{dText(data.summary, compareData?.summary)}</p></div>}
        {data.experience && data.experience.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 9.5, fontWeight: 700, color: accent, margin: '0 0 6px 0' }}>Experience</h3>{data.experience.map((e, idx) => (<div key={idx} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 9.5 }}><span>{dText(e.title, compareData?.experience?.[idx]?.title)} at <span style={{ color: '#2d3436' }}>{dText(e.company, compareData?.experience?.[idx]?.company)}</span></span>{e.dates && <span style={{ color: '#636e72', fontSize: 8.5 }}>{dText(e.dates, compareData?.experience?.[idx]?.dates)}</span>}</div>{e.bullets && e.bullets.length > 0 && <ul style={{ paddingLeft: 12, margin: '4px 0 0 0' }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 9, color: '#2d3436', marginBottom: 1.5, lineHeight: 1.4 }}>{dBullet(b, idx, j)}</li>)}</ul>}</div>))}</div>}
        {data.skills && data.skills.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 9.5, fontWeight: 700, color: accent, margin: '0 0 4px 0' }}>Skills</h3><p style={{ fontSize: 9, color: '#2d3436', margin: 0, lineHeight: 1.4 }}>{dText(data.skills.join(', '), compareData?.skills?.join(', '))}</p></div>}
        {data.education && data.education.length > 0 && <div style={{ marginBottom: 12 }}><h3 style={{ fontSize: 9.5, fontWeight: 700, color: accent, margin: '0 0 4px 0' }}>Education</h3>{data.education.map((edu, idx) => (<div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}><div><span style={{ fontWeight: 700 }}>{dText(edu.degree, compareData?.education?.[idx]?.degree)}</span> · {dText(edu.institution, compareData?.education?.[idx]?.institution)}</div>{edu.dates && <span style={{ color: '#636e72', fontSize: 8.5 }}>{dText(edu.dates, compareData?.education?.[idx]?.dates)}</span>}</div>))}</div>}
      </div>
    );
  }

  // Creative Executive
  return (
    <div style={{ padding: '24px', background: 'white', color: '#2c3e50', fontFamily: 'Georgia, serif', fontSize: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderRadius: 8, minHeight: '840px' }}>
      <div style={{ background: accent, height: '4px', margin: '-24px -24px 16px -24px', borderRadius: '8px 8px 0 0' }} />
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#2c3e50', margin: '0 0 2px 0' }}>{dText(data.name, compareData?.name) || 'Your Name'}</h2>
        <p style={{ fontSize: 11.5, color: accent, fontWeight: 600, margin: '0 0 8px 0', fontStyle: 'italic' }}>{dText(data.title, compareData?.title) || 'Professional Title'}</p>
        <p style={{ fontSize: 9, color: '#7f8c8d', margin: 0, borderBottom: '1px solid #ecf0f1', paddingBottom: 8 }}>{contact}</p>
      </div>
      {data.summary && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>About Me</h3><p style={{ fontSize: 9.5, color: '#34495e', lineHeight: 1.5, margin: 0 }}>{dText(data.summary, compareData?.summary)}</p></div>}
      {data.experience && data.experience.length > 0 && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Career History</h3>{data.experience.map((e, idx) => (<div key={idx} style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 9.5 }}><span style={{ color: '#2c3e50' }}>{dText(e.title, compareData?.experience?.[idx]?.title)} <span style={{ fontWeight: 400, color: '#7f8c8d' }}>at</span> {dText(e.company, compareData?.experience?.[idx]?.company)}</span>{e.dates && <span style={{ color: '#7f8c8d', fontSize: 8.5 }}>{dText(e.dates, compareData?.experience?.[idx]?.dates)}</span>}</div>{e.bullets && e.bullets.length > 0 && <ul style={{ paddingLeft: 12, margin: '4px 0 0 0' }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 9, color: '#34495e', marginBottom: 2, lineHeight: 1.4 }}>{dBullet(b, idx, j)}</li>)}</ul>}</div>))}</div>}
      {data.skills && data.skills.length > 0 && <div style={{ marginBottom: 14 }}><h3 style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Skills Matrix</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{data.skills.map(s => renderSkill(s))}</div></div>}
      {data.education && data.education.length > 0 && <div><h3 style={{ fontSize: 10, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Academic Studies</h3>{data.education.map((edu, idx) => (<div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, marginBottom: 3 }}><span><span style={{ fontWeight: 600 }}>{dText(edu.degree, compareData?.education?.[idx]?.degree)}</span> · {dText(edu.institution, compareData?.education?.[idx]?.institution)}</span>{edu.dates && <span style={{ color: '#7f8c8d', fontSize: 8.5 }}>{dText(edu.dates, compareData?.education?.[idx]?.dates)}</span>}</div>))}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   UPLOAD ZONE
   ───────────────────────────────────────────── */
function UploadZone({ onUpload, loading }: { onUpload: (file: File) => void; loading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
  };

  return (
    <div className={`upload-zone ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, border: '2px dashed var(--border-color)', borderRadius: 16, cursor: 'pointer', padding: 24, transition: 'all 0.2s', background: dragActive ? 'var(--bg-hover)' : 'var(--bg-secondary)' }}>
      <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])} />
      {loading ? (
        <>
          <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 700 }}>Processing Uploaded Resume...</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Parsing data & extracting content</p>
        </>
      ) : (
        <>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <FileText size={26} color="var(--primary)" />
          </div>
          <p style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Drag & Drop Resume here</p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Or click to browse your folders (PDF or DOCX)</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>Supports up to 10 MB limit</p>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WORKSPACE CORE CONTENT
   ───────────────────────────────────────────── */
function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { get, post } = useApi();
  const { user } = useAuth();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);

  const [formData, setFormData] = useState<ResumeData>(EMPTY_RESUME_DATA);
  const [template, setTemplate] = useState('modern');
  const [activeTab, setActiveTab] = useState<'info' | 'summary' | 'skills' | 'experience' | 'projects'>('info');

  const [jobDescription, setJobDescription] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [originalResumeId, setOriginalResumeId] = useState<string | null>(null);
  const [optimizedResumeId, setOptimizedResumeId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);

  const [previewMode, setPreviewMode] = useState<'original' | 'optimized'>('original');
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(100);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback((updatedData: ResumeData) => {
    if (!selectedResume) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await post<any>('/api/resume/edit', {
          resume_id: selectedResume.id,
          resume_data: updatedData,
          job_description: jobDescription,
        });
        if (res.success) {
          setSelectedResume(prev => prev ? { ...prev, parsed_data: updatedData, ats_score: res.data?.score } : null);
        }
      } catch {
        toast.error('Failed to auto-save edits', { id: 'autosave' });
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [selectedResume, post, jobDescription]);

  const fetchResumes = useCallback(async (autoSelectId?: string) => {
    setLoadingResumes(true);
    try {
      const res = await get<Resume[]>('/api/resumes');
      if (res.success && res.data) {
        setResumes(res.data);
        const targetId = autoSelectId || searchParams.get('id');
        const toSelect = targetId ? res.data.find(r => r.id === targetId) : res.data[0];
        if (toSelect) {
          setSelectedResume(toSelect);
          setFormData({
            ...EMPTY_RESUME_DATA,
            ...toSelect.parsed_data,
            experience: toSelect.parsed_data?.experience || [],
            education: toSelect.parsed_data?.education || [],
            skills: toSelect.parsed_data?.skills || [],
            projects: toSelect.parsed_data?.projects || [],
            certifications: toSelect.parsed_data?.certifications || [],
          });
          setTemplate(toSelect.template === 'Tech Minimalist' ? 'minimalist' : toSelect.template === 'Creative Executive' ? 'executive' : 'modern');
        } else {
          setSelectedResume(null);
          setFormData(EMPTY_RESUME_DATA);
        }
      }
    } catch {}
    setLoadingResumes(false);
  }, [get, searchParams]);

  useEffect(() => { fetchResumes(); }, []); // eslint-disable-line

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploadLoading(true);
    toast.loading('Uploading and parsing resume...', { id: 'w-upload' });
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: fd,
        headers: { 'x-user-id': user?.id || 'demo-001' },
      });
      const json = await res.json();
      if (json.success && json.data?.resume) {
        toast.success('Resume uploaded successfully!', { id: 'w-upload' });
        await fetchResumes(json.data.resume.id);
      } else {
        const msg = json.error || 'Failed to parse resume.';
        setUploadError(msg);
        toast.error(msg, { id: 'w-upload' });
      }
    } catch {
      setUploadError('Network error uploading resume.');
      toast.error('Network error uploading resume.', { id: 'w-upload' });
    } finally {
      setUploadLoading(false);
    }
  };

  const updateField = (field: keyof ResumeData, val: any) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    triggerAutosave(updated);
  };

  // Skills CRUD
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !formData.skills.includes(clean)) {
      updateField('skills', [...formData.skills, clean]);
      setSkillInput('');
    }
  };
  const handleRemoveSkill = (skill: string) => updateField('skills', formData.skills.filter(s => s !== skill));

  // Certifications CRUD
  const handleAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = certInput.trim();
    const currentCerts = formData.certifications || [];
    if (clean && !currentCerts.includes(clean)) {
      updateField('certifications', [...currentCerts, clean]);
      setCertInput('');
    }
  };
  const handleRemoveCert = (cert: string) => updateField('certifications', (formData.certifications || []).filter(c => c !== cert));

  // Experience CRUD
  const handleAddExperience = () => updateField('experience', [...formData.experience, { title: 'New Role', company: 'New Company', dates: 'Month Year – Present', bullets: ['Responsibility bullet point'] }]);
  const handleUpdateExperience = (idx: number, field: keyof ExperienceItem, val: any) => updateField('experience', formData.experience.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const handleRemoveExperience = (idx: number) => updateField('experience', formData.experience.filter((_, i) => i !== idx));
  const handleAddBullet = (expIdx: number) => { const exp = formData.experience[expIdx]; handleUpdateExperience(expIdx, 'bullets', [...(exp.bullets || []), 'New bullet point']); };
  const handleUpdateBullet = (expIdx: number, bulletIdx: number, val: string) => { const exp = formData.experience[expIdx]; handleUpdateExperience(expIdx, 'bullets', exp.bullets.map((b, i) => i === bulletIdx ? val : b)); };
  const handleRemoveBullet = (expIdx: number, bulletIdx: number) => { const exp = formData.experience[expIdx]; handleUpdateExperience(expIdx, 'bullets', exp.bullets.filter((_, i) => i !== bulletIdx)); };

  // Education CRUD
  const handleAddEducation = () => updateField('education', [...formData.education, { degree: 'Degree / Major', institution: 'University', dates: 'Year – Year' }]);
  const handleUpdateEducation = (idx: number, field: keyof EducationItem, val: any) => updateField('education', formData.education.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const handleRemoveEducation = (idx: number) => updateField('education', formData.education.filter((_, i) => i !== idx));

  // Projects CRUD
  const handleAddProject = () => updateField('projects', [...(formData.projects || []), { name: 'New Project', description: 'Brief description', technologies: [], url: '' }]);
  const handleUpdateProject = (idx: number, field: keyof ProjectItem, val: any) => updateField('projects', (formData.projects || []).map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const handleRemoveProject = (idx: number) => updateField('projects', (formData.projects || []).filter((_, i) => i !== idx));

  // AI Optimization
  const handleOptimize = async () => {
    if (!selectedResume) return;
    setOptimizing(true);
    setOptError(null);
    toast.loading('Optimizing resume with AI...', { id: 'opt' });
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || 'demo-001' },
        body: JSON.stringify({ resume_id: selectedResume.id, job_description: jobDescription }),
      });
      const json = await res.json();
      if (json.success && json.data?.optimized) {
        setOptimizedResume(json.data.optimized);
        setOriginalResumeId(json.data.originalId);
        setOptimizedResumeId(json.data.optimizedId);
        setChanges(json.data.changes || []);
        setPreviewMode('optimized');
        setShowComparison(true);
        toast.success('Resume optimized successfully!', { id: 'opt' });
      } else {
        const errMsg = json.error || 'AI Optimization failed.';
        setOptError(errMsg);
        toast.error(errMsg, { id: 'opt' });
      }
    } catch (err: any) {
      setOptError(err?.message || 'Error occurred during optimization.');
      toast.error('Optimization failed.', { id: 'opt' });
    } finally {
      setOptimizing(false);
    }
  };

  const handleAcceptOptimized = async () => {
    if (!optimizedResume) return;
    setFormData(optimizedResume);
    setShowComparison(false);
    setPreviewMode('original');
    setSaving(true);
    try {
      await post<any>('/api/resume/edit', {
        resume_id: selectedResume?.id,
        resume_data: optimizedResume,
        job_description: jobDescription,
      });
      toast.success('✅ Optimized resume applied & saved!');
      fetchResumes(selectedResume?.id);
    } catch {
      toast.error('Failed to commit optimized version.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditOptimized = () => {
    if (!optimizedResume) return;
    setFormData(optimizedResume);
    setShowComparison(false);
    setPreviewMode('original');
    triggerAutosave(optimizedResume);
    toast.success('✍️ Now editing the optimized resume!');
  };

  // Print & Download
  const handlePrint = async () => {
    if (!selectedResume) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      setSaving(true);
      await post<any>('/api/resume/edit', { resume_id: selectedResume.id, resume_data: formData, job_description: jobDescription });
      setSaving(false);
    }
    window.open(`/print-resume/${selectedResume.id}`, '_blank');
  };

  const downloadDocxFile = async (resumeId: string, data: ResumeData) => {
    toast.loading('Preparing DOCX...', { id: 'docx' });
    try {
      const res = await fetch('/api/resume/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId, resume_data: data, format: 'docx' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nameClean = data.name.replace(/\s+/g, '_') || 'Candidate';
        const isOpt = resumeId === optimizedResumeId;
        a.download = `${nameClean}_Resume${isOpt ? '_Optimized' : ''}.docx`;
        document.body.appendChild(a); a.click(); a.remove();
        toast.success('DOCX downloaded!', { id: 'docx' });
      } else {
        toast.error('Failed to generate DOCX file.', { id: 'docx' });
      }
    } catch {
      toast.error('Error downloading DOCX.', { id: 'docx' });
    }
  };

  const handleDownloadOriginalPdf = () => { if (selectedResume) window.open(`/print-resume/${selectedResume.id}`, '_blank'); };
  const handleDownloadOriginalDocx = () => { if (selectedResume) downloadDocxFile(selectedResume.id, formData); };
  const handleDownloadOptimizedPdf = () => {
    if (!optimizedResumeId) { toast.error('Optimized resume ID not found. Re-run optimization.'); return; }
    window.open(`/print-resume/${optimizedResumeId}`, '_blank');
  };
  const handleDownloadOptimizedDocx = () => {
    if (!optimizedResumeId || !optimizedResume) { toast.error('Optimized resume not found. Re-run optimization.'); return; }
    downloadDocxFile(optimizedResumeId, optimizedResume);
  };

  // Compute comparison summary stats
  const compStats = optimizedResume && formData ? (() => {
    const skillsAdded = optimizedResume.skills?.filter(s => !formData.skills?.some(os => os.toLowerCase() === s.toLowerCase())) || [];
    const keywordsAdded = (() => {
      const origText = JSON.stringify(formData).toLowerCase();
      return optimizedResume.skills?.filter(s => !origText.includes(s.toLowerCase())) || [];
    })();
    const sectionsImproved: string[] = [];
    if (formData.summary !== optimizedResume.summary) sectionsImproved.push('Summary');
    const origSkills = formData.skills || [];
    const optSkills = optimizedResume.skills || [];
    if (optSkills.some(s => !origSkills.includes(s))) sectionsImproved.push('Skills');
    if (JSON.stringify(formData.experience) !== JSON.stringify(optimizedResume.experience)) sectionsImproved.push('Experience');
    if (JSON.stringify(formData.projects) !== JSON.stringify(optimizedResume.projects)) sectionsImproved.push('Projects');
    return { skillsAdded: skillsAdded.length, keywordsAdded: keywordsAdded.length, sectionsImproved };
  })() : null;

  if (loadingResumes) {
    return (
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Workspace Settings...</p>
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 56px)', minHeight: 0 }}>

        {/* WORKSPACE HEADER */}
        <div className="card" style={{ padding: '12px 18px', marginBottom: 12, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="var(--primary)" />
              <h2 style={{ fontSize: 15, fontWeight: 800 }}>Resume Optimizer Workspace</h2>
            </div>

            {resumes.length > 0 && selectedResume && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border-color)', paddingLeft: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Resume:</span>
                <select
                  className="select"
                  style={{ padding: '4px 28px 4px 10px', fontSize: 12.5, width: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, height: 'auto', fontWeight: 600 }}
                  value={selectedResume.id}
                  onChange={e => fetchResumes(e.target.value)}
                >
                  {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {selectedResume && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Template:</span>
                <select
                  className="select"
                  style={{ padding: '4px 10px', fontSize: 12.5, width: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, height: 'auto' }}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                >
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {saving && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</span>}

              <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Printer size={13} /> Print PDF
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadOriginalDocx} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Download size={13} /> DOCX
              </button>
            </div>
          )}
        </div>

        {/* WORKSPACE CONTENT AREA */}
        {!selectedResume ? (
          /* NO RESUME: UPLOAD ZONE */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 640, margin: '0 auto', width: '100%', padding: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Resume Optimizer Workspace</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Upload your resume in PDF or DOCX format. The AI will optimize it and show you exactly what changed.
              </p>
            </div>
            <UploadZone onUpload={handleUpload} loading={uploadLoading} />
            {uploadError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--error-bg)', border: '1px solid rgba(231,76,60,.2)' }}>
                <AlertCircle size={15} color="var(--error)" />
                <p style={{ fontSize: 13, color: 'var(--error)' }}>{uploadError}</p>
              </div>
            )}
          </div>

        ) : showComparison && optimizedResume ? (
          /* ══════════════════════════════════════════════════
             SIDE-BY-SIDE COMPARISON VIEW
             ══════════════════════════════════════════════════ */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* SUMMARY CARD */}
            <div style={{ padding: '14px 20px', marginBottom: 14, background: 'linear-gradient(135deg, #1e1e2f 0%, #11111c 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', color: '#fff', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                {/* Left: title + description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} color="#a29bfe" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>AI Optimization Complete</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: 2 }}>Review what changed — accept, edit, or keep your original</p>
                  </div>
                </div>

                {/* Right: key stats */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(0,184,148,0.12)', border: '1px solid rgba(0,184,148,0.3)', textAlign: 'center', minWidth: 80 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#7ddfbf', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Skills Added</p>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#00b894', margin: '4px 0 0 0', lineHeight: 1 }}>{compStats?.skillsAdded ?? 0}</p>
                  </div>
                  <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(9,132,227,0.12)', border: '1px solid rgba(9,132,227,0.3)', textAlign: 'center', minWidth: 80 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#74b9ff', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Keywords Added</p>
                    <p style={{ fontSize: 28, fontWeight: 900, color: '#0984e3', margin: '4px 0 0 0', lineHeight: 1 }}>{compStats?.keywordsAdded ?? 0}</p>
                  </div>
                  <div style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(162,155,254,0.1)', border: '1px solid rgba(162,155,254,0.25)', textAlign: 'center', minWidth: 120 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#a29bfe', textTransform: 'uppercase', margin: 0, letterSpacing: '0.06em' }}>Sections Improved</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '6px 0 0 0', lineHeight: 1.2 }}>
                      {compStats && compStats.sectionsImproved.length > 0 ? compStats.sectionsImproved.join(', ') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highlight Legend:</span>
                <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#e6fcf5', border: '1px solid #c3fae8' }} /> <span style={{ color: '#7ddfbf' }}>Green = Added</span></span>
                <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fff9db', border: '1px solid #ffd43b' }} /> <span style={{ color: '#fcc419' }}>Yellow = Modified</span></span>
                <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fff5f5', border: '1px solid #ffe3e3' }} /> <span style={{ color: '#ff6b6b' }}>Red = Removed</span></span>
              </div>
            </div>

            {/* SIDE-BY-SIDE PANELS */}
            <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
              {/* LEFT — Original */}
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '10px 14px', background: 'rgba(231, 76, 60, 0.06)', borderBottom: '2px solid rgba(231, 76, 60, 0.2)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e74c3c', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#c0392b' }}>Original Resume</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Red = removed · Yellow = changed</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--bg-tertiary)' }}>
                  <StyledResumeCard data={formData} templateId={template} diffMode="original" compareData={optimizedResume} />
                </div>
                {/* Download row */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 6, background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Download Original:</span>
                  <button className="btn btn-secondary btn-sm" onClick={handleDownloadOriginalPdf} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Printer size={11} /> PDF
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleDownloadOriginalDocx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <Download size={11} /> DOCX
                  </button>
                </div>
              </div>

              {/* RIGHT — Optimized */}
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '10px 14px', background: 'rgba(46, 204, 113, 0.06)', borderBottom: '2px solid rgba(46, 204, 113, 0.25)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#27ae60' }}>Optimized Resume</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(0,184,148,0.15)', color: '#00b894', fontWeight: 700, border: '1px solid rgba(0,184,148,0.3)' }}>AI-Enhanced</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Green = added · Yellow = improved</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--bg-tertiary)' }}>
                  <StyledResumeCard data={optimizedResume} templateId={template} diffMode="optimized" compareData={formData} />
                </div>
                {/* Download row */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 6, background: 'rgba(0,184,148,0.05)', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#0ca678', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>Download Optimized:</span>
                  <button className="btn btn-sm" onClick={handleDownloadOptimizedPdf} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#0ca678', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                    <Printer size={11} /> PDF
                  </button>
                  <button className="btn btn-sm" onClick={handleDownloadOptimizedDocx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#0ca678', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                    <Download size={11} /> DOCX
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, padding: '10px 0', borderTop: '1px solid var(--border-color)', flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" onClick={handleAcceptOptimized} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white', fontWeight: 700 }}>
                  <CheckCircle size={15} /> Accept & Use Optimized
                </button>
                <button className="btn btn-primary" onClick={handleEditOptimized} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={15} /> Edit Optimized
                </button>
                <button className="btn btn-secondary" onClick={() => { setShowComparison(false); setPreviewMode('original'); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={15} /> Keep Original
                </button>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleOptimize}
                disabled={optimizing}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {optimizing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                Re-Optimize
              </button>
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════════════
             ACTIVE WORKSPACE EDITOR VIEW
             ══════════════════════════════════════════════════ */
          <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

            {/* COLUMN 1: FORM EDITOR */}
            <div className="card" style={{ flex: '0 0 32%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="tabs" style={{ borderBottom: '1px solid var(--border-color)', flexShrink: 0, overflowX: 'auto', display: 'flex', flexWrap: 'nowrap' }}>
                {[
                  { id: 'info', label: 'Contact' },
                  { id: 'summary', label: 'Summary' },
                  { id: 'skills', label: 'Skills & Certs' },
                  { id: 'experience', label: 'Exp & Edu' },
                  { id: 'projects', label: 'Projects' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`tab${activeTab === t.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(t.id as any)}
                    style={{ padding: '8px 12px', fontSize: 12, flex: 1, whiteSpace: 'nowrap' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* CONTACT */}
                {activeTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div><label className="input-label" style={{ fontSize: 11 }}>Full Name</label><input className="input" value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. John Doe" /></div>
                    <div><label className="input-label" style={{ fontSize: 11 }}>Target Title</label><input className="input" value={formData.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Senior Software Engineer" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><label className="input-label" style={{ fontSize: 11 }}>Email</label><input className="input" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} /></div>
                      <div><label className="input-label" style={{ fontSize: 11 }}>Phone</label><input className="input" value={formData.phone} onChange={e => updateField('phone', e.target.value)} /></div>
                    </div>
                    <div><label className="input-label" style={{ fontSize: 11 }}>Location</label><input className="input" value={formData.location} onChange={e => updateField('location', e.target.value)} /></div>
                    <div><label className="input-label" style={{ fontSize: 11 }}>LinkedIn (optional)</label><input className="input" value={formData.linkedin || ''} onChange={e => updateField('linkedin', e.target.value)} placeholder="linkedin.com/in/username" /></div>
                    <div><label className="input-label" style={{ fontSize: 11 }}>GitHub (optional)</label><input className="input" value={formData.github || ''} onChange={e => updateField('github', e.target.value)} placeholder="github.com/username" /></div>
                  </div>
                )}

                {/* SUMMARY */}
                {activeTab === 'summary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label className="input-label" style={{ fontSize: 11 }}>Professional Summary</label>
                    <textarea className="textarea" rows={14} value={formData.summary} onChange={e => updateField('summary', e.target.value)} placeholder="Write a powerful summary highlighting your core skills, years of experience, and primary accomplishments." style={{ lineHeight: 1.5, fontSize: 13 }} />
                  </div>
                )}

                {/* SKILLS & CERTS */}
                {activeTab === 'skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="input-label" style={{ fontSize: 11, fontWeight: 700 }}>Skills Matrix</label>
                      <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <input className="input input-sm" placeholder="Add skill (e.g. Docker, Python)" value={skillInput} onChange={e => setSkillInput(e.target.value)} />
                        <button type="submit" className="btn btn-secondary btn-sm">Add</button>
                      </form>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {formData.skills.map(s => (
                          <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '3px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                            {s}<button onClick={() => handleRemoveSkill(s)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0 }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                      <label className="input-label" style={{ fontSize: 11, fontWeight: 700 }}>Certifications</label>
                      <form onSubmit={handleAddCert} style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        <input className="input input-sm" placeholder="Add cert (e.g. AWS Solution Architect)" value={certInput} onChange={e => setCertInput(e.target.value)} />
                        <button type="submit" className="btn btn-secondary btn-sm">Add</button>
                      </form>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(formData.certifications || []).map(c => (
                          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '3px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                            {c}<button onClick={() => handleRemoveCert(c)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: 0 }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* EXPERIENCE & EDUCATION */}
                {activeTab === 'experience' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <label className="input-label" style={{ fontSize: 11.5, fontWeight: 700, margin: 0 }}>Work Experience</label>
                        <button className="btn btn-ghost btn-xs text-primary" onClick={handleAddExperience} style={{ padding: '2px 6px' }}>+ Add Role</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {formData.experience.map((exp, idx) => (
                          <div key={idx} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                            <button onClick={() => handleRemoveExperience(idx)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)' }}><Trash2 size={13} /></button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, paddingRight: 20 }}>
                              <div><label className="input-label" style={{ fontSize: 9.5 }}>Title</label><input className="input input-sm" value={exp.title} onChange={e => handleUpdateExperience(idx, 'title', e.target.value)} /></div>
                              <div><label className="input-label" style={{ fontSize: 9.5 }}>Company</label><input className="input input-sm" value={exp.company} onChange={e => handleUpdateExperience(idx, 'company', e.target.value)} /></div>
                            </div>
                            <div style={{ marginBottom: 8 }}><label className="input-label" style={{ fontSize: 9.5 }}>Dates</label><input className="input input-sm" value={exp.dates} onChange={e => handleUpdateExperience(idx, 'dates', e.target.value)} placeholder="e.g. Jun 2021 - Present" /></div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)' }}>Bullets</span>
                                <button className="btn btn-ghost btn-xs" style={{ fontSize: 9, padding: '1px 4px' }} onClick={() => handleAddBullet(idx)}>+ Bullet</button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {exp.bullets?.map((b, bIdx) => (
                                  <div key={bIdx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input className="input input-sm" style={{ flex: 1, fontSize: 11.5 }} value={b} onChange={e => handleUpdateBullet(idx, bIdx, e.target.value)} />
                                    <button onClick={() => handleRemoveBullet(idx, bIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>×</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <label className="input-label" style={{ fontSize: 11.5, fontWeight: 700, margin: 0 }}>Education</label>
                        <button className="btn btn-ghost btn-xs text-primary" onClick={handleAddEducation}>+ Add Study</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {formData.education.map((edu, idx) => (
                          <div key={idx} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                            <button onClick={() => handleRemoveEducation(idx)} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)' }}><Trash2 size={13} /></button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6, paddingRight: 20 }}>
                              <div><label className="input-label" style={{ fontSize: 9.5 }}>Degree</label><input className="input input-sm" value={edu.degree} onChange={e => handleUpdateEducation(idx, 'degree', e.target.value)} /></div>
                              <div><label className="input-label" style={{ fontSize: 9.5 }}>Institution</label><input className="input input-sm" value={edu.institution} onChange={e => handleUpdateEducation(idx, 'institution', e.target.value)} /></div>
                            </div>
                            <div><label className="input-label" style={{ fontSize: 9.5 }}>Dates</label><input className="input input-sm" value={edu.dates} onChange={e => handleUpdateEducation(idx, 'dates', e.target.value)} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PROJECTS */}
                {activeTab === 'projects' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="input-label" style={{ fontSize: 11.5, fontWeight: 700, margin: 0 }}>Personal & Tech Projects</label>
                      <button className="btn btn-ghost btn-xs text-primary" onClick={handleAddProject}>+ Add Project</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(formData.projects || []).map((proj, idx) => (
                        <div key={idx} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                          <button onClick={() => handleRemoveProject(idx)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--error)' }}><Trash2 size={13} /></button>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, paddingRight: 20 }}>
                            <div><label className="input-label" style={{ fontSize: 9.5 }}>Name</label><input className="input input-sm" value={proj.name} onChange={e => handleUpdateProject(idx, 'name', e.target.value)} /></div>
                            <div><label className="input-label" style={{ fontSize: 9.5 }}>URL (optional)</label><input className="input input-sm" value={proj.url || ''} onChange={e => handleUpdateProject(idx, 'url', e.target.value)} placeholder="github.com/..." /></div>
                          </div>
                          <div style={{ marginBottom: 8 }}><label className="input-label" style={{ fontSize: 9.5 }}>Description</label><textarea className="textarea input-sm" rows={3} value={proj.description} onChange={e => handleUpdateProject(idx, 'description', e.target.value)} /></div>
                          <div><label className="input-label" style={{ fontSize: 9.5 }}>Technologies (comma separated)</label><input className="input input-sm" value={proj.technologies?.join(', ') || ''} onChange={e => handleUpdateProject(idx, 'technologies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="React, AWS, Node.js" /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: LIVE PREVIEW */}
            <div className="card" style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
              <div className="card-header" style={{ padding: '8px 12px', flexShrink: 0, justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Eye size={13} color="var(--primary)" /> Real-Time Preview
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>A-</button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(130, z + 10))} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}>A+</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '100%', maxWidth: '100%', transition: 'transform 0.15s' }}>
                  <StyledResumeCard data={formData} templateId={template} />
                </div>
              </div>
            </div>

            {/* COLUMN 3: AI OPTIMIZE PANEL */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

              {/* Prominent Optimize with AI button area */}
              <div className="card" style={{ flexShrink: 0, overflow: 'hidden' }}>
                {/* Header banner */}
                <div style={{ padding: '16px 18px', background: 'linear-gradient(135deg, #2d1b69 0%, #11111c 100%)', borderBottom: '1px solid rgba(162,155,254,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(162,155,254,0.2)', border: '1px solid rgba(162,155,254,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkles size={16} color="#a29bfe" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0 }}>AI Resume Optimizer</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Claude AI-powered enhancement</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="input-label" style={{ fontSize: 11.5, fontWeight: 700 }}>Target Job Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                    <textarea
                      className="textarea"
                      rows={5}
                      placeholder="Paste the job description here to tailor your resume to specific keywords and requirements..."
                      value={jobDescription}
                      onChange={e => setJobDescription(e.target.value)}
                      style={{ fontSize: 12.5, marginTop: 6 }}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleOptimize}
                    disabled={optimizing || !formData.name}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 800,
                      background: optimizing ? undefined : 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                      border: 'none',
                      borderRadius: 10,
                      boxShadow: optimizing ? 'none' : '0 4px 20px rgba(108,92,231,0.35)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {optimizing ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Optimizing Resume...</>
                    ) : (
                      <><Sparkles size={16} /> Optimize with AI</>
                    )}
                  </button>

                  {optError && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--error-bg)', border: '1px solid rgba(231,76,60,.2)' }}>
                      <AlertCircle size={14} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11.5, color: 'var(--error)', lineHeight: 1.45 }}>{optError}</p>
                    </div>
                  )}

                  {/* What AI does callout */}
                  {!optimizing && !optError && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>What AI will improve:</p>
                      <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {['Rewrites bullet points with strong action verbs', 'Adds quantified achievements & metrics', 'Improves professional summary', 'Adds relevant skills & keywords', 'Strengthens project descriptions'].map(item => (
                          <li key={item} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload another resume */}
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '10px 14px', flexShrink: 0 }}>
                  <h3>Upload Another Resume</h3>
                  <FileText size={14} color="var(--text-muted)" />
                </div>
                <div style={{ padding: 14, flex: 1, overflowY: 'auto' }}>
                  <UploadZone onUpload={handleUpload} loading={uploadLoading} />
                  {uploadError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--error-bg)', border: '1px solid rgba(231,76,60,.2)' }}>
                      <AlertCircle size={13} color="var(--error)" />
                      <p style={{ fontSize: 11.5, color: 'var(--error)' }}>{uploadError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppWrapper>
  );
}

export default function AiChatPage() {
  return (
    <Suspense fallback={
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading Resume Optimizer Workspace...</p>
        </div>
      </AppWrapper>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
