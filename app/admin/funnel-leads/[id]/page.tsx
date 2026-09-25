'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import type { AuditReportData } from '@/lib/auditBot';
import type { CallScriptData } from '@/lib/scriptGenerator';
import AuditReportView from '@/app/components/audit/AuditReportView';
import CallScriptView from '@/app/components/audit/CallScriptView';
import ProposalTab from '@/app/components/admin/ProposalTab';
import { countryFlag, placeWithFlag } from '@/lib/flag';

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
  createdAt?: string;
  startTime: string;
  endTime: string;
  status: string;
  meetLink: string | null;
  callSummary?: string | null;
  callTranscript?: string | null;
  recordingUrl?: string | null;
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
  formAnswers: Record<string, string> | null;
  callScript: string | null;
  appliedAt: string | null;
  createdAt: string;
  auditReports: AuditReport[];
  bookings: Booking[];
  videoWatch: { secondsWatched: number; maxPosition: number; duration: number } | null;
  emailLogs: { id: string; kind: string; subject: string; ok: boolean; error: string | null; createdAt: string }[];
  activities: { id: string; type: string; text: string; actor: string | null; createdAt: string }[];
  spReports: { id: string; storeName: string; host?: string; publicToken: string | null; competitorsRequested?: string | null; viewCount: number; lastViewedAt?: string | null; createdAt: string; views: { viewedAt: string; durationSec?: number | null; scrollPct?: number | null; country?: string | null; city?: string | null; os?: string | null; browser?: string | null; screen?: string | null; clicks?: string | null; ip?: string | null; sections?: Record<string, number> | null }[] }[];
  auditJob: { id: string; status: string; host: string; error: string | null; createdAt: string } | null;
  proposals?: { id: string; title: string; status: string; acceptedTier: string | null; views: { viewedAt: string; city: string | null; country: string | null; os: string | null; browser: string | null; durationSec: number | null; clicks: string | null }[] }[];
}

interface TimelineEvent { at: string; icon: string; text: string; sub?: string }

function buildTimeline(lead: FunnelLead): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const srcLabel = lead.utmMedium === 'instant-form' ? 'Meta Instant Form'
    : lead.utmSource === 'cold-email' ? 'Cold email reply'
    : lead.utmMedium === 'free-audit' ? 'Free audit form'
    : lead.utmSource ? `${lead.utmSource} / ${lead.utmMedium || ''}` : 'Website (organic)';
  const answers = lead.formAnswers && Object.keys(lead.formAnswers).length
    ? Object.entries(lead.formAnswers).map(([q, a]) => `${q}: ${a.replace(/_/g, ' ')}`).join(' · ')
    : undefined;
  ev.push({ at: lead.createdAt, icon: '📥', text: `Came in via ${srcLabel}`, sub: answers });
  if (lead.appliedAt) ev.push({ at: lead.appliedAt, icon: '📋', text: 'Submitted the full application' });
  for (const e of lead.emailLogs || []) {
    ev.push({ at: e.createdAt, icon: e.ok ? '✉️' : '⚠️', text: `${e.ok ? 'Email sent' : 'Email FAILED'} — ${e.subject}`, sub: e.error || undefined });
  }
  for (const b of lead.bookings || []) {
    ev.push({ at: b.createdAt || b.startTime, icon: '📅', text: `Call booked for ${new Date(b.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`, sub: b.status });
  }
  for (const a of lead.activities || []) {
    ev.push({ at: a.createdAt, icon: a.type === 'note' ? '📝' : a.type === 'status' ? '🔀' : 'ℹ️', text: a.text, sub: a.actor || undefined });
  }
  for (const r of lead.spReports || []) {
    ev.push({ at: r.createdAt, icon: '🔍', text: `Store report generated — ${r.storeName}` });
    for (const v of r.views) {
      const where = placeWithFlag(v.city, v.country);
      const dev = [v.os, v.browser].filter(Boolean).join(' · ');
      const dur = v.durationSec ? (v.durationSec >= 60 ? `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s` : `${v.durationSec}s`) : null;
      const clicked = (v.clicks || '').split(',').filter(Boolean);
      ev.push({
        at: v.viewedAt, icon: '👁',
        text: `Opened their store report${where ? ` from ${where}` : ''}${dev ? ` (${dev})` : ''}${dur ? ` — read ${dur}` : ''}${clicked.includes('whatsapp') ? ' · tapped WhatsApp 💬' : ''}${clicked.includes('book') ? ' · tapped Book 📅' : ''}`,
      });
    }
  }
  for (const p of lead.proposals || []) {
    p.views.forEach((v, idx) => {
      const visitNo = p.views.length - idx;
      const where = placeWithFlag(v.city, v.country);
      const dev = [v.os, v.browser].filter(Boolean).join(' · ');
      const dur = v.durationSec ? (v.durationSec >= 60 ? `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s` : `${v.durationSec}s`) : null;
      const clicked = (v.clicks || '').split(',').filter(Boolean);
      ev.push({
        at: v.viewedAt, icon: '📄',
        text: `Opened the proposal${where ? ` from ${where}` : ''}${dev ? ` (${dev})` : ''}${dur ? ` — read ${dur}` : ''}${clicked.includes('report') ? ' · opened report' : ''}${clicked.some((c) => c.startsWith('choose_')) ? ' · tapped a plan 🎯' : ''}${visitNo > 1 ? ` · ↩ visit ${visitNo}` : ''}`,
      });
    });
  }
  return ev.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
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

