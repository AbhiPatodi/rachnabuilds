// UAbility coaching sheets: CSV feeds pulled by =IMPORTDATA() in their Google
// Sheets (no service account, no writes). Key is derived from CRON_SECRET so
// nothing new has to be configured; it only unlocks read-only aggregates.
import { createHash } from 'crypto';
import { prisma } from './prisma';
import { safeEqual } from './auth';

export function sheetKey(): string | null {
  if (!process.env.CRON_SECRET) return null;
  return createHash('sha256').update(`uability:${process.env.CRON_SECRET}`).digest('hex').slice(0, 24);
}
export function keyOk(k: string | null): boolean { const want = sheetKey(); return !!want && !!k && safeEqual(k, want); }

const IST = 'Asia/Kolkata';
// Paid traffic = Meta Instant Form leads + people who commented/DMed after seeing the ad
// (tagged utmCampaign 'meta-ad'). Both are bought by the ad spend.
const FROM_ADS = { OR: [{ utmMedium: 'instant-form' }, { utmCampaign: 'meta-ad' }] };
const dayIST = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); // YYYY-MM-DD
const ddmmyyyy = (ymd: string) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
const csvCell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
const r2 = (n: number) => Math.round(n * 100) / 100;
const div = (a: number, b: number) => (b > 0 ? a / b : 0);

/** One row per day for a month — same 26 columns as UAbility's "Paid Traffic Tracking" tab. */
export async function trafficRows(month: string /* YYYY-MM */): Promise<unknown[][]> {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)); const next = new Date(Date.UTC(y, m, 1));
  const daysInMonth = Math.round((next.getTime() - first.getTime()) / 86400_000);
  const [ads, leads, bookings, won, pays] = await Promise.all([
    prisma.adSpendDay.findMany({ where: { date: { gte: first, lt: next } } }),
    prisma.funnelLead.findMany({ where: { ...FROM_ADS, createdAt: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) } }, select: { id: true, createdAt: true, storeUrl: true } }),
    prisma.booking.findMany({ where: { startTime: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) }, NOT: { id: { startsWith: 'demo' } }, funnelLead: FROM_ADS }, select: { startTime: true } }),
    prisma.funnelLead.findMany({ where: { status: 'closed_won', ...FROM_ADS, updatedAt: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) } }, select: { id: true, updatedAt: true, payments: { select: { amount: true, currency: true, status: true } } } }),
    prisma.payment.findMany({ where: { status: 'received', dateTbc: false, date: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) }, lead: FROM_ADS }, select: { date: true, amount: true, currency: true } }),
  ]);
  const fx = Number((await prisma.setting.findUnique({ where: { key: 'money_fx_usd_inr' } }))?.value) || 84;
  const inr = (amt: number, cur: string) => (cur === 'USD' ? amt * fx : amt);
  const by = <T,>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, T[]>>((acc, x) => { (acc[f(x)] ||= []).push(x); return acc; }, {});
  const adsBy = by(ads, (a) => a.date.toISOString().slice(0, 10));
  const leadsBy = by(leads, (l) => dayIST(l.createdAt));
  const callsBy = by(bookings, (b) => dayIST(b.startTime));
  const wonBy = by(won, (w) => dayIST(w.updatedAt));
  const paysBy = by(pays, (p) => dayIST(p.date));

  const header = ['Date', 'Adspend', 'Impr', 'Reach', 'CPM', 'Clicks', 'CTR %', 'CPC', 'Leads', 'Lead Cost', 'LP CR%', 'Apps', 'App Cost', 'App %', 'Calls', 'Call Cost', 'Call %', 'Sales', 'Conversion %', 'Revenue', 'Cash', 'CPA', 'R-P/L', 'C-P/L', 'R-ROI%', 'C-ROI %'];
  const rows: unknown[][] = []; const tot = { spend: 0, impr: 0, reach: 0, clicks: 0, leads: 0, apps: 0, calls: 0, sales: 0, revenue: 0, cash: 0 };
  const today = dayIST(new Date());
  for (let i = 0; i < daysInMonth; i++) {
    const ymd = new Date(first.getTime() + i * 86400_000).toISOString().slice(0, 10);
    if (ymd > today) { rows.push([ddmmyyyy(ymd)]); continue; }
    const a = adsBy[ymd]?.[0];
    const d = {
      spend: a?.spend || 0, impr: a?.impressions || 0, reach: a?.reach || 0, clicks: a?.clicks || 0,
      leads: Math.max(a?.leads || 0, (leadsBy[ymd] || []).length),
      apps: (leadsBy[ymd] || []).filter((l) => !!l.storeUrl).length,
      calls: (callsBy[ymd] || []).length,
      sales: (wonBy[ymd] || []).length,
      revenue: (wonBy[ymd] || []).reduce((s, w) => s + w.payments.reduce((t, p) => t + inr(p.amount, p.currency), 0), 0),
      cash: (paysBy[ymd] || []).reduce((s, p) => s + inr(p.amount, p.currency), 0),
    };
    for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += d[k];
    rows.push(line(ddmmyyyy(ymd), d));
  }
  return [header, line('Total', tot), ...rows];
  function line(label: string, d: typeof tot) {
    // Percentages are fractions (0.0242) because the template's % cells are percent-formatted.
    const pct = (a: number, b: number) => Math.round(div(a, b) * 10000) / 10000;
    return [label, r2(d.spend), d.impr, d.reach, r2(div(d.spend, d.impr) * 1000), d.clicks, pct(d.clicks, d.impr), r2(div(d.spend, d.clicks)),
      d.leads, r2(div(d.spend, d.leads)), pct(d.leads, d.clicks), d.apps, r2(div(d.spend, d.apps)), pct(d.apps, d.leads),
      d.calls, r2(div(d.spend, d.calls)), pct(d.calls, d.apps), d.sales, pct(d.sales, d.calls), r2(d.revenue), r2(d.cash), r2(div(d.spend, d.sales)),
      r2(d.revenue - d.spend), r2(d.cash - d.spend), pct(d.revenue - d.spend, d.spend), pct(d.cash - d.spend, d.spend)];
  }
}

