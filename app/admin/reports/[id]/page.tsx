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

interface PortalEvent {
  id: string;
  eventType: string;
  meta: unknown;
  createdAt: string;
}

interface PortalComment {
  id: string;
  author: string;
  context: string;
  text: string;
  createdAt: string;
}

interface ClientProfile {
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
}

interface Report {
  id: string;
  slug: string;
  clientName: string;
  clientEmail?: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt?: string | null;
  clientProfile?: ClientProfile | null;
  clientPasswordPlain?: string | null;
  createdAt: string;
  sections: Section[];
  documents: Document[];
  analytics?: {
    commentCount: number;
    eventCounts: { eventType: string; _count: { eventType: number } }[];
  };
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

  // Document form (add)
  const [showDocForm, setShowDocForm] = useState(false);
  const [docType, setDocType] = useState('rfp');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  // Document inline edit
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocType, setEditDocType] = useState('rfp');
  const [editDocTitle, setEditDocTitle] = useState('');
  const [editDocUrl, setEditDocUrl] = useState('');
  const [editDocNotes, setEditDocNotes] = useState('');
  const [editDocLoading, setEditDocLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  // Edit report info
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);

  const startEditInfo = () => {
    if (!report) return;
    setEditName(report.clientName);
    setEditEmail(report.clientEmail ?? '');
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    setInfoSaving(true);
    await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: editName.trim(), clientEmail: editEmail.trim() || null }),
    });
    setInfoSaving(false);
    setEditingInfo(false);
    fetchReport();
  };

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [msgCopied, setMsgCopied] = useState(false);

  const openShareModal = (r: NonNullable<typeof report>) => {
    // Priority: DB stored password → localStorage → empty
    const pw = r.clientPasswordPlain
      || localStorage.getItem(`share_pw_${r.slug}`)
      || '';
    setSharePassword(pw);
    setShowShareModal(true);
  };

  const updateSharePassword = (val: string, slug: string) => {
    setSharePassword(val);
    if (val) localStorage.setItem(`share_pw_${slug}`, val);
    else localStorage.removeItem(`share_pw_${slug}`);
  };

  const shareMessage = (r: typeof report) => {
    if (!r) return '';
    const link = `https://rachnabuilds.com/reports/${r.slug}`;
    const pw = sharePassword || '[password]';
    return `Hi ${r.clientName}! 👋\n\nYour personalized Shopify store report is ready for review.\n\n🔗 Portal: ${link}\n🔑 Password: ${pw}\n\nLet me know if you have any questions — happy to walk you through it!\n\n— Rachna\nrachnabuilds.com`;
  };

  const copyShareMessage = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(shareMessage(report));
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  };

  const openWhatsApp = () => {
    if (!report) return;
    const text = encodeURIComponent(shareMessage(report));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const nativeShare = async () => {
    if (!report || !navigator.share) return;
    await navigator.share({ text: shareMessage(report) });
  };

  // Portal Activity state
  const [activity, setActivity] = useState<{ events: PortalEvent[]; comments: PortalComment[] } | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}/events`);
      const data = await res.json();
      setActivity(data);
    } catch {
      // silently fail — activity is non-critical
    } finally {
      setActivityLoading(false);
    }
  };

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
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const startEditDoc = (doc: Document) => {
    setEditingDocId(doc.id);
    setEditDocType(doc.docType);
    setEditDocTitle(doc.title);
    setEditDocUrl(doc.url);
    setEditDocNotes(doc.notes ?? '');
  };

  const cancelEditDoc = () => setEditingDocId(null);

  const handleSaveDocEdit = async (docId: string) => {
    setEditDocLoading(true);
    await fetch(`/api/admin/reports/${id}/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, docType: editDocType, title: editDocTitle, url: editDocUrl, notes: editDocNotes }),
    });
    setEditDocLoading(false);
    setEditingDocId(null);
    fetchReport();
  };

  const handleDeleteReport = async () => {
    if (!confirm('Delete this entire report? This cannot be undone.')) return;
    await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
    router.push('/admin/dashboard');
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const eventIcon: Record<string, string> = {
    tab_view: '👁',
    doc_open: '📄',
    comment_add: '💬',
    file_submit: '📤',
    login: '🔑',
  };

  const getEventCount = (type: string) =>
    report?.analytics?.eventCounts.find(e => e.eventType === type)?._count.eventType ?? 0;

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => openShareModal(report)} style={{ fontSize: 13 }}>
            📤 Share
          </button>
          <button className="admin-btn admin-btn-danger" onClick={handleDeleteReport}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* ─── REPORT INFO ─── */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">
          Report Info
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="admin-btn admin-btn-ghost admin-btn-icon"
              onClick={editingInfo ? () => setEditingInfo(false) : startEditInfo}
              style={{ fontSize: 12 }}
            >
              {editingInfo ? '✕ Cancel' : '✏️ Edit'}
            </button>
            <button
              className={`admin-btn admin-btn-icon ${report.isActive ? 'admin-btn-danger' : 'admin-btn-ghost'}`}
              onClick={toggleActive}
              style={{ fontSize: 12 }}
            >
              {report.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>

        {editingInfo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div className="admin-form-row">
              <div className="admin-field">
                <label className="admin-label">Client Name *</label>
                <input className="admin-input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Client Email</label>
                <input className="admin-input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="client@example.com" />
              </div>
            </div>
            <div>
              <button className="admin-btn admin-btn-primary" onClick={saveInfo} disabled={infoSaving || !editName.trim()} style={{ fontSize: 13 }}>
                {infoSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
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
        )}

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
      <div className="admin-card" style={{ marginBottom: 20 }}>
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
            <div key={doc.id}>
              {editingDocId === doc.id ? (
                <div className="admin-add-form-wrapper" style={{ marginBottom: 12 }}>
                  <div className="admin-add-form-title">Edit Document</div>
                  <div className="admin-form">
                    <div className="admin-form-row">
                      <div className="admin-field">
                        <label className="admin-label">Doc Type</label>
                        <select className="admin-select" value={editDocType} onChange={e => setEditDocType(e.target.value)}>
                          {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="admin-field">
                        <label className="admin-label">Title</label>
                        <input type="text" className="admin-input" value={editDocTitle} onChange={e => setEditDocTitle(e.target.value)} />
                      </div>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">URL</label>
                      <input type="url" className="admin-input" value={editDocUrl} onChange={e => setEditDocUrl(e.target.value)} />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Notes</label>
                      <textarea className="admin-textarea" value={editDocNotes} onChange={e => setEditDocNotes(e.target.value)} style={{ minHeight: 60 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} onClick={() => handleSaveDocEdit(doc.id)} disabled={editDocLoading}>
                        {editDocLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={cancelEditDoc}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="admin-section-item">
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
                    <button className="admin-btn admin-btn-ghost admin-btn-icon" style={{ fontSize: 12 }} onClick={() => startEditDoc(doc)}>
                      Edit
                    </button>
                    <button className="admin-btn admin-btn-danger admin-btn-icon" style={{ fontSize: 12 }} onClick={() => handleDeleteDocument(doc.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {/* ─── CLIENT PROFILE ─── */}
      {report.clientProfile && Object.values(report.clientProfile).some(Boolean) && (
        <div className="admin-card" style={{ marginBottom: 20 }}>
          <div className="admin-card-title">
            <div className="admin-section-label">Client Profile</div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {Object.values(report.clientProfile).filter(Boolean).length} fields filled
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { key: 'email',     label: 'Email',       icon: '✉️' },
              { key: 'phone',     label: 'Phone',       icon: '📞' },
              { key: 'whatsapp',  label: 'WhatsApp',    icon: '💬' },
              { key: 'website',   label: 'Website',     icon: '🌐' },
              { key: 'instagram', label: 'Instagram',   icon: '📸' },
              { key: 'linkedin',  label: 'LinkedIn',    icon: '💼' },
              { key: 'twitter',   label: 'X / Twitter', icon: '𝕏' },
              { key: 'notes',     label: 'Notes',       icon: '📝' },
            ]
              .filter(f => report.clientProfile![f.key as keyof ClientProfile])
              .map(f => (
                <div key={f.key} style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {f.icon} {f.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {report.clientProfile![f.key as keyof ClientProfile]}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── PORTAL ACTIVITY ─── */}
      <div className="admin-card portal-activity">
        <div className="admin-card-title">
          <div className="admin-section-label">Portal Activity</div>
          <button className="admin-btn admin-btn-ghost" onClick={loadActivity} style={{ fontSize: 12 }} disabled={activityLoading}>
            {activityLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>

        {/* Stats row */}
        <div className="activity-stats">
          <div className="activity-stat">
            <div className="activity-stat-num">{getEventCount('tab_view')}</div>
            <div className="activity-stat-label">👁 Tab Views</div>
          </div>
          <div className="activity-stat">
            <div className="activity-stat-num">{getEventCount('doc_open')}</div>
            <div className="activity-stat-label">📄 Doc Opens</div>
          </div>
          <div className="activity-stat">
            <div className="activity-stat-num">{report?.analytics?.commentCount ?? 0}</div>
            <div className="activity-stat-label">💬 Comments</div>
          </div>
          <div className="activity-stat">
            <div className="activity-stat-num">{getEventCount('file_submit')}</div>
            <div className="activity-stat-label">📤 Submissions</div>
          </div>
        </div>

        {/* Recent Events */}
        {activityLoading ? (
          <div className="admin-empty" style={{ padding: '20px 0' }}>Loading activity…</div>
        ) : !activity || activity.events.length === 0 ? (
          <div className="admin-empty">No portal activity yet.</div>
        ) : (
          <>
            <h3 style={{ color: '#e2e8f0', fontSize: 14, marginBottom: 10, fontWeight: 600 }}>Recent Events</h3>
            <div className="activity-timeline">
              {activity.events.slice(0, 20).map(ev => {
                const icon = eventIcon[ev.eventType] ?? '•';
                const meta = ev.meta && typeof ev.meta === 'object'
                  ? Object.entries(ev.meta as Record<string, unknown>)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')
                  : '';
                return (
                  <div key={ev.id} className="activity-event">
                    <span>{icon}</span>
                    <span className="activity-event-type">{ev.eventType.replace(/_/g, ' ')}</span>
                    {meta && <span style={{ color: '#64748b', fontSize: 12 }}>— {meta}</span>}
                    <span className="activity-event-time">{timeAgo(ev.createdAt)}</span>
                  </div>
                );
              })}
            </div>

            {/* Comments */}
            {activity.comments.length > 0 && (
              <>
                <h3 style={{ color: '#e2e8f0', fontSize: 14, margin: '20px 0 10px', fontWeight: 600 }}>Comments</h3>
                <div className="activity-comments">
                  {activity.comments.slice(0, 10).map(c => (
                    <div key={c.id} className="activity-comment">
                      <div className="activity-comment-author">{c.author}</div>
                      <div className="activity-comment-text">{c.text}</div>
                      <div className="activity-comment-meta">
                        in {c.context} · {timeAgo(c.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {/* ─── SHARE MODAL ─── */}
      {showShareModal && (
        <div className="share-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <div className="share-modal-title">📤 Share Report</div>
              <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
            </div>

            <div className="share-modal-body">
              <div className="share-field">
                <label className="share-label">Portal Link</label>
                <div className="share-link-row">
                  <span className="share-link-text">rachnabuilds.com/reports/{report.slug}</span>
                </div>
              </div>

              <div className="share-field">
                <label className="share-label">Password (type the one you set)</label>
                <input
                  className="share-input"
                  type="text"
                  placeholder="e.g. sageandveda2026"
                  value={sharePassword}
                  onChange={e => updateSharePassword(e.target.value, report.slug)}
                />
              </div>

              <div className="share-field">
                <label className="share-label">Message Preview</label>
                <pre className="share-preview">{shareMessage(report)}</pre>
              </div>
            </div>

            <div className="share-modal-actions">
              <button className="share-btn share-btn-copy" onClick={copyShareMessage}>
                {msgCopied ? '✓ Copied!' : '📋 Copy Message'}
              </button>
              <button className="share-btn share-btn-whatsapp" onClick={openWhatsApp}>
                💬 WhatsApp
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button className="share-btn share-btn-native" onClick={nativeShare}>
                  ↗ Share
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
