'use client';

import { useState, useCallback } from 'react';
import './portal.css';

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

export interface ReportWithSectionsAndDocs {
  id: string;
  slug: string;
  clientName: string;
  clientEmail: string | null;
  isActive: boolean;
  viewCount: number;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sections: ReportSection[];
  documents: ClientDocument[];
}

// ── Severity finding cards ─────────────────────────────────────────────────

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

function FindingCards({ items }: { items: string[] }) {
  return (
    <div className="portal-findings">
      {items.map((item, i) => {
        const f = parseFinding(item);
        if (!f) return <div key={i} className="portal-finding-card sev-neutral"><div className="portal-finding-title">{item}</div></div>;
        return (
          <div key={i} className={`portal-finding-card ${f.sev.cls}`}>
            <span className={`portal-sev-badge ${f.sev.cls}`}>{f.sev.label}</span>
            <div className="portal-finding-title">{f.title}</div>
            {f.detail && <div className="portal-finding-detail">{f.detail}</div>}
          </div>
        );
      })}
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
              ? <FindingCards items={items} />
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

    // Items (finding cards or bullet list)
    if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
      const items = (c as { items: string[] }).items;
      if (hasSeverityItems(items)) return <FindingCards items={items} />;
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

// ── Sections panel ─────────────────────────────────────────────────────────

function SectionsPanel({ sections, types }: { sections: ReportSection[]; types: string[] }) {
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

// ── Documents panel (with client notes) ───────────────────────────────────

function DocumentsPanel({ documents, slug }: { documents: ClientDocument[]; slug: string }) {
  const [noteState, setNoteState] = useState<Record<string, { editing: boolean; value: string; saving: boolean; saved: boolean }>>({});

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

  if (documents.length === 0) {
    return (
      <div className="portal-empty">
        <div className="portal-empty-icon">📁</div>
        <p>No documents have been submitted yet.</p>
      </div>
    );
  }

  return (
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
            >
              View document →
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ── Main PortalView ────────────────────────────────────────────────────────

export default function PortalView({ report }: { report: ReportWithSectionsAndDocs }) {
  const [activeTab, setActiveTab] = useState('submissions');

  const handleLogout = () => {
    document.cookie = `rp_${report.slug}=; path=/; max-age=0`;
    window.location.reload();
  };

  const auditSections    = report.sections.filter(s => AUDIT_TYPES.includes(s.sectionType));
  const competitorSections = report.sections.filter(s => COMPETITOR_TYPES.includes(s.sectionType));
  const proposalSections = report.sections.filter(s => PROPOSAL_TYPES.includes(s.sectionType));
  const statusSections   = report.sections.filter(s => STATUS_TYPES.includes(s.sectionType));

  return (
    <div className="portal-root">

      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            <div className="portal-logo-mark"><LogoSVG /></div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb">Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{report.clientName}</span>
            <span className="portal-badge">Your Report</span>
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
              onClick={() => setActiveTab(tab.id)}
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
            <DocumentsPanel documents={report.documents} slug={report.slug} />
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <h1 className="portal-tab-heading">Audit Report</h1>
            <p className="portal-tab-sub">Detailed findings from our performance, SEO, and CRO analysis.</p>
            {auditSections.length > 0
              ? <SectionsPanel sections={report.sections} types={AUDIT_TYPES} />
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
              ? <SectionsPanel sections={report.sections} types={COMPETITOR_TYPES} />
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
            <h1 className="portal-tab-heading">Proposal</h1>
            <p className="portal-tab-sub">Our recommendations, scope, and pricing tailored for you.</p>
            {proposalSections.length > 0
              ? <SectionsPanel sections={report.sections} types={PROPOSAL_TYPES} />
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
              ? <SectionsPanel sections={report.sections} types={STATUS_TYPES} />
              : (
                <ComingSoonPanel
                  icon="🚀"
                  headline="Project not started yet"
                  sub="Once the proposal is confirmed and the project kicks off, you&apos;ll see live progress updates, milestones, and deliverable status here."
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
