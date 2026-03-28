'use client';

import { useState } from 'react';
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

// ── Content Renderers ─────────────────────────────────────────────────────────

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
    // Text
    if ('text' in c && typeof (c as { text: string }).text === 'string') {
      const paragraphs = (c as { text: string }).text.split('\n').filter(Boolean);
      return (
        <div className="portal-text">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      );
    }

    // Items (bullet list)
    if ('items' in c && Array.isArray((c as { items: string[] }).items)) {
      return (
        <ul className="portal-list">
          {(c as { items: string[] }).items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    }

    // Rows (score table)
    if ('rows' in c && Array.isArray((c as { rows: { label: string; value: string; status?: string }[] }).rows)) {
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
                const statusClass =
                  row.status === 'good'
                    ? 'good'
                    : row.status === 'warning'
                    ? 'warning'
                    : row.status === 'bad'
                    ? 'bad'
                    : '';
                return (
                  <tr key={i}>
                    <td className="score-label">{row.label}</td>
                    <td>{row.value}</td>
                    <td>
                      {row.status ? (
                        <span className={`portal-status-pill ${statusClass}`}>{row.status}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Metrics grid
    if (
      'metrics' in c &&
      Array.isArray((c as { metrics: { label: string; value: string; note?: string }[] }).metrics)
    ) {
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
    if (
      'competitors' in c &&
      Array.isArray(
        (c as { competitors: { name: string; size: string; speed: string; notes: string }[] }).competitors
      )
    ) {
      const competitors = (
        c as { competitors: { name: string; size: string; speed: string; notes: string }[] }
      ).competitors;
      return (
        <div className="portal-competitor-table-wrap">
          <table className="portal-competitor-table">
            <thead>
              <tr>
                <th>Brand / Product</th>
                <th>Size</th>
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

  // Default fallback
  return (
    <pre className="portal-pre">{JSON.stringify(content, null, 2)}</pre>
  );
}

// ── Section type label ────────────────────────────────────────────────────────

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

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'submissions', label: 'Your Submissions' },
  { id: 'audit', label: 'Audit Report' },
  { id: 'competitors', label: 'Competitor Analysis' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'status', label: 'Project Status' },
];

const AUDIT_TYPES = ['executive_summary', 'performance_audit', 'seo_audit', 'cro_audit', 'action_plan'];
const COMPETITOR_TYPES = ['competitor_analysis', 'pdp_analysis'];
const PROPOSAL_TYPES = ['proposal', 'mockup_review'];
const STATUS_TYPES = ['project_status'];

// ── Doc type label ────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  rfp: 'RFP',
  mockup: 'Mockup',
  competitor_ref: 'Competitor Ref',
  brand_assets: 'Brand Assets',
  other: 'Other',
};

// ── Sections tab content ──────────────────────────────────────────────────────

function SectionsPanel({
  sections,
  types,
  emptyMessage,
}: {
  sections: ReportSection[];
  types: string[];
  emptyMessage: string;
}) {
  const filtered = sections
    .filter((s) => types.includes(s.sectionType))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  if (filtered.length === 0) {
    return (
      <div className="portal-empty">
        <div className="portal-empty-icon">📄</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {filtered.map((section) => (
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

// ── Documents tab content ─────────────────────────────────────────────────────

function DocumentsPanel({ documents }: { documents: ClientDocument[] }) {
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
      {documents.map((doc) => (
        <div key={doc.id} className="portal-doc-card">
          <div className="portal-doc-type-badge">
            {DOC_TYPE_LABELS[doc.docType] || doc.docType}
          </div>
          <div className="portal-doc-title">{doc.title}</div>
          {doc.notes && <div className="portal-doc-notes">{doc.notes}</div>}
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-doc-link"
          >
            View →
          </a>
        </div>
      ))}
    </div>
  );
}

// ── Main PortalView ───────────────────────────────────────────────────────────

export default function PortalView({ report }: { report: ReportWithSectionsAndDocs }) {
  const [activeTab, setActiveTab] = useState('submissions');

  return (
    <div className="portal-root">
      {/* Header */}
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-logo">
            <div className="portal-logo-mark">
              <LogoSVG />
            </div>
            <div className="portal-logo-text">
              <span className="ln">Rachna</span>
              <span className="lb">Builds</span>
            </div>
          </div>
          <div className="portal-header-right">
            <span className="portal-client-name">{report.clientName}</span>
            <span className="portal-badge">Your Report</span>
          </div>
        </div>
      </header>

      {/* Tabs bar */}
      <nav className="portal-tabs-bar" aria-label="Report sections">
        <div className="portal-tabs-inner">
          {TABS.map((tab) => (
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
            <p className="portal-tab-sub">Documents and files you&apos;ve shared with us.</p>
            <DocumentsPanel documents={report.documents} />
          </>
        )}

        {activeTab === 'audit' && (
          <>
            <h1 className="portal-tab-heading">Audit Report</h1>
            <p className="portal-tab-sub">
              Detailed findings from our performance, SEO, and CRO analysis.
            </p>
            <SectionsPanel
              sections={report.sections}
              types={AUDIT_TYPES}
              emptyMessage="Your audit report is being prepared. Check back soon."
            />
          </>
        )}

        {activeTab === 'competitors' && (
          <>
            <h1 className="portal-tab-heading">Competitor Analysis</h1>
            <p className="portal-tab-sub">
              How your store stacks up against the competition.
            </p>
            <SectionsPanel
              sections={report.sections}
              types={COMPETITOR_TYPES}
              emptyMessage="Competitor analysis will appear here once completed."
            />
          </>
        )}

        {activeTab === 'proposal' && (
          <>
            <h1 className="portal-tab-heading">Proposal</h1>
            <p className="portal-tab-sub">
              Our recommendations, mockups, and project proposal for you.
            </p>
            <SectionsPanel
              sections={report.sections}
              types={PROPOSAL_TYPES}
              emptyMessage="Your proposal is being finalized."
            />
          </>
        )}

        {activeTab === 'status' && (
          <>
            <h1 className="portal-tab-heading">Project Status</h1>
            <p className="portal-tab-sub">Live updates on your project&apos;s progress.</p>
            <SectionsPanel
              sections={report.sections}
              types={STATUS_TYPES}
              emptyMessage="Project status updates will appear here."
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        Prepared by Rachna Builds &middot;{' '}
        <a href="mailto:rachnajain2103@gmail.com">rachnajain2103@gmail.com</a> &middot;{' '}
        <a href="https://rachnabuilds.com" target="_blank" rel="noopener noreferrer">
          rachnabuilds.com
        </a>
      </footer>
    </div>
  );
}