/** One row per sales call (plus sales closed without a call) — UAbility "Sales EOD Report" columns. */
export async function salesEodRows(): Promise<unknown[][]> {
  const since = new Date('2026-09-01T00:00:00Z');
  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: since }, NOT: { id: { startsWith: 'demo' } } }, orderBy: { startTime: 'asc' },
    include: { funnelLead: { select: { id: true, status: true, storeUrl: true, phone: true, whatsapp: true, utmSource: true, payments: { select: { amount: true, currency: true, status: true, date: true } } } } },
  });
  const wonNoCall = await prisma.funnelLead.findMany({
    // Imported historical clients (sheet backfill, ids 'imp…') are not EOD sales — they'd read as fresh closes.
    where: { status: 'closed_won', updatedAt: { gte: since }, bookings: { none: {} }, NOT: { id: { startsWith: 'imp' } } },
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, storeUrl: true, utmSource: true, utmMedium: true, utmCampaign: true, updatedAt: true, payments: { select: { amount: true, currency: true, status: true, date: true } } },
  });
  const fx = Number((await prisma.setting.findUnique({ where: { key: 'money_fx_usd_inr' } }))?.value) || 84;
  const money = (ps: { amount: number; currency: string; status: string; date: Date }[]) => {
    const inr = (p: { amount: number; currency: string }) => (p.currency === 'USD' ? p.amount * fx : p.amount);
    const cash = ps.filter((p) => p.status === 'received').reduce((s, p) => s + inr(p), 0);
    const total = ps.reduce((s, p) => s + inr(p), 0);
    const due = ps.filter((p) => p.status === 'expected').map((p) => p.date).sort((a, b) => a.getTime() - b.getTime())[0];
    return { cash: r2(cash), total: r2(total), due: due ? ddmmyyyy(dayIST(due)) : '' };
  };
  // Outcome must be one of the sheet's dropdown items (validation rule on G4:G298,L4:L298):
  // CSU | Split Pay | Full Pay | Deposit | No Deposit & Follow Up | Offer & Didn't Buy | No Offer Yet | No Show | Cancelled | Rescheduled | Bad fit & No offer
  const outcomeFor = (bookingStatus: string | null, leadStatus: string | null, m: { cash: number; total: number }) => {
    if (bookingStatus === 'no_show') return 'No Show';
    if (bookingStatus === 'cancelled') return 'Cancelled';
    if (leadStatus === 'closed_won') return m.cash >= m.total && m.total > 0 ? 'Full Pay' : m.cash > 0 ? 'Deposit' : 'Split Pay';
    if (leadStatus === 'closed_lost') return "Offer & Didn't Buy";
    if (leadStatus === 'disqualified') return 'Bad fit & No offer';
    if (leadStatus === 'proposal_sent') return 'No Deposit & Follow Up';
    return 'No Offer Yet';
  };
  const header = ['Date', 'Name', 'Email', 'Number', 'Link', 'Rep', 'Outcome', 'Cancel/Resc Reason', 'Summary', 'Objection', 'Next Call Date', 'Follow-Up Call Outcome', 'Cash Collected', 'Total Sales Value', 'Balance Due Date'];
  const rows: unknown[][] = [header];
  for (const b of bookings) {
    const l = b.funnelLead; const m = money(l?.payments || []);
    const outcome = outcomeFor(b.status, l?.status ?? null, m);
    const summary = (b.callSummary || '').replace(/[#*_>]/g, '').replace(/\s+/g, ' ').replace(/^Meeting Purpose\s*/i, '').trim().slice(0, 220);
    rows.push([ddmmyyyy(dayIST(b.startTime)), b.name, b.email, l?.whatsapp || l?.phone || b.whatsapp || '', l?.storeUrl || '', 'Rachna', outcome, '', summary, '', '', '', m.cash, m.total, m.due]);
  }
  for (const w of wonNoCall) {
    const m = money(w.payments);
    rows.push([ddmmyyyy(dayIST(w.updatedAt)), w.name, w.email.endsWith('@no-email.local') ? '' : w.email, w.whatsapp || w.phone || '', w.storeUrl || '', 'Rachna', outcomeFor(null, 'closed_won', m), '', `Closed without a call (${w.utmCampaign === 'meta-ad' ? `Meta ad → Instagram ${w.utmMedium === 'ig-comment' ? 'comment' : 'DM'}` : (w.utmSource || 'direct')})`, '', '', '', m.cash, m.total, m.due]);
  }
  return rows;
}
