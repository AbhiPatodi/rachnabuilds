'use client';
// The Meta Ads report that gets shared with the performance team: pick a date
// range, read the cuts, export the whole thing as one branded PNG.
//
// Charts are hand-drawn SVG rather than a chart library — the export path draws
// the report into a canvas, and inline SVG with no external CSS is the one thing
// that serialises reliably there.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const INK = '#0B3D2E', EM = '#06D6A0', MUT = '#6B7C74', LINE = '#E3E9E6', BAD = '#C0392B';

type Row = { key: string; spend: number; impressions: number; reach: number; clicks: number; leads: number; cpm: number | null; ctr: number | null; cpl: number | null };
type LeadRow = {
  id: string; name: string; email: string; phone: string | null; createdAt: string; status: string; subStatus: string | null;
  ad: string | null; platform: string | null; form: string | null; store: string | null; adSpend: string | null; conversion: string | null;
  device: string | null; place: string | null; visits: number; touches: number; replied: boolean; callAt: string | null; proposal: string | null;
  lastTouch: { at: string; text: string } | null; lastNote: { at: string; text: string } | null; paid: boolean;
};
type Report = {
  range: { from: string; to: string; days: number };
  connected: boolean;
  totals: { spend: number; impressions: number; clicks: number; leads: number; added: number; gst: number; gstPct: number; remaining: number; cpm: number | null; ctr: number | null; cpl: number | null };
  days: { day: string; spend: number; impressions: number; reach: number; clicks: number; leads: number }[];
  topUps: { id: string; date: string; amount: number; method: string; note: string | null; source: string }[];
  revenue: {
    booked: number; received: number; fees: number; netVsSpend: number;
    clients: { name: string; status: string; bookedInr: number; receivedInr: number; feesInr: number; pending: number }[];
  };
  leadList?: LeadRow[];
  syncedAt?: string | null;
  ads?: (Row & { cpl: number | null; crmLeads: number })[];
  funnel?: { leads: number; contacted: number; replied: number; calls: number; proposals: number; won: number; lost: number; noStore: number; underFive: number };
  states: Row[];
  platforms: Row[];
  audience: (Row & { age: string; gender: string })[];
  devices?: Row[];
  placements?: Row[];
  hours?: Row[];
};

const inr = (v: number | null | undefined) => v == null ? '—' : '₹' + Math.round(v).toLocaleString('en-IN');
const num = (v: number | null | undefined) => v == null ? '—' : Math.round(v).toLocaleString('en-IN');
const pct = (v: number | null | undefined) => v == null ? '—' : v.toFixed(2) + '%';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dlabel = (isoDay: string) => { const d = new Date(isoDay + 'T00:00:00Z'); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);

const PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: 'Last 7 days', from: () => daysAgo(6), to: today },
  { label: 'Last 30 days', from: () => daysAgo(29), to: today },
  { label: 'This month', from: () => today().slice(0, 8) + '01', to: today },
  { label: 'All time', from: () => '2026-08-01', to: today },
];

