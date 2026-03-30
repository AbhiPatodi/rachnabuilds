'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import './portal.css';
import ProposalView from './ProposalView';

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

interface ReportSection {
  id: string;
  reportId: string;
  sectionType: string;
  title: string;
  content: unknown;
  displayOrder: number;
  createdAt: Date;
}

interface ClientDocument {
  id: string;
  reportId: string;
  docType: string;
  title: string;
  url: string;
  notes: string | null;
  uploadedAt: Date;
}

export interface ClientProfile {
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
}

export interface ReportWithSectionsAndDocs {
  id: string;
  slug: string;
  clientName: string;
  clientEmail: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt: Date | null;
  clientProfile: ClientProfile | null;
  adminProfile: ClientProfile | null;
  createdAt: Date;
  updatedAt: Date;
  sections: ReportSection[];
  documents: ClientDocument[];
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

  // Severity summary counts
  const counts: Record<string, number> = {};
  findings.forEach(f => { if (f) counts[f.sev.cls] = (counts[f.sev.cls] || 0) + 1; });

  const SEV_ORDER = ['sev-critical', 'sev-high', 'sev-medium', 'sev-good', 'sev-done', 'sev-warning'];
  const SEV_LABELS: Record<string, string> = {
    'sev-critical': 'Critical',
    'sev-high': 'High',
    'sev-medium': 'Medium',
    'sev-good': 'Good',
    'sev-done': 'Done',
    'sev-warning': 'Note',
  };

