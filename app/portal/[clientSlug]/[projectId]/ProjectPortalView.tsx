'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../../../reports/[slug]/portal.css';
import ProposalView from '../../../reports/[slug]/ProposalView';
import PortalKanbanBoard from './PortalKanbanBoard';

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
  approvedAt?: string | null;
  approvedBy?: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  order: number;
}

interface FeedbackReplyData {
  id: string; message: string; attachmentUrl: string | null; attachmentName: string | null;
  addedBy: string; createdAt: string;
}

interface DeliverableFeedbackData {
  id: string; message: string; attachmentUrl: string | null; attachmentName: string | null;
  addedBy: string; status: string; createdAt: string; replies: FeedbackReplyData[];
}

interface DeliverableData {
  id: string; title: string; description: string | null; previewUrl: string | null;
  status: string; displayOrder: number; createdAt: string; feedback: DeliverableFeedbackData[];
}

interface ProjectData {
  id: string;
  name: string;
  clientType: string;
  status: string;
  updatedAt?: string;
  adminProfile: Record<string, unknown> | null;
  sections: ProjectSection[];
  documents: ProjectDocument[];
}

interface PortalContractData {
  id: string; phase: number; phaseLabel: string | null; content: string; status: string;
  clientSignature?: string | null; signedAt?: string | null;
  advancePaid?: boolean; balancePaid?: boolean;
  advanceReceiptUrl?: string | null; balanceReceiptUrl?: string | null;
}

interface ProjectPortalViewProps {
  clientSlug: string;
  clientName: string;
  project: ProjectData;
  hasMultipleProjects?: boolean;
  visibleTabs?: string[]; // if not provided, show all tabs (backward compat)
  initialContracts?: PortalContractData[];
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
  competitor_analysis: 'Reference',
  pdp_analysis: 'PDP Analysis',
  mockup_review: 'Mockup Review',
  action_plan: 'Action Plan',
  proposal: 'Proposal',
  project_status: 'Project Status',
};

