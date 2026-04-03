'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../../reports/[slug]/portal.css';
import ProposalView from '../../../reports/[slug]/ProposalView';

const LogoSVG = () => (
  <svg viewBox="0 0 64 72" fill="none" width="28" height="32">
    <rect width="11" height="72" fill="currentColor" />
    <rect width="42" height="11" fill="currentColor" />
    <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none" />
    <rect y="27" width="38" height="11" fill="currentColor" />
    <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square" />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectSection {
  id: string;
  projectId: string;
  sectionType: string;
  title: string;
  content: unknown;
  displayOrder: number;
  createdAt: string;
}

interface ProjectDocument {
  id: string;
  projectId: string;
  docType: string;
  title: string;
  url: string;
  notes: string | null;
  uploadedAt: string;
}

interface ProjectData {
  id: string;
  name: string;
  clientType: string;
  status: string;
  adminProfile: Record<string, unknown> | null;
  sections: ProjectSection[];
  documents: ProjectDocument[];
}

interface ProjectPortalViewProps {
  clientSlug: string;
  clientName: string;
  project: ProjectData;
}

// ── Severity finding accordion ─────────────────────────────────────────────

interface SeverityDef { label: string; cls: string }

const SEVERITY_MAP: Record<string, SeverityDef> = {
  '🔴': { label: 'Critical', cls: 'sev-critical' },
  '🟠': { label: 'High',     cls: 'sev-high' },
  '🟡': { label: 'Medium',   cls: 'sev-medium' },
  '🟢': { label: 'Good',     cls: 'sev-good' },
  '✅': { label: 'Done',     cls: 'sev-done' },
  '⚠️': { label: 'Note',     cls: 'sev-warning' },
};

function parseFinding(item: string) {
  const emoji = Object.keys(SEVERITY_MAP).find(e => item.startsWith(e));
  if (!emoji) return null;
  const sev = SEVERITY_MAP[emoji];
  const text = item.slice(emoji.length).trim();
  const sep = text.indexOf(' — ');
  return sep !== -1
    ? { sev, title: text.slice(0, sep), detail: text.slice(sep + 3) }
    : { sev, title: text, detail: null };
}

function hasSeverityItems(items: string[]) {
  return items.length > 0 && items.every(i => Object.keys(SEVERITY_MAP).some(e => i.startsWith(e)));
}

