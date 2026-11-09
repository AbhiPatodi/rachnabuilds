// Which ads bring GOOD leads — not just cheap ones. Every Meta lead carries
// the ad name and campaign it came from (utmContent / utmCampaign, set by the
// lead webhook); this page adds up how far each ad's leads got in the
// pipeline, next to what Meta charged for that ad.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { spendByAd, hasAdsToken } from '@/lib/metaAds';
import LeadsSubNav from '../../LeadsSubNav';

export const dynamic = 'force-dynamic';

const GOOD = new Set(['call_booked', 'showed', 'proposal_sent', 'closed_won']);
const LOST = new Set(['closed_lost', 'disqualified']);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

type Row = {
  key: string; label: string; sub?: string;
  leads: number; reached: number; good: number; proposals: number; won: number; lost: number;
  revenue: Record<string, number>; reasons: Record<string, number>;
  spend?: number;
};

function blank(key: string, label: string, sub?: string): Row {
  return { key, label, sub, leads: 0, reached: 0, good: 0, proposals: 0, won: 0, lost: 0, revenue: {}, reasons: {} };
}

function sourceOf(l: { utmSource: string | null; utmMedium: string | null; utmCampaign: string | null }) {
  if (l.utmMedium === 'instant-form') return 'Meta Instant Form';
  if (l.utmCampaign === 'meta-ad') return 'Meta ad → Instagram';
  if (l.utmSource === 'cold-email') return 'Cold email';
  if (l.utmMedium === 'free-audit') return 'Free audit form';
  if (l.utmMedium === 'manual') return `Added by hand (${l.utmSource || 'other'})`;
  if (l.utmMedium === 'ig-comment') return 'Instagram comment';
  return l.utmSource ? `Website (${l.utmSource})` : 'Website (organic)';
}

