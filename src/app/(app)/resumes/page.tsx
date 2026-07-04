'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Search, Grid, List, MoreHorizontal,
  Download, Eye, Trash2, Copy, Zap, Target, Mail, X, UploadCloud, AlertCircle, Loader2, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Resume } from '@/lib/types';

function AtsCircle({ ats, label }: { ats: number; label: string }) {
  const color = ats >= 85 ? '#00b894' : ats >= 70 ? '#6C5CE7' : ats >= 55 ? '#fdcb6e' : '#ff7675';
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="var(--border-color)" strokeWidth={4} />
        <circle cx={22} cy={22} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - ats / 100)} strokeLinecap="round" />
      </svg>
      <div style={{ marginLeft: -36, width: 44, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>{ats}</p>
      </div>
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, color }}>{label}</p>
        <p style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>ATS Score</p>
      </div>
    </div>
  );
}

export default function ResumesPage() {
  const router = useRouter();
  const { get, del } = useApi();
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sort, setSort] = useState('Newest First');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selected, setSelected] = useState<Resume | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchResumes = async () => {
    setLoading(true);
    const res = await get<Resume[]>('/api/resumes');
    if (res.success && res.data) setResumes(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchResumes(); }, []); // eslint-disable-line

  const handleUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext || '')) { toast.error('Only PDF and DOCX files are supported.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be under 10 MB.'); return; }

    setUploading(true);
    toast.loading('Parsing resume…', { id: 'upload' });
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: fd,
        headers: { 'x-user-id': user?.id || 'demo-001' },
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Resume parsed! ATS Score: ${json.data.ats?.score ?? '—'}/100`, { id: 'upload' });
        await fetchResumes();
      } else {
        toast.error(json.error || 'Upload failed.', { id: 'upload' });
      }
    } catch {
      toast.error('Upload failed. Please try again.', { id: 'upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await del('/api/resumes', { id });
    if (res.success) {
      toast.success('Resume deleted.');
      setResumes(prev => prev.filter(r => r.id !== id));
      if (selected?.id === id) setSelected(null);
    } else {
      toast.error('Failed to delete resume.');
    }
    setDeleteConfirm(null);
  };

  const statusColor = (s: string) => {
    if (s === 'Optimized') return 'badge-success';
    if (s === 'Good') return 'badge-primary';
    if (s === 'Needs Improve') return 'badge-warning';
    if (s === 'Below Average' || s === 'Poor') return 'badge-error';
    return 'badge-muted';
  };

  const scoreLabel = (score?: number) => {
    if (!score) return '—';
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Needs Work';
    return 'Poor';
  };

  const sorted = [...resumes]
    .filter(r => {
      const name = r.parsed_data?.name || r.filename;
      const title = r.parsed_data?.title || '';
      const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All Status' || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sort === 'Highest ATS') return (b.ats_score ?? 0) - (a.ats_score ?? 0);
      if (sort === 'Lowest ATS') return (a.ats_score ?? 0) - (b.ats_score ?? 0);
      if (sort === 'Oldest First') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newest First
    });

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 0, minHeight: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div className="page-header">
          <h1>My Resumes</h1>
          <p>Upload, manage and optimize all your resumes in one place</p>
        </div>

        {/* Upload Zone (drag-and-drop or button) */}
        <label htmlFor="resume-upload-input" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          <input id="resume-upload-input" type="file" accept=".pdf,.docx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          <div style={{ border: '2px dashed rgba(108,92,231,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6C5CE7'; e.currentTarget.style.background = 'rgba(108,92,231,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(108,92,231,0.3)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}>
            {uploading
              ? <><Loader2 size={20} color="#6C5CE7" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} /><p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Parsing resume…</p></>
              : <><UploadCloud size={20} color="#6C5CE7" style={{ flexShrink: 0 }} /><div><p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>Upload a Resume</p><p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF or DOCX · max 10 MB · drag & drop or click</p></div></>
            }
          </div>
        </label>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <div className="topbar-search" style={{ flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search resumes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {['All Status', 'Optimized', 'Good', 'Needs Improve', 'Below Average'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="select" style={{ width: 150 }} value={sort} onChange={e => setSort(e.target.value)}>
            {['Newest First', 'Oldest First', 'Highest ATS', 'Lowest ATS'].map(s => <option key={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            <button className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setViewMode('list')}><List size={15} /></button>
            <button className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'} btn-icon`} onClick={() => setViewMode('grid')}><Grid size={15} /></button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>Loading your resumes…</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && sorted.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={28} color="var(--text-muted)" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              {search || statusFilter !== 'All Status' ? 'No resumes match your filters' : 'No resumes yet'}
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {search || statusFilter !== 'All Status'
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload your first resume to get an instant ATS score and optimization recommendations.'}
            </p>
            {!search && statusFilter === 'All Status' && (
              <label htmlFor="resume-upload-input" style={{ cursor: 'pointer' }}>
                <span className="btn btn-primary"><UploadCloud size={14} /> Upload Your First Resume</span>
              </label>
            )}
          </div>
        )}

        {/* List View */}
        {!loading && sorted.length > 0 && viewMode === 'list' && (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Resume</th><th>ATS Score</th><th>Status</th><th>Uploaded</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const displayName = r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename;
                    const title = r.parsed_data?.title || '';
                    const score = r.ats_score ?? 0;
                    const label = scoreLabel(score);
                    const date = new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <tr key={r.id} className={selected?.id === r.id ? 'selected' : ''} onClick={() => setSelected(r)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={16} color="var(--primary)" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{displayName}</span>
                                {r.status === 'Optimized' && <span className="badge badge-primary" style={{ fontSize: 10 }}>AI Optimized</span>}
                              </div>
                              {title && <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{title}</p>}
                            </div>
                          </div>
                        </td>
                        <td>{score > 0 ? <AtsCircle ats={score} label={label} /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                        <td><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{date}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-icon btn-sm" title="Preview" onClick={() => setSelected(r)}><Eye size={14} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" title="ATS Check" onClick={() => router.push('/ats-checker')}><Target size={14} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Delete" onClick={() => setDeleteConfirm(r.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grid View */}
        {!loading && sorted.length > 0 && viewMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {sorted.map(r => {
              const displayName = r.parsed_data?.name ? `${r.parsed_data.name}'s Resume` : r.filename;
              const score = r.ats_score ?? 0;
              const label = scoreLabel(score);
              return (
                <div key={r.id} className="card" style={{ cursor: 'pointer', transition: 'all 0.18s', padding: 16 }}
                  onClick={() => setSelected(r)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,92,231,.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="var(--primary)" />
                    </div>
                    {r.status === 'Optimized' && <span className="badge badge-primary" style={{ fontSize: 10 }}>AI</span>}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 10 }}>{r.parsed_data?.title || r.filename}</p>
                  {score > 0 && <AtsCircle ats={score} label={label} />}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={e => { e.stopPropagation(); router.push('/ats-checker'); }}>
                      <Target size={12} />
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 2, justifyContent: 'center', fontSize: 12 }} onClick={e => { e.stopPropagation(); router.push('/ai-chat'); }}>
                      <Zap size={12} /> Optimize
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Detail Panel */}
      {selected && (
        <div className="detail-panel" style={{ width: 340 }}>
          <div className="detail-panel-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.parsed_data?.name ? `${selected.parsed_data.name}'s Resume` : selected.filename}
              </h3>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon btn-sm"><X size={15} /></button>
            </div>
            {selected.status === 'Optimized' && <span className="badge badge-primary" style={{ marginTop: 6 }}>AI Optimized</span>}
          </div>
          <div style={{ padding: 18 }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => router.push('/ats-checker')}>
                <Target size={13} /> ATS Check
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => router.push('/ai-chat')}>
                <Zap size={13} /> Optimize
              </button>
            </div>

            {/* ATS Score */}
            {(selected.ats_score ?? 0) > 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
                {(() => {
                  const color = (selected.ats_score ?? 0) >= 85 ? '#00b894' : (selected.ats_score ?? 0) >= 70 ? '#6C5CE7' : (selected.ats_score ?? 0) >= 55 ? '#fdcb6e' : '#ff7675';
                  const circ = 2 * Math.PI * 42;
                  return (
                    <>
                      <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={50} cy={50} r={42} fill="none" stroke="var(--border-color)" strokeWidth={8} />
                        <circle cx={50} cy={50} r={42} fill="none" stroke={color} strokeWidth={8}
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - (selected.ats_score ?? 0) / 100)} strokeLinecap="round" />
                      </svg>
                      <div style={{ marginTop: -68, marginBottom: 8 }}>
                        <p style={{ fontSize: 28, fontWeight: 900, color }}>{selected.ats_score}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color }}>{scoreLabel(selected.ats_score)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Parsed Info */}
            {selected.parsed_data && (
              <>
                <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Parsed Info</p>
                {[
                  { label: 'Name',     value: selected.parsed_data.name },
                  { label: 'Title',    value: selected.parsed_data.title },
                  { label: 'Email',    value: selected.parsed_data.email },
                  { label: 'Location', value: selected.parsed_data.location },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </>
            )}

            {/* Skills */}
            {selected.parsed_data?.skills && selected.parsed_data.skills.length > 0 && (
              <>
                <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', margin: '16px 0 8px' }}>Skills ({selected.parsed_data.skills.length})</p>
                <div className="chip-row">
                  {selected.parsed_data.skills.slice(0, 10).map(s => <span key={s} className="tag tag-primary">{s}</span>)}
                  {selected.parsed_data.skills.length > 10 && <span className="tag">+{selected.parsed_data.skills.length - 10} more</span>}
                </div>
              </>
            )}

            {/* Actions */}
            <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', margin: '16px 0 8px' }}>Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Download PDF',            icon: Download, action: () => window.open(`/print-resume/${selected.id}`, '_blank'), danger: false },
                { label: 'Download DOCX',           icon: Download, action: async () => {
                  toast.loading('Preparing DOCX...', { id: 'dl' });
                  try {
                    const response = await fetch('/api/resume/download', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ resume_id: selected.id, format: 'docx' })
                    });
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      const suffix = selected.status === 'Optimized' ? '_Optimized' : '';
                      a.download = `${selected.parsed_data?.name?.replace(/\s+/g, '_') || 'Candidate'}_Resume${suffix}.docx`;
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
                }, danger: false },
                { label: 'Edit Resume',             icon: Edit3, action: () => router.push(`/editor?id=${selected.id}`), danger: false },
                { label: 'Optimize with AI',       icon: Zap,    action: () => router.push('/ai-chat'),       danger: false },
                { label: 'Run ATS Check',           icon: Target, action: () => router.push('/ats-checker'),   danger: false },
                { label: 'Generate Cover Letter',   icon: Mail,   action: () => router.push('/cover-letter'),  danger: false },
                { label: 'Delete Resume',           icon: Trash2, action: () => setDeleteConfirm(selected.id), danger: true },
              ].map(({ label, icon: Icon, action, danger }) => (
                <button key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: danger ? 'var(--error)' : 'var(--text-secondary)', width: '100%', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--error-bg)' : 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Delete Resume?</h3>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                This action cannot be undone. The resume and all associated ATS reports will be permanently deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppWrapper>
  );
}
