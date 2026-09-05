'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import type { AuditReportData } from '@/lib/auditBot';
import type { CallScriptData } from '@/lib/scriptGenerator';
import AuditReportView from '@/app/components/audit/AuditReportView';
import CallScriptView from '@/app/components/audit/CallScriptView';

interface AuditReport {
  id: string;
  status: string;
  token: string;
  error: string | null;
  reportJson: string;
  sentAt: string | null;
  updatedAt: string;
}

interface Booking {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  meetLink: string | null;
}

interface FunnelLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profession: string | null;
  whatsapp: string | null;
  storeUrl: string | null;
  role: string | null;
  challenge: string | null;
  revenue: string | null;
  blocker: string | null;
  financial: string | null;
  readiness: string | null;
  stage: string;
  status: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  notes: string | null;
  callScript: string | null;
  appliedAt: string | null;
  createdAt: string;
  auditReports: AuditReport[];
  bookings: Booking[];
  videoWatch: { secondsWatched: number; maxPosition: number; duration: number } | null;
  emailLogs: { id: string; kind: string; subject: string; ok: boolean; error: string | null; createdAt: string }[];
}

const EMAIL_KIND_LABELS: Record<string, string> = {
  confirmation: 'Confirmed',
  '12h': '12h before',
  '1h': '1h before',
  '30m': '30m before',
  live: 'We’re live',
  nudge_cold: 'Cold nudge',
  nudge_watched: 'Watched nudge',
  nudge_book: 'Book-call nudge',
  instant_welcome: 'IG/FB welcome',
};

function fmtMins(sec: number): string {
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

const LABELS: Record<string, string> = {
  traffic_no_sales: 'Getting traffic but not enough sales',
  low_conversion: 'Low conversion rate',
  poor_roas: 'Poor ROAS',
  cart_abandonment: 'High cart abandonment',
  brand_mismatch: "Store doesn't reflect our brand",
  other: 'Other',
  under_5k: 'Under $5,000',
  '5k_10k': '$5,000–$10,000',
  '10k_25k': '$10,000–$25,000',
  '25k_50k': '$25,000–$50,000',
  over_50k: '$50,000+',
  ready_now: 'We have the budget to invest immediately',
  can_invest: 'We can invest if the opportunity makes sense',
  budget_challenge: 'Budget is currently a major challenge',
  right_now: 'Right now',
  within_30_days: 'Within the next 30 days',
  later: 'More than 30 days',
};

const STATUSES = ['new', 'confirmed', 'call_booked', 'showed', 'closed_won', 'closed_lost', 'disqualified'];
const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#06D6A0' },
  confirmed: { label: 'Confirmed', color: '#38BDF8' },
  call_booked: { label: 'Call Booked', color: '#FBBF24' },
  showed: { label: 'Showed', color: '#A78BFA' },
  closed_won: { label: 'Closed Won 🎉', color: '#06D6A0' },
  closed_lost: { label: 'Closed Lost', color: '#FF6B6B' },
  disqualified: { label: 'Disqualified', color: '#6B7280' },
};

type TabId = 'overview' | 'application' | 'audit' | 'script' | 'bookings';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14.5, color: 'var(--text)', lineHeight: 1.6 }}>{value || <span style={{ color: 'var(--text-muted)' }}>— not provided —</span>}</div>
    </div>
  );
}

