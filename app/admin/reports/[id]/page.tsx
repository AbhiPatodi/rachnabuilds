'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SECTION_TYPES = [
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'performance_audit', label: 'Performance Audit' },
  { value: 'seo_audit', label: 'SEO Audit' },
  { value: 'cro_audit', label: 'CRO Audit' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'pdp_analysis', label: 'PDP Analysis' },
  { value: 'mockup_review', label: 'Mockup Review' },
  { value: 'action_plan', label: 'Action Plan' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'project_status', label: 'Project Status' },
];

const DOC_TYPES = [
  { value: 'rfp', label: 'RFP' },
  { value: 'mockup', label: 'Mockup' },
  { value: 'competitor_ref', label: 'Competitor Reference' },
  { value: 'brand_assets', label: 'Brand Assets' },
  { value: 'other', label: 'Other' },
];

interface Section {
  id: string;
  sectionType: string;
  title: string;
  content: unknown;
  displayOrder: number;
}

interface Document {
  id: string;
  docType: string;
  title: string;
  url: string;
  notes?: string | null;
}

interface Report {
  id: string;
  slug: string;
  clientName: string;
  clientEmail?: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt?: string | null;
  createdAt: string;
  sections: Section[];
  documents: Document[];
}

export default function ReportManagePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionType, setSectionType] = useState('executive_summary');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionContent, setSectionContent] = useState('{}');
  const [sectionOrder, setSectionOrder] = useState(0);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docType, setDocType] = useState('rfp');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  const [copied, setCopied] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`);
      if (!res.ok) { setError('Report not found'); return; }
      const data = await res.json();
      setReport(data);
    } catch {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleActive = async () => {
    if (!report) return;
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !report.isActive }),
    });
    fetchReport();
  };

  const copyLink = () => {
    if (!report) return;
    navigator.clipboard.writeText(`rachnabuilds.com/reports/${report.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError('');
    setSectionLoading(true);
    try {
      let parsedContent: unknown;
      try {
        parsedContent = JSON.parse(sectionContent);
      } catch {
        setSectionError('Content must be valid JSON');
        setSectionLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/reports/${id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionType,
          title: sectionTitle,
          content: parsedContent,
          displayOrder: sectionOrder,
        }),
      });
      if (!res.ok) {
        setSectionError('Failed to add section');
        return;
      }
      setSectionTitle('');
      setSectionContent('{}');
      setSectionOrder(0);
      setSectionType('executive_summary');
      setShowSectionForm(false);
      fetchReport();
    } catch {
      setSectionError('Something went wrong');
    } finally {
      setSectionLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    await fetch(`/api/admin/reports/${id}/sections?sectionId=${sectionId}`, { method: 'DELETE' });
    fetchReport();
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');
    setDocLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, title: docTitle, url: docUrl, notes: docNotes }),
      });
      if (!res.ok) {
        setDocError('Failed to add document');
        return;
      }
      setDocTitle('');
      setDocUrl('');
      setDocNotes('');
      setDocType('rfp');
      setShowDocForm(false);
      fetchReport();
    } catch {
      setDocError('Something went wrong');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/admin/reports/${id}/documents?docId=${docId}`, { method: 'DELETE' });
    fetchReport();
  };

  const handleDeleteReport = async () => {
    if (!confirm('Delete this entire report? This cannot be undone.')) return;
    await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
    router.push('/admin/dashboard');
  };

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading report...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="admin-content">
        <div className="admin-alert admin-alert-error">{error || 'Report not found'}</div>
        <Link href="/admin/dashboard" className="admin-btn admin-btn-ghost">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <span className="current">{report.clientName}</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{report.clientName}</h1>
          <p className="admin-page-subtitle">
            {report.viewCount} view{report.viewCount !== 1 ? 's' : ''} · Created {new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button className="admin-btn admin-btn-danger" onClick={handleDeleteReport}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Delete Report
        </button>
      </div>

      {/* ─── REPORT INFO ─── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">
          Report Info
          <button
            className={`admin-btn admin-btn-icon ${report.isActive ? 'admin-btn-danger' : 'admin-btn-ghost'}`}
            onClick={toggleActive}
            style={{ fontSize: 12 }}
          >
            {report.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>

        <div className="admin-info-grid" style={{ marginBottom: 16 }}>
          <div className="admin-info-item">
            <label>Client Name</label>
            <span>{report.clientName}</span>
          </div>
          <div className="admin-info-item">
            <label>Client Email</label>
            <span>{report.clientEmail || '—'}</span>
          </div>
          <div className="admin-info-item">
            <label>Status</label>
            <span>
              <span className={`badge ${report.isActive ? 'badge-green' : 'badge-red'}`}>
                <span className="badge-dot" />
                {report.isActive ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
          <div className="admin-info-item">
            <label>Last Viewed</label>
            <span>{report.lastViewedAt ? new Date(report.lastViewedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}</span>
          </div>
        </div>

        <div>
          <div className="admin-label" style={{ marginBottom: 6 }}>Portal Link</div>
          <div className="admin-link-row">
            <span>rachnabuilds.com/reports/{report.slug}</span>
            <button className="admin-btn admin-btn-ghost admin-btn-icon" onClick={copyLink} style={{ fontSize: 12, flexShrink: 0 }}>
              {copied ? 'Copied!' : (
                <>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── SECTIONS ─── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">
          <div className="admin-section-label">
            Sections
            <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 100, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
              {report.sections.length}
            </span>
          </div>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => setShowSectionForm(v => !v)}
            style={{ fontSize: 12 }}
          >
            {showSectionForm ? '✕ Cancel' : '+ Add Section'}
          </button>
        </div>

        {showSectionForm && (
          <div className="admin-add-form-wrapper" style={{ marginBottom: 16 }}>
            <div className="admin-add-form-title">Add Section</div>
            {sectionError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{sectionError}</div>}
            <form onSubmit={handleAddSection} className="admin-form">
              <div className="admin-form-row">
                <div className="admin-field">
                  <label className="admin-label">Section Type</label>
                  <select className="admin-select" value={sectionType} onChange={e => setSectionType(e.target.value)}>
                    {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Display Order</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={sectionOrder}
                    onChange={e => setSectionOrder(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
              <div className="admin-field">
                <label className="admin-label">Title *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Q1 2026 Performance Summary"
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Content (JSON)</label>
                <textarea
                  className="admin-textarea"
                  placeholder={'{\n  "summary": "Your content here",\n  "items": []\n}'}
                  value={sectionContent}
                  onChange={e => setSectionContent(e.target.value)}
                  style={{ minHeight: 120, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
                <div className="admin-slug-hint">Enter valid JSON content for this section</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={sectionLoading} style={{ fontSize: 13 }}>
                  {sectionLoading ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        )}

        {report.sections.length === 0 ? (
          <div className="admin-empty">No sections yet. Add your first section above.</div>
        ) : (
          [...report.sections]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(section => (
              <div key={section.id} className="admin-section-item">
                <div className="admin-section-item-info">
                  <div className="admin-section-item-title">{section.title}</div>
                  <div className="admin-section-item-meta">
                    {SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType} · Order: {section.displayOrder}
                  </div>
                </div>
                <div className="admin-section-item-actions">
                  <button
                    className="admin-btn admin-btn-danger admin-btn-icon"
                    onClick={() => handleDeleteSection(section.id)}
                    style={{ fontSize: 12 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
        )}
      </div>

      {/* ─── DOCUMENTS ─── */}
      <div className="admin-card">
        <div className="admin-card-title">
          <div className="admin-section-label">
            Client Documents
            <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--bg-elevated)', borderRadius: 100, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
              {report.documents.length}
            </span>
          </div>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => setShowDocForm(v => !v)}
            style={{ fontSize: 12 }}
          >
            {showDocForm ? '✕ Cancel' : '+ Add Document'}
          </button>
        </div>

        {showDocForm && (
          <div className="admin-add-form-wrapper" style={{ marginBottom: 16 }}>
            <div className="admin-add-form-title">Add Document</div>
            {docError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{docError}</div>}
            <form onSubmit={handleAddDocument} className="admin-form">
              <div className="admin-form-row">
                <div className="admin-field">
                  <label className="admin-label">Doc Type</label>
                  <select className="admin-select" value={docType} onChange={e => setDocType(e.target.value)}>
                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Title *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Brand Guidelines v2"
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="admin-field">
                <label className="admin-label">URL *</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://drive.google.com/..."
                  value={docUrl}
                  onChange={e => setDocUrl(e.target.value)}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Notes (optional)</label>
                <textarea
                  className="admin-textarea"
                  placeholder="Any notes for the client about this document..."
                  value={docNotes}
                  onChange={e => setDocNotes(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={docLoading} style={{ fontSize: 13 }}>
                  {docLoading ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        )}

        {report.documents.length === 0 ? (
          <div className="admin-empty">No documents yet. Add your first document above.</div>
        ) : (
          report.documents.map(doc => (
            <div key={doc.id} className="admin-section-item">
              <div className="admin-section-item-info">
                <div className="admin-section-item-title">{doc.title}</div>
                <div className="admin-section-item-meta">
                  {DOC_TYPES.find(t => t.value === doc.docType)?.label || doc.docType}
                  {doc.notes && ` · ${doc.notes}`}
                </div>
              </div>
              <div className="admin-section-item-actions">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }}>
                  Open ↗
                </a>
                <button
                  className="admin-btn admin-btn-danger admin-btn-icon"
                  onClick={() => handleDeleteDocument(doc.id)}
                  style={{ fontSize: 12 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
