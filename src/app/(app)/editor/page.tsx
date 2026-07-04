'use client';
import { useState, useEffect, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Trash2, Plus, Loader2, CheckCircle,
  Eye, Download, ChevronDown, History, Info, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';

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
}

interface VersionRecord {
  id: string;
  resume_id: string;
  parsed_data: ResumeData;
  version: number;
  created_at: string;
}

/* ─────────────────────────────────────────────
   RESUME CARD PREVIEW
   Renders structured resume data in real-time
───────────────────────────────────────────── */
function ResumeCard({ data, accent = '#6C5CE7' }: { data: ResumeData; accent?: string }) {
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join(' • ');
  return (
    <div style={{ fontSize: 10, padding: 18, background: 'white', color: 'black', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 8, fontFamily: 'Calibri, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 8, marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 2, color: '#111' }}>{data.name || 'Your Name'}</h2>
        <p style={{ fontSize: 11.5, color: accent, fontWeight: 600 }}>{data.title || 'Professional'}</p>
        {contact && <p style={{ fontSize: 9.5, color: '#666', marginTop: 3, lineHeight: 1.4 }}>{contact}</p>}
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 2, marginBottom: 5 }}>Summary</h3>
          <p style={{ fontSize: 9.5, color: '#333', lineHeight: 1.45, margin: 0, textAlign: 'justify' }}>{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 2, marginBottom: 5 }}>Experience</h3>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 9.5 }}>
                <span>{e.title}</span>
                {e.dates && <span style={{ color: '#666', fontSize: 8.5 }}>{e.dates}</span>}
              </div>
              <p style={{ fontSize: 9, color: '#555', fontStyle: 'italic', margin: '1px 0 3px 0' }}>{e.company}</p>
              {e.bullets && e.bullets.length > 0 && (
                <ul style={{ paddingLeft: 12, margin: 0 }}>
                  {e.bullets.map((b, j) => <li key={j} style={{ fontSize: 9, color: '#333', marginBottom: 1.5, lineHeight: 1.4 }}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 2, marginBottom: 5 }}>Education</h3>
          {data.education.map((ed, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 3 }}>
              <div>
                <span style={{ fontWeight: 700 }}>{ed.degree}</span>
                <span style={{ color: '#666', fontStyle: 'italic' }}> · {ed.institution}</span>
              </div>
              {ed.dates && <span style={{ color: '#666', fontSize: 8.5 }}>{ed.dates}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 2, marginBottom: 5 }}>Skills</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {data.skills.map(s => (
              <span key={s} style={{ fontSize: 8.5, padding: '2px 5px', borderRadius: 3, background: `${accent}12`, color: accent, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('id');
  const { get, post } = useApi();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume states
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');
  const [formData, setFormData] = useState<ResumeData>({
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
  });

  // Version states
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'summary' | 'experience' | 'education'>('info');

  // Skill input
  const [skillInput, setSkillInput] = useState('');

  // Fetch initial resume & version list
  useEffect(() => {
    if (!resumeId) {
      setError('No Resume ID provided.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const resumeRes = await get<any>(`/api/resumes?id=${resumeId}`);
        if (resumeRes.success && resumeRes.data) {
          setFilename(resumeRes.data.filename);
          setStatus(resumeRes.data.status);
          if (resumeRes.data.parsed_data) {
            setFormData({
              name: resumeRes.data.parsed_data.name || '',
              title: resumeRes.data.parsed_data.title || '',
              email: resumeRes.data.parsed_data.email || '',
              phone: resumeRes.data.parsed_data.phone || '',
              location: resumeRes.data.parsed_data.location || '',
              linkedin: resumeRes.data.parsed_data.linkedin || '',
              github: resumeRes.data.parsed_data.github || '',
              summary: resumeRes.data.parsed_data.summary || '',
              experience: resumeRes.data.parsed_data.experience || [],
              education: resumeRes.data.parsed_data.education || [],
              skills: resumeRes.data.parsed_data.skills || [],
            });
          }
        } else {
          setError(resumeRes.error || 'Failed to load resume details.');
        }

        // Load versions history
        const versionsRes = await get<VersionRecord[]>(`/api/resume/versions?resume_id=${resumeId}`);
        if (versionsRes.success && versionsRes.data) {
          setVersions(versionsRes.data);
        }
      } catch (err) {
        setError('Error reaching the server. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [resumeId, get]);

  // Handle Save
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await post<any>('/api/resume/edit', {
        resume_id: resumeId,
        resume_data: formData,
      });

      if (res.success && res.data) {
        toast.success(`Saved successfully! Created Version ${res.data.version}`);
        
        // Refresh version history
        const versionsRes = await get<VersionRecord[]>(`/api/resume/versions?resume_id=${resumeId}`);
        if (versionsRes.success && versionsRes.data) {
          setVersions(versionsRes.data);
        }
      } else {
        toast.error(res.error || 'Failed to save changes.');
      }
    } catch {
      toast.error('An unexpected error occurred during save.');
    } finally {
      setSaving(false);
    }
  };

  // Restore older version snapshot
  const handleRestoreVersion = (ver: VersionRecord) => {
    setFormData(ver.parsed_data);
    setShowVersions(false);
    toast.success(`Restored Version ${ver.version} fields! Remember to click "Save Version" to commit new edits.`);
  };

  // Form Field Change
  const updateField = (field: keyof ResumeData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Add/Remove Skills
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = skillInput.trim();
    if (clean && !formData.skills.includes(clean)) {
      updateField('skills', [...formData.skills, clean]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    updateField('skills', formData.skills.filter((s) => s !== skill));
  };

  // Experience CRUD
  const handleAddExperience = () => {
    const newItem: ExperienceItem = {
      title: 'New Position',
      company: 'New Company',
      dates: 'Month Year – Present',
      bullets: ['Responsible for...', 'Achieved...'],
    };
    updateField('experience', [...formData.experience, newItem]);
  };

  const handleUpdateExperience = (idx: number, field: keyof ExperienceItem, val: any) => {
    const updated = formData.experience.map((item, i) => {
      if (i === idx) return { ...item, [field]: val };
      return item;
    });
    updateField('experience', updated);
  };

  const handleRemoveExperience = (idx: number) => {
    updateField('experience', formData.experience.filter((_, i) => i !== idx));
  };

  const handleAddBullet = (expIdx: number) => {
    const exp = formData.experience[expIdx];
    handleUpdateExperience(expIdx, 'bullets', [...(exp.bullets || []), 'New bullet point']);
  };

  const handleUpdateBullet = (expIdx: number, bulletIdx: number, val: string) => {
    const exp = formData.experience[expIdx];
    const updatedBullets = exp.bullets.map((b, i) => (i === bulletIdx ? val : b));
    handleUpdateExperience(expIdx, 'bullets', updatedBullets);
  };

  const handleRemoveBullet = (expIdx: number, bulletIdx: number) => {
    const exp = formData.experience[expIdx];
    handleUpdateExperience(expIdx, 'bullets', exp.bullets.filter((_, i) => i !== bulletIdx));
  };

  // Education CRUD
  const handleAddEducation = () => {
    const newItem: EducationItem = {
      degree: 'Degree / Major',
      institution: 'University Name',
      dates: 'Year – Year',
    };
    updateField('education', [...formData.education, newItem]);
  };

  const handleUpdateEducation = (idx: number, field: keyof EducationItem, val: any) => {
    const updated = formData.education.map((item, i) => {
      if (i === idx) return { ...item, [field]: val };
      return item;
    });
    updateField('education', updated);
  };

  const handleRemoveEducation = (idx: number) => {
    updateField('education', formData.education.filter((_, i) => i !== idx));
  };

  // PDF download
  const handleDownloadPdf = () => {
    window.open(`/print-resume/${resumeId}`, '_blank');
  };

  // DOCX download
  const handleDownloadDocx = async () => {
    toast.loading('Preparing DOCX...', { id: 'dl' });
    try {
      const response = await fetch('/api/resume/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_id: resumeId, format: 'docx' }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const suffix = status === 'Optimized' ? '_Optimized' : '';
        a.download = `${formData.name.replace(/\s+/g, '_') || 'Candidate'}_Resume${suffix}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('DOCX downloaded!', { id: 'dl' });
      } else {
        toast.error('Failed to generate DOCX', { id: 'dl' });
      }
    } catch {
      toast.error('Error downloading DOCX', { id: 'dl' });
    }
  };

  if (loading) {
    return (
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading editor interface...</p>
        </div>
      </AppWrapper>
    );
  }

  if (error) {
    return (
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', padding: 20 }}>
          <AlertCircle size={40} color="var(--error)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Load Failed</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push('/resumes')}>
            Back to Resumes
          </button>
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 56px)', minHeight: 0 }}>
        {/* Editor Sub-header */}
        <div className="card" style={{ padding: '12px 18px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startTransition(() => router.push('/resumes'))}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800 }}>Resume Editor & Version Control</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filename} · Active Schema Mode</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
            {/* Version History Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowVersions((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <History size={14} /> Version History ({versions.length}) <ChevronDown size={12} />
              </button>
              {showVersions && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowVersions(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', width: 280, zIndex: 100, padding: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', padding: '4px 8px 8px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: 6 }}>Select Version to Restore</p>
                    {versions.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '10px 8px', textAlign: 'center' }}>No version history recorded yet.</p>
                    ) : (
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {versions.map((ver) => (
                          <button
                            key={ver.id}
                            onClick={() => handleRestoreVersion(ver)}
                            style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left', marginBottom: 2 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Version {ver.version}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(ver.created_at).toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleDownloadPdf}>
              <Eye size={14} /> PDF Print
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadDocx}>
              <Download size={14} /> DOCX
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…
                </>
              ) : (
                <>
                  <Save size={14} /> Save Version
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
          {/* Left Edit Pane */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="tabs" style={{ borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              {[
                { id: 'info', label: 'Contact Info' },
                { id: 'summary', label: 'Summary & Skills' },
                { id: 'experience', label: 'Experience' },
                { id: 'education', label: 'Education' },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id as any)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {/* CONTACT INFO TAB */}
              {activeTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">Full Name</label>
                      <input className="input" value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Target Title</label>
                      <input className="input" value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">Email</label>
                      <input className="input" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">Phone</label>
                      <input className="input" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Location</label>
                    <input className="input" value={formData.location} onChange={(e) => updateField('location', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">LinkedIn Profile (optional)</label>
                      <input className="input" placeholder="linkedin.com/in/username" value={formData.linkedin || ''} onChange={(e) => updateField('linkedin', e.target.value)} />
                    </div>
                    <div>
                      <label className="input-label">GitHub URL (optional)</label>
                      <input className="input" placeholder="github.com/username" value={formData.github || ''} onChange={(e) => updateField('github', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* SUMMARY & SKILLS TAB */}
              {activeTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="input-label">Professional Summary</label>
                    <textarea className="textarea" rows={6} value={formData.summary} onChange={(e) => updateField('summary', e.target.value)} />
                  </div>

                  <div>
                    <label className="input-label">Skills List</label>
                    <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <input
                        className="input"
                        placeholder="Type skill and press Enter (e.g. Node.js, Next.js)"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                      />
                      <button type="submit" className="btn btn-secondary">
                        <Plus size={16} /> Add
                      </button>
                    </form>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {formData.skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            padding: '4px 10px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6,
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(skill)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', padding: 0 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* EXPERIENCE TAB */}
              {activeTab === 'experience' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Work Experience</p>
                    <button className="btn btn-secondary btn-sm" onClick={handleAddExperience}>
                      <Plus size={14} /> Add Role
                    </button>
                  </div>

                  {formData.experience.map((exp, idx) => (
                    <div key={idx} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                      <button
                        onClick={() => handleRemoveExperience(idx)}
                        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                        title="Remove role"
                      >
                        <Trash2 size={15} />
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, paddingRight: 24 }}>
                        <div>
                          <label className="input-label" style={{ fontSize: 11 }}>Title</label>
                          <input className="input input-sm" value={exp.title} onChange={(e) => handleUpdateExperience(idx, 'title', e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label" style={{ fontSize: 11 }}>Company</label>
                          <input className="input input-sm" value={exp.company} onChange={(e) => handleUpdateExperience(idx, 'company', e.target.value)} />
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <label className="input-label" style={{ fontSize: 11 }}>Dates</label>
                        <input className="input input-sm" placeholder="e.g. June 2021 – Present" value={exp.dates} onChange={(e) => handleUpdateExperience(idx, 'dates', e.target.value)} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label className="input-label" style={{ fontSize: 11, margin: 0 }}>Bullet Points</label>
                          <button className="btn btn-secondary btn-xs" style={{ fontSize: 10 }} onClick={() => handleAddBullet(idx)}>
                            + Add Bullet
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {exp.bullets?.map((b, bulletIdx) => (
                            <div key={bulletIdx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                className="input input-sm"
                                style={{ flex: 1 }}
                                value={b}
                                onChange={(e) => handleUpdateBullet(idx, bulletIdx, e.target.value)}
                              />
                              <button
                                onClick={() => handleRemoveBullet(idx, bulletIdx)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* EDUCATION TAB */}
              {activeTab === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)' }}>Education</p>
                    <button className="btn btn-secondary btn-sm" onClick={handleAddEducation}>
                      <Plus size={14} /> Add Education
                    </button>
                  </div>

                  {formData.education.map((edu, idx) => (
                    <div key={idx} style={{ padding: 14, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                      <button
                        onClick={() => handleRemoveEducation(idx)}
                        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                        title="Remove education"
                      >
                        <Trash2 size={15} />
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10, paddingRight: 24 }}>
                        <div>
                          <label className="input-label" style={{ fontSize: 11 }}>Degree / Major</label>
                          <input className="input input-sm" value={edu.degree} onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)} />
                        </div>
                        <div>
                          <label className="input-label" style={{ fontSize: 11 }}>Institution</label>
                          <input className="input input-sm" value={edu.institution} onChange={(e) => handleUpdateEducation(idx, 'institution', e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label className="input-label" style={{ fontSize: 11 }}>Dates</label>
                        <input className="input input-sm" placeholder="e.g. 2017 – 2021" value={edu.dates} onChange={(e) => handleUpdateEducation(idx, 'dates', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Live Preview Pane */}
          <div style={{ width: 380, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
            <div className="card" style={{ padding: '8px 12px', flexShrink: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} color="var(--primary)" /> Live Real-Time Preview
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-tertiary)', borderRadius: 12, padding: 12, border: '1px solid var(--border-color)' }}>
              <ResumeCard data={formData} accent={status === 'Optimized' ? '#00b894' : '#6C5CE7'} />
            </div>
          </div>
        </div>
      </div>
      {/* Spin Animation Styling */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppWrapper>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <AppWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading editor interface...</p>
        </div>
      </AppWrapper>
    }>
      <EditorContent />
    </Suspense>
  );
}