  return (
    <div className="finding-accordion-wrap">
      {/* Severity summary */}
      <div className="finding-summary">
        {SEV_ORDER.filter(k => counts[k]).map(k => (
          <span key={k} className={`finding-summary-pill ${k}`}>
            {counts[k]} {SEV_LABELS[k]}
          </span>
        ))}
      </div>
      {/* Accordion rows */}
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
    // Text block
    if ('text' in c && typeof (c as { text: string }).text === 'string') {
      const paragraphs = (c as { text: string }).text.split('\n').filter(Boolean);
      const textEl = (
        <div className="portal-text">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
      // Also render items if present alongside text
      if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
        const items = (c as { items: string[] }).items;
        return (
          <>
            {textEl}
            {hasSeverityItems(items)
              ? <FindingAccordion items={items} />
              : (
                <ul className="portal-list">
                  {items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )
            }
          </>
        );
      }
      return textEl;
    }

    // Items (finding accordion or bullet list)
    if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
      const items = (c as { items: string[] }).items;
      if (hasSeverityItems(items)) return <FindingAccordion items={items} />;
      return (
        <ul className="portal-list">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }

    // Rows (score table)
    if ('rows' in c) {
      const rows = (c as { rows: { label: string; value: string; status?: string }[] }).rows;
      return (
        <div style={{ overflowX: 'auto' }}>
          <table className="portal-score-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Score / Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const s = row.status === 'good' || row.status === 'done' ? 'good'
                  : row.status === 'warning' || row.status === 'pending' ? 'warning'
                  : row.status === 'bad' || row.status === 'critical' ? 'bad'
                  : row.status === 'high' ? 'warning'
                  : '';
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

    // Metrics grid
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

    // Competitors table
    if ('competitors' in c) {
      const competitors = (c as { competitors: { name: string; size: string; speed: string; notes: string }[] }).competitors;
      return (
        <div className="portal-competitor-table-wrap">
          <table className="portal-competitor-table">
            <thead>
              <tr>
                <th>Brand / Product</th>
                <th>Page Size</th>
                <th>Speed</th>
                <th>Notes</th>
              </tr>
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

const AUDIT_TYPES       = ['executive_summary', 'performance_audit', 'seo_audit', 'cro_audit', 'action_plan'];
const COMPETITOR_TYPES  = ['competitor_analysis', 'pdp_analysis'];
const PROPOSAL_TYPES    = ['proposal', 'mockup_review'];
const STATUS_TYPES      = ['project_status'];

const DOC_TYPE_LABELS: Record<string, string> = {
  rfp: 'RFP',
  mockup: 'Mockup',
  competitor_ref: 'Competitor Ref',
  brand_assets: 'Brand Assets',
  other: 'Other',
};

// ── Section comments ───────────────────────────────────────────────────────

interface CommentData { id: string; author: string; text: string; createdAt: string; }

function SectionComments({ slug, context, clientName }: { slug: string; context: string; clientName: string }) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/reports/${slug}/comments?context=${encodeURIComponent(context)}`);
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
    const res = await fetch(`/api/reports/${slug}/comments`, {
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
  slug,
  clientName,
}: {
  sections: ReportSection[];
  types: string[];
  slug: string;
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
            slug={slug}
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

// ── Client Profile Card ────────────────────────────────────────────────────

const PROFILE_FIELDS: { key: keyof ClientProfile; label: string; placeholder: string; icon: string; span?: boolean }[] = [
  { key: 'email',     label: 'Email',       placeholder: 'your@email.com',        icon: '✉️' },
  { key: 'phone',     label: 'Phone',       placeholder: '+91 98765 43210',        icon: '📞' },
  { key: 'whatsapp',  label: 'WhatsApp',    placeholder: '+91 98765 43210',        icon: '💬' },
  { key: 'website',   label: 'Website',     placeholder: 'https://yourstore.com',  icon: '🌐' },
  { key: 'instagram', label: 'Instagram',   placeholder: '@yourhandle',            icon: '📸' },
  { key: 'linkedin',  label: 'LinkedIn',    placeholder: 'linkedin.com/in/you',    icon: '💼' },
  { key: 'twitter',   label: 'X / Twitter', placeholder: '@yourhandle',            icon: '𝕏' },
  { key: 'notes',     label: 'Notes',       placeholder: 'Anything else for us…',  icon: '📝', span: true },
];

function ProfileCard({ slug, clientName, initialProfile, adminProfile }: {
  slug: string;
  clientName: string;
  initialProfile: ClientProfile | null;
  adminProfile: ClientProfile | null;
}) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(initialProfile ?? {});
  const [draft, setDraft] = useState<ClientProfile>(initialProfile ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasAny = PROFILE_FIELDS.some(f => profile[f.key]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${slug}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (res.ok) {
        setProfile(draft);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="profile-card">
      {/* Header */}
      <div className="profile-card-header">
        <div className="profile-avatar">{clientName.charAt(0).toUpperCase()}</div>
        <div className="profile-header-text">
          <div className="profile-name">{clientName}</div>
          <div className="profile-label">
            {hasAny ? `${PROFILE_FIELDS.filter(f => profile[f.key]).length} of ${PROFILE_FIELDS.length} fields filled` : 'Contact details'}
          </div>
        </div>
        <div className="profile-header-actions">
          {saved && <span className="profile-saved-badge">✓ Saved</span>}
          <button
            className={`profile-edit-btn ${editing ? 'cancel' : ''}`}
            onClick={() => { setDraft(profile); setEditing(e => !e); }}
          >
            {editing ? 'Cancel' : (hasAny ? '✏️ Edit' : '+ Add Details')}
          </button>
        </div>
      </div>

      {/* Admin-added fields — read-only */}
      {adminProfile && PROFILE_FIELDS.some(f => adminProfile[f.key]) && (
        <div className="profile-chips" style={{ marginBottom: 14 }}>
          {PROFILE_FIELDS.filter(f => adminProfile[f.key]).map(f => (
            <div key={f.key} className="profile-chip profile-chip-locked">
              <span className="profile-chip-icon">{f.icon}</span>
              <div>
                <div className="profile-chip-label">{f.label} <span style={{ opacity: .5 }}>· from Rachna</span></div>
                <div className="profile-chip-value">{adminProfile[f.key]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <>
          <div className="profile-form-grid">
            {PROFILE_FIELDS.map(f => (
              <div key={f.key} className={`profile-field${f.span ? ' profile-field-span' : ''}`}>
                <label className="profile-field-label">
                  <span className="profile-field-icon">{f.icon}</span>
                  {f.label}
                </label>
                <input
                  className="profile-field-input"
                  placeholder={f.placeholder}
                  value={draft[f.key] ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                  type={f.key === 'email' ? 'email' : 'text'}
                />
              </div>
            ))}
          </div>
          <div className="profile-form-actions">
            <button className="profile-cancel-link" onClick={() => setEditing(false)}>Cancel</button>
            <button className="profile-save-btn" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </>
      ) : hasAny ? (
        <div className="profile-chips">
          {PROFILE_FIELDS.filter(f => profile[f.key]).map(f => (
            <div key={f.key} className="profile-chip">
              <span className="profile-chip-icon">{f.icon}</span>
              <div>
                <div className="profile-chip-label">{f.label}</div>
                <div className="profile-chip-value">{profile[f.key]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="profile-empty-state">
          <p>Add your contact details so we can reach you easily — phone, WhatsApp, social handles, and more.</p>
        </div>
      )}
    </div>
  );
}

// ── Documents panel (with client notes + file submission) ──────────────────

function DocumentsPanel({
  documents,
  slug,
  onDocOpen,
}: {
  documents: ClientDocument[];
  slug: string;
  onDocOpen: (docId: string, title: string) => void;
}) {
  const [noteState, setNoteState] = useState<Record<string, { editing: boolean; value: string; saving: boolean; saved: boolean }>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const getNote = useCallback((doc: ClientDocument) => {
    return noteState[doc.id] ?? { editing: false, value: doc.notes ?? '', saving: false, saved: false };
  }, [noteState]);

  const startEdit = (doc: ClientDocument) => {
    setNoteState(prev => ({
      ...prev,
      [doc.id]: { editing: true, value: doc.notes ?? '', saving: false, saved: false },
    }));
  };

  const cancelEdit = (doc: ClientDocument) => {
    setNoteState(prev => ({
      ...prev,
      [doc.id]: { editing: false, value: doc.notes ?? '', saving: false, saved: false },
    }));
  };

  const saveNote = async (doc: ClientDocument, value: string) => {
    setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: true } }));
    try {
      await fetch(`/api/reports/${slug}/documents/${doc.id}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: value }),
      });
      setNoteState(prev => ({ ...prev, [doc.id]: { editing: false, value, saving: false, saved: true } }));
    } catch {
      setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false } }));
    }
  };

  const handleSubmitFile = async () => {
    if (!submitTitle.trim() || !submitUrl.trim()) return;
    setSubmitLoading(true);
    const res = await fetch(`/api/reports/${slug}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: submitTitle, url: submitUrl, note: submitNote }),
    });
    if (res.ok) {
      window.location.reload();
    }
    setSubmitLoading(false);
  };

  return (
    <>
      {/* File/link submission */}
      <div className="client-submit-wrap">
        <button
          className="client-submit-btn"
          onClick={() => setShowSubmit(v => !v)}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
          {showSubmit ? 'Cancel' : 'Submit a file or link'}
        </button>
        {showSubmit && (
          <div className="client-submit-form">
            <div className="client-submit-title">Share a file or link with us</div>
            <div>
              <label className="client-submit-label">Title *</label>
              <input
                className="client-submit-input"
                value={submitTitle}
                onChange={e => setSubmitTitle(e.target.value)}
                placeholder="e.g. Brand guidelines PDF"
              />
            </div>
            <div>
              <label className="client-submit-label">URL or link *</label>
              <input
                className="client-submit-input"
                value={submitUrl}
                onChange={e => setSubmitUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
              />
            </div>
            <div>
              <label className="client-submit-label">Note (optional)</label>
              <input
                className="client-submit-input"
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
                placeholder="Any context you want to add…"
              />
            </div>
            <div className="client-submit-actions">
              <button
                className="client-submit-cancel"
                onClick={() => setShowSubmit(false)}
              >
                Cancel
              </button>
              <button
                className="client-submit-save"
                onClick={handleSubmitFile}
                disabled={submitLoading || !submitTitle.trim() || !submitUrl.trim()}
              >
                {submitLoading ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents grid */}
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
                <div className="portal-doc-type-badge">
                  {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                </div>
                <div className="portal-doc-title">{doc.title}</div>

                {/* Notes section */}
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
                      <button
                        className="portal-note-save"
                        onClick={() => saveNote(doc, ns.value)}
                        disabled={ns.saving}
                      >
                        {ns.saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="portal-note-cancel" onClick={() => cancelEdit(doc)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="portal-doc-note-display">
                    {ns.value ? (
                      <div className="portal-doc-note-text">{ns.value}</div>
                    ) : (
                      <div className="portal-doc-note-placeholder">No note added</div>
                    )}
                    <button className="portal-note-edit-btn" onClick={() => startEdit(doc)}>
                      {ns.value ? 'Edit note' : '+ Add note'}
                    </button>
                  </div>
                )}

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="portal-doc-link"
                  onClick={() => onDocOpen(doc.id, doc.title)}
                >
                  View document →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Main PortalView ────────────────────────────────────────────────────────

export default function PortalView({ report, isAdminPreview = false }: { report: ReportWithSectionsAndDocs; isAdminPreview?: boolean }) {
  const [activeTab, setActiveTab] = useState('submissions');

  // ── Analytics refs ────────────────────────────────────────────────────────
  const sessionIdRef      = useRef<string>('');
  const tabStartTimeRef   = useRef<number>(Date.now());
  const visStartRef       = useRef<number>(Date.now());
  const activeTimeRef     = useRef<number>(0);   // accumulated visible seconds
  const maxScrollRef      = useRef<number>(0);   // max scroll % for current tab

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    // Portal-specific override → global pref → time-based auto
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
    document.cookie = `rp_${report.slug}=; path=/; max-age=0`;
    window.location.reload();
  };

  // ── Session init ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Generate or restore sessionId
    let sid = sessionStorage.getItem('portal_session_' + report.slug);
    if (!sid) {
      sid = ([1e7] as unknown as string + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) =>
        (parseInt(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (parseInt(c) / 4)))).toString(16)
      );
      sessionStorage.setItem('portal_session_' + report.slug, sid);
    }
    sessionIdRef.current = sid;

    // Register session (create or mark returning)
    fetch(`/api/reports/${report.slug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, userAgent: navigator.userAgent }),
    }).catch(() => {});

    // Visibility / active-time tracking
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        activeTimeRef.current += (Date.now() - visStartRef.current) / 1000;
        sendDuration();
      } else {
        visStartRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Scroll depth tracking
    const handleScroll = () => {
      const el = document.documentElement;
      const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100);
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Periodic duration update (every 30s)
    const interval = setInterval(sendDuration, 30_000);

    // On unload — sendBeacon so it survives page close
    const handleUnload = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      activeTimeRef.current += (Date.now() - visStartRef.current) / 1000;
      navigator.sendBeacon(
        `/api/reports/${report.slug}/session`,
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
  }, [report.slug]);

  const sendDuration = () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const duration = Math.round(activeTimeRef.current + (Date.now() - visStartRef.current) / 1000);
    fetch(`/api/reports/${report.slug}/session`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, duration }),
    }).catch(() => {});
  };

  const track = useCallback(async (eventType: string, meta?: Record<string, unknown>) => {
    fetch(`/api/reports/${report.slug}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, meta, sessionId: sessionIdRef.current }),
    }).catch(() => {}); // fire-and-forget
  }, [report.slug]);

  const handleTabChange = (tabId: string) => {
    const now = Date.now();
    const tabDuration = Math.round((now - tabStartTimeRef.current) / 1000);
    const scrollDepth = maxScrollRef.current;
    // Track leaving the current tab with how long + how deep they scrolled
    track('tab_view', { tab: tabId, prevTabDuration: tabDuration, scrollDepth });
    tabStartTimeRef.current = now;
    maxScrollRef.current = 0; // reset scroll for new tab
    setActiveTab(tabId);
  };

  const handleDocOpen = (docId: string, title: string) => {
    track('doc_open', { docId, title });
  };

  const auditSections      = report.sections.filter(s => AUDIT_TYPES.includes(s.sectionType));
  const competitorSections = report.sections.filter(s => COMPETITOR_TYPES.includes(s.sectionType));
  const proposalSections   = report.sections.filter(s => PROPOSAL_TYPES.includes(s.sectionType));
  const statusSections     = report.sections.filter(s => STATUS_TYPES.includes(s.sectionType));

  return (
    <div className="portal-root" data-theme={theme} suppressHydrationWarning>

      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            <div className="portal-logo-mark"><LogoSVG /></div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb"> Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{report.clientName}</span>
            <span className="portal-badge">Your Report</span>
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
      <nav className="portal-tabs-bar" aria-label="Report sections">
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

        {/* Profile card — always visible at the top */}
        <ProfileCard
          adminProfile={report.adminProfile}
          slug={report.slug}
          clientName={report.clientName}
          initialProfile={report.clientProfile}
        />

        {activeTab === 'submissions' && (
          <>
            <h1 className="portal-tab-heading">Your Submissions</h1>
            <p className="portal-tab-sub">Documents and files shared with us. Add a note to any document if needed.</p>
            <DocumentsPanel
              documents={report.documents}
              slug={report.slug}
              onDocOpen={handleDocOpen}
            />
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <h1 className="portal-tab-heading">Audit Report</h1>
            <p className="portal-tab-sub">Detailed findings from our performance, SEO, and CRO analysis.</p>
            {auditSections.length > 0
              ? <SectionsPanel sections={report.sections} types={AUDIT_TYPES} slug={report.slug} clientName={report.clientName} />
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
              ? <SectionsPanel sections={report.sections} types={COMPETITOR_TYPES} slug={report.slug} clientName={report.clientName} />
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
            {isAdminPreview && (
              <div className="portal-preview-banner">
                👁 Admin Preview — clients cannot see this until you enable it
              </div>
            )}
            {((report.adminProfile as Record<string,unknown>)?.proposalVisible === true || isAdminPreview)
              ? <ProposalView />
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
              ? <SectionsPanel sections={report.sections} types={STATUS_TYPES} slug={report.slug} clientName={report.clientName} />
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
            <a
              href="https://www.linkedin.com/in/rachnabuilds/"
              target="_blank"
              rel="noopener noreferrer"
              className="portal-social-link"
              aria-label="LinkedIn"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
              LinkedIn
            </a>
            <a
              href="https://www.instagram.com/rachnabuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="portal-social-link"
              aria-label="Instagram"
            >
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