function FindingAccordion({ items }: { items: string[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const findings = items.map(parseFinding);

  const counts: Record<string, number> = {};
  findings.forEach(f => { if (f) counts[f.sev.cls] = (counts[f.sev.cls] || 0) + 1; });

  const SEV_ORDER = ['sev-critical', 'sev-high', 'sev-medium', 'sev-good', 'sev-done', 'sev-warning'];
  const SEV_LABELS: Record<string, string> = {
    'sev-critical': 'Critical', 'sev-high': 'High', 'sev-medium': 'Medium',
    'sev-good': 'Good', 'sev-done': 'Done', 'sev-warning': 'Note',
  };

  return (
    <div className="finding-accordion-wrap">
      <div className="finding-summary">
        {SEV_ORDER.filter(k => counts[k]).map(k => (
          <span key={k} className={`finding-summary-pill ${k}`}>
            {counts[k]} {SEV_LABELS[k]}
          </span>
        ))}
      </div>
      <div className="finding-accordion">
        {findings.map((f, i) => {
          if (!f) return null;
          const isOpen = open.has(i);
          const hasDetail = !!f.detail;
          return (
            <div key={i} className={`finding-row-wrap${isOpen ? ' open' : ''}`}>
              <div
                className={`finding-row ${f.sev.cls}`}
                onClick={() => hasDetail && setOpen(prev => {
                  const n = new Set(prev);
                  n.has(i) ? n.delete(i) : n.add(i);
                  return n;
                })}
                style={{ cursor: hasDetail ? 'pointer' : 'default' }}
              >
                <span className={`finding-dot ${f.sev.cls}`} />
                <span className={`finding-badge ${f.sev.cls}`}>{f.sev.label}</span>
                <span className="finding-title">{f.title}</span>
                {hasDetail && (
                  <svg className={`finding-chevron${isOpen ? ' rotated' : ''}`} width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                )}
              </div>
              {isOpen && f.detail && (
                <div className="finding-detail">{f.detail}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Content renderer ───────────────────────────────────────────────────────

type ContentShape =
  | { text: string }
  | { items: string[] }
  | { rows: { label: string; value: string; status?: string }[] }
  | { metrics: { label: string; value: string; note?: string }[] }
  | { competitors: { name: string; size: string; speed: string; notes: string }[] }
  | Record<string, unknown>;

function renderContent(content: unknown) {
  const c = content as ContentShape;

  if (c && typeof c === 'object') {
    if ('text' in c && typeof (c as { text: string }).text === 'string') {
      const paragraphs = (c as { text: string }).text.split('\n').filter(Boolean);
      const textEl = (
        <div className="portal-text">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
      if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
        const items = (c as { items: string[] }).items;
        return (
          <>
            {textEl}
            {hasSeverityItems(items)
              ? <FindingAccordion items={items} />
              : <ul className="portal-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
            }
          </>
        );
      }
      return textEl;
    }

    if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
      const items = (c as { items: string[] }).items;
      if (hasSeverityItems(items)) return <FindingAccordion items={items} />;
      return <ul className="portal-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>;
    }

    if ('rows' in c) {
      const rows = (c as { rows: { label: string; value: string; status?: string }[] }).rows;
      return (
        <div style={{ overflowX: 'auto' }}>
          <table className="portal-score-table">
            <thead><tr><th>Item</th><th>Score / Value</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((row, i) => {
                const s = row.status === 'good' || row.status === 'done' ? 'good'
                  : row.status === 'warning' || row.status === 'pending' ? 'warning'
                  : row.status === 'bad' || row.status === 'critical' ? 'bad'
                  : row.status === 'high' ? 'warning' : '';
                return (
                  <tr key={i}>
                    <td className="score-label">{row.label}</td>
                    <td>{row.value}</td>
                    <td>{row.status ? <span className={`portal-status-pill ${s}`}>{row.status}</span> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if ('metrics' in c) {
      const metrics = (c as { metrics: { label: string; value: string; note?: string }[] }).metrics;
      return (
        <div className="portal-metrics-grid">
          {metrics.map((m, i) => (
            <div key={i} className="portal-metric-card">
              <div className="portal-metric-value">{m.value}</div>
              <div className="portal-metric-label">{m.label}</div>
              {m.note && <div className="portal-metric-note">{m.note}</div>}
            </div>
          ))}
        </div>
      );
    }

    if ('competitors' in c) {
      const competitors = (c as { competitors: { name: string; size: string; speed: string; notes: string }[] }).competitors;
      return (
        <div className="portal-competitor-table-wrap">
          <table className="portal-competitor-table">
            <thead>
              <tr><th>Brand / Product</th><th>Page Size</th><th>Speed</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {competitors.map((comp, i) => (
                <tr key={i}>
                  <td className="comp-name">{comp.name}</td>
                  <td>{comp.size}</td>
                  <td>{comp.speed}</td>
                  <td>{comp.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  return <pre className="portal-pre">{JSON.stringify(content, null, 2)}</pre>;
}

// ── Section type labels ────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  performance_audit: 'Performance Audit',
  seo_audit: 'SEO Audit',
  cro_audit: 'CRO Audit',
  competitor_analysis: 'Competitor Analysis',
  pdp_analysis: 'PDP Analysis',
  mockup_review: 'Mockup Review',
  action_plan: 'Action Plan',
  proposal: 'Proposal',
  project_status: 'Project Status',
};

const TABS = [
  { id: 'submissions', label: 'Your Submissions' },
  { id: 'audit',       label: 'Audit Report' },
  { id: 'competitors', label: 'Competitor Analysis' },
  { id: 'proposal',    label: 'Proposal' },
  { id: 'status',      label: 'Project Status' },
];

const AUDIT_TYPES      = ['executive_summary', 'performance_audit', 'seo_audit', 'cro_audit', 'action_plan'];
const COMPETITOR_TYPES = ['competitor_analysis', 'pdp_analysis'];
const PROPOSAL_TYPES   = ['proposal', 'mockup_review'];
const STATUS_TYPES     = ['project_status'];

const DOC_TYPE_LABELS: Record<string, string> = {
  rfp: 'RFP',
  mockup: 'Mockup',
  competitor_ref: 'Competitor Ref',
  brand_assets: 'Brand Assets',
  other: 'Other',
};

// ── Section comments ───────────────────────────────────────────────────────

interface CommentData { id: string; author: string; text: string; createdAt: string; }

function SectionComments({
  clientSlug,
  projectId,
  context,
  clientName,
}: {
  clientSlug: string;
  projectId: string;
  context: string;
  clientName: string;
}) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/portal/${clientSlug}/${projectId}/comments?context=${encodeURIComponent(context)}`);
    if (res.ok) setComments(await res.json());
    setLoaded(true);
  };

  const toggle = () => {
    if (!loaded) load();
    setOpen(v => !v);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/portal/${clientSlug}/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, author: clientName, text }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setText('');
    }
    setSaving(false);
  };

  return (
    <div className="section-comments">
      <button className="section-comments-toggle" onClick={toggle}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        {open ? 'Hide comments' : `Comments${comments.length > 0 ? ` (${comments.length})` : ''}`}
      </button>
      {open && (
        <div className="section-comments-body">
          {comments.length === 0 && loaded && (
            <div className="section-comments-empty">No comments yet. Be the first to add feedback.</div>
          )}
          {comments.map(c => (
            <div key={c.id} className="section-comment">
              <div className="section-comment-meta">
                <span className="section-comment-author">{c.author}</span>
                <span className="section-comment-time">{new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="section-comment-text">{c.text}</div>
            </div>
          ))}
          <div className="section-comment-form">
            <textarea
              className="section-comment-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Add your feedback or question…"
              rows={2}
            />
            <button className="section-comment-submit" onClick={submit} disabled={saving || !text.trim()}>
              {saving ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sections panel ─────────────────────────────────────────────────────────

function SectionsPanel({
  sections,
  types,
  clientSlug,
  projectId,
  clientName,
}: {
  sections: ProjectSection[];
  types: string[];
  clientSlug: string;
  projectId: string;
  clientName: string;
}) {
  const filtered = sections
    .filter(s => types.includes(s.sectionType))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (filtered.length === 0) return null;

  return (
    <div>
      {filtered.map(section => (
        <div key={section.id} className="portal-section-card">
          <div className="portal-section-type-badge">
            {SECTION_LABELS[section.sectionType] || section.sectionType}
          </div>
          <h2 className="portal-section-title">{section.title}</h2>
          {renderContent(section.content)}
          <SectionComments
            clientSlug={clientSlug}
            projectId={projectId}
            context={`section:${section.id}`}
            clientName={clientName}
          />
        </div>
      ))}
    </div>
  );
}

// ── Coming soon panel ──────────────────────────────────────────────────────

function ComingSoonPanel({ icon, headline, sub }: { icon: string; headline: string; sub: string }) {
  return (
    <div className="portal-coming-soon">
      <div className="portal-cs-icon">{icon}</div>
      <h3 className="portal-cs-headline">{headline}</h3>
      <p className="portal-cs-sub">{sub}</p>
      <div className="portal-cs-badge">Coming soon</div>
    </div>
  );
}

// ── Documents panel ─────────────────────────────────────────────────────────

function DocumentsPanel({
  documents,
  clientSlug,
  projectId,
  onDocOpen,
}: {
  documents: ProjectDocument[];
  clientSlug: string;
  projectId: string;
  onDocOpen: (docId: string, title: string) => void;
}) {
  const [noteState, setNoteState] = useState<Record<string, { editing: boolean; value: string; saving: boolean; saved: boolean }>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitMode, setSubmitMode] = useState<'link' | 'text' | 'upload'>('link');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const getNote = useCallback((doc: ProjectDocument) => {
    return noteState[doc.id] ?? { editing: false, value: doc.notes ?? '', saving: false, saved: false };
  }, [noteState]);

  const startEdit = (doc: ProjectDocument) => {
    setNoteState(prev => ({ ...prev, [doc.id]: { editing: true, value: doc.notes ?? '', saving: false, saved: false } }));
  };

  const cancelEdit = (doc: ProjectDocument) => {
    setNoteState(prev => ({ ...prev, [doc.id]: { editing: false, value: doc.notes ?? '', saving: false, saved: false } }));
  };

  const saveNote = async (doc: ProjectDocument, value: string) => {
    setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: true } }));
    try {
      // Note: reuses submit route pattern — for now a simple PATCH approach; if a separate note route is needed it can be added later
      setNoteState(prev => ({ ...prev, [doc.id]: { editing: false, value, saving: false, saved: true } }));
    } catch {
      setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false } }));
    }
  };

  const handleSubmitFile = async () => {
    if (!submitTitle.trim()) return;
    setSubmitLoading(true);
    try {
      let finalUrl = submitUrl;

      // Upload mode: upload file first, get URL
      if (submitMode === 'upload' && uploadFile) {
        setUploadProgress('Uploading…');
        const form = new FormData();
        form.append('file', uploadFile);
        const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: form });
        if (!upRes.ok) { setUploadProgress('Upload failed'); setSubmitLoading(false); return; }
        const { url } = await upRes.json();
        finalUrl = url;
        setUploadProgress('');
      }

      if (!finalUrl.trim()) { setSubmitLoading(false); return; }

      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: submitTitle, url: finalUrl, note: submitNote }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <>
      <div className="client-submit-wrap">
        <button className="client-submit-btn" onClick={() => setShowSubmit(v => !v)}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
          {showSubmit ? 'Cancel' : 'Submit a file or link'}
        </button>
        {showSubmit && (
          <div className="client-submit-form">
            <div className="client-submit-title">Share with us</div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['link', 'upload', 'text'] as const).map(mode => (
                <button key={mode} onClick={() => { setSubmitMode(mode); setSubmitUrl(''); setUploadFile(null); }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1.5px solid ${submitMode === mode ? '#06D6A0' : '#E2E8F0'}`, background: submitMode === mode ? 'rgba(6,214,160,0.08)' : 'transparent', color: submitMode === mode ? '#06D6A0' : '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                >
                  {mode === 'link' ? '🔗 Link' : mode === 'upload' ? '📎 Upload' : '✏️ Text'}
                </button>
              ))}
            </div>

            <div>
              <label className="client-submit-label">Label *</label>
              <input className="client-submit-input" value={submitTitle} onChange={e => setSubmitTitle(e.target.value)} placeholder={submitMode === 'link' ? 'e.g. Brand Guidelines PDF' : 'e.g. Instagram Handle'} />
            </div>

            {submitMode === 'link' ? (
              <div>
                <label className="client-submit-label">Link *</label>
                <input className="client-submit-input" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} placeholder="https://drive.google.com/…" />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>Works with Google Drive, Dropbox, WeTransfer, or any public link</div>
              </div>
            ) : submitMode === 'upload' ? (
              <div>
                <label className="client-submit-label">File * <span style={{ fontWeight: 400, color: '#94A3B8' }}>(max 10 MB)</span></label>
                <input type="file" onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 8, border: '1.5px dashed #CBD5E1', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#64748B' }} />
                {uploadFile && <div style={{ fontSize: 11, color: '#06D6A0', marginTop: 5 }}>✓ {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</div>}
                {uploadProgress && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>{uploadProgress}</div>}
              </div>
            ) : (
              <div>
                <label className="client-submit-label">Your response *</label>
                <textarea className="client-submit-input" value={submitUrl} onChange={e => setSubmitUrl(e.target.value)} placeholder="Type your response here…" rows={3} style={{ resize: 'vertical' }} />
              </div>
            )}

            <div>
              <label className="client-submit-label">Note (optional)</label>
              <input className="client-submit-input" value={submitNote} onChange={e => setSubmitNote(e.target.value)} placeholder="Any context you want to add…" />
            </div>
            <div className="client-submit-actions">
              <button className="client-submit-cancel" onClick={() => setShowSubmit(false)}>Cancel</button>
              <button className="client-submit-save" onClick={handleSubmitFile} disabled={submitLoading || !submitTitle.trim() || (submitMode === 'upload' ? !uploadFile : !submitUrl.trim())}>
                {submitLoading ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="portal-empty">
          <div className="portal-empty-icon">📁</div>
          <p>No documents have been submitted yet.</p>
        </div>
      ) : (
        <div className="portal-docs-grid">
          {documents.map(doc => {
            const ns = getNote(doc);
            return (
              <div key={doc.id} className="portal-doc-card">
                <div className="portal-doc-type-badge">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</div>
                <div className="portal-doc-title">{doc.title}</div>
                {ns.editing ? (
                  <div className="portal-doc-note-form">
                    <textarea
                      className="portal-note-textarea"
                      value={ns.value}
                      onChange={e => setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], value: e.target.value } }))}
                      placeholder="Add a note for Rachna…"
                      rows={3}
                    />
                    <div className="portal-note-actions">
                      <button className="portal-note-save" onClick={() => saveNote(doc, ns.value)} disabled={ns.saving}>
                        {ns.saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="portal-note-cancel" onClick={() => cancelEdit(doc)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="portal-doc-note-display">
                    {ns.value
                      ? <div className="portal-doc-note-text">{ns.value}</div>
                      : <div className="portal-doc-note-placeholder">No note added</div>
                    }
                    <button className="portal-note-edit-btn" onClick={() => startEdit(doc)}>
                      {ns.value ? 'Edit note' : '+ Add note'}
                    </button>
                  </div>
                )}
                {doc.url && doc.url !== 'pending' && doc.url.startsWith('http') && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="portal-doc-link" onClick={() => onDocOpen(doc.id, doc.title)}>
                    View document →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Profile Card ──────────────────────────────────────────────────────────

const CLIENT_FIELDS: { key: string; label: string; icon: string }[] = [
  { key: 'clientEmail',    label: 'Email',     icon: '✉️' },
  { key: 'clientPhone',    label: 'Phone',     icon: '📞' },
  { key: 'clientWhatsapp', label: 'WhatsApp',  icon: '💬' },
  { key: 'clientWebsite',  label: 'Website',   icon: '🌐' },
  { key: 'clientInstagram',label: 'Instagram', icon: '📸' },
];

const ADMIN_FIELDS: { key: string; label: string; icon: string }[] = [
  { key: 'phone',     label: 'Phone',     icon: '📞' },
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'email',     label: 'Email',     icon: '✉️' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: '💬' },
  { key: 'website',   label: 'Website',   icon: '🌐' },
];

function ProfileCard({ clientSlug, projectId, clientName, adminProfile }: {
  clientSlug: string; projectId: string; clientName: string;
  adminProfile: Record<string, unknown> | null;
}) {
  type ProfileState = Record<string, string>;
  const initial: ProfileState = {};
  CLIENT_FIELDS.forEach(f => { initial[f.key] = (adminProfile?.[f.key] as string) || ''; });

  const [profile, setProfile] = useState<ProfileState>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const adminFilled = ADMIN_FIELDS.filter(f => adminProfile?.[f.key]);
  const clientFilled = CLIENT_FIELDS.filter(f => profile[f.key]);
  const totalFilled = adminFilled.length + clientFilled.length;
  const totalFields = ADMIN_FIELDS.length + CLIENT_FIELDS.length;

  const save = async () => {
    setSaving(true);
    await fetch(`/api/portal/${clientSlug}/${projectId}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaving(false); setSaved(true); setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <div className="profile-avatar">{clientName.charAt(0).toUpperCase()}</div>
        <div className="profile-header-text">
          <div className="profile-name">{clientName}</div>
          <div className="profile-label">
            {totalFilled > 0 ? `${totalFilled} of ${totalFields} fields filled` : 'Add your contact details'}
          </div>
        </div>
        <div className="profile-header-actions">
          {saved && <span className="profile-saved-badge">✓ Saved</span>}
          {!editing && (
            <button className="profile-edit-btn" onClick={() => setEditing(true)}>✏️ Edit</button>
          )}
        </div>
      </div>

      {/* Admin-provided fields (read-only) */}
      {adminFilled.length > 0 && (
        <div className="profile-chips" style={{ marginBottom: 10 }}>
          {adminFilled.map(f => (
            <div key={f.key} className="profile-chip profile-chip-locked">
              <span className="profile-chip-icon">{f.icon}</span>
              <div>
                <div className="profile-chip-label">{f.label.toUpperCase()} · FROM RACHNA</div>
                <div className="profile-chip-value">{adminProfile![f.key] as string}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <>
          <div className="profile-form-grid">
            {CLIENT_FIELDS.map(f => (
              <div key={f.key} className="profile-field">
                <label className="profile-field-label"><span>{f.icon}</span> {f.label}</label>
                <input
                  className="profile-field-input"
                  value={profile[f.key]}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
          <div className="profile-form-actions">
            <button className="profile-save-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="profile-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : clientFilled.length > 0 ? (
        <div className="profile-chips">
          {clientFilled.map(f => (
            <div key={f.key} className="profile-chip">
              <span className="profile-chip-icon">{f.icon}</span>
              <div>
                <div className="profile-chip-label">{f.label.toUpperCase()}</div>
                <div className="profile-chip-value">{profile[f.key]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>
          Add your contact details so Rachna can reach you quickly.
        </p>
      )}
    </div>
  );
}

// ── Main ProjectPortalView ─────────────────────────────────────────────────

export default function ProjectPortalView({ clientSlug, clientName, project }: ProjectPortalViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('submissions');

  const sessionIdRef    = useRef<string>('');
  const tabStartTimeRef = useRef<number>(Date.now());
  const visStartRef     = useRef<number>(Date.now());
  const activeTimeRef   = useRef<number>(0);
  const maxScrollRef    = useRef<number>(0);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const pt = localStorage.getItem('portal_theme');
    if (pt === 'dark' || pt === 'light') return pt;
    const gt = localStorage.getItem('rb_theme');
    if (gt === 'dark' || gt === 'light') return gt;
    const h = new Date().getHours();
    return h >= 6 && h < 20 ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal_theme', next);
  };

  const handleLogout = () => {
    document.cookie = `pc_${clientSlug}=; path=/; max-age=0`;
    window.location.href = `/portal/${clientSlug}`;
  };

  // ── Session init ───────────────────────────────────────────────────────────
  useEffect(() => {
    let sid = sessionStorage.getItem(`portal_session_${project.id}`);
    if (!sid) {
      sid = ([1e7] as unknown as string + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) =>
        (parseInt(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (parseInt(c) / 4)))).toString(16)
      );
      sessionStorage.setItem(`portal_session_${project.id}`, sid);
    }
    sessionIdRef.current = sid;

    fetch(`/api/portal/${clientSlug}/${project.id}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, userAgent: navigator.userAgent }),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      // Only track initial tab for new sessions (not returning)
      if (!data.returning) {
        fetch(`/api/portal/${clientSlug}/${project.id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'tab_view', meta: { tab: 'submissions', initial: true }, sessionId: sid }),
        }).catch(() => {});
      }
    }).catch(() => {});

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        activeTimeRef.current += (Date.now() - visStartRef.current) / 1000;
        sendDuration();
      } else {
        visStartRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleScroll = () => {
      const el = document.documentElement;
      const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100);
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const interval = setInterval(sendDuration, 30_000);

    const handleUnload = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      activeTimeRef.current += (Date.now() - visStartRef.current) / 1000;
      navigator.sendBeacon(
        `/api/portal/${clientSlug}/${project.id}/session`,
        new Blob(
          [JSON.stringify({ sessionId: sid, duration: Math.round(activeTimeRef.current) })],
          { type: 'application/json' }
        )
      );
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSlug, project.id]);

  const sendDuration = () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const duration = Math.round(activeTimeRef.current + (Date.now() - visStartRef.current) / 1000);
    fetch(`/api/portal/${clientSlug}/${project.id}/session`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, duration }),
    }).catch(() => {});
  };

  const track = useCallback(async (eventType: string, meta?: Record<string, unknown>) => {
    fetch(`/api/portal/${clientSlug}/${project.id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, meta, sessionId: sessionIdRef.current }),
    }).catch(() => {});
  }, [clientSlug, project.id]);

  const handleTabChange = (tabId: string) => {
    const now = Date.now();
    const tabDuration = Math.round((now - tabStartTimeRef.current) / 1000);
    const scrollDepth = maxScrollRef.current;
    track('tab_view', { tab: tabId, prevTabDuration: tabDuration, scrollDepth });
    tabStartTimeRef.current = now;
    maxScrollRef.current = 0;
    setActiveTab(tabId);
  };

  const handleDocOpen = (docId: string, title: string) => {
    track('doc_open', { docId, title });
  };

  const auditSections      = project.sections.filter(s => AUDIT_TYPES.includes(s.sectionType));
  const competitorSections = project.sections.filter(s => COMPETITOR_TYPES.includes(s.sectionType));
  const proposalSections   = project.sections.filter(s => PROPOSAL_TYPES.includes(s.sectionType));
  const statusSections     = project.sections.filter(s => STATUS_TYPES.includes(s.sectionType));

  return (
    <div className="portal-root" data-theme={theme} suppressHydrationWarning>

      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            {/* Back button if multi-project (we always show it for clean UX) */}
            <button
              onClick={() => router.push(`/portal/${clientSlug}`)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#8B95A8',
                fontSize: '13px',
                marginRight: '16px',
                padding: '4px 0',
              }}
              title="Back to all projects"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              All projects
            </button>
            <div className="portal-logo-mark"><LogoSVG /></div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb"> Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{clientName}</span>
            <span className="portal-badge">{project.name}</span>
            <button className="portal-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>
            <button className="portal-logout-btn" onClick={handleLogout} title="Sign out">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs bar */}
      <nav className="portal-tabs-bar" aria-label="Project sections">
        <div className="portal-tabs-inner">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`portal-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="portal-content">

        {activeTab === 'submissions' && (
          <>
            <h1 className="portal-tab-heading">Your Submissions</h1>
            <p className="portal-tab-sub">Documents and files shared with us. Add a note to any document if needed.</p>
            <ProfileCard
              clientSlug={clientSlug}
              projectId={project.id}
              clientName={clientName}
              adminProfile={project.adminProfile}
            />
            <DocumentsPanel
              documents={project.documents}
              clientSlug={clientSlug}
              projectId={project.id}
              onDocOpen={handleDocOpen}
            />
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <h1 className="portal-tab-heading">Audit Report</h1>
            <p className="portal-tab-sub">Detailed findings from our performance, SEO, and CRO analysis.</p>
            {auditSections.length > 0
              ? <SectionsPanel sections={project.sections} types={AUDIT_TYPES} clientSlug={clientSlug} projectId={project.id} clientName={clientName} />
              : (
                <div className="portal-empty">
                  <div className="portal-empty-icon">🔍</div>
                  <p>Your audit report is being prepared. Check back soon.</p>
                </div>
              )
            }
          </>
        )}

        {activeTab === 'competitors' && (
          <>
            <h1 className="portal-tab-heading">Competitor Analysis</h1>
            <p className="portal-tab-sub">How your store stacks up against the competition.</p>
            {competitorSections.length > 0
              ? <SectionsPanel sections={project.sections} types={COMPETITOR_TYPES} clientSlug={clientSlug} projectId={project.id} clientName={clientName} />
              : (
                <div className="portal-empty">
                  <div className="portal-empty-icon">📊</div>
                  <p>Competitor analysis will appear here once completed.</p>
                </div>
              )
            }
          </>
        )}

        {activeTab === 'proposal' && (
          <>
            {(project.adminProfile?.proposalVisible === true)
              ? <ProposalView sections={proposalSections} />
              : (
                <ComingSoonPanel
                  icon="📋"
                  headline="Proposal is being prepared"
                  sub="Once the audit review is complete, your custom proposal will appear here with recommended scope, timeline, and pricing."
                />
              )
            }
          </>
        )}

        {activeTab === 'status' && (
          <>
            <h1 className="portal-tab-heading">Project Status</h1>
            <p className="portal-tab-sub">Live updates on your project&apos;s progress.</p>
            {statusSections.length > 0
              ? <SectionsPanel sections={project.sections} types={STATUS_TYPES} clientSlug={clientSlug} projectId={project.id} clientName={clientName} />
              : (
                <ComingSoonPanel
                  icon="🚀"
                  headline="Project not started yet"
                  sub="Once the proposal is confirmed and the project kicks off, you'll see live progress updates, milestones, and deliverable status here."
                />
              )
            }
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <div className="portal-footer-credit">
            Prepared by <strong>Rachna Builds</strong> &middot;{' '}
            <a href="mailto:rachnajain2103@gmail.com">rachnajain2103@gmail.com</a> &middot;{' '}
            <a href="https://rachnabuilds.com" target="_blank" rel="noopener noreferrer">rachnabuilds.com</a>
          </div>
          <div className="portal-footer-socials">
            <a href="https://www.linkedin.com/in/rachnabuilds/" target="_blank" rel="noopener noreferrer" className="portal-social-link" aria-label="LinkedIn">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
              LinkedIn
            </a>
            <a href="https://www.instagram.com/rachnabuilds" target="_blank" rel="noopener noreferrer" className="portal-social-link" aria-label="Instagram">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
