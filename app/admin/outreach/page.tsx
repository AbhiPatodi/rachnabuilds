'use client';

// Cold email at a glance: list → verified → scanned → contacted → replied,
// inbox warm-up health, campaign numbers, and the latest replies.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface Data {
  pipeline: { tiers: Record<string, number>; verify: Record<string, number>; scan: Record<string, number>; stage: Record<string, number> };
  instantly: { connected: boolean; accounts: { email: string; ready: boolean; warmup: boolean; dailyLimit: number; score: number | null }[]; campaigns: { id: string; name: string; status: number; leads_count?: number; contacted_count?: number; emails_sent_count?: number; open_count?: number; reply_count?: number; bounced_count?: number; unsubscribed_count?: number }[]; error?: string };
  replied: { id: string; name: string; email: string; storeUrl: string | null; status: string; createdAt: string }[];
  lastWebhook: { at: string; type: string; email: string; campaign: string | null } | null;
}

const CAMP_STATUS: Record<number, string> = { 0: 'Draft', 1: 'Active', 2: 'Paused', 3: 'Completed', 4: 'Running subsequences', '-99': 'Account suspended', '-1': 'Accounts unhealthy', '-2': 'Bounce protect' } as Record<number, string>;

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const color = tone === 'good' ? 'var(--accent)' : tone === 'bad' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : undefined;
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value" style={{ color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function OutreachPage() {
  const [d, setD] = useState<Data | null>(null);
  const load = useCallback(async () => { const r = await fetch('/api/admin/outreach'); if (r.ok) setD(await r.json()); }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <div className="admin-content"><div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 40, textAlign: 'center' }}>Loading outreach…</div></div>;

  const p = d.pipeline;
  const topTier = (p.tiers['A+'] || 0) + (p.tiers['A'] || 0);
  const valid = (p.verify.valid || 0);
  const risky = (p.verify.risky || 0);
  const invalid = (p.verify.invalid || 0) + (p.verify.duplicate || 0);
  const unverified = p.verify.unverified || 0;
  const scanned = p.scan.scanned || 0;
  const contacted = (p.stage.contacted || 0) + (p.stage.replied || 0) + (p.stage.promoted || 0);
  const replied = (p.stage.replied || 0) + (p.stage.promoted || 0);
  const ready = d.instantly.accounts.filter((a) => a.ready).length;
  const warming = d.instantly.accounts.filter((a) => a.warmup).length;
  const totalSent = d.instantly.campaigns.reduce((a, c) => a + (c.emails_sent_count || 0), 0);
  const totalReplies = d.instantly.campaigns.reduce((a, c) => a + (c.reply_count || 0), 0);
  const totalBounced = d.instantly.campaigns.reduce((a, c) => a + (c.bounced_count || 0), 0);
  const bounceRate = totalSent ? (totalBounced / totalSent) * 100 : 0;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Cold email</h1>
          <p className="admin-page-subtitle">From the Vela list to booked calls. Top tiers (A+ and A) only; B and C wait.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={load}>↻ Refresh</button>
      </div>

      <div className="admin-stats">
        <Stat label="Top-tier list" value={topTier.toLocaleString('en-IN')} sub={`${(p.tiers['B'] || 0) + (p.tiers['C'] || 0)} more in B/C`} />
        <Stat label="Verified" value={valid + risky} sub={`${valid} valid · ${risky} risky · ${invalid} dropped · ${unverified} to check`} tone={unverified ? 'warn' : 'good'} />
        <Stat label="Scanned (have a finding)" value={scanned} sub={`${p.scan.failed || 0} failed · ${(p.scan.pending || 0)} pending`} />
      </div>
      <div className="admin-stats">
        <Stat label="Contacted" value={contacted} sub={totalSent ? `${totalSent} emails sent` : 'campaign not started'} />
        <Stat label="Replied" value={replied} sub={contacted ? `${((replied / contacted) * 100).toFixed(1)}% of contacted` : undefined} tone={replied ? 'good' : undefined} />
        <Stat label="Bounce rate" value={totalSent ? `${bounceRate.toFixed(1)}%` : '—'} sub={totalSent ? (bounceRate > 2 ? 'PAUSE: over the 2% line' : 'under the 2% line') : 'no sends yet'} tone={totalSent ? (bounceRate > 2 ? 'bad' : 'good') : undefined} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="admin-card" style={{ padding: 18 }}>
          <h2 className="admin-card-title">Inboxes · {ready}/{d.instantly.accounts.length} ready · {warming} warming up</h2>
          {!d.instantly.connected && <p style={{ color: 'var(--danger)', fontSize: 13.5 }}>INSTANTLY_API_KEY is not set.</p>}
          {d.instantly.error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{d.instantly.error}</p>}
          {d.instantly.accounts.map((a) => (
            <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: a.ready ? 'var(--accent)' : 'var(--warn)', flexShrink: 0 }} title={a.ready ? 'ready' : 'setting up'} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.email}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.warmup ? 'warm-up on' : 'warm-up OFF'} · {a.dailyLimit}/day{a.score != null ? ` · health ${a.score}` : ''}</span>
            </div>
          ))}
          {d.instantly.accounts.length === 0 && d.instantly.connected && <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>No inboxes yet.</p>}
        </div>

        <div className="admin-card" style={{ padding: 18 }}>
          <h2 className="admin-card-title">Campaigns</h2>
          {d.instantly.campaigns.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>None yet. The campaign is created (paused) once verification and scanning are done.</p> : d.instantly.campaigns.map((c) => (
            <div key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b>{c.name}</b><span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: c.status === 1 ? 'var(--accent)' : 'var(--text-muted)' }}>{CAMP_STATUS[c.status] || c.status}</span></div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 3 }}>
                {c.leads_count ?? 0} leads · {c.emails_sent_count ?? 0} sent · {c.reply_count ?? 0} replies · {c.bounced_count ?? 0} bounced · {c.unsubscribed_count ?? 0} unsubscribed
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            Last webhook: {d.lastWebhook ? `${d.lastWebhook.type} from ${d.lastWebhook.email} at ${new Date(d.lastWebhook.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'none received yet'}
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 18, marginTop: 16 }}>
        <h2 className="admin-card-title">Replies → leads</h2>
        {d.replied.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>No cold-email replies yet. They&apos;ll show here and under Leads → Cold Email.</p> : d.replied.map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
            <Link href={`/admin/funnel-leads/${l.id}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{l.name}</Link>
            <span style={{ color: 'var(--text-muted)' }}>{l.storeUrl?.replace(/^https?:\/\/(www\.)?/, '') || l.email}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{l.status}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