const TABS = [
  { id: 'submissions', label: 'Your Submissions' },
  { id: 'audit',       label: 'Insights' },
  { id: 'competitors', label: 'References' },
  { id: 'proposal',    label: 'Proposal' },
  { id: 'status',      label: 'Project Status' },
  { id: 'review',      label: 'Review & Feedback' },
  { id: 'contract',    label: 'Contract' },
  { id: 'payments',    label: 'Payments' },
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

// ── Message types ───────────────────────────────────────────

interface MessageData {
  id: string;
  projectId: string;
  senderType: string;
  text: string;
  readByAdmin: boolean;
  readByClient: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

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
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/comments?context=${encodeURIComponent(context)}`);
      if (res.ok) setComments(await res.json());
    } finally {
      setCommentsLoading(false);
      setFetched(true);
    }
  };

  const toggle = () => {
    if (!fetched) load();
    setOpen(v => !v);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/portal/${clientSlug}/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, text }),
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
          {commentsLoading && (
            <div style={{fontSize:12,color:'var(--text-muted)',padding:'16px 0'}}>Loading…</div>
          )}
          {!commentsLoading && comments.length === 0 && (
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

type DocLog = { id: string; documentId: string; action: string; actorType: string; docTitle?: string | null; createdAt: string };

function timeAgoShort(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const ACTION_LABELS: Record<string, string> = {
  added: 'Added',
  url_changed: 'File/link updated',
  note_edited: 'Note edited',
  deleted: 'Removed',
};

type ApprovalEntry = { approvedAt: string; approvedBy: string };

function DocumentsPanel({
  documents,
  clientSlug,
  projectId,
  clientName,
  onDocOpen,
}: {
  documents: ProjectDocument[];
  clientSlug: string;
  projectId: string;
  clientName: string;
  onDocOpen: (docId: string, title: string) => void;
}) {
  const [noteState, setNoteState] = useState<Record<string, { editing: boolean; value: string; saving: boolean; saved: boolean }>>({});
  const [editUrlState, setEditUrlState] = useState<Record<string, { open: boolean; mode: 'link' | 'upload'; value: string; file: File | null; saving: boolean; progress: string }>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<DocLog[]>([]);

  // Approval state — pre-populate from docs that already have approvedAt
  const [approvalStates, setApprovalStates] = useState<Record<string, ApprovalEntry | null>>(() => {
    const init: Record<string, ApprovalEntry | null> = {};
    documents.forEach(d => {
      if (d.approvedAt && d.approvedBy) {
        init[d.id] = { approvedAt: d.approvedAt, approvedBy: d.approvedBy };
      } else {
        init[d.id] = null;
      }
    });
    return init;
  });
  const [approvalNameState, setApprovalNameState] = useState<Record<string, string>>({});
  const [approvalSaving, setApprovalSaving] = useState<Record<string, boolean>>({});
  const [approvalInputOpen, setApprovalInputOpen] = useState<Record<string, boolean>>({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitMode, setSubmitMode] = useState<'link' | 'text' | 'upload'>('link');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitNote, setSubmitNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>(() => Object.fromEntries(documents.map(d => [d.id, d.url ?? ''])));
  const [subTab, setSubTab] = useState<'files' | 'required'>('files');

  useEffect(() => {
    fetch(`/api/portal/${clientSlug}/${projectId}/document-logs`)
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {});
  }, [clientSlug, projectId]);

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
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) {
        setNoteState(prev => ({ ...prev, [doc.id]: { editing: false, value, saving: false, saved: true } }));
        // Refresh logs
        fetch(`/api/portal/${clientSlug}/${projectId}/document-logs`)
          .then(r => r.ok ? r.json() : { logs: [] }).then(d => setLogs(d.logs ?? [])).catch(() => {});
        setTimeout(() => setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saved: false } })), 2000);
      } else {
        setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false } }));
      }
    } catch {
      setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false } }));
    }
  };

  const saveEditUrl = async (doc: ProjectDocument) => {
    const es = editUrlState[doc.id];
    if (!es) return;
    setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: true } }));
    try {
      let finalUrl = es.value;
      if (es.mode === 'upload' && es.file) {
        setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], progress: 'Uploading…' } }));
        const form = new FormData();
        form.append('file', es.file);
        const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: form });
        if (!upRes.ok) {
          setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false, progress: 'Upload failed' } }));
          return;
        }
        finalUrl = (await upRes.json()).url;
      }
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      });
      if (res.ok) {
        setDocUrls(prev => ({ ...prev, [doc.id]: finalUrl }));
        setEditUrlState(prev => ({ ...prev, [doc.id]: { open: false, mode: 'link', value: finalUrl, file: null, saving: false, progress: '' } }));
        fetch(`/api/portal/${clientSlug}/${projectId}/document-logs`)
          .then(r => r.ok ? r.json() : { logs: [] }).then(d => setLogs(d.logs ?? [])).catch(() => {});
      } else {
        setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false, progress: '' } }));
      }
    } catch {
      setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], saving: false, progress: '' } }));
    }
  };

  const handleSubmitFile = async () => {
    if (!submitTitle.trim()) return;
    setSubmitLoading(true);
    try {
      let finalUrl = submitUrl;

      // Upload mode: upload file first, get URL
      if (submitMode === 'text') {
        // Text response: store the text in notes, use placeholder URL
        if (!submitUrl.trim()) { setSubmitLoading(false); return; }
        const res = await fetch(`/api/portal/${clientSlug}/${projectId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: submitTitle, url: 'text://', note: submitUrl.trim() }),
        });
        if (res.ok) window.location.reload();
        setSubmitLoading(false);
        return;
      }

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

  const handleApprove = async (doc: ProjectDocument) => {
    const name = (approvalNameState[doc.id] ?? clientName).trim();
    if (!name) return;
    setApprovalSaving(prev => ({ ...prev, [doc.id]: true }));
    try {
      const res = await fetch(`/api/portal/${clientSlug}/${projectId}/documents/${doc.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedBy: name }),
      });
      if (res.ok) {
        const data = await res.json();
        setApprovalStates(prev => ({ ...prev, [doc.id]: { approvedAt: data.approvedAt, approvedBy: data.approvedBy } }));
        setApprovalInputOpen(prev => ({ ...prev, [doc.id]: false }));
      } else if (res.status === 409) {
        const data = await res.json();
        setApprovalStates(prev => ({ ...prev, [doc.id]: { approvedAt: data.approvedAt, approvedBy: data.approvedBy } }));
        setApprovalInputOpen(prev => ({ ...prev, [doc.id]: false }));
      }
    } catch {
      // non-critical
    } finally {
      setApprovalSaving(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  // "Required from You": explicitly marked as client_required by admin
  const requiredDocs = documents.filter(d => d.docType === 'client_required');
  // "Your Files": client uploads + any admin doc with a URL
  const uploadedDocs = documents.filter(d => d.docType === 'client_upload' || (d.docType !== 'client_required' && d.url && d.url.trim() !== ''));

  const submittedCount = requiredDocs.filter(d => { const u = docUrls[d.id] ?? d.url ?? ''; return u && u !== '' && u !== 'pending'; }).length;

  return (
    <>
      {/* ── Sub-tab bar ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <button
          onClick={() => setSubTab('files')}
          style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, color: subTab === 'files' ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: subTab === 'files' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}
        >
          📁 My Submissions
        </button>
        {requiredDocs.length > 0 && (
          <button
            onClick={() => setSubTab('required')}
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, color: subTab === 'required' ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', borderBottom: subTab === 'required' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', marginBottom: -1 }}
          >
            📋 What We Need From You
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: submittedCount === requiredDocs.length ? 'rgba(6,214,160,0.15)' : 'rgba(245,158,11,0.15)', color: submittedCount === requiredDocs.length ? '#06D6A0' : '#F59E0B' }}>
              {submittedCount}/{requiredDocs.length}
            </span>
          </button>
        )}
      </div>

      {/* ── YOUR FILES tab ── */}
      {subTab === 'files' && <div>

      {/* Submit form */}
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

      {uploadedDocs.length === 0 ? (
        <div className="portal-empty" style={{ marginTop: 16 }}>
          <div className="portal-empty-icon">📁</div>
          <p>No files submitted yet. Use the button above to share something.</p>
        </div>
      ) : (
        <div className="portal-docs-grid" style={{ marginTop: 16 }}>
          {uploadedDocs.map(doc => {
            const ns = getNote(doc);
            const es = editUrlState[doc.id] ?? { open: false, mode: 'link' as const, value: doc.url ?? '', file: null, saving: false, progress: '' };
            const docUrl = docUrls[doc.id] ?? doc.url ?? '';
            const isClientUpload = doc.docType === 'client_upload';
            const docLogs = logs.filter(l => l.documentId === doc.id).slice(0, 5);
            const historyOpen = !!showHistory[doc.id];
            return (
              <div key={doc.id} className="portal-doc-card">
                <div className="portal-doc-title">{doc.title}</div>
                {doc.notes && !ns.editing && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{doc.notes}</div>}
                {ns.editing ? (
                  <div className="portal-doc-note-form">
                    <textarea className="portal-note-textarea" value={ns.value} onChange={e => setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], value: e.target.value } }))} placeholder="Add a note…" rows={3} />
                    <div className="portal-note-actions">
                      <button className="portal-note-save" onClick={() => saveNote(doc, ns.value)} disabled={ns.saving}>{ns.saving ? 'Saving…' : 'Save'}</button>
                      <button className="portal-note-cancel" onClick={() => cancelEdit(doc)}>Cancel</button>
                    </div>
                  </div>
                ) : ns.value ? (
                  <div className="portal-doc-note-display">
                    <div className="portal-doc-note-text">{ns.value}</div>
                    <button className="portal-note-edit-btn" onClick={() => startEdit(doc)}>Edit note</button>
                  </div>
                ) : isClientUpload ? (
                  <button className="portal-note-edit-btn" onClick={() => startEdit(doc)} style={{ marginBottom: 6 }}>+ Add note</button>
                ) : null}
                {isClientUpload && (
                  es.open ? (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['link', 'upload'] as const).map(m => (
                          <button key={m} onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], mode: m, value: '', file: null } }))}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: `1.5px solid ${es.mode === m ? '#06D6A0' : 'var(--border)'}`, background: es.mode === m ? 'rgba(6,214,160,0.08)' : 'transparent', color: es.mode === m ? '#06D6A0' : 'var(--text-secondary)', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                            {m === 'link' ? '🔗 Link' : '📎 Upload'}
                          </button>
                        ))}
                      </div>
                      {es.mode === 'link' ? (
                        <input className="client-submit-input" value={es.value} onChange={e => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], value: e.target.value } }))} placeholder="Paste link…" style={{ marginBottom: 8 }} />
                      ) : (
                        <div style={{ marginBottom: 8 }}>
                          <input type="file" onChange={e => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], file: e.target.files?.[0] ?? null } }))}
                            style={{ display: 'block', width: '100%', padding: '8px', borderRadius: 6, border: '1.5px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }} />
                          {es.file && <div style={{ fontSize: 11, color: '#06D6A0', marginTop: 4 }}>✓ {es.file.name}</div>}
                          {es.progress && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{es.progress}</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="portal-note-save" onClick={() => saveEditUrl(doc)} disabled={es.saving || (es.mode === 'link' ? !es.value.trim() : !es.file)} style={{ flex: 1, fontSize: 12 }}>
                          {es.saving ? 'Uploading…' : 'Update'}
                        </button>
                        <button className="portal-note-cancel" onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], open: false } }))} style={{ fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { open: true, mode: 'link', value: docUrl, file: null, saving: false, progress: '' } }))}
                      style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                      ✏️ Replace file / link
                    </button>
                  )
                )}
                {docUrl && docUrl.startsWith('text://') ? (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>✏️ Text response</div>
                ) : docUrl && docUrl !== 'pending' && docUrl.startsWith('http') ? (
                  <a href={docUrl} target="_blank" rel="noopener noreferrer" className="portal-doc-link" onClick={() => onDocOpen(doc.id, doc.title)}>View document →</a>
                ) : null}
                {/* Mark as Reviewed — only for admin-delivered docs (not client's own uploads) */}
                {!isClientUpload && docUrl && docUrl.trim() !== '' && docUrl !== 'pending' && (() => {
                  const entry = approvalStates[doc.id];
                  if (entry) {
                    return (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#06D6A0', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Reviewed by <strong>{entry.approvedBy}</strong> on {new Date(entry.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    );
                  }
                  const inputOpen = !!approvalInputOpen[doc.id];
                  const saving = !!approvalSaving[doc.id];
                  if (inputOpen) {
                    return (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          className="client-submit-input"
                          placeholder="Your name"
                          value={approvalNameState[doc.id] ?? clientName}
                          onChange={e => setApprovalNameState(prev => ({ ...prev, [doc.id]: e.target.value }))}
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="portal-note-save"
                            onClick={() => handleApprove(doc)}
                            disabled={saving || !(approvalNameState[doc.id] ?? clientName).trim()}
                            style={{ flex: 1, fontSize: 12 }}
                          >
                            {saving ? 'Saving…' : 'Confirm'}
                          </button>
                          <button
                            className="portal-note-cancel"
                            onClick={() => setApprovalInputOpen(prev => ({ ...prev, [doc.id]: false }))}
                            style={{ fontSize: 12 }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      onClick={() => {
                        setApprovalNameState(prev => ({ ...prev, [doc.id]: prev[doc.id] ?? clientName }));
                        setApprovalInputOpen(prev => ({ ...prev, [doc.id]: true }));
                      }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      Mark as Reviewed
                    </button>
                  );
                })()}
                {docLogs.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <button onClick={() => setShowHistory(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                      style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {historyOpen ? '▲ Hide history' : `▼ History (${docLogs.length})`}
                    </button>
                    {historyOpen && (
                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {docLogs.map(log => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{log.actorType === 'admin' ? '👩‍💼' : '👤'} {ACTION_LABELS[log.action] ?? log.action}</span>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{timeAgoShort(log.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>}

      {/* ── REQUIRED FROM YOU tab ── */}
      {subTab === 'required' && requiredDocs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="portal-docs-grid">
            {requiredDocs.map(doc => {
              const ns = getNote(doc);
              const es = editUrlState[doc.id] ?? { open: false, mode: 'link' as const, value: doc.url ?? '', file: null, saving: false, progress: '' };
              const docUrl = docUrls[doc.id] ?? doc.url ?? '';
              const isSubmitted = docUrl && docUrl !== '' && docUrl !== 'pending';
              const docLogs = logs.filter(l => l.documentId === doc.id).slice(0, 5);
              const historyOpen = !!showHistory[doc.id];
              return (
                <div key={doc.id} className="portal-doc-card" style={{ borderLeft: `3px solid ${isSubmitted ? '#06D6A0' : '#F59E0B'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div className="portal-doc-type-badge" style={{ background: isSubmitted ? 'rgba(6,214,160,0.12)' : 'rgba(245,158,11,0.12)', color: isSubmitted ? '#06D6A0' : '#F59E0B', border: `1px solid ${isSubmitted ? '#06D6A040' : '#F59E0B40'}` }}>
                      {isSubmitted ? '✅ Submitted' : '📎 Pending'}
                    </div>
                  </div>
                  <div className="portal-doc-title">{doc.title}</div>
                  {doc.notes && !ns.editing && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{doc.notes}</div>}

                  {/* Note edit for submitted docs */}
                  {isSubmitted && (
                    ns.editing ? (
                      <div className="portal-doc-note-form">
                        <textarea className="portal-note-textarea" value={ns.value} onChange={e => setNoteState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], value: e.target.value } }))} placeholder="Add a note…" rows={3} />
                        <div className="portal-note-actions">
                          <button className="portal-note-save" onClick={() => saveNote(doc, ns.value)} disabled={ns.saving}>{ns.saving ? 'Saving…' : 'Save'}</button>
                          <button className="portal-note-cancel" onClick={() => cancelEdit(doc)}>Cancel</button>
                        </div>
                      </div>
                    ) : ns.value ? (
                      <div className="portal-doc-note-display">
                        <div className="portal-doc-note-text">{ns.value}</div>
                        <button className="portal-note-edit-btn" onClick={() => startEdit(doc)}>Edit note</button>
                      </div>
                    ) : null
                  )}

                  {/* Submit / replace inline form */}
                  {es.open ? (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {(['link', 'upload'] as const).map(m => (
                          <button key={m} onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], mode: m, value: '', file: null } }))}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: `1.5px solid ${es.mode === m ? '#06D6A0' : 'var(--border)'}`, background: es.mode === m ? 'rgba(6,214,160,0.08)' : 'transparent', color: es.mode === m ? '#06D6A0' : 'var(--text-secondary)', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                            {m === 'link' ? '🔗 Link' : '📎 Upload'}
                          </button>
                        ))}
                      </div>
                      {es.mode === 'link' ? (
                        <input className="client-submit-input" value={es.value} onChange={e => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], value: e.target.value } }))} placeholder="Paste link…" style={{ marginBottom: 8 }} />
                      ) : (
                        <div style={{ marginBottom: 8 }}>
                          <input type="file" onChange={e => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], file: e.target.files?.[0] ?? null } }))}
                            style={{ display: 'block', width: '100%', padding: '8px', borderRadius: 6, border: '1.5px dashed var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)' }} />
                          {es.file && <div style={{ fontSize: 11, color: '#06D6A0', marginTop: 4 }}>✓ {es.file.name}</div>}
                          {es.progress && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{es.progress}</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="portal-note-save" onClick={() => saveEditUrl(doc)} disabled={es.saving || (es.mode === 'link' ? !es.value.trim() : !es.file)} style={{ flex: 1, fontSize: 12 }}>
                          {es.saving ? 'Uploading…' : isSubmitted ? 'Update' : 'Submit'}
                        </button>
                        <button className="portal-note-cancel" onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { ...prev[doc.id], open: false } }))} style={{ fontSize: 12 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {isSubmitted && docUrl.startsWith('http') && (
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="portal-doc-link" style={{ marginBottom: 6, display: 'inline-block' }}>
                          View submitted →
                        </a>
                      )}
                      {isSubmitted && docUrl.startsWith('text://') && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 6 }}>✏️ Text response submitted</div>
                      )}
                      <button onClick={() => setEditUrlState(prev => ({ ...prev, [doc.id]: { open: true, mode: 'link', value: docUrl.startsWith('http') ? docUrl : '', file: null, saving: false, progress: '' } }))}
                        style={{ fontSize: 12, color: isSubmitted ? 'var(--text-muted)' : '#06D6A0', background: isSubmitted ? 'none' : 'rgba(6,214,160,0.08)', border: isSubmitted ? 'none' : '1px solid #06D6A040', borderRadius: 6, cursor: 'pointer', padding: isSubmitted ? '0' : '6px 12px', fontWeight: isSubmitted ? 400 : 600 }}>
                        {isSubmitted ? '✏️ Replace submission' : '+ Submit now'}
                      </button>
                    </div>
                  )}

                  {/* History */}
                  {docLogs.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <button onClick={() => setShowHistory(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                        style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {historyOpen ? '▲ Hide history' : `▼ History (${docLogs.length})`}
                      </button>
                      {historyOpen && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {docLogs.map(log => (
                            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{log.actorType === 'admin' ? '👩‍💼' : '👤'} {ACTION_LABELS[log.action] ?? log.action}</span>
                              <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{timeAgoShort(log.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

// ── Portal Contract View ───────────────────────────────────────────────────

interface ContractData2 {
  meta: { clientName: string; projectName: string; date: string; preparedBy: string };
  sections: Array<{
    id: string; type: string; title: string;
    items?: string[]; rows?: { milestone?: string; duration?: string; label?: string; amount?: string; timing?: string }[];
    body?: string; totalFee?: string; schedule?: { label: string; amount: string; timing: string; paymentLink?: string }[];
    latePenalty?: string; note?: string;
    paymentMethods?: { upiId?: string; paypalLink?: string; bankDetails?: string; qrCodeUrl?: string };
  }>;
}

// Contract always renders as a white paper document regardless of portal theme
const C = {
  text: '#1A202C',
  textMid: '#4A5568',
  textLight: '#718096',
  border: '#E2E8F0',
  bg: '#F7FAFC',
  accent: '#06D6A0',
};

function PortalContractView({ data }: { data: ContractData2 }) {
  const h2Style: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textLight, borderBottom: `1px solid ${C.border}`, paddingBottom: 6, marginBottom: 12, marginTop: 24, fontFamily: 'Georgia, serif' };
  return (
    <div style={{ fontFamily: 'Georgia, serif', color: C.text }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${C.accent}`, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 64 72" fill="none" width="28" height="32" style={{ color: C.accent, flexShrink: 0 }}>
            <rect width="11" height="72" fill="currentColor"/>
            <rect width="42" height="11" fill="currentColor"/>
            <path d="M42 0Q64 0 64 16Q64 32 42 32" stroke="currentColor" strokeWidth="11" fill="none"/>
            <rect y="27" width="38" height="11" fill="currentColor"/>
            <path d="M36 38L64 72" stroke="currentColor" strokeWidth="11" strokeLinecap="square"/>
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>Rachna Builds</div>
            <div style={{ fontSize: 11, color: C.textLight, fontFamily: 'Inter, sans-serif' }}>rachnabuilds.com</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.textLight, textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontWeight: 600, color: C.textMid }}>Service Agreement</div>
          <div>{data.meta.date}</div>
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 20, marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 14 }}>{data.meta.projectName}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 24px', fontSize: 13, color: C.textMid, textAlign: 'left', maxWidth: 440, margin: '0 auto' }}>
          <div><span style={{ fontSize: 10, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</span><br /><strong style={{ color: C.text }}>{data.meta.clientName}</strong></div>
          <div><span style={{ fontSize: 10, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span><br /><strong style={{ color: C.text }}>{data.meta.date}</strong></div>
          <div style={{ gridColumn: '1/-1' }}><span style={{ fontSize: 10, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prepared by</span><br /><strong style={{ color: C.text }}>{data.meta.preparedBy}</strong></div>
        </div>
      </div>

      {data.sections.map((s, i) => (
        <div key={s.id}>
          <div style={h2Style}>{i + 1}. {s.title}</div>
          {s.type === 'bullets' && s.items && (
            <ul style={{ paddingLeft: 18, color: C.textMid, fontSize: 14, lineHeight: 1.8 }}>
              {s.items.filter(Boolean).map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          )}
          {s.type === 'timeline' && s.rows && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Milestone', 'Duration'].map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: C.textLight, border: `1px solid ${C.border}`, background: C.bg }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((row, j) => (
                    <tr key={j}>
                      <td style={{ padding: '7px 10px', color: C.text, border: `1px solid ${C.border}`, fontSize: 13 }}>{row.milestone}</td>
                      <td style={{ padding: '7px 10px', color: C.textMid, border: `1px solid ${C.border}`, fontSize: 13 }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.note && <p style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: 'italic' }}>{s.note}</p>}
            </>
          )}
          {s.type === 'payment' && (
            <>
              {s.totalFee && (
                <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.textLight }}>Total Fee</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>{s.totalFee}</div>
                </div>
              )}
              {s.schedule && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Payment', 'Amount', 'Due'].map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: C.textLight, border: `1px solid ${C.border}`, background: C.bg }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {s.schedule.map((row, j) => (
                      <tr key={j}>
                        <td style={{ padding: '7px 10px', color: C.text, border: `1px solid ${C.border}` }}>{row.label}</td>
                        <td style={{ padding: '7px 10px', color: C.text, border: `1px solid ${C.border}`, fontWeight: 700 }}>{row.amount}</td>
                        <td style={{ padding: '7px 10px', color: C.textMid, border: `1px solid ${C.border}` }}>{row.timing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {s.latePenalty && <p style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: 'italic' }}>Late payment: {s.latePenalty}</p>}
              {s.paymentMethods && (s.paymentMethods.upiId || s.paymentMethods.paypalLink || s.paymentMethods.bankDetails || s.paymentMethods.qrCodeUrl) && (
                <div style={{ marginTop: 14, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textLight, fontWeight: 700, marginBottom: 10 }}>How to Pay</div>
                  {s.paymentMethods.upiId && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPI ID</span>
                      <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: C.text, marginTop: 2 }}>{s.paymentMethods.upiId}</div>
                    </div>
                  )}
                  {s.paymentMethods.paypalLink && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PayPal</span>
                      <div style={{ marginTop: 2 }}><a href={s.paymentMethods.paypalLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.accent, wordBreak: 'break-all' }}>{s.paymentMethods.paypalLink}</a></div>
                    </div>
                  )}
                  {s.paymentMethods.bankDetails && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Transfer</span>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.textMid, marginTop: 2, whiteSpace: 'pre-line' }}>{s.paymentMethods.bankDetails}</div>
                    </div>
                  )}
                  {s.paymentMethods.qrCodeUrl && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scan to Pay</span>
                      <div style={{ marginTop: 6 }}><img src={s.paymentMethods.qrCodeUrl} alt="Payment QR" style={{ width: 120, height: 120, borderRadius: 8, border: `1px solid ${C.border}` }} /></div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {s.type === 'text' && s.body && (
            <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.7 }}>{s.body}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main ProjectPortalView ─────────────────────────────────────────────────

export default function ProjectPortalView({ clientSlug, clientName, project, hasMultipleProjects, visibleTabs, initialContracts }: ProjectPortalViewProps) {
  const router = useRouter();
  const tabs = (() => {
    const filtered = visibleTabs ? TABS.filter(t => visibleTabs.includes(t.id)) : [...TABS];
    // For audit/optimisation projects, put Insights before Submissions
    if (['audit_only', 'existing_optimisation'].includes(project.clientType)) {
      const subIdx = filtered.findIndex(t => t.id === 'submissions');
      const auditIdx = filtered.findIndex(t => t.id === 'audit');
      if (subIdx !== -1 && auditIdx !== -1 && auditIdx > subIdx) {
        [filtered[subIdx], filtered[auditIdx]] = [filtered[auditIdx], filtered[subIdx]];
      }
    }
    return [...filtered, { id: 'messages', label: 'Messages' }];
  })();
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'submissions');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  type ContractData = PortalContractData;
  const [contracts, setContracts] = useState<ContractData[] | undefined>(initialContracts ?? undefined);
  const [activeContractPhase, setActiveContractPhase] = useState(1);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractSigning, setContractSigning] = useState(false);
  const [signatureName, setSignatureName] = useState(clientName);
  const [signConfirmed, setSignConfirmed] = useState(false);
  const [signError, setSignError] = useState('');

  // Payments tab
  const [receiptUploading, setReceiptUploading] = useState<string | null>(null); // `${phase}-advance` or `${phase}-balance`
  const [receiptError, setReceiptError] = useState('');
  const paymentReceiptInputRef = useRef<HTMLInputElement>(null);
  const [pendingReceiptKey, setPendingReceiptKey] = useState<{ phase: number; type: 'advance' | 'balance' } | null>(null);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  // Messages
  const [portalMessages, setPortalMessages] = useState<MessageData[]>([]);
  const [portalMsgLoaded, setPortalMsgLoaded] = useState(false);
  const [portalNewMsg, setPortalNewMsg] = useState('');
  const [portalMsgSending, setPortalMsgSending] = useState(false);
  const [portalMsgAttachFile, setPortalMsgAttachFile] = useState<File | null>(null);
  const [portalMsgAttachError, setPortalMsgAttachError] = useState('');
  const msgBottomRef = useRef<HTMLDivElement>(null);
  const portalMsgFileInputRef = useRef<HTMLInputElement>(null);

  // Proposal acceptance
  const [proposalAccepting, setProposalAccepting] = useState(false);
  const [proposalAcceptName, setProposalAcceptName] = useState('');
  const [proposalAcceptError, setProposalAcceptError] = useState('');
  const [proposalAccepted, setProposalAccepted] = useState(
    !!(project.adminProfile?.proposalAcceptedAt)
  );
  const [proposalAcceptedBy, setProposalAcceptedBy] = useState(
    (project.adminProfile?.proposalAcceptedBy as string) ?? ''
  );
  const [proposalAcceptedAt, setProposalAcceptedAt] = useState(
    (project.adminProfile?.proposalAcceptedAt as string) ?? ''
  );

  // Password change modal
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!pwCurrent.trim() || !pwNew.trim()) { setPwError('Please fill in all fields'); return; }
    if (pwNew.trim().length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwNew !== pwConfirm) { setPwError('New passwords do not match'); return; }
    setPwError(''); setPwSaving(true);
    try {
      const res = await fetch(`/api/portal/${clientSlug}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent.trim(), newPassword: pwNew.trim() }),
      });
      if (res.ok) {
        setPwSuccess(true);
        setTimeout(() => { setPwModalOpen(false); setPwSuccess(false); setPwCurrent(''); setPwNew(''); setPwConfirm(''); }, 2000);
      } else {
        const d = await res.json();
        setPwError(d.error ?? 'Failed to change password');
      }
    } catch { setPwError('Something went wrong'); }
    finally { setPwSaving(false); }
  };

  const sessionIdRef    = useRef<string>('');
  const tabStartTimeRef = useRef<number>(Date.now());
  const visStartRef     = useRef<number>(Date.now());
  const activeTimeRef   = useRef<number>(0);
  const maxScrollRef    = useRef<number>(0);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const pt = localStorage.getItem('portal_theme');
    if (pt === 'dark' || pt === 'light') return pt;
    const h = new Date().getHours();
    return h >= 6 && h < 20 ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('portal_theme', next);
  };

  const handleLogout = () => {
    window.location.href = `/api/portal/${clientSlug}/logout`;
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

    const fireBeacon = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      activeTimeRef.current += (Date.now() - visStartRef.current) / 1000;
      visStartRef.current = Date.now(); // reset so double-fires don't double-add
      navigator.sendBeacon(
        `/api/portal/${clientSlug}/${project.id}/session`,
        new Blob(
          [JSON.stringify({ sessionId: sid, duration: Math.round(activeTimeRef.current) })],
          { type: 'application/json' }
        )
      );
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        fireBeacon(); // use beacon (not fetch) so it survives mobile backgrounding
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

    // beforeunload for desktop, pagehide for iOS Safari (beforeunload doesn't fire on mobile)
    window.addEventListener('beforeunload', fireBeacon);
    window.addEventListener('pagehide', fireBeacon);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', fireBeacon);
      window.removeEventListener('pagehide', fireBeacon);
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

  // Load contract when tab becomes active
  useEffect(() => {
    if ((activeTab !== 'contract' && activeTab !== 'payments') || contracts !== undefined) return;
    setContractLoading(true);
    fetch(`/api/portal/${clientSlug}/${project.id}/contract`)
      .then(r => r.json())
      .then(d => {
        const list = d.contracts ?? [];
        setContracts(list);
        if (list.length > 0) setActiveContractPhase(list[0].phase);
      })
      .catch(() => setContracts([]))
      .finally(() => setContractLoading(false));
  }, [activeTab, clientSlug, project.id, contracts]);

  // Load milestones + contract payment data when status tab is active
  useEffect(() => {
    if (activeTab !== 'status') return;
    setMilestonesLoading(true);
    fetch(`/api/portal/${clientSlug}/${project.id}/milestones`)
      .then(r => r.ok ? r.json() : { milestones: [] })
      .then(d => setMilestones(d.milestones ?? []))
      .catch(() => setMilestones([]))
      .finally(() => setMilestonesLoading(false));
    // Also load contract if not yet loaded (to show payment card)
    if (contracts === undefined) {
      fetch(`/api/portal/${clientSlug}/${project.id}/contract`)
        .then(r => r.json())
        .then(d => {
          const list = d.contracts ?? [];
          setContracts(list);
          if (list.length > 0) setActiveContractPhase(list[0].phase);
        })
        .catch(() => setContracts([]));
    }
  }, [activeTab, clientSlug, project.id]);

  // Load and poll messages when on messages tab
  useEffect(() => {
    if (activeTab !== 'messages') return;

    const load = () => {
      fetch(`/api/portal/${clientSlug}/${project.id}/messages`)
        .then(r => r.ok ? r.json() : [])
        .then((data: MessageData[]) => {
          setPortalMessages(data);
          setPortalMsgLoaded(true);
        })
        .catch(() => setPortalMsgLoaded(true));
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, clientSlug, project.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (activeTab === 'messages' && msgBottomRef.current) {
      msgBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [portalMessages, activeTab]);


  const handleSign = async () => {
    if (!signatureName.trim()) { setSignError('Please enter your full name'); return; }
    setSignError('');
    setContractSigning(true);
    try {
      const res = await fetch(`/api/portal/${clientSlug}/${project.id}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signatureName.trim(), phase: activeContractPhase }),
      });
      if (res.ok) {
        const d = await res.json();
        setContracts(prev => prev ? prev.map(c => c.phase === d.contract.phase ? d.contract : c) : [d.contract]);
        track('contract_signed', { projectId: project.id, phase: activeContractPhase });
      } else {
        const data = await res.json();
        if (res.status === 400 && data.error?.includes('not available for signing')) {
          alert('This contract has already been signed or is not available for signing.');
          return;
        }
        setSignError('Failed to sign. Please try again.');
      }
    } catch {
      setSignError('Something went wrong. Please try again.');
    }
    setContractSigning(false);
  };

  const renderContractBody = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data.version === '2' && data.sections) {
        return <PortalContractView data={data} />;
      }
    } catch {}
    // Fallback: render as pre-wrap text
    return (
      <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: 1.8, color: 'var(--text)' }}>
        {content}
      </div>
    );
  };

  const track = useCallback(async (eventType: string, meta?: Record<string, unknown>) => {
    fetch(`/api/portal/${clientSlug}/${project.id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, meta, sessionId: sessionIdRef.current }),
    }).catch(() => {});
  }, [clientSlug, project.id]);

  const handleProposalAccept = async () => {
    if (!proposalAcceptName.trim()) { setProposalAcceptError('Please enter your full name'); return; }
    setProposalAcceptError('');
    setProposalAccepting(true);
    try {
      const res = await fetch(`/api/portal/${clientSlug}/${project.id}/proposal-accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: proposalAcceptName.trim() }),
      });
      if (res.ok) {
        setProposalAccepted(true);
        setProposalAcceptedBy(proposalAcceptName.trim());
        setProposalAcceptedAt(new Date().toISOString());
        track('proposal_accepted', { projectId: project.id });
      } else {
        const d = await res.json();
        setProposalAcceptError(d.error ?? 'Failed to accept');
      }
    } catch {
      setProposalAcceptError('Something went wrong');
    }
    setProposalAccepting(false);
  };

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

  // Derived: currently selected phase contract (undefined = not yet loaded, null = no matching phase)
  const contract = contracts === undefined
    ? undefined
    : (contracts.find(c => c.phase === activeContractPhase) ?? null);

  return (
    <div className="portal-root" data-theme={theme} suppressHydrationWarning>

      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            {hasMultipleProjects && (
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
            )}
            <div className="portal-logo-mark"><LogoSVG /></div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb"> Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{clientName}</span>
            <span className="portal-badge">{project.name}</span>
            {/* Contact Rachna shortcut */}
            {(() => {
              const wa = project.adminProfile?.whatsapp as string | undefined;
              const ph = project.adminProfile?.phone as string | undefined;
              if (!wa && !ph) return null;
              return (
                <a
                  href={wa ? `https://wa.me/${wa.replace(/\D/g, '')}` : `tel:${ph}`}
                  target={wa ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  title="Contact Rachna"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>
                  </svg>
                  Contact Rachna
                </a>
              );
            })()}
            {/* Change password */}
            <button
              className="portal-theme-btn"
              onClick={() => setPwModalOpen(true)}
              title="Change password"
              aria-label="Change password"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
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
          {tabs.map(tab => (
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

      {/* Contract status banner — always visible */}
      {contracts && contracts.length > 0 && (() => {
        const signed = contracts.filter(c => c.status === 'signed');
        const pending = contracts.filter(c => c.status === 'sent');
        if (signed.length === 0 && pending.length === 0) return null;
        return (
          <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '10px 24px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {signed.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.25)', fontSize: 12, fontWeight: 600, color: '#06D6A0' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Contract Signed{c.phaseLabel ? ` — ${c.phaseLabel}` : c.phase > 1 ? ` (Phase ${c.phase})` : ''}
                  {c.signedAt && <span style={{ fontWeight: 400, opacity: 0.8 }}>· {new Date(c.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
              ))}
              {pending.map(c => (
                <button key={c.id} onClick={() => handleTabChange('contract')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  Action needed — sign contract{c.phaseLabel ? ` (${c.phaseLabel})` : ''} →
                </button>
              ))}
            </div>
          </div>
        );
      })()}

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
              clientName={clientName}
              onDocOpen={handleDocOpen}
            />
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <h1 className="portal-tab-heading">Insights</h1>
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
            <h1 className="portal-tab-heading">References</h1>
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
              ? (
                <>
                  <ProposalView sections={proposalSections} />
                  <div className="portal-proposal-accept-block" style={{ background: 'var(--bg-card)', border: `1px solid ${proposalAccepted ? '#06D6A0' : 'var(--border)'}`, borderRadius: 14, padding: isMobile ? '16px 18px' : '24px 28px', marginTop: 20 }}>
                    {proposalAccepted ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#06D6A0', marginBottom: 6 }}>✓ Proposal Accepted</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          Accepted by <strong>{proposalAcceptedBy}</strong> on {new Date(proposalAcceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Accept this Proposal</div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                          By entering your name below, you confirm you have reviewed and accept this proposal. This does not replace the service contract.
                        </p>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={proposalAcceptName}
                          onChange={e => setProposalAcceptName(e.target.value)}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14, marginBottom: 10 }}
                        />
                        {proposalAcceptError && <p style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 10 }}>{proposalAcceptError}</p>}
                        <button
                          onClick={handleProposalAccept}
                          disabled={proposalAccepting || !proposalAcceptName.trim()}
                          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: proposalAccepting || !proposalAcceptName.trim() ? 0.6 : 1 }}
                        >
                          {proposalAccepting ? 'Saving…' : '✓ I Accept This Proposal'}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )
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

            {milestonesLoading ? (
              <div className="portal-empty"><div className="portal-empty-icon">⏳</div><p>Loading…</p></div>
            ) : milestones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', marginBottom: 32 }}>
                {milestones.map((m, idx) => {
                  const statusColor = { pending: '#94A3B8', in_progress: '#F59E0B', completed: '#06D6A0', blocked: '#FF6B6B' }[m.status] ?? '#94A3B8';
                  const statusLabel = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', blocked: 'Blocked' }[m.status] ?? m.status;
                  const statusIcon = { pending: '⏳', in_progress: '🔄', completed: '✅', blocked: '🚫' }[m.status] ?? '•';
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 16, paddingBottom: 24, position: 'relative' }}>
                      {idx < milestones.length - 1 && (
                        <div style={{ position: 'absolute', left: 11, top: 28, bottom: 0, width: 2, background: 'var(--border)' }} />
                      )}
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: statusColor, flexShrink: 0, marginTop: 4, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10 }}>{statusIcon}</span>
                      </div>
                      <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: m.description ? 6 : 0 }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{m.description}</div>}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, padding: '2px 8px', borderRadius: 100, background: `${statusColor}18`, border: `1px solid ${statusColor}44` }}>{statusLabel}</span>
                          {m.dueDate && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 {new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : statusSections.length > 0 ? (
              <SectionsPanel sections={project.sections} types={STATUS_TYPES} clientSlug={clientSlug} projectId={project.id} clientName={clientName} />
            ) : (
              <ComingSoonPanel
                icon="🚀"
                headline="Project not started yet"
                sub="Once the proposal is confirmed and the project kicks off, you'll see live progress updates, milestones, and deliverable status here."
              />
            )}

            {contracts && contracts.length > 0 && (
              <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>💳</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>View your payment schedule and upload receipts in the <button onClick={() => handleTabChange('payments')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>Payments</button> tab.</span>
              </div>
            )}
          </>
        )}

        {activeTab === 'review' && (
          <>
            <h1 className="portal-tab-heading">Review &amp; Feedback</h1>
            <p className="portal-tab-sub">Review each deliverable, test the preview, and drag cards to approve or flag changes.</p>
            <PortalKanbanBoard projectId={project.id} clientSlug={clientSlug} />
          </>
        )}


        {activeTab === 'contract' && (
          <>
            <h1 className="portal-tab-heading">Contract</h1>
            <p className="portal-tab-sub">Your service agreement with Rachna Builds.</p>

            {contractLoading || contracts === undefined ? (
              <div className="portal-empty">
                <div className="portal-empty-icon">⏳</div>
                <p>Loading contract…</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="portal-empty">
                <div className="portal-empty-icon">📋</div>
                <p>Your contract hasn&apos;t been prepared yet. Rachna will share it here once it&apos;s ready.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Phase tabs — only show if more than one phase */}
                {contracts.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {contracts.map(c => (
                      <button
                        key={c.phase}
                        onClick={() => setActiveContractPhase(c.phase)}
                        style={{
                          padding: '6px 16px',
                          borderRadius: 8,
                          border: activeContractPhase === c.phase ? '1.5px solid #06D6A0' : '1px solid var(--border)',
                          background: activeContractPhase === c.phase ? 'rgba(6,214,160,0.08)' : 'var(--bg-elevated)',
                          color: activeContractPhase === c.phase ? '#06D6A0' : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        Phase {c.phase}{c.phaseLabel ? ` — ${c.phaseLabel}` : ''}
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 100,
                          background: c.status === 'signed' ? 'rgba(6,214,160,0.15)' : 'rgba(245,158,11,0.15)',
                          color: c.status === 'signed' ? '#06D6A0' : '#F59E0B',
                        }}>
                          {c.status === 'signed' ? '✓ Signed' : '⏳ Awaiting'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Active contract */}
                {(() => {
                  const contract = contracts.find(c => c.phase === activeContractPhase) ?? contracts[0];
                  if (!contract) return null;
                  return (
                    <>
                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: contract.status === 'signed' ? 'rgba(6,214,160,0.12)' : 'rgba(251,191,36,0.12)', color: contract.status === 'signed' ? '#06D6A0' : '#F59E0B', border: `1px solid ${contract.status === 'signed' ? '#06D6A0' : '#F59E0B'}` }}>
                          {contract.status === 'signed' ? '✓ Signed' : '⏳ Awaiting Your Signature'}
                        </div>
                        {contract.status === 'signed' && contract.signedAt && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Signed on {new Date(contract.signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        )}
                      </div>

                      {/* Print button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="no-print">
                        <button
                          onClick={() => window.print()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          🖨️ Print / Save PDF
                        </button>
                      </div>

                      {/* Contract body */}
                      <div id="contract-print-area" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: isMobile ? '16px' : '28px 32px', maxWidth: '100%', overflowX: 'hidden' }}>
                        {renderContractBody(contract.content)}
                        {/* Signature block — always shown, included in print */}
                        <div className="portal-contract-sig-grid" style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 20 : 32 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Client Signature</div>
                            {contract.status === 'signed' && contract.clientSignature ? (
                              <>
                                <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: C.text, marginBottom: 4 }}>{contract.clientSignature}</div>
                                <div style={{ fontSize: 11, color: C.textLight }}>Signed {new Date(contract.signedAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                              </>
                            ) : (
                              <div style={{ borderBottom: `1px solid ${C.border}`, height: 32, marginBottom: 6 }} />
                            )}
                            <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{contract.clientSignature ? '' : 'Client'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Service Provider</div>
                            <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: C.text, marginBottom: 4 }}>Rachna Jain</div>
                            <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>Rachna Jain</div>
                          </div>
                        </div>
                      </div>

                      {/* Sign block OR signed confirmation */}
                      {contract.status === 'signed' ? (
                        <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid #06D6A0', borderRadius: 14, padding: '20px 24px' }}>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Digital Signature</div>
                          <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>{contract.clientSignature}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Signed on {new Date(contract.signedAt!).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Sign this contract</div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
                            By typing your full name below, you confirm you have read and agree to the terms of this service agreement.
                          </p>
                          <input
                            type="text"
                            placeholder="Your full legal name"
                            value={signatureName}
                            onChange={e => setSignatureName(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14, marginBottom: 12, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={signConfirmed}
                              onChange={e => setSignConfirmed(e.target.checked)}
                              style={{ marginTop: 2, flexShrink: 0, accentColor: '#06D6A0', width: 16, height: 16 }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              I confirm that I am <strong>{clientName}</strong> and I have read and agree to the terms of this service agreement.
                            </span>
                          </label>
                          {signError && <p style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>{signError}</p>}
                          <button
                            onClick={handleSign}
                            disabled={contractSigning || !signatureName.trim() || !signConfirmed}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 14, cursor: (contractSigning || !signConfirmed) ? 'not-allowed' : 'pointer', opacity: (contractSigning || !signatureName.trim() || !signConfirmed) ? 0.6 : 1 }}
                          >
                            {contractSigning ? 'Signing…' : '✍ I Agree & Sign'}
                          </button>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                            This digital signature is legally binding under the Information Technology Act, 2000.
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}


        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'payments' && (
          <>
            <h1 className="portal-tab-heading">Payments</h1>
            <p className="portal-tab-sub">Your payment schedule, status, and receipt uploads.</p>

            {/* Hidden file input for receipts */}
            <input
              ref={paymentReceiptInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file || !pendingReceiptKey) return;
                const { phase, type } = pendingReceiptKey;
                const key = `${phase}-${type}`;
                setReceiptUploading(key);
                setReceiptError('');
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: fd });
                  if (!upRes.ok) throw new Error('Upload failed');
                  const { url } = await upRes.json() as { url: string };
                  const field = type === 'advance' ? 'advanceReceiptUrl' : 'balanceReceiptUrl';
                  const patchRes = await fetch(`/api/portal/${clientSlug}/${project.id}/contract?phase=${phase}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: url }),
                  });
                  if (!patchRes.ok) throw new Error('Failed to save receipt');
                  const { contract: updated } = await patchRes.json() as { contract: ContractData };
                  setContracts(prev => prev?.map(c => c.phase === phase ? { ...c, [field]: url } : c) ?? prev);
                  // clear contract so it reloads with fresh data
                  void updated;
                } catch {
                  setReceiptError('Upload failed. Please try again.');
                } finally {
                  setReceiptUploading(null);
                  setPendingReceiptKey(null);
                  if (paymentReceiptInputRef.current) paymentReceiptInputRef.current.value = '';
                }
              }}
            />

            {contractLoading || contracts === undefined ? (
              <div className="portal-empty"><div className="portal-empty-icon">⏳</div><p>Loading…</p></div>
            ) : contracts.length === 0 ? (
              <div className="portal-empty">
                <div className="portal-empty-icon">💳</div>
                <p>Payment details will appear here once your contract is ready.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {receiptError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, fontSize: 13, color: '#FF6B6B' }}>
                    {receiptError}
                  </div>
                )}
                {contracts.map(c => {
                  let ps: { totalFee?: string; schedule?: { label: string; amount: string; timing: string; paymentLink?: string }[]; latePenalty?: string; paymentMethods?: { upiId?: string; paypalLink?: string; bankDetails?: string; qrCodeUrl?: string } } | null = null;
                  try {
                    const parsed = JSON.parse(c.content);
                    ps = (parsed.sections ?? []).find((s: { type: string }) => s.type === 'payment') ?? null;
                  } catch { /* ignore */ }
                  const rows = (ps?.schedule ?? []).filter(r => r.label);

                  return (
                    <div key={c.phase} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                      {/* Phase header */}
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                          Phase {c.phase}{c.phaseLabel ? ` — ${c.phaseLabel}` : ''}
                        </div>
                        {ps?.totalFee && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Total: {ps.totalFee}</div>
                        )}
                      </div>

                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Payment rows */}
                        {rows.map((r, idx) => {
                          const isAdvance = idx === 0;
                          const type = isAdvance ? 'advance' : 'balance';
                          const isPaid = type === 'advance' ? !!c.advancePaid : !!c.balancePaid;
                          const receiptUrl = type === 'advance' ? c.advanceReceiptUrl : c.balanceReceiptUrl;
                          const uploadKey = `${c.phase}-${type}`;
                          const isUploading = receiptUploading === uploadKey;

                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10, border: `1px solid ${isPaid ? 'rgba(6,214,160,0.25)' : 'var(--border)'}` }}>
                              {/* Status dot */}
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isPaid ? '#06D6A0' : '#94A3B8', flexShrink: 0, marginTop: 4 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.label}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.timing}</div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    {r.amount && <div style={{ fontSize: 16, fontWeight: 800, color: isPaid ? '#06D6A0' : 'var(--text)' }}>{r.amount}</div>}
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: isPaid ? 'rgba(6,214,160,0.12)' : 'rgba(148,163,184,0.12)', color: isPaid ? '#06D6A0' : '#94A3B8', border: `1px solid ${isPaid ? 'rgba(6,214,160,0.3)' : 'rgba(148,163,184,0.3)'}` }}>
                                      {isPaid ? '✓ Paid' : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                                {/* Pay Now + Receipt area */}
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  {r.paymentLink && !isPaid && (
                                    <a href={r.paymentLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#0B0F1A', background: 'var(--accent)', textDecoration: 'none', padding: '5px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                                      Pay Now →
                                    </a>
                                  )}
                                  {receiptUrl ? (
                                    <>
                                      <a href={receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(6,214,160,0.3)', background: 'rgba(6,214,160,0.05)' }}>
                                        📎 View Receipt
                                      </a>
                                      <button
                                        onClick={() => { setPendingReceiptKey({ phase: c.phase, type }); paymentReceiptInputRef.current?.click(); }}
                                        style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                      >
                                        Replace
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => { setPendingReceiptKey({ phase: c.phase, type }); paymentReceiptInputRef.current?.click(); }}
                                      disabled={isUploading}
                                      style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'var(--bg-elevated)', cursor: isUploading ? 'wait' : 'pointer' }}
                                    >
                                      {isUploading ? '⏳ Uploading…' : '📤 Upload Receipt'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {rows.length === 0 && (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Payment details not available yet.</p>
                        )}

                        {ps?.latePenalty && (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>
                            Late payment: {ps.latePenalty}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'messages' && (
          <>
            <h1 className="portal-tab-heading">Messages</h1>
            <p className="portal-tab-sub">Direct messages between you and Rachna.</p>

            {/* Chat thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, minHeight: 120 }}>
              {!portalMsgLoaded && (
                <div className="portal-empty"><div className="portal-empty-icon">⏳</div><p>Loading…</p></div>
              )}
              {portalMsgLoaded && portalMessages.length === 0 && (
                <div className="portal-empty"><div className="portal-empty-icon">💬</div><p>No messages yet. Start the conversation below!</p></div>
              )}
              {portalMessages.map(m => {
                const isClient = m.senderType === 'client';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '72%' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textAlign: isClient ? 'right' : 'left' }}>
                        {isClient ? clientName : 'Rachna'} &middot; {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{
                        background: isClient ? '#06D6A0' : 'var(--bg-card)',
                        color: isClient ? '#0B0F1A' : 'var(--text)',
                        borderRadius: isClient ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 14px',
                        fontSize: 14,
                        lineHeight: 1.5,
                        border: isClient ? 'none' : '1px solid var(--border)',
                        wordBreak: 'break-word',
                      }}>
                        {m.text}
                        {m.attachmentUrl && (
                          <a
                            href={m.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              marginTop: m.text ? 8 : 0,
                              padding: '4px 10px',
                              borderRadius: 20,
                              background: isClient ? 'rgba(0,0,0,0.15)' : 'rgba(6,214,160,0.12)',
                              color: isClient ? '#0B0F1A' : '#06D6A0',
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                              border: isClient ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(6,214,160,0.3)',
                            }}
                          >
                            📎 {m.attachmentName || 'Attachment'}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgBottomRef} />
            </div>

            {/* Input */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Attachment preview */}
              {portalMsgAttachFile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: 20, alignSelf: 'flex-start', fontSize: 12 }}>
                  <span style={{ color: '#06D6A0', fontWeight: 600 }}>📎 {portalMsgAttachFile.name}</span>
                  <button
                    onClick={() => { setPortalMsgAttachFile(null); setPortalMsgAttachError(''); if (portalMsgFileInputRef.current) portalMsgFileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}
                    title="Remove attachment"
                  >✕</button>
                </div>
              )}
              {portalMsgAttachError && (
                <div style={{ fontSize: 12, color: '#FF6B6B' }}>{portalMsgAttachError}</div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  rows={2}
                  placeholder="Type a message…"
                  value={portalNewMsg}
                  onChange={e => setPortalNewMsg(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((!portalNewMsg.trim() && !portalMsgAttachFile) || portalMsgSending) return;
                      setPortalMsgSending(true);
                      setPortalMsgAttachError('');
                      let attachmentUrl: string | undefined;
                      let attachmentName: string | undefined;
                      if (portalMsgAttachFile) {
                        const fd = new FormData();
                        fd.append('file', portalMsgAttachFile);
                        const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: fd });
                        if (!upRes.ok) {
                          setPortalMsgAttachError('Upload failed. Please try again.');
                          setPortalMsgSending(false);
                          return;
                        }
                        const upData = await upRes.json() as { url: string };
                        attachmentUrl = upData.url;
                        attachmentName = portalMsgAttachFile.name;
                      }
                      const res = await fetch(`/api/portal/${clientSlug}/${project.id}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: portalNewMsg.trim(), ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}) }),
                      });
                      if (res.ok) {
                        const msg = await res.json() as MessageData;
                        setPortalMessages(prev => [...prev, msg]);
                        setPortalNewMsg('');
                        setPortalMsgAttachFile(null);
                        if (portalMsgFileInputRef.current) portalMsgFileInputRef.current.value = '';
                      }
                      setPortalMsgSending(false);
                    }
                  }}
                  style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}
                />
                {/* Hidden file input */}
                <input
                  ref={portalMsgFileInputRef}
                  type="file"
                  accept="*/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setPortalMsgAttachFile(file);
                    setPortalMsgAttachError('');
                  }}
                />
                {/* Paperclip button */}
                <button
                  onClick={() => portalMsgFileInputRef.current?.click()}
                  title="Attach file"
                  style={{
                    padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-secondary)', fontSize: 16,
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  📎
                </button>
                <button
                  disabled={portalMsgSending || (!portalNewMsg.trim() && !portalMsgAttachFile)}
                  onClick={async () => {
                    if ((!portalNewMsg.trim() && !portalMsgAttachFile) || portalMsgSending) return;
                    setPortalMsgSending(true);
                    setPortalMsgAttachError('');
                    let attachmentUrl: string | undefined;
                    let attachmentName: string | undefined;
                    if (portalMsgAttachFile) {
                      const fd = new FormData();
                      fd.append('file', portalMsgAttachFile);
                      const upRes = await fetch(`/api/portal/upload?slug=${clientSlug}`, { method: 'POST', body: fd });
                      if (!upRes.ok) {
                        setPortalMsgAttachError('Upload failed. Please try again.');
                        setPortalMsgSending(false);
                        return;
                      }
                      const upData = await upRes.json() as { url: string };
                      attachmentUrl = upData.url;
                      attachmentName = portalMsgAttachFile.name;
                    }
                    const res = await fetch(`/api/portal/${clientSlug}/${project.id}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: portalNewMsg.trim(), ...(attachmentUrl ? { attachmentUrl, attachmentName } : {}) }),
                    });
                    if (res.ok) {
                      const msg = await res.json() as MessageData;
                      setPortalMessages(prev => [...prev, msg]);
                      setPortalNewMsg('');
                      setPortalMsgAttachFile(null);
                      if (portalMsgFileInputRef.current) portalMsgFileInputRef.current.value = '';
                    }
                    setPortalMsgSending(false);
                  }}
                  style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 13,
                    cursor: (portalMsgSending || (!portalNewMsg.trim() && !portalMsgAttachFile)) ? 'not-allowed' : 'pointer',
                    opacity: (portalMsgSending || (!portalNewMsg.trim() && !portalMsgAttachFile)) ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {portalMsgSending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}

      </main>

      {/* Password change modal */}
      {pwModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) { setPwModalOpen(false); setPwError(''); } }}
        >
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Change Password</div>
              <button onClick={() => { setPwModalOpen(false); setPwError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>
            {pwSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#06D6A0' }}>Password changed successfully</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Current Password</label>
                    <input
                      type="password"
                      value={pwCurrent}
                      onChange={e => setPwCurrent(e.target.value)}
                      placeholder="Enter current password"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>New Password</label>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={e => setPwNew(e.target.value)}
                      placeholder="At least 6 characters"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Confirm New Password</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14 }}
                      onKeyDown={e => { if (e.key === 'Enter') handlePasswordChange(); }}
                    />
                  </div>
                </div>
                {pwError && <p style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>{pwError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setPwModalOpen(false); setPwError(''); }}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={pwSaving || !pwCurrent.trim() || !pwNew.trim() || !pwConfirm.trim()}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#06D6A0', color: '#0B0F1A', fontWeight: 700, fontSize: 13, cursor: pwSaving ? 'wait' : 'pointer', opacity: pwSaving ? 0.7 : 1 }}
                  >
                    {pwSaving ? 'Saving…' : 'Update Password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <div className="portal-footer-credit">
            Prepared by <strong>Rachna Builds</strong> &middot;{' '}
            <a href="mailto:rachnajain2103@gmail.com">rachnajain2103@gmail.com</a> &middot;{' '}
            <a href="https://rachnabuilds.com" target="_blank" rel="noopener noreferrer">rachnabuilds.com</a>
            {project.updatedAt && (
              <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 11 }}>
                &middot; Last updated {new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
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