const STATUSES = ['new', 'confirmed', 'call_booked', 'showed', 'proposal_sent', 'closed_won', 'closed_lost', 'disqualified'];
const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#06D6A0' },
  confirmed: { label: 'Confirmed', color: '#38BDF8' },
  call_booked: { label: 'Call Booked', color: '#FBBF24' },
  showed: { label: 'Call Done ✓', color: '#A78BFA' },
  proposal_sent: { label: 'Proposal Sent', color: '#F472B6' },
  closed_won: { label: 'Closed Won 🎉', color: '#06D6A0' },
  closed_lost: { label: 'Closed Lost', color: '#FF6B6B' },
  disqualified: { label: 'Disqualified', color: '#6B7280' },
};

type TabId = 'overview' | 'timeline' | 'application' | 'audit' | 'script' | 'bookings' | 'proposal';

// Only leads from the /training VSL funnel have an opt-in → application
// journey; Meta form, free-audit and cold-email leads arrive complete.
function isVslLead(l: { utmMedium: string | null; utmSource: string | null }) {
  return l.utmMedium !== 'instant-form' && l.utmMedium !== 'free-audit' && l.utmSource !== 'cold-email';
}
function stageLabel(l: { stage: string; utmMedium: string | null; utmSource: string | null }) {
  if (l.stage === 'applied') return 'Applied (full application)';
  if (l.utmMedium === 'instant-form') return 'Meta form lead';
  if (l.utmMedium === 'free-audit') return 'Free audit request';
  if (l.utmSource === 'cold-email') return 'Cold email reply';
  return 'VSL opt-in (no application yet)';
}

