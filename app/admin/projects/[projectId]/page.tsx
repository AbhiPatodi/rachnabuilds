'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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

const CLIENT_TYPES: Record<string, string> = {
  new_build: 'New Build',
  existing_optimisation: 'Existing Optimisation',
  audit_only: 'Audit Only',
  retainer: 'Retainer',
  landing_page: 'Landing Page',
  migration: 'Migration',
};

type Tab = 'overview' | 'sections' | 'documents' | 'sessions' | 'events' | 'settings';

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

interface PortalSession {
  id: string;
  sessionId: string;
  ip: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  totalDuration: number;
  startedAt: string;
  lastActiveAt: string;
  tabsViewed: string[];
}

interface PortalEvent {
  id: string;
  eventType: string;
  meta: unknown;
  sessionId?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  clientType: string;
  status: string;
  createdAt: string;
  tabConfig?: unknown;
  adminProfile?: {
    proposalVisible?: boolean;
    notes?: string;
  } | null;
  client: {
    id: string;
    name: string;
    slug: string;
  };
  sections: Section[];
  documents: Document[];
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function ProjectManagePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Sections
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionType, setSectionType] = useState('executive_summary');
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionContent, setSectionContent] = useState('{}');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');

  // Documents
  const [showDocForm, setShowDocForm] = useState(false);
  const [docType, setDocType] = useState('rfp');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState('');

  // Sessions & events
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Settings
  const [tabConfigText, setTabConfigText] = useState('');
  const [proposalVisible, setProposalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Copy states
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (!res.ok) { setError('Project not found'); return; }
      const data = await res.json();
      setProject(data);
      setTabConfigText(JSON.stringify(data.tabConfig ?? {}, null, 2));
      setProposalVisible(!!(data.adminProfile as Record<string, unknown>)?.proposalVisible);
      setAdminNotes((data.adminProfile as Record<string, unknown>)?.notes as string ?? '');
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const [evRes, sessRes] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}/events`),
        fetch(`/api/admin/projects/${projectId}/sessions`),
      ]);
      if (evRes.ok) { const d = await evRes.json(); setEvents(d.events ?? []); }
      if (sessRes.ok) { const d = await sessRes.json(); setSessions(d.sessions ?? []); }
    } catch {
      // non-critical
    } finally {
      setActivityLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); loadActivity(); }, [fetchProject, loadActivity]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError('');
    setSectionLoading(true);
    try {
      let parsedContent: unknown;
      try { parsedContent = JSON.parse(sectionContent); } catch {
        setSectionError('Content must be valid JSON');
        setSectionLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/projects/${projectId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionType, title: sectionTitle, content: parsedContent }),
      });
      if (!res.ok) { setSectionError('Failed to add section'); return; }
      const data = await res.json();
      setProject(p => p ? { ...p, sections: [...p.sections, data] } : p);
      setSectionTitle('');
      setSectionContent('{}');
      setShowSectionForm(false);
    } catch {
      setSectionError('Something went wrong');
    } finally {
      setSectionLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section?')) return;
    await fetch(`/api/admin/projects/${projectId}/sections/${sectionId}`, { method: 'DELETE' });
    setProject(p => p ? { ...p, sections: p.sections.filter(s => s.id !== sectionId) } : p);
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');
    setDocLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, title: docTitle, url: docUrl, notes: docNotes }),
      });
      if (!res.ok) { setDocError('Failed to add document'); return; }
      const data = await res.json();
      setProject(p => p ? { ...p, documents: [...p.documents, data] } : p);
      setDocTitle('');
      setDocUrl('');
      setDocNotes('');
      setShowDocForm(false);
    } catch {
      setDocError('Something went wrong');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/admin/projects/${projectId}/documents/${docId}`, { method: 'DELETE' });
    setProject(p => p ? { ...p, documents: p.documents.filter(d => d.id !== docId) } : p);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      let parsedConfig: unknown;
      try { parsedConfig = JSON.parse(tabConfigText); } catch { parsedConfig = {}; }
      await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabConfig: parsedConfig,
          adminProfile: { proposalVisible, notes: adminNotes },
        }),
      });
      fetchProject();
    } catch {
      // silently fail
    } finally {
      setSettingsSaving(false);
    }
  };

  if (loading) return <div className="admin-content"><div className="admin-empty">Loading…</div></div>;
  if (error || !project) return <div className="admin-content"><div className="admin-alert admin-alert-error">{error || 'Not found'}</div></div>;

  const portalUrl = `rachnabuilds.com/portal/${project.client.slug}/${project.id}`;

  return (
    <div className="admin-content">
      <div className="admin-breadcrumb">
        <Link href="/admin/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/clients">Clients</Link>
        <span>/</span>
        <Link href={`/admin/clients/${project.client.id}`}>{project.client.name}</Link>
        <span>/</span>
        <span className="current">{project.name}</span>
      </div>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{project.name}</h1>
          <p className="admin-page-subtitle">
            <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              {project.client.name}
            </Link>
            {' '}· {CLIENT_TYPES[project.clientType] ?? project.clientType} · {project.status}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="admin-link-row" style={{ fontSize: 11, padding: '8px 12px' }}>
            <span>/portal/{project.client.slug}/{project.id}</span>
            <button
              className="admin-btn admin-btn-ghost admin-btn-icon"
              style={{ fontSize: 10, flexShrink: 0 }}
              onClick={() => {
                navigator.clipboard.writeText(`https://${portalUrl}`);
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
            >
              {copiedUrl ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        {(['overview', 'sections', 'documents', 'sessions', 'events', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`settings-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
            {tab === 'sections' && ` (${project.sections.length})`}
            {tab === 'documents' && ` (${project.documents.length})`}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="admin-card">
          <div className="admin-card-title">Project Info</div>
          <div className="admin-info-grid">
            <div className="admin-info-item">
              <label>Project Name</label>
              <span>{project.name}</span>
            </div>
            <div className="admin-info-item">
              <label>Client</label>
              <span>
                <Link href={`/admin/clients/${project.client.id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  {project.client.name}
                </Link>
              </span>
            </div>
            <div className="admin-info-item">
              <label>Type</label>
              <span>{CLIENT_TYPES[project.clientType] ?? project.clientType}</span>
            </div>
            <div className="admin-info-item">
              <label>Status</label>
              <span style={{ textTransform: 'capitalize' }}>{project.status}</span>
            </div>
            <div className="admin-info-item">
              <label>Created</label>
              <span>{formatDate(project.createdAt)}</span>
            </div>
            <div className="admin-info-item">
              <label>Portal URL</label>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{portalUrl}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTIONS ─── */}
      {activeTab === 'sections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div className="admin-card-title">
              Sections
              <button
                className="admin-btn admin-btn-primary admin-btn-icon"
                onClick={() => setShowSectionForm(!showSectionForm)}
                style={{ fontSize: 12 }}
              >
                {showSectionForm ? '✕ Cancel' : '+ Add Section'}
              </button>
            </div>

            {showSectionForm && (
              <div className="admin-add-form-wrapper" style={{ marginBottom: 20 }}>
                <div className="admin-add-form-title">New Section</div>
                {sectionError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{sectionError}</div>}
                <form onSubmit={handleAddSection} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Section Type</label>
                      <select className="admin-select" value={sectionType} onChange={e => setSectionType(e.target.value)}>
                        {SECTION_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Title *</label>
                      <input
                        className="admin-input"
                        placeholder="Section title"
                        value={sectionTitle}
                        onChange={e => setSectionTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Content (JSON)</label>
                    <textarea
                      className="admin-textarea"
                      value={sectionContent}
                      onChange={e => setSectionContent(e.target.value)}
                      rows={6}
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={sectionLoading} style={{ fontSize: 13 }}>
                      {sectionLoading ? 'Adding…' : 'Add Section'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {project.sections.length === 0 ? (
              <div className="admin-empty">No sections yet. Add your first section above.</div>
            ) : (
              project.sections.map(section => (
                <div key={section.id} className="admin-section-item">
                  <div className="admin-section-item-info">
                    <div className="admin-section-item-title">{section.title}</div>
                    <div className="admin-section-item-meta">{section.sectionType} · order {section.displayOrder}</div>
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
        </div>
      )}

      {/* ─── DOCUMENTS ─── */}
      {activeTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div className="admin-card-title">
              Documents
              <button
                className="admin-btn admin-btn-primary admin-btn-icon"
                onClick={() => setShowDocForm(!showDocForm)}
                style={{ fontSize: 12 }}
              >
                {showDocForm ? '✕ Cancel' : '+ Add Document'}
              </button>
            </div>

            {showDocForm && (
              <div className="admin-add-form-wrapper" style={{ marginBottom: 20 }}>
                <div className="admin-add-form-title">New Document</div>
                {docError && <div className="admin-alert admin-alert-error" style={{ marginBottom: 12 }}>{docError}</div>}
                <form onSubmit={handleAddDoc} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="admin-form-row">
                    <div className="admin-field">
                      <label className="admin-label">Doc Type</label>
                      <select className="admin-select" value={docType} onChange={e => setDocType(e.target.value)}>
                        {DOC_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label className="admin-label">Title *</label>
                      <input
                        className="admin-input"
                        placeholder="Document title"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">URL *</label>
                    <input
                      className="admin-input"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={docUrl}
                      onChange={e => setDocUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Notes</label>
                    <textarea
                      className="admin-textarea"
                      rows={3}
                      placeholder="Optional notes…"
                      value={docNotes}
                      onChange={e => setDocNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={docLoading} style={{ fontSize: 13 }}>
                      {docLoading ? 'Adding…' : 'Add Document'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {project.documents.length === 0 ? (
              <div className="admin-empty">No documents yet.</div>
            ) : (
              project.documents.map(doc => (
                <div key={doc.id} className="admin-section-item">
                  <div className="admin-section-item-info">
                    <div className="admin-section-item-title">{doc.title}</div>
                    <div className="admin-section-item-meta">
                      {doc.docType}
                      {doc.notes ? ` · ${doc.notes}` : ''}
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginTop: 2 }}>
                      {doc.url.length > 50 ? `${doc.url.slice(0, 50)}…` : doc.url}
                    </a>
                  </div>
                  <div className="admin-section-item-actions">
                    <button
                      className="admin-btn admin-btn-danger admin-btn-icon"
                      onClick={() => handleDeleteDoc(doc.id)}
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
      )}

      {/* ─── SESSIONS ─── */}
      {activeTab === 'sessions' && (
        <div className="admin-card">
          <div className="admin-card-title">Sessions</div>
          {activityLoading ? (
            <div className="admin-empty">Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="admin-empty">No sessions recorded yet.</div>
          ) : (
            sessions.map(sess => (
              <div key={sess.id} className="admin-section-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div className="admin-section-item-info">
                    <div className="admin-section-item-title">
                      {sess.country ?? 'Unknown'} · {sess.device ?? 'Unknown device'} · {sess.browser ?? ''}
                    </div>
                    <div className="admin-section-item-meta">
                      {new Date(sess.startedAt).toLocaleString()} · {formatDuration(sess.totalDuration)}
                      {sess.ip ? ` · ${sess.ip}` : ''}
                    </div>
                  </div>
                  <button
                    className="admin-btn admin-btn-ghost admin-btn-icon"
                    onClick={() => setExpandedSession(expandedSession === sess.id ? null : sess.id)}
                    style={{ fontSize: 11 }}
                  >
                    {expandedSession === sess.id ? 'Hide' : 'Details'}
                  </button>
                </div>
                {expandedSession === sess.id && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', width: '100%' }}>
                    <div className="admin-section-item-meta" style={{ marginBottom: 6 }}>Tabs viewed:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(sess.tabsViewed ?? []).map((tab, i) => (
                        <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── EVENTS ─── */}
      {activeTab === 'events' && (
        <div className="admin-card">
          <div className="admin-card-title">Event Timeline</div>
          {activityLoading ? (
            <div className="admin-empty">Loading events…</div>
          ) : events.length === 0 ? (
            <div className="admin-empty">No events recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {events.map((ev, i) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    gap: 14,
                    paddingBottom: i < events.length - 1 ? 12 : 0,
                    marginBottom: i < events.length - 1 ? 12 : 0,
                    borderBottom: i < events.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {ev.eventType.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(ev.createdAt).toLocaleString()}
                      {ev.sessionId ? ` · session: ${ev.sessionId.slice(0, 8)}…` : ''}
                    </div>
                    {(ev.meta != null && typeof ev.meta === 'object' && Object.keys(ev.meta as Record<string, unknown>).length > 0) && (
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {JSON.stringify(ev.meta)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── SETTINGS ─── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="admin-card">
            <div className="admin-card-title">Tab Config</div>
            <div className="admin-field">
              <label className="admin-label">tabConfig (JSON)</label>
              <textarea
                className="admin-textarea"
                value={tabConfigText}
                onChange={e => setTabConfigText(e.target.value)}
                rows={10}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
              <div className="admin-slug-hint">Controls which tabs are visible in the client portal.</div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-title">Admin Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={proposalVisible}
                    onChange={e => setProposalVisible(e.target.checked)}
                  />
                  <span className="admin-toggle-slider" />
                  Proposal visible to client
                </label>
              </div>
              <div className="admin-field">
                <label className="admin-label">Admin Notes</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  placeholder="Private notes about this project…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              className="admin-btn admin-btn-primary"
              onClick={saveSettings}
              disabled={settingsSaving}
              style={{ padding: '12px 28px', fontSize: 14 }}
            >
              {settingsSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
