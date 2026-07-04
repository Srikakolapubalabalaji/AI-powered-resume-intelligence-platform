'use client';
import { useEffect, useState, use } from 'react';
import type { Resume } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

interface PrintResumeClientProps {
  id: string;
}

export default function PrintResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/resumes?id=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setResume(json.data);
        } else {
          setError(json.error || 'Failed to load resume details.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch resume.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (resume) {
      // Delay slightly to ensure fonts and styles are fully loaded before print dialog pops
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [resume]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f6fa', color: '#666' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, color: '#6C5CE7' }} />
        <p style={{ fontFamily: 'sans-serif', fontSize: 14 }}>Preparing printable resume document...</p>
      </div>
    );
  }

  if (error || !resume?.parsed_data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f6fa', padding: 20 }}>
        <AlertCircle size={40} color="#ff7675" style={{ marginBottom: 12 }} />
        <p style={{ fontFamily: 'sans-serif', fontSize: 15, fontWeight: 600, color: '#2d3436', marginBottom: 4 }}>Print Preparation Failed</p>
        <p style={{ fontFamily: 'sans-serif', fontSize: 13, color: '#636e72', marginBottom: 16 }}>{error || 'No parsed data available for this resume.'}</p>
        <button onClick={() => window.close()} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#6C5CE7', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Close Window</button>
      </div>
    );
  }

  const data = resume.parsed_data;
  const contact = [data.email, data.phone, data.location, data.linkedin, data.github].filter(Boolean).join('  •  ');

  return (
    <div style={{ background: 'white', color: 'black', minHeight: '100vh', padding: '0.6in 0.8in' }}>
      {/* CSS overrides for print view */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4;
            margin: 0.6in 0.8in;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 15 }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 800, margin: '0 0 4px 0', color: '#111', fontFamily: 'Calibri, Arial, sans-serif' }}>
          {data.name || 'Your Name'}
        </h1>
        {data.title && (
          <p style={{ fontSize: '13pt', fontWeight: 600, margin: '0 0 6px 0', color: '#555', fontFamily: 'Calibri, Arial, sans-serif' }}>
            {data.title}
          </p>
        )}
        {contact && (
          <p style={{ fontSize: '9.5pt', color: '#666', margin: 0, lineHeight: 1.4, fontFamily: 'Calibri, Arial, sans-serif' }}>
            {contact}
          </p>
        )}
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6C5CE7', borderBottom: '1px solid #ddd', paddingBottom: 3, margin: '0 0 8px 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
            Summary
          </h2>
          <p style={{ fontSize: '10.5pt', color: '#333', lineHeight: 1.5, margin: 0, fontFamily: 'Calibri, Arial, sans-serif', textAlign: 'justify' }}>
            {data.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {data.experience && data.experience.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6C5CE7', borderBottom: '1px solid #ddd', paddingBottom: 3, margin: '0 0 8px 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
            Experience
          </h2>
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 12, pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontWeight: 700, fontSize: '11pt', margin: 0, fontFamily: 'Calibri, Arial, sans-serif', color: '#111' }}>
                  {e.title}
                </p>
                {e.dates && (
                  <p style={{ fontSize: '9.5pt', color: '#666', margin: 0, fontFamily: 'Calibri, Arial, sans-serif', fontWeight: 600 }}>
                    {e.dates}
                  </p>
                )}
              </div>
              <p style={{ fontSize: '10pt', color: '#444', fontStyle: 'italic', margin: '2px 0 6px 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
                {e.company}
              </p>
              {e.bullets && e.bullets.length > 0 && (
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {e.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: '10pt', color: '#333', marginBottom: 3, lineHeight: 1.45, fontFamily: 'Calibri, Arial, sans-serif', textAlign: 'justify' }}>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6C5CE7', borderBottom: '1px solid #ddd', paddingBottom: 3, margin: '0 0 8px 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
            Education
          </h2>
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pageBreakInside: 'avoid' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '11pt', margin: 0, fontFamily: 'Calibri, Arial, sans-serif', color: '#111' }}>
                  {ed.degree}
                </p>
                <p style={{ fontSize: '10pt', color: '#444', fontStyle: 'italic', margin: '2px 0 0 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
                  {ed.institution}
                </p>
              </div>
              {ed.dates && (
                <p style={{ fontSize: '9.5pt', color: '#666', margin: 0, fontFamily: 'Calibri, Arial, sans-serif', fontWeight: 600 }}>
                  {ed.dates}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills && data.skills.length > 0 && (
        <div>
          <h2 style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6C5CE7', borderBottom: '1px solid #ddd', paddingBottom: 3, margin: '0 0 8px 0', fontFamily: 'Calibri, Arial, sans-serif' }}>
            Skills
          </h2>
          <p style={{ fontSize: '10pt', color: '#333', lineHeight: 1.6, margin: 0, fontFamily: 'Calibri, Arial, sans-serif' }}>
            {data.skills.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