// Render Fathom's markdown-ish call summaries as structured UI: ## headings,
// ### subheadings, "- " bullets (nested by indent), **bold** inline.
function CallMd({ text }: { text: string }) {
  const bold = (s: string, key: string) =>
    s.split(/\*\*([^*]+)\*\*/).map((part, i) =>
      i % 2 === 1 ? <b key={`${key}-${i}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{part}</b> : part);
  const out: React.ReactNode[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const bullet = line.match(/^(\s*)-\s+(.*)/);
    if (h2 && !h3) {
      out.push(<div key={i} style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent, #06D6A0)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 6px' }}>{h2[1]}</div>);
    } else if (h3) {
      out.push(<div key={i} style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', margin: '12px 0 4px' }}>{h3[1]}</div>);
    } else if (bullet) {
      const depth = Math.min(2, Math.floor(bullet[1].length / 2));
      out.push(
        <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 6 + depth * 14, margin: '3px 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent, #06D6A0)', flexShrink: 0 }}>{depth > 0 ? '◦' : '•'}</span>
          <span>{bold(bullet[2], `b${i}`)}</span>
        </div>,
      );
    } else {
      out.push(<p key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '4px 0' }}>{bold(line, `p${i}`)}</p>);
    }
  });
  return <div>{out}</div>;
}

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
  const [noteText, setNoteText] = useState('');
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

  const addNote = async () => {
    if (!noteText.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/funnel-leads/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      setNoteText('');
      await fetchLead();
    } finally {
      setBusy(false);
    }
  };

  const [auditUrl, setAuditUrl] = useState('');
  const [callStart, setCallStart] = useState('');
  const [callDuration, setCallDuration] = useState(20);
  const runAudit = async () => {
    const url = auditUrl.trim() || lead?.storeUrl || '';
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/funnel-leads/${id}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl: url }),
      });
      if (res.ok) { setAuditUrl(''); await fetchLead(); }
      else alert((await res.json()).error || 'Failed to queue audit');
    } finally {
      setBusy(false);
    }
  };

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
    { id: 'timeline', label: `Timeline (${buildTimeline(lead).length})` },
    { id: 'application', label: 'Application' },
    { id: 'audit', label: 'Audit Report' },
    { id: 'script', label: 'Call Script' },
    { id: 'bookings', label: `Bookings (${lead.bookings.length})` },
    { id: 'proposal', label: lead.proposals?.length ? `Proposal (${lead.proposals.length})` : 'Proposal' },
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
          {lead.stage !== 'applied' && isVslLead(lead) && (
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
            <Field label="Stage" value={stageLabel(lead)} />
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

          {lead.formAnswers && Object.keys(lead.formAnswers).length > 0 && (
            <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Instant Form answers</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
                {Object.entries(lead.formAnswers).map(([q, a]) => (
                  <Field
                    key={q}
                    label={q.charAt(0).toUpperCase() + q.slice(1)}
                    value={<strong style={{ color: '#06D6A0' }}>{a.replace(/_/g, ' ')}</strong>}
                  />
                ))}
              </div>
            </div>
          )}


          {/* ─── SCHEDULE CALL (Google Meet) ─── */}
          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Call</h3>
            {(() => {
              const upcoming = (lead.bookings || []).find((b) => new Date(b.startTime).getTime() > Date.now() - 30 * 60_000 && b.status !== 'cancelled');
              if (upcoming) {
                const when = new Date(upcoming.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
                const waDigits2 = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
                const waCallMsg = encodeURIComponent(
                  `Locked in! ${when} IST — here's our Google Meet link: ${upcoming.meetLink || ''}\n\nI'll have your full report open and we'll go through the top three fixes. See you there 🙂`
                );
                return (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5 }}>📅 <b>{when} IST</b>{upcoming.meetLink ? '' : ' (no Meet link)'}</span>
                    {upcoming.meetLink && (
                      <>
                        <a className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} href={upcoming.meetLink} target="_blank" rel="noopener noreferrer">Open Meet ↗</a>
                        {waDigits2 && (
                          <a className="admin-btn admin-btn-primary" style={{ fontSize: 12.5 }} href={`https://wa.me/${waDigits2}?text=${waCallMsg}`} target="_blank" rel="noopener noreferrer">
                            💬 Send Meet link on WhatsApp
                          </a>
                        )}
                      </>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Google invite emailed to {lead.email}</span>
                  </div>
                );
              }
              const lastWithNotes = (lead.bookings || []).find((b) => b.callSummary || b.recordingUrl);
              if (lastWithNotes) {
                const when = new Date(lastWithNotes.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
                return (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5 }}>✅ Call done — <b>{when} IST</b></span>
                    {lastWithNotes.recordingUrl && (
                      <a className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} href={lastWithNotes.recordingUrl} target="_blank" rel="noopener noreferrer">🎥 Recording ↗</a>
                    )}
                    <button type="button" className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} onClick={() => setTab('bookings')}>📝 Notes & transcript → Bookings</button>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="datetime-local" value={callStart} onChange={(e) => setCallStart(e.target.value)}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }} />
                  <select value={callDuration} onChange={(e) => setCallDuration(Number(e.target.value))}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13 }}>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                  </select>
                  <button type="button" disabled={busy || !callStart} className="admin-btn admin-btn-primary" style={{ fontSize: 12.5 }}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await fetch(`/api/admin/funnel-leads/${id}/schedule-call`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ start: new Date(callStart).toISOString(), durationMin: callDuration }),
                        });
                        if (!res.ok) alert((await res.json()).error || 'Failed to schedule');
                        await fetchLead();
                      } finally { setBusy(false); }
                    }}>
                    {busy ? 'Creating…' : '📅 Create Meet + send invite'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Times in your local clock (IST) · lead gets the Google invite by email</span>
                </div>
              );
            })()}
          </div>

          {/* ─── STORE AUDIT (StoreProof) ─── */}
          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Store Audit</h3>
            {(() => {
              const report = lead.spReports?.[0];
              const job = lead.auditJob;
              if (report?.publicToken) {
                const link = `https://rachnabuilds.com/report/${report.publicToken}`;
                const waDigits = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
                const waMsg = encodeURIComponent(
                  `Here's your store report, ${lead.name.split(' ')[0]} \u{1F50D} ${link}\n\nTwo findings are open right away \u2014 I'll walk you through the top three (the ones costing you the most) on a quick call. When works for you?`
                );
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13.5 }}>✅ Report ready — <b>{report.storeName}</b></span>
                      <span style={{ fontSize: 12.5, color: report.viewCount > 0 ? '#06D6A0' : 'var(--text-muted)', fontWeight: report.viewCount > 0 ? 700 : 400 }}>
                        {report.viewCount > 0 ? `\u{1F441} Viewed ${report.viewCount}\u00d7` : 'Not opened yet'}
                      </span>
                      {(() => {
                        const best = Math.max(0, ...(report.views || []).map((v) => v.durationSec || 0));
                        const scroll = Math.max(0, ...(report.views || []).map((v) => v.scrollPct || 0));
                        if (!best) return null;
                        const t = best >= 60 ? `${Math.floor(best / 60)}m ${best % 60}s` : `${best}s`;
                        return <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>\u23f1 longest read {t}{scroll > 0 ? ` \u00b7 scrolled ${scroll}%` : ''}</span>;
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      {waDigits && (
                        <a className="admin-btn admin-btn-primary" style={{ fontSize: 12.5 }}
                          href={`https://wa.me/${waDigits}?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
                          💬 Share on WhatsApp
                        </a>
                      )}
                      <a className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} href={link} target="_blank" rel="noopener noreferrer">Teaser ↗</a>
                      <a className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} href={`/admin/storeproof/${report.id}`} target="_blank" rel="noopener noreferrer">Full report ↗</a>
                    </div>
                    {report.competitorsRequested && (
                      <div style={{ marginTop: 12, fontSize: 12.5, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#FBBF24' }}>
                        🥊 Wants a comparison vs <b>{report.competitorsRequested.split(',').join(', ')}</b> — high intent. Run the benchmark before the call.
                      </div>
                    )}
                    {(report.views || []).length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Report activity</div>
                        {(report.views || []).map((v, i, all) => {
                          const flag = countryFlag(v.country);
                          const where = [v.city, v.country].filter(Boolean).join(', ');
                          const dev = [v.os, v.browser].filter(Boolean).join(' · ');
                          const dur = v.durationSec ? (v.durationSec >= 60 ? `${Math.floor(v.durationSec / 60)}m ${v.durationSec % 60}s` : `${v.durationSec}s`) : null;
                          const clicked = (v.clicks || '').split(',').filter(Boolean);
                          // Views arrive newest-first; visit # = how many earlier views share this device (ip+os)
                          const visitNo = v.ip ? all.slice(i + 1).filter((o) => o.ip === v.ip && o.os === v.os).length + 1 : null;
                          const topSections = Object.entries(v.sections || {})
                            .filter(([, s]) => s >= 3).sort((a, b) => b[1] - a[1]).slice(0, 2);
                          return (
                            <div key={i} style={{ padding: '5px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <span style={{ color: 'var(--text-muted)', minWidth: 118 }}>{new Date(v.viewedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                {where && <span>{flag} {where}</span>}
                                {dev && <span>{dev}</span>}
                                {visitNo && visitNo > 1 && <span style={{ background: 'var(--surface-2, #EEF2F0)', borderRadius: 99, padding: '1px 8px', fontSize: 11 }}>↩ visit {visitNo}</span>}
                                {dur && <span>⏱ {dur}{v.scrollPct ? ` · ${v.scrollPct}%` : ''}</span>}
                                {clicked.includes('whatsapp') && <span style={{ color: '#06D6A0', fontWeight: 700 }}>💬 tapped WhatsApp</span>}
                                {clicked.includes('book') && <span style={{ color: '#06D6A0', fontWeight: 700 }}>📅 tapped Book</span>}
                              </div>
                              {topSections.length > 0 && (
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 118 }}>
                                  read most: {topSections.map(([k, s]) => `${k} (${s}s)`).join(' · ')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              if (job && (job.status === 'queued' || job.status === 'running')) {
                return (
                  <p style={{ fontSize: 13.5, margin: 0, color: 'var(--text-secondary)' }}>
                    {job.status === 'running' ? '⚙️ Audit running' : '⏳ Audit queued'} for <b>{job.host}</b> — takes ~10-15 min.
                    You'll get a push when the report is ready to share.
                    <button type="button" onClick={fetchLead} className="admin-btn admin-btn-secondary" style={{ fontSize: 11.5, marginLeft: 10 }}>Refresh</button>
                  </p>
                );
              }
              return (
                <div>
                  {job?.status === 'failed' && (
                    <p style={{ fontSize: 12.5, color: '#FF6B6B', margin: '0 0 10px' }}>Last audit failed: {job.error?.slice(0, 120)} — fix and re-run.</p>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      value={auditUrl || lead.storeUrl || ''}
                      onChange={(e) => setAuditUrl(e.target.value)}
                      placeholder="Store URL from WhatsApp — e.g. minimaljewel.com"
                      style={{ flex: 1, minWidth: 220, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 13.5 }}
                    />
                    <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 13 }} disabled={busy || !(auditUrl.trim() || lead.storeUrl)} onClick={runAudit}>
                      🔍 Run Store Audit
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                    Runs the full StoreProof audit (~10-15 min). No email goes to the lead — you share the report on WhatsApp when it's ready.
                  </p>
                </div>
              );
            })()}
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
      {/* ─── TIMELINE ─── */}
      {tab === 'timeline' && (
        <div className="admin-card">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {['📤 Report link sent', '💬 First message sent', '🔁 Follow-up sent', '📞 Call scheduled', '🎥 Walkthrough done'].map((q) => (
              <button key={q} type="button" disabled={busy} className="admin-btn admin-btn-secondary" style={{ fontSize: 11.5, padding: '4px 10px' }}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await fetch(`/api/admin/funnel-leads/${id}`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: q }),
                    });
                    await fetchLead();
                  } finally { setBusy(false); }
                }}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
              placeholder="Add a note — call outcome, WhatsApp update, next step…"
              style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontSize: 13.5 }}
            />
            <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 13 }} disabled={busy || !noteText.trim()} onClick={addNote}>
              Add Note
            </button>
          </div>
          <div style={{ position: 'relative', paddingLeft: 6 }}>
            {buildTimeline(lead).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 18, position: 'relative' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, zIndex: 1 }}>
                  {e.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{e.text}</div>
                  {e.sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{e.sub}</div>}
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    {new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'application' && (
        lead.stage !== 'applied' ? (
          <div className="admin-card admin-empty" style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontSize: 32 }}>✋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{isVslLead(lead) ? 'Opt-in only — no application yet' : `${stageLabel(lead)} — no website application`}</div>
            {!isVslLead(lead) ? (
              <div>This lead didn&apos;t come through the website application. {lead.formAnswers ? 'Their form answers are on the Overview tab.' : ''}</div>
            ) : (
            <div>
              This lead unlocked the training video but hasn&apos;t submitted the full application
              (step 3 of the funnel) yet. Worth a follow-up — they gave us their name, email
              and phone but nothing else.
            </div>
            )}
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
          {(() => {
            const sp = lead.spReports?.[0];
            const job = lead.auditJob;
            if (sp?.publicToken) {
              return (
                <div className="admin-card admin-empty">
                  <div style={{ marginBottom: 8, fontSize: 32 }}>✅</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Store audit is done — {sp.storeName}</div>
                  <div style={{ marginBottom: 16 }}>Share it from the Store Audit card on Overview (WhatsApp + view tracking).</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a className="admin-btn admin-btn-primary" style={{ fontSize: 12.5 }} href={`/admin/storeproof/${sp.id}`} target="_blank" rel="noopener noreferrer">Full report ↗</a>
                    <a className="admin-btn admin-btn-secondary" style={{ fontSize: 12.5 }} href={`https://rachnabuilds.com/report/${sp.publicToken}`} target="_blank" rel="noopener noreferrer">Teaser (what they see) ↗</a>
                  </div>
                </div>
              );
            }
            if (job && (job.status === 'queued' || job.status === 'running')) {
              return (
                <div className="admin-card admin-empty">
                  <div style={{ marginBottom: 8, fontSize: 32 }}>{job.status === 'running' ? '⚙️' : '⏳'}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Audit {job.status} for {job.host}</div>
                  <div style={{ marginBottom: 12 }}>A full store audit takes about 10–15 minutes once the audit worker picks it up. You&apos;ll get a push when the report is ready.</div>
                  <button type="button" onClick={fetchLead} className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Refresh</button>
                </div>
              );
            }
            if (!lead.storeUrl) {
              return <div className="admin-card admin-empty">No store URL on file yet — add it on the Overview tab&apos;s Store Audit card to run an audit.</div>;
            }
            return (
              <div className="admin-card admin-empty">
                <div style={{ marginBottom: 8, fontSize: 32 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{job?.status === 'failed' ? 'Last audit failed' : 'No store audit yet'}</div>
                {job?.status === 'failed' && job.error && <div style={{ color: '#FF6B6B', fontSize: 12.5, marginBottom: 10 }}>{job.error.slice(0, 200)}</div>}
                <div style={{ marginBottom: 16 }}>Runs the full StoreProof audit on {lead.storeUrl} (~10–15 min) and produces the teaser + full report.</div>
                <button type="button" onClick={runAudit} disabled={busy} className="admin-btn admin-btn-primary">
                  {busy ? 'Queuing…' : job?.status === 'failed' ? '↻ Retry store audit' : '🔍 Run store audit'}
                </button>
              </div>
            );
          })()}

          {auditReportData && audit && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer' }}>Earlier AI audit (legacy, {audit.status})</summary>
              <div style={{ marginTop: 12 }}>
                <a href={`/audit/${audit.token}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12, marginBottom: 12, display: 'inline-block' }}>Open legacy report ↗</a>
                <AuditReportView report={auditReportData} />
              </div>
            </details>
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

      {/* ─── PROPOSAL ─── */}
      {tab === 'proposal' && <ProposalTab leadId={id} leadName={lead.name} onLeadChange={fetchLead} />}

      {/* ─── BOOKINGS ─── */}
      {tab === 'bookings' && (
        <div style={{ marginTop: 20, maxWidth: 640 }}>
          {lead.bookings.length === 0 ? (
            <div className="admin-card admin-empty">No calls booked yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lead.bookings.map((b) => {
                const mins = Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60_000);
                const parts = (b.callSummary || '').split(/\n\s*ACTION ITEMS:\s*\n?/);
                const summaryText = parts[0]?.trim();
                const actionText = parts[1]?.trim();
                const done = b.status === 'completed';
                return (
                  <div key={b.id} className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 18px', background: 'var(--bg-elevated)', borderBottom: b.callSummary || b.callTranscript ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 20 }}>{done ? '✅' : '📅'}</span>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {new Date(b.startTime).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mins} min · {done ? 'call completed' : 'upcoming'}</div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 10px', borderRadius: 99, background: done ? 'rgba(6,214,160,0.12)' : 'rgba(148,163,184,0.12)', color: done ? '#06D6A0' : STATUS_META[b.status]?.color || '#94A3B8' }}>{b.status}</span>
                      {b.recordingUrl && <a href={b.recordingUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-primary" style={{ fontSize: 12 }}>🎥 Watch recording</a>}
                      {b.meetLink && !done && <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Join Meet</a>}
                    </div>
                    {(summaryText || actionText) && (
                      <div style={{ padding: '4px 18px 16px' }}>
                        {summaryText && <CallMd text={summaryText} />}
                        {actionText && (
                          <div style={{ marginTop: 16, background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.25)', borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#06D6A0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>✔ Action items</div>
                            {actionText.split('\n').filter(Boolean).map((a, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', margin: '4px 0' }}>
                                <span style={{ flexShrink: 0 }}>☐</span>
                                <span>{a.replace(/^\d+\.\s*/, '')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {b.callTranscript && (
                          <details style={{ marginTop: 14 }}>
                            <summary style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer' }}>💬 Full transcript</summary>
                            <div style={{ marginTop: 8, maxHeight: 340, overflowY: 'auto', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                              {b.callTranscript.split('\n').filter(Boolean).map((line, i) => {
                                const m = line.match(/^([^:]{2,40}):\s*(.*)$/);
                                return m ? (
                                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, margin: '6px 0' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{m[1]}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}> — {m[2]}</span>
                                  </div>
                                ) : (
                                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)', margin: '6px 0' }}>{line}</div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
