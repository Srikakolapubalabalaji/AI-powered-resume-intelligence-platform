'use client';
import { useState } from 'react';
import { Search, FileText, Target, Mail, MessageSquare, LayoutTemplate, Briefcase, X, Download, Eye, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper';

const TYPE_CONFIG = {
  Resume:       { color: '#6C5CE7', bg: 'rgba(108,92,231,.1)',  icon: FileText     },
  'Cover Letter': { color: '#0984e3', bg: 'rgba(9,132,227,.1)',   icon: Mail         },
  'ATS Check':  { color: '#00b894', bg: 'rgba(0,184,148,.1)',   icon: Target       },
  'AI Chat':    { color: '#e17055', bg: 'rgba(225,112,85,.1)',  icon: MessageSquare },
  Template:     { color: '#fdcb6e', bg: 'rgba(253,203,110,.15)',icon: LayoutTemplate},
  'Job Match':  { color: '#A29BFE', bg: 'rgba(162,155,254,.15)',icon: Briefcase    },
};

type HistType = keyof typeof TYPE_CONFIG;

const HISTORY: Array<{
  id: number; type: HistType; name: string; role: string; company: string;
  created: string; size: string; location: string;
}> = [
  { id: 1,  type: 'Resume',       name: 'Software Engineer Resume.pdf',   role: 'Senior Software Engineer', company: 'Stripe',     created: 'Jun 17, 2026 · 10:24 AM', size: '245 KB', location: 'My Resumes' },
  { id: 2,  type: 'ATS Check',    name: 'ATS Report — Stripe.pdf',        role: 'Senior Frontend Engineer', company: 'Stripe',     created: 'Jun 17, 2026 · 09:58 AM', size: '128 KB', location: 'ATS Reports' },
  { id: 3,  type: 'Cover Letter', name: 'Cover Letter — Notion.docx',     role: 'Full Stack Developer',     company: 'Notion',     created: 'Jun 16, 2026 · 03:12 PM', size: '89 KB',  location: 'Cover Letters' },
  { id: 4,  type: 'AI Chat',      name: 'Chat Session — Resume Improve',  role: 'Software Engineer',        company: '—',          created: 'Jun 16, 2026 · 11:40 AM', size: '32 KB',  location: 'AI Chat History' },
  { id: 5,  type: 'Job Match',    name: 'Job Match Report — Figma.pdf',   role: 'Software Engineer II',     company: 'Figma',      created: 'Jun 15, 2026 · 04:30 PM', size: '67 KB',  location: 'Job Reports' },
  { id: 6,  type: 'Template',     name: 'Modern Professional Template',   role: 'Template Applied',          company: '—',          created: 'Jun 14, 2026 · 02:20 PM', size: '12 KB',  location: 'Templates' },
  { id: 7,  type: 'Resume',       name: 'Full Stack Developer CV.pdf',    role: 'Full Stack Developer',     company: 'Notion',     created: 'Jun 13, 2026 · 01:15 PM', size: '312 KB', location: 'My Resumes' },
  { id: 8,  type: 'ATS Check',    name: 'ATS Report — Linear.pdf',       role: 'React Developer',          company: 'Linear',     created: 'Jun 12, 2026 · 10:05 AM', size: '114 KB', location: 'ATS Reports' },
  { id: 9,  type: 'Cover Letter', name: 'Cover Letter — Figma.docx',     role: 'Software Engineer II',     company: 'Figma',      created: 'Jun 11, 2026 · 09:30 AM', size: '91 KB',  location: 'Cover Letters' },
  { id: 10, type: 'AI Chat',      name: 'Chat Session — Tailor for Stripe',role: 'Frontend Engineer',      company: 'Stripe',     created: 'Jun 10, 2026 · 05:45 PM', size: '28 KB',  location: 'AI Chat History' },
];

const FILTER_TABS = ['All', 'Resumes', 'Cover Letters', 'ATS Checks', 'AI Chat', 'Templates', 'Job Matches'];

const PAGE_SIZE = 7;

export default function HistoryPage() {
  const [filterTab, setFilterTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof HISTORY[0] | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(HISTORY);

  const typeMatch = (t: HistType): boolean => {
    if (filterTab === 'All') return true;
    if (filterTab === 'Resumes') return t === 'Resume';
    if (filterTab === 'Cover Letters') return t === 'Cover Letter';
    if (filterTab === 'ATS Checks') return t === 'ATS Check';
    if (filterTab === 'AI Chat') return t === 'AI Chat';
    if (filterTab === 'Templates') return t === 'Template';
    if (filterTab === 'Job Matches') return t === 'Job Match';
    return true;
  };

  const filtered = items.filter(h =>
    typeMatch(h.type) &&
    (h.name.toLowerCase().includes(search.toLowerCase()) ||
     h.role.toLowerCase().includes(search.toLowerCase()) ||
     h.company.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteItem = (id: number) => {
    setItems(prev => prev.filter(h => h.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('Item deleted from history');
  };

  return (
    <AppWrapper>
    <div className="fade-in" style={{ display: 'flex', gap: 0, minHeight: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header">
          <h1>History</h1>
          <p>All your past resumes, letters, ATS checks, and AI sessions in one place</p>
        </div>

        {/* Filter tabs + search */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="tabs" style={{ borderBottom: 'none', flexWrap: 'wrap' }}>
            {FILTER_TABS.map(t => (
              <button key={t} className={`tab${filterTab === t ? ' active' : ''}`}
                style={{ borderBottom: filterTab === t ? '2px solid var(--primary)' : '2px solid transparent' }}
                onClick={() => { setFilterTab(t); setPage(1); }}>
                {t}
                <span className="tab-count">{t === 'All' ? items.length : items.filter(h => typeMatch(h.type as HistType) && (t === 'Resumes' ? h.type === 'Resume' : t === 'Cover Letters' ? h.type === 'Cover Letter' : t === 'ATS Checks' ? h.type === 'ATS Check' : t === 'AI Chat' ? h.type === 'AI Chat' : t === 'Templates' ? h.type === 'Template' : h.type === 'Job Match')).length}</span>
              </button>
            ))}
          </div>
          <div className="topbar-search" style={{ marginLeft: 'auto', width: 220 }}>
            <Search size={14} color="var(--text-muted)" />
            <input placeholder="Search history…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Type</th>
                  <th>Role / Company</th>
                  <th>Created On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(h => {
                  const cfg = TYPE_CONFIG[h.type];
                  const Icon = cfg.icon;
                  return (
                    <tr key={h.id} className={selected?.id === h.id ? 'selected' : ''} onClick={() => setSelected(h)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={15} color={cfg.color} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11.5, fontWeight: 600 }}>
                          {h.type}
                        </span>
                      </td>
                      <td>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{h.role}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{h.company}</p>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{h.created}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="View" onClick={() => setSelected(h)}><Eye size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Download" onClick={() => toast.success(`Downloading ${h.name}…`)}><Download size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--error)' }} onClick={() => deleteItem(h.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} items
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i+1)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border-color)', background: page === i+1 ? 'var(--primary)' : 'var(--bg-tertiary)', color: page === i+1 ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right detail panel */}
      {selected && (() => {
        const cfg = TYPE_CONFIG[selected.type];
        const Icon = cfg.icon;
        return (
          <div className="detail-panel" style={{ width: 320 }}>
            <div className="detail-panel-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{selected.name}</h3>
                <button onClick={() => setSelected(null)} className="btn btn-ghost btn-icon btn-sm"><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11.5, fontWeight: 600 }}>
                  <Icon size={11} /> {selected.type}
                </span>
                <span className="badge badge-muted" style={{ fontSize: 10.5 }}>Generated by AI</span>
              </div>
            </div>

            <div style={{ padding: 18 }}>
              {/* Preview thumbnail */}
              <div style={{ height: 120, borderRadius: 10, background: `linear-gradient(135deg,${cfg.color}15,${cfg.color}05)`, border: '1px solid var(--border-color)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <Icon size={32} color={cfg.color} style={{ opacity: 0.6 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview thumbnail</p>
              </div>

              {/* Metadata */}
              <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Details</p>
              {[
                { label: 'Role',       value: selected.role },
                { label: 'Company',    value: selected.company },
                { label: 'Created On', value: selected.created },
                { label: 'File Size',  value: selected.size },
                { label: 'Location',   value: selected.location },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 160, textAlign: 'right' }}>{value}</span>
                </div>
              ))}

              {/* Actions */}
              <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', margin: '16px 0 8px' }}>Actions</p>
              {[
                { label: 'View Full Details', icon: Eye,      action: () => toast('Opening full view…'),                            danger: false },
                { label: 'Download',          icon: Download,  action: () => toast.success(`Downloading ${selected.name}…`),         danger: false },
                { label: 'Duplicate',         icon: Copy,      action: () => toast.success('Duplicated to history!'),               danger: false },
                { label: 'Delete',            icon: Trash2,    action: () => deleteItem(selected.id),                               danger: true },
              ].map(({ label, icon: BtnIcon, action, danger }) => (
                <button key={label} onClick={action}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: danger ? 'var(--error)' : 'var(--text-secondary)', width: '100%', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--error-bg)' : 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <BtnIcon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
    </AppWrapper>
  );
}