export default function FunnelLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<FunnelLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/admin/funnel-leads/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      setNotes(data.notes || '');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const updateStatus = async (status: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (res.ok) await fetchLead();
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
      });
      if (res.ok) { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }
    } finally {
      setBusy(false);
    }
  };

  const generateAudit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}/audit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(`Audit failed: ${data.error}`); return; }
      await fetchLead();
      setTab('audit');
    } finally {
      setBusy(false);
    }
  };

  const sendAudit = async (auditId: string) => {
    if (!confirm(`Email the audit report to ${lead?.email}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/audit-reports/${auditId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(`Send failed: ${data.error}`); return; }
      await fetchLead();
    } finally {
      setBusy(false);
    }
  };

  const generateScript = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}/script`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(`Script failed: ${data.error}`); return; }
      await fetchLead();
      setTab('script');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading lead...</span>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="admin-content">
        <div className="admin-card admin-empty">Lead not found. <Link href="/admin/funnel-leads" style={{ color: 'var(--accent)' }}>← Back to Funnel Leads</Link></div>
      </div>
    );
  }

  const audit = lead.auditReports[0];
  let auditReportData: AuditReportData | null = null;
  if (audit && audit.reportJson && audit.status !== 'generating') {
    try { auditReportData = JSON.parse(audit.reportJson); } catch { /* ignore */ }
  }
  let scriptData: CallScriptData | null = null;
  if (lead.callScript) {
    try { scriptData = JSON.parse(lead.callScript); } catch { /* ignore */ }
  }
  const meta = STATUS_META[lead.status] ?? STATUS_META.new;

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'application', label: 'Application' },
    { id: 'audit', label: 'Audit Report' },
    { id: 'script', label: 'Call Script' },
    { id: 'bookings', label: `Bookings (${lead.bookings.length})` },
  ];

  return (
    <div className="admin-content">
      <Link href="/admin/funnel-leads" style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, textDecoration: 'none' }}>
        ← Back to Funnel Leads
      </Link>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{lead.name}</h1>
          <p className="admin-page-subtitle">{lead.email} · Applied {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <select
          value={lead.status}
          disabled={busy}
          onChange={(e) => updateStatus(e.target.value)}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: meta.color, fontWeight: 700, fontSize: 13 }}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      </div>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`settings-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {tab === 'overview' && (
        <div style={{ marginTop: 20 }}>
          {lead.stage !== 'applied' && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, fontSize: 13, color: '#FBBF24', fontWeight: 600 }}>
              ✋ Opt-in only — hasn&apos;t submitted the full application yet.
              {lead.videoWatch && lead.videoWatch.duration > 0 && (
                <> Watched {Math.min(100, Math.round((lead.videoWatch.maxPosition / lead.videoWatch.duration) * 100))}% of the training —
                {' '}{lead.videoWatch.maxPosition / lead.videoWatch.duration >= 0.5 ? 'worth a follow-up nudge.' : 'may not have gotten far.'}</>
              )}
            </div>
          )}
          {lead.stage === 'applied' && lead.bookings.length === 0 && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 8, fontSize: 13, color: '#38BDF8', fontWeight: 600 }}>
              📞 Applied but hasn&apos;t booked a call yet — high intent, one email/call away. See the Bookings tab.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <div className="admin-card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Contact</h3>
            <Field label="Name" value={lead.name} />
            <Field label="Email" value={<a href={`mailto:${lead.email}`} style={{ color: 'var(--accent)' }}>{lead.email}</a>} />
            <Field label="WhatsApp" value={lead.whatsapp ? <a href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{lead.whatsapp} ↗</a> : lead.phone} />
            <Field label="Role / Profession" value={lead.role || lead.profession} />
            <Field label="Store URL" value={lead.storeUrl ? <a href={lead.storeUrl.startsWith('http') ? lead.storeUrl : `https://${lead.storeUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{lead.storeUrl} ↗</a> : null} />
          </div>

          <div className="admin-card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Funnel status</h3>
            <Field label="Stage" value={lead.stage === 'applied' ? 'Applied (full application)' : 'Opt-in only'} />
            <Field label="Source" value={lead.utmSource ? `${lead.utmSource}${lead.utmCampaign ? ` / ${lead.utmCampaign}` : ''}${lead.utmContent ? ` / ${lead.utmContent}` : ''}` : 'Organic / direct'} />
            <Field label="Applied on" value={lead.appliedAt ? new Date(lead.appliedAt).toLocaleString('en-IN') : null} />
            <Field
              label="VSL watched"
              value={
                lead.videoWatch && lead.videoWatch.duration > 0 ? (
                  <span>
                    <strong style={{ color: lead.videoWatch.maxPosition / lead.videoWatch.duration >= 0.75 ? '#06D6A0' : '#FBBF24' }}>
                      {Math.min(100, Math.round((lead.videoWatch.maxPosition / lead.videoWatch.duration) * 100))}%
                    </strong>
                    {' '}— reached {fmtMins(lead.videoWatch.maxPosition)} of {fmtMins(lead.videoWatch.duration)}
                    {' '}({fmtMins(lead.videoWatch.secondsWatched)} total play time)
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Not watched yet</span>
                )
              }
            />
          </div>

          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Email history</h3>
            {(!lead.emailLogs || lead.emailLogs.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                No automated funnel emails sent to this lead yet. Booking confirmation and
                call reminders will appear here.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {lead.emailLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span title={log.ok ? 'Sent' : `Failed${log.error ? `: ${log.error}` : ''}`}>{log.ok ? '✅' : '❌'}</span>
                    <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)', flexShrink: 0, width: 96 }}>
                      {EMAIL_KIND_LABELS[log.kind] || log.kind}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{log.subject}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Internal notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes only you can see — call outcomes, follow-up reminders, etc."
              style={{ width: '100%', minHeight: 90, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, color: 'var(--text)', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical' }}
            />
            <button type="button" onClick={saveNotes} disabled={busy} className="admin-btn admin-btn-secondary" style={{ marginTop: 10, fontSize: 12 }}>
              {notesSaved ? '✓ Saved' : 'Save Notes'}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* ─── APPLICATION ─── */}
      {tab === 'application' && (
        lead.stage !== 'applied' ? (
          <div className="admin-card admin-empty" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontSize: 32 }}>✋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Opt-in only — no application yet</div>
            <div>
              This lead unlocked the training video but hasn&apos;t submitted the full application
              (step 3 of the funnel) yet. Worth a follow-up — they gave us their name, email
              and phone but nothing else.
            </div>
          </div>
        ) : (
          <div className="admin-card" style={{ marginTop: 20, maxWidth: 640 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>What they told us in the application form</h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>Every question from the /training/apply funnel, shown exactly as answered.</p>
            <Field label="Full name" value={lead.name} />
            <Field label="Email" value={lead.email} />
            <Field label="WhatsApp number" value={lead.whatsapp} />
            <Field label="Website / Shopify store URL" value={lead.storeUrl} />
            <Field label="Current role" value={lead.role} />
            <Field label="Biggest challenge with their Shopify store" value={lead.challenge ? LABELS[lead.challenge] : null} />
            <Field label="Current monthly revenue" value={lead.revenue ? LABELS[lead.revenue] : null} />
            <Field label="Be 100% honest — what's preventing conversion" value={lead.blocker ? <span style={{ display: 'block', background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>{lead.blocker}</span> : null} />
            <Field label="Financial situation" value={lead.financial ? LABELS[lead.financial] : null} />
            <Field label="How soon they're ready" value={lead.readiness ? LABELS[lead.readiness] : null} />
          </div>
        )
      )}

      {/* ─── AUDIT REPORT ─── */}
      {tab === 'audit' && (
        <div style={{ marginTop: 20, maxWidth: 720 }}>
          {!lead.storeUrl ? (
            <div className="admin-card admin-empty">No store URL on file — can&apos;t run an audit for this lead.</div>
          ) : !audit || audit.status === 'failed' ? (
            <div className="admin-card admin-empty">
              <div style={{ marginBottom: 8, fontSize: 32 }}>⚡</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No audit generated yet</div>
              <div style={{ marginBottom: 16 }}>Analyzes {lead.storeUrl} for conversion bottlenecks. Takes about 60–90 seconds.</div>
              {audit?.status === 'failed' && <div style={{ color: '#FF6B6B', fontSize: 12.5, marginBottom: 12 }}>Last attempt failed: {audit.error}</div>}
              <button type="button" onClick={generateAudit} disabled={busy} className="admin-btn admin-btn-primary">
                {busy ? 'Generating…' : '⚡ Generate Audit'}
              </button>
            </div>
          ) : audit.status === 'generating' ? (
            <div className="admin-card admin-empty">⏳ Audit is generating — refresh in a minute.</div>
          ) : auditReportData ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <a href={`/audit/${audit.token}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>
                  Open Public Link ↗
                </a>
                {audit.status === 'draft' ? (
                  <button type="button" onClick={() => sendAudit(audit.id)} disabled={busy} className="admin-btn admin-btn-primary" style={{ fontSize: 12 }}>
                    {busy ? 'Sending…' : '📤 Send Report to Lead'}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>✓ Sent {audit.sentAt ? new Date(audit.sentAt).toLocaleDateString() : ''}</span>
                )}
                <button type="button" onClick={generateAudit} disabled={busy} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  {busy ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
              <AuditReportView report={auditReportData} />
            </>
          ) : (
            <div className="admin-card admin-empty">Report data couldn&apos;t be read — try regenerating.</div>
          )}
        </div>
      )}

      {/* ─── CALL SCRIPT ─── */}
      {tab === 'script' && (
        <div style={{ marginTop: 20, maxWidth: 720 }}>
          {!scriptData ? (
            <div className="admin-card admin-empty">
              <div style={{ marginBottom: 8, fontSize: 32 }}>📞</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No call script generated yet</div>
              <div style={{ marginBottom: 16 }}>Personalized SLOSHED 2.0 script using their application answers{audit ? ' and audit findings' : ''}. Takes about a minute.</div>
              <button type="button" onClick={generateScript} disabled={busy} className="admin-btn admin-btn-primary">
                {busy ? 'Writing…' : '📞 Generate Call Script'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <a href={`/admin/funnel-leads/${id}/script`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>
                  Open Print View ↗
                </a>
                <button type="button" onClick={generateScript} disabled={busy} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  {busy ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
              <CallScriptView script={scriptData} />
            </>
          )}
        </div>
      )}

      {/* ─── BOOKINGS ─── */}
      {tab === 'bookings' && (
        <div style={{ marginTop: 20, maxWidth: 640 }}>
          {lead.bookings.length === 0 ? (
            <div className="admin-card admin-empty">No calls booked yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lead.bookings.map((b) => (
                <div key={b.id} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(b.startTime).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_META[b.status]?.color || '#94A3B8' }}>{b.status}</span>
                  {b.meetLink && <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Join Meet</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