export default async function AdReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = daysParam === '30' || daysParam === '90' ? Number(daysParam) : null;
  const since = days ? new Date(Date.now() - days * 86400_000) : null;
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  const leads = await prisma.funnelLead.findMany({
    where: { ...(since ? { createdAt: { gte: since } } : {}), NOT: { id: { startsWith: 'imp' } } },
    select: {
      id: true, status: true, subStatus: true, lastTouchAt: true, utmSource: true, utmMedium: true, utmCampaign: true, utmContent: true,
      _count: { select: { bookings: true, proposals: true } },
      payments: { where: { status: 'received' }, select: { amount: true, currency: true } },
    },
  });

  const add = (r: Row, l: (typeof leads)[number]) => {
    r.leads++;
    if (l.status !== 'new' || l.lastTouchAt) r.reached++;
    if (GOOD.has(l.status) || l._count.bookings > 0) r.good++;
    if (l.status === 'proposal_sent' || l.status === 'closed_won' || l._count.proposals > 0) r.proposals++;
    if (l.status === 'closed_won') r.won++;
    if (LOST.has(l.status)) {
      r.lost++;
      const why = l.subStatus || (l.status === 'disqualified' ? 'Disqualified' : 'No reason noted');
      r.reasons[why] = (r.reasons[why] || 0) + 1;
    }
    for (const p of l.payments) r.revenue[p.currency] = (r.revenue[p.currency] || 0) + p.amount;
  };

  // ── Per ad (Meta Instant Form leads) ──
  const byAd = new Map<string, Row>();
  for (const l of leads.filter((x) => x.utmMedium === 'instant-form')) {
    const key = l.utmContent || '(ad not recorded)';
    if (!byAd.has(key)) byAd.set(key, blank(key, key, l.utmCampaign || undefined));
    add(byAd.get(key)!, l);
  }
  let spendError: string | null = null;
  let totalSpend = 0;
  if (hasAdsToken()) {
    try {
      const spend = await spendByAd(since ? ymd(since) : undefined, since ? ymd(new Date()) : undefined);
      for (const s of spend) {
        totalSpend += s.spend;
        if (!byAd.has(s.adName)) {
          if (s.spend < 1) continue;
          byAd.set(s.adName, blank(s.adName, s.adName, s.campaignName));
        }
        const r = byAd.get(s.adName)!;
        r.spend = (r.spend || 0) + s.spend;
        if (!r.sub && s.campaignName) r.sub = s.campaignName;
      }
    } catch (e) {
      spendError = e instanceof Error ? e.message : 'Could not load spend from Meta';
    }
  }
  const adRows = [...byAd.values()].sort((a, b) => b.good - a.good || b.leads - a.leads || (b.spend || 0) - (a.spend || 0));

  // ── Per source (all leads) ──
  const bySource = new Map<string, Row>();
  for (const l of leads) {
    const key = sourceOf(l);
    if (!bySource.has(key)) bySource.set(key, blank(key, key));
    add(bySource.get(key)!, l);
  }
  const sourceRows = [...bySource.values()].sort((a, b) => b.leads - a.leads);

  // ── Meta learning: quality signals sent ──
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [signals, metaLeadsMonth] = await Promise.all([
    prisma.leadActivity.findMany({ where: { type: 'system', text: { startsWith: '📡 Sent' } }, select: { text: true, createdAt: true } }),
    prisma.funnelLead.count({ where: { utmMedium: 'instant-form', createdAt: { gte: monthStart } } }),
  ]);
  const sig = { lead_qualified: 0, lead_converted: 0, lead_disqualified: 0 };
  for (const s of signals) for (const k of Object.keys(sig) as (keyof typeof sig)[]) if (s.text.includes(`"${k}"`)) sig[k]++;
  const sigTotal = sig.lead_qualified + sig.lead_converted + sig.lead_disqualified;

  const money = (r: Row) => Object.entries(r.revenue).map(([c, v]) => (c === 'INR' ? inr(v) : `${c === 'USD' ? '$' : `${c} `}${Math.round(v).toLocaleString('en-IN')}`)).join(' + ') || '—';
  const reasons = (r: Row) => Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(', ');
  const th: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

  const Table = ({ rows, withSpend }: { rows: Row[]; withSpend: boolean }) => (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{withSpend ? 'Ad' : 'Source'}</th>
            {withSpend && <th style={th}>Spend</th>}
            <th style={th}>Leads</th>
            {withSpend && <th style={th}>Per lead</th>}
            <th style={th} title="Got a message from us (status moved past New)">Reached</th>
            <th style={th} title="Booked a call or further">Good leads</th>
            {withSpend && <th style={th}>Per good lead</th>}
            <th style={th}>Proposals</th>
            <th style={th}>Won</th>
            <th style={th}>Revenue</th>
            <th>Why lost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ maxWidth: 260 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.sub}</div>}
              </td>
              {withSpend && <td style={td}>{r.spend != null ? inr(r.spend) : '—'}</td>}
              <td style={td}>{r.leads}</td>
              {withSpend && <td style={td}>{r.spend != null && r.leads ? inr(r.spend / r.leads) : '—'}</td>}
              <td style={td}>{r.reached} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{pct(r.reached, r.leads)}</span></td>
              <td style={{ ...td, fontWeight: 700, color: r.good ? 'var(--accent)' : 'var(--text-muted)' }}>{r.good} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>{pct(r.good, r.leads)}</span></td>
              {withSpend && <td style={{ ...td, fontWeight: 700 }}>{r.spend != null && r.good ? inr(r.spend / r.good) : r.spend ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>none yet</span> : '—'}</td>}
              <td style={td}>{r.proposals}</td>
              <td style={{ ...td, fontWeight: r.won ? 700 : 400, color: r.won ? 'var(--accent)' : undefined }}>{r.won}</td>
              <td style={td}>{money(r)}</td>
              <td style={{ fontSize: 11.5, color: 'var(--text-muted)', maxWidth: 220 }}>{reasons(r) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="admin-content">
      <LeadsSubNav />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Ad report</h1>
          <p className="admin-page-subtitle">Which ads bring leads that actually book calls and pay, not just cheap form fills</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['30', 'Last 30 days'], ['90', 'Last 90 days'], ['', 'All time']].map(([v, l]) => (
            <Link key={l} href={v ? `?days=${v}` : '?'} className={`admin-btn ${String(days ?? '') === v ? 'admin-btn-primary' : 'admin-btn-secondary'}`} style={{ fontSize: 12 }}>{l}</Link>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'clip', marginBottom: 20 }}>
        <div style={{ padding: '16px 18px 4px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Meta ads — by ad</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {totalSpend ? `${inr(totalSpend)} spent in this period` : ''}{spendError ? ` · spend unavailable: ${spendError.slice(0, 90)}` : ''}
          </span>
        </div>
        {adRows.length ? <Table rows={adRows} withSpend /> : <div className="admin-empty">No Meta form leads in this period.</div>}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 18px 14px', margin: 0 }}>
          “Good leads” = booked a call or got further. Judge an ad by <b>cost per good lead</b>, not cost per lead. With a handful of leads per ad, wait for at least 3–5 good leads before calling a winner.
        </p>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'clip', marginBottom: 20 }}>
        <div style={{ padding: '16px 18px 4px' }}><h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Every lead source</h3></div>
        {sourceRows.length ? <Table rows={sourceRows} withSpend={false} /> : <div className="admin-empty">No leads in this period.</div>}
      </div>

      <div className="admin-card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Teaching Meta which leads are good</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
          <div><div style={{ fontSize: 24, fontWeight: 700 }}>{sigTotal}</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>quality signals sent (all time)</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{sig.lead_qualified + sig.lead_converted}</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>good ({sig.lead_converted} won)</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{sig.lead_disqualified}</div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>not good</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 700 }}>{metaLeadsMonth}<span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}> / ~200</span></div><div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Meta form leads this month</div></div>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--bg-elevated)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: `${Math.min(100, (metaLeadsMonth / 200) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Every status change on a Meta lead now tells Meta whether it was good (call booked, proposal, won) or not (lost, disqualified).
          Meta uses these as a hint straight away, but it can only <b>optimise the ads for good leads</b> (the “Conversion leads” goal in Ads Manager)
          once there are roughly 200 leads a month. Until then, keep marking every lead honestly — the history counts when you get there.
        </p>
      </div>
    </div>
  );
}