export default function AdsReport() {
  const [from, setFrom] = useState(() => '2026-08-01');
  const [to, setTo] = useState(today);
  const [r, setR] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [leadStatus, setLeadStatus] = useState('all');
  const [leadAd, setLeadAd] = useState('all');
  const [leadQ, setLeadQ] = useState('');
  const [showAllLeads, setShowAllLeads] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/money/ads-report?from=${from}&to=${to}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not load the report');
      setR(j);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const maxSpend = useMemo(() => Math.max(1, ...(r?.days || []).map((d) => d.spend)), [r]);

  // Export: draw the sheet into a canvas via an SVG foreignObject, then download
  // a PNG at 2× so it stays sharp in WhatsApp and Slack.
  const exportPng = async () => {
    const node = sheet.current;
    if (!node) return;
    setExporting(true);
    try {
      const w = node.scrollWidth, h = node.scrollHeight, scale = 2;
      // Inline every computed style: the clone leaves the document, so nothing
      // in admin.css reaches it.
      const clone = node.cloneNode(true) as HTMLElement;
      const srcEls = [node, ...Array.from(node.querySelectorAll<HTMLElement>('*'))];
      const dstEls = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
      srcEls.forEach((src, i) => {
        const cs = getComputedStyle(src);
        const dst = dstEls[i];
        if (!dst) return;
        let css = '';
        for (let k = 0; k < cs.length; k++) { const p = cs[k]; css += `${p}:${cs.getPropertyValue(p)};`; }
        dst.setAttribute('style', css);
      });
      clone.style.width = w + 'px';
      const xml = new XMLSerializer().serializeToString(clone);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<foreignObject width="100%" height="100%">` +
        `<div xmlns="http://www.w3.org/1999/xhtml">${xml}</div></foreignObject></svg>`;
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const img = new Image();
      await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(new Error('Could not draw the report')); img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const blob: Blob = await new Promise((ok) => canvas.toBlob((b) => ok(b!), 'image/png'));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rachna-builds-meta-ads-${from}-to-${to}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      setErr('Export failed: ' + (e as Error).message + '. The report is still on screen.');
    } finally { setExporting(false); }
  };

  const setPreset = (p: typeof PRESETS[number]) => { setFrom(p.from()); setTo(p.to()); };
  // Pull the range again from Meta (capped at 120 days back), then re-read.
  const refresh = async () => {
    setSyncing(true);
    try {
      const back = Math.min(120, Math.max(3, Math.ceil((Date.now() - new Date(from).getTime()) / 86400_000) + 1));
      const res = await fetch(`/api/admin/money/sync-ads?days=${back}`, { method: 'POST' });
      if (!res.ok) setErr((await res.json().catch(() => ({})))?.error || `Meta refresh failed (${res.status})`);
      await load();
    } finally { setSyncing(false); }
  };
  const filteredLeads = useMemo(() => (r?.leadList || []).filter((l) =>
    (leadStatus === 'all' || (leadStatus === 'open' ? !/closed|disqualified/.test(l.status) : l.status === leadStatus)) &&
    (leadAd === 'all' || (l.ad || 'unattributed') === leadAd) &&
    (!leadQ || `${l.name} ${l.email} ${l.phone || ''} ${l.store || ''} ${l.place || ''}`.toLowerCase().includes(leadQ.toLowerCase()))
  ), [r, leadStatus, leadAd, leadQ]);

  return (
    <div>
      <div className="admin-card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>From</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>To</label>
          <input type="date" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13.5 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="admin-btn admin-btn-secondary"
              style={{ fontSize: 12.5, padding: '7px 11px' }} onClick={() => setPreset(p)}>{p.label}</button>
          ))}
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" style={{ marginLeft: 'auto', fontSize: 12.5, padding: '7px 11px' }} disabled={syncing || loading} onClick={refresh}>
          {syncing ? 'Pulling from Meta…' : '↻ Refresh from Meta'}
        </button>
        {r?.syncedAt && <span style={{ fontSize: 11.5, color: 'var(--text-muted)', alignSelf: 'center' }}>Data as of {new Date(r.syncedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST · auto-pulls hourly</span>}
        <button type="button" className="admin-btn admin-btn-primary"
          disabled={exporting || loading || !r} onClick={exportPng}>
          {exporting ? 'Building image…' : '⇩ Export as image'}
        </button>
      </div>

      {err && <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>{err}</div>}
      {loading && <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Loading the report…</p>}

      {r && !loading && (
        <div ref={sheet} style={{ background: '#fff', color: INK, fontFamily: "'Hanken Grotesk', -apple-system, Segoe UI, sans-serif", borderRadius: 14, overflow: 'hidden', border: `1px solid ${LINE}` }}>
          <div style={{ background: INK, color: '#fff', padding: '24px 30px 20px' }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>Rachna Builds<span style={{ color: EM }}>.</span></div>
            <div style={{ fontSize: 28, fontWeight: 600, margin: '12px 0 5px', letterSpacing: '-.02em' }}>Meta ads account review</div>
            <div style={{ fontSize: 13, color: '#A7C4B8' }}>
              Rachnabuilds New · {dlabel(r.range.from)} – {dlabel(r.range.to)} 2026 · {r.days.length} days
            </div>
          </div>

          <div style={{ padding: '22px 30px 28px' }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 20px', color: '#273B33' }}>
              <b>{inr(r.totals.spend)}</b> of media spend produced <b>{r.totals.leads} lead{r.totals.leads === 1 ? '' : 's'}</b>
              {r.totals.cpl != null && <> at <b>{inr(r.totals.cpl)}</b> each</>}. The account pays <b>{inr(r.totals.cpm)}</b> per
              thousand impressions, which is what limits everything else below.
              {r.revenue.received > 0 && <> Of that, <b>{inr(r.revenue.received)}</b> has come back from clients these ads produced.</>}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 26 }}>
              <Tile k="Money added" v={inr(r.totals.added)} n={`${r.topUps.length} top-up${r.topUps.length === 1 ? '' : 's'}`} />
              <Tile k="Media spend" v={inr(r.totals.spend)} n="before GST" />
              <Tile k="Leads" v={String(r.totals.leads)} n="Meta lead forms" />
              <Tile k="Cost per lead" v={inr(r.totals.cpl)} n="spend ÷ leads" bad />
              <Tile k="CPM" v={inr(r.totals.cpm)} n="per 1,000 impressions" bad />
              <Tile k="Click rate" v={pct(r.totals.ctr)} n={`${num(r.totals.clicks)} clicks`} />
              <Tile k="Banked from ads" v={inr(r.revenue.received)} n="after payment fees" />
              <Tile k="Net position" v={inr(r.revenue.netVsSpend)} n="banked − spend − GST"
                bad={r.revenue.netVsSpend < 0} />
            </div>

            {r.funnel && r.funnel.leads > 0 && (<>
              <H>What happened to the leads</H>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
                <Tile k="Leads in CRM" v={String(r.funnel.leads)} n="from these ads, this range" />
                <Tile k="Contacted" v={String(r.funnel.contacted)} n={`${r.funnel.leads - r.funnel.contacted} untouched`} bad={r.funnel.leads - r.funnel.contacted > 0} />
                <Tile k="Replied" v={String(r.funnel.replied)} n={r.funnel.contacted ? `${Math.round((r.funnel.replied / r.funnel.contacted) * 100)}% of contacted` : '—'} />
                <Tile k="Calls" v={String(r.funnel.calls)} n="booked or held" />
                <Tile k="Proposals" v={String(r.funnel.proposals)} n="sent" />
                <Tile k="Won" v={String(r.funnel.won)} n={`${r.funnel.lost} closed lost`} />
                <Tile k="No usable store link" v={String(r.funnel.noStore)} n="blank, 'I don't know', 'will share'" bad={r.funnel.noStore > 0} />
                <Tile k="Under $5k ad spend" v={String(r.funnel.underFive)} n="by their own answer" />
              </div>
            </>)}

            {(r.ads?.length || 0) > 0 && (<>
              <H>Each ad and its numbers</H>
              <Card pad="4px 16px 0">
                <Table head={['Ad', 'Spend', 'Impressions', 'CPM', 'Clicks', 'CTR', 'Leads (Meta)', 'Cost / lead', 'In CRM']}
                  rows={(r.ads || []).filter((a) => a.spend > 0.5).map((a) => [a.key, inr(a.spend), num(a.impressions), inr(a.cpm), num(a.clicks), pct(a.ctr), a.leads ? String(a.leads) : '—', inr(a.cpl), a.crmLeads ? String(a.crmLeads) : '—'])}
                  okCol={6} limit={5} />
              </Card>
              <p style={{ fontSize: 12, color: MUT, margin: '-10px 0 20px' }}>
                Leads (Meta) is what Meta counts on the ad; In CRM is how many of our lead records carry that ad name. They differ when a lead was attributed later or a form submit never reached the webhook.
              </p>
            </>)}

            <H>Daily spend</H>
            <Card>
              {r.days.length === 0 ? <Empty>No spend recorded in this range.</Empty> : (
                <svg width="100%" viewBox={`0 0 1000 220`} preserveAspectRatio="xMinYMin meet" style={{ display: 'block' }}>
                  <text x={62} y={12} fontSize={11} fill={MUT}>● green marks a day that produced a lead</text>
                  {[0, maxSpend / 2, maxSpend].map((t, i) => {
                    const y = 26 + (170 - (t / maxSpend) * 170);
                    return (
                      <g key={i}>
                        <line x1={62} x2={986} y1={y} y2={y} stroke={LINE} strokeWidth={1} />
                        <text x={54} y={y + 4} textAnchor="end" fontSize={11} fill={MUT}>{inr(t)}</text>
                      </g>
                    );
                  })}
                  {r.days.map((d, i) => {
                    const step = 924 / r.days.length, bw = Math.max(2, step * 0.66);
                    const x = 62 + i * step + (step - bw) / 2;
                    const y = 26 + (170 - (d.spend / maxSpend) * 170);
                    return (
                      <g key={d.day}>
                        {d.spend > 0 && <rect x={x} y={y} width={bw} height={Math.max(0, 196 - y)} rx={2} fill={INK} opacity={0.82} />}
                        {d.leads > 0 && <circle cx={x + bw / 2} cy={16} r={3 + Math.min(d.leads, 5)} fill={EM} />}
                        {i % Math.max(1, Math.ceil(r.days.length / 7)) === 0 &&
                          <text x={x + bw / 2} y={213} textAnchor="middle" fontSize={11} fill={MUT}>{dlabel(d.day)}</text>}
                      </g>
                    );
                  })}
                </svg>
              )}
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div>
                <H>Spend by state</H>
                <Card>{r.states.length === 0 ? <Empty>No breakdown synced yet — press Refresh from Meta.</Empty> :
                  <BarList rows={r.states.slice(0, 6)} label={(x) => x.key} value={(x) => x.spend}
                    right={(x) => `${inr(x.spend)}${x.leads ? ` · ${x.leads} lead${x.leads > 1 ? 's' : ''}` : ''}`}
                    tone={(x) => x.leads > 0 ? INK : '#C9D4CF'} />}
                </Card>
              </div>
              <div>
                <H>Facebook vs Instagram</H>
                <Card>{r.platforms.length === 0 ? <Empty>No breakdown synced yet.</Empty> :
                  <BarList rows={r.platforms.filter((p) => p.spend > 1)} label={(x) => x.key} value={(x) => x.cpm || 0}
                    right={(x) => `${inr(x.cpm)} CPM · ${x.leads} lead${x.leads === 1 ? '' : 's'}`}
                    tone={(x) => x.leads > 0 ? INK : BAD} caption="Cost per 1,000 impressions" />}
                </Card>
              </div>
            </div>

            {r.states.length > 0 && (<>
              <H>Cost and return by state</H>
              <Card pad="4px 16px 0">
                <Table head={['State', 'Spend', 'Impressions', 'CPM', 'Leads']}
                  rows={r.states.map((s) => [s.key, inr(s.spend), num(s.impressions), inr(s.cpm), s.leads ? String(s.leads) : '—'])}
                  okCol={4} limit={5} />
              </Card>
            </>)}

            <H>Every payment into the account</H>
            <Card pad="4px 16px 0">
              {r.topUps.length === 0 ? <Empty>No top-ups in this range.</Empty> : (() => {
                let run = 0;
                const rows = r.topUps.map((t) => { run += t.amount; return [`${dlabel(t.date)} 2026`, inr(t.amount), t.method, inr(run)]; });
                return <Table head={['Date', 'Amount', 'Method', 'Running total']} rows={rows.reverse()} limit={5} />;
              })()}
            </Card>
            <p style={{ fontSize: 12, color: MUT, margin: '-10px 0 20px' }}>
              {r.topUps.length} payment{r.topUps.length === 1 ? '' : 's'}, {inr(r.totals.added)} in total. About {inr(r.totals.gst)} of
              that is {r.totals.gstPct}% GST, leaving roughly <b style={{ color: INK }}>{inr(r.totals.remaining)}</b> on the account.
              Spend on the earlier “Rachna” account, deactivated 9 September 2026, is not included — Meta stops reporting a closed account.
            </p>

            <H>What came back</H>
            <Card pad={r.revenue.clients.length ? '4px 16px 0' : '14px 16px'}>
              {r.revenue.clients.length === 0 ? <Empty>No client from a Meta-sourced lead has been invoiced yet.</Empty> : (
                <Table head={['Client', 'Status', 'Billed', 'Fees', 'In the bank', 'Still due']}
                  rows={r.revenue.clients.map((c) => [
                    c.name, c.status.replace(/_/g, ' '), inr(c.bookedInr),
                    c.feesInr ? '−' + inr(c.feesInr) : '—', inr(c.receivedInr),
                    c.pending ? inr(c.pending) : '—',
                  ])} okCol={4} />
              )}
            </Card>
            <p style={{ fontSize: 12, color: MUT, margin: '-10px 0 20px' }}>
              Billed is what was agreed; fees are what PayPal or Upwork took; in the bank is what actually arrived in
              rupees. Against {inr(r.totals.spend + r.totals.gst)} paid out to Meta including GST, the ads are
              currently <b style={{ color: r.revenue.netVsSpend < 0 ? BAD : '#0C8F6B' }}>
              {r.revenue.netVsSpend < 0 ? inr(Math.abs(r.revenue.netVsSpend)) + ' behind' : inr(r.revenue.netVsSpend) + ' ahead'}</b>.
              Payments are counted whenever they landed, so a lead from August that pays in October still counts here.
            </p>

            {(r.leadList?.length || 0) > 0 && (<>
              <H>Every lead, latest first</H>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <select value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} style={{ padding: '6px 9px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12.5, background: '#fff' }}>
                  <option value="all">All statuses</option>
                  <option value="open">Open (not closed)</option>
                  {[...new Set((r.leadList || []).map((l) => l.status))].map((st) => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={leadAd} onChange={(e) => setLeadAd(e.target.value)} style={{ padding: '6px 9px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12.5, background: '#fff', maxWidth: 260 }}>
                  <option value="all">All ads</option>
                  {[...new Set((r.leadList || []).map((l) => l.ad || 'unattributed'))].map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <input value={leadQ} onChange={(e) => setLeadQ(e.target.value)} placeholder="Search name, store, place…" style={{ padding: '6px 9px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12.5, minWidth: 200 }} />
                <span style={{ fontSize: 12, color: MUT, alignSelf: 'center' }}>{filteredLeads.length} of {r.leadList?.length}</span>
              </div>
              <Card pad="4px 16px 0">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    <thead><tr>{['Lead', 'Came in', 'Ad · platform', 'Store', 'Their answers', 'Device · where', 'Status', 'Last touch'].map((h, i) => (
                      <th key={h} style={{ textAlign: 'left', padding: '7px 8px', borderBottom: `1px solid ${LINE}`, color: MUT, fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>{filteredLeads.slice(0, showAllLeads ? undefined : 5).map((l) => {
                      const st = l.status.replace(/_/g, ' ');
                      const tone = l.status === 'closed_won' ? '#0C8F6B' : l.status === 'closed_lost' || l.status === 'disqualified' ? BAD : /proposal|showed|call/.test(l.status) ? INK : MUT;
                      const d = new Date(l.createdAt);
                      return (
                        <tr key={l.id}>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', minWidth: 150 }}>
                            <div style={{ fontWeight: 600, color: INK }}>{l.name}</div>
                            <div style={{ fontSize: 11, color: MUT }}>{l.phone || l.email}</div>
                          </td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{dlabel(d.toISOString().slice(0, 10))} {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}<div style={{ fontSize: 11, color: MUT }}>IST</div></td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', minWidth: 140 }}>{l.ad || <span style={{ color: MUT }}>unattributed</span>}<div style={{ fontSize: 11, color: MUT }}>{l.platform === 'ig' ? 'Instagram' : l.platform === 'fb' ? 'Facebook' : l.platform || ''}{l.form ? ` · ${/v2/i.test(l.form) ? 'form v2' : 'old form'}` : ''}</div></td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', maxWidth: 170, wordBreak: 'break-all' }}>{l.store ? l.store.replace(/^https?:\/\/(www\.)?/, '') : <span style={{ color: BAD }}>none</span>}</td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{l.adSpend ? l.adSpend.replace(/_/g, ' ').replace('less than', '<') : '—'}<div style={{ fontSize: 11, color: MUT }}>{l.conversion ? l.conversion.replace(/_/g, ' ').replace('conversion rate', 'CR').replace('less than', '<').replace('more than', '>') : ''}</div></td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', minWidth: 130 }}>{l.device || <span style={{ color: MUT }}>no visit yet</span>}<div style={{ fontSize: 11, color: MUT }}>{l.place || ''}{l.visits ? ` · ${l.visits} visit${l.visits === 1 ? '' : 's'}` : ''}</div></td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', whiteSpace: 'nowrap' }}><span style={{ color: tone, fontWeight: 600 }}>{st}</span>{l.subStatus ? <div style={{ fontSize: 11, color: MUT }}>{l.subStatus}</div> : null}<div style={{ fontSize: 11, color: MUT }}>{l.touches} touch{l.touches === 1 ? '' : 'es'}{l.replied ? ' · replied' : ''}{l.callAt ? ` · call ${dlabel(l.callAt.slice(0, 10))}` : ''}{l.proposal ? ` · ${l.proposal}` : ''}{l.paid ? ' · paid' : ''}</div></td>
                          <td style={{ padding: '8px', borderBottom: `1px solid ${LINE}`, verticalAlign: 'top', minWidth: 260, maxWidth: 360, whiteSpace: 'normal', fontSize: 11.5, color: '#273B33' }}>{(l.lastTouch || l.lastNote) ? <>{(l.lastTouch || l.lastNote)!.text}<div style={{ fontSize: 10.5, color: MUT }}>{dlabel((l.lastTouch || l.lastNote)!.at.slice(0, 10))}</div></> : <span style={{ color: BAD }}>never contacted</span>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
                {filteredLeads.length > 5 && <MoreBtn open={showAllLeads} n={filteredLeads.length} onClick={() => setShowAllLeads((v) => !v)} />}
              </Card>
              <p style={{ fontSize: 12, color: MUT, margin: '-10px 0 20px' }}>
                Leads are the ones the CRM attributes to Meta ads and that arrived inside the date range. Device and location come from the lead opening one of our links (Meta does not share them per lead); "no visit yet" means they have not opened a link. Ad attribution is Meta's per-ad lead count matched by submit hour.
              </p>
            </>)}

            {r.audience.length > 0 && (<>
              <H>Who saw it</H>
              <Card pad="4px 16px 0">
                <Table head={['Age', 'Gender', 'Spend', 'Impressions', 'CPM', 'Leads']}
                  rows={r.audience.filter((a) => a.gender !== 'Unknown').map((a) => [a.age, a.gender, inr(a.spend), num(a.impressions), inr(a.cpm), a.leads ? String(a.leads) : '—'])}
                  okCol={5} limit={5} />
              </Card>
            </>)}

            {(r.devices?.length || 0) > 0 && (<>
              <H>By device</H>
              <Card pad="4px 16px 0">
                <Table head={['Device', 'Spend', 'Impressions', 'CPM', 'Clicks', 'Leads']}
                  rows={(r.devices || []).filter((d) => d.spend > 0.5).map((d) => [d.key, inr(d.spend), num(d.impressions), inr(d.cpm), num(d.clicks), d.leads ? String(d.leads) : '—'])}
                  okCol={5} limit={5} />
              </Card>
            </>)}

            {(r.placements?.length || 0) > 0 && (<>
              <H>By placement</H>
              <Card pad="4px 16px 0">
                <Table head={['Placement', 'Spend', 'Impressions', 'CPM', 'Clicks', 'Leads']}
                  rows={(r.placements || []).filter((d) => d.spend > 0.5).sort((x, y) => y.spend - x.spend).map((d) => [d.key, inr(d.spend), num(d.impressions), inr(d.cpm), num(d.clicks), d.leads ? String(d.leads) : '—'])}
                  okCol={5} limit={5} />
              </Card>
            </>)}

            {(r.hours?.length || 0) > 0 && (<>
              <H>By hour of day (IST, account time) — hours with leads first</H>
              <Card pad="4px 16px 0">
                <Table head={['Hour', 'Spend', 'Impressions', 'Clicks', 'Leads']}
                  rows={(r.hours || []).filter((d) => d.spend > 0.5).slice().sort((x, y) => (y.leads - x.leads) || (y.spend - x.spend)).map((d) => [`${d.key}:00`, inr(d.spend), num(d.impressions), num(d.clicks), d.leads ? String(d.leads) : '—'])}
                  okCol={4} limit={5} />
              </Card>
            </>)}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: MUT, borderTop: `1px solid ${LINE}`, paddingTop: 12, marginTop: 6, gap: 12, flexWrap: 'wrap' }}>
              <div>Source: Meta Ads API, account 1054469927180158</div>
              <div>Prepared by Rachna Builds</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ k, v, n, bad }: { k: string; v: string; n: string; bad?: boolean }) {
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 11, padding: '12px 13px 10px' }}>
      <div style={{ fontSize: 10.5, color: MUT, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 600, margin: '5px 0 3px', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', color: bad ? BAD : INK }}>{v}</div>
      <div style={{ fontSize: 11, color: MUT }}>{n}</div>
    </div>
  );
}
function H({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.07em', color: MUT, fontWeight: 600, margin: '0 0 10px' }}>{children}</div>;
}
function Card({ children, pad = '14px 16px' }: { children: React.ReactNode; pad?: string }) {
  return <div style={{ border: `1px solid ${LINE}`, borderRadius: 11, padding: pad, marginBottom: 20 }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ color: MUT, fontSize: 13, margin: '8px 0' }}>{children}</p>;
}
function BarList<T>({ rows, label, value, right, tone, caption }: {
  rows: T[]; label: (x: T) => string; value: (x: T) => number;
  right: (x: T) => string; tone: (x: T) => string; caption?: string;
}) {
  const max = Math.max(1, ...rows.map(value));
  return (
    <div>
      {caption && <div style={{ fontSize: 11, color: MUT, marginBottom: 8 }}>{caption}</div>}
      {rows.map((x, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <div style={{ width: 86, fontSize: 12, textAlign: 'right', flexShrink: 0 }}>{label(x)}</div>
          <div style={{ flex: 1, minWidth: 0, height: 18, position: 'relative' }}>
            <div style={{ width: `${(value(x) / max) * 100}%`, height: 18, borderRadius: 4, background: tone(x) }} />
          </div>
          <div style={{ fontSize: 11, color: MUT, width: 132, flexShrink: 0 }}>{right(x)}</div>
        </div>
      ))}
    </div>
  );
}
function MoreBtn({ open, n, onClick }: { open: boolean; n: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'block', width: '100%', padding: '9px 0 11px', background: 'none', border: 0, borderTop: `1px solid ${LINE}`, color: INK, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
      {open ? 'Show first 5 only' : `View all ${n}`}
    </button>
  );
}
function Table({ head, rows, okCol, limit }: { head: string[]; rows: string[][]; okCol?: number; limit?: number }) {
  const [open, setOpen] = useState(false);
  const shown = limit && !open ? rows.slice(0, limit) : rows;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
        <thead><tr>{head.map((h, i) => (
          <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '7px 8px', borderBottom: `1px solid ${LINE}`, color: MUT, fontWeight: 600, fontSize: 11.5, whiteSpace: 'nowrap' }}>{h}</th>
        ))}</tr></thead>
        <tbody>{shown.map((r, i) => (
          <tr key={i}>{r.map((c, j) => (
            <td key={j} style={{ textAlign: j === 0 ? 'left' : 'right', padding: '7px 8px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap', color: okCol === j && c !== '—' ? '#0C8F6B' : INK, fontWeight: okCol === j && c !== '—' ? 600 : 400 }}>{c}</td>
          ))}</tr>
        ))}</tbody>
      </table>
      {limit && rows.length > limit && <MoreBtn open={open} n={rows.length} onClick={() => setOpen((v) => !v)} />}

    </div>
  );
}
