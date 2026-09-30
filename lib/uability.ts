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
    prisma.funnelLead.findMany({ where: { utmMedium: 'instant-form', createdAt: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) } }, select: { id: true, createdAt: true, storeUrl: true } }),
    prisma.booking.findMany({ where: { startTime: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) }, NOT: { id: { startsWith: 'demo' } }, funnelLead: { utmMedium: 'instant-form' } }, select: { startTime: true } }),
    prisma.funnelLead.findMany({ where: { status: 'closed_won', utmMedium: 'instant-form', updatedAt: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) } }, select: { id: true, updatedAt: true, payments: { select: { amount: true, currency: true, status: true } } } }),
    prisma.payment.findMany({ where: { status: 'received', date: { gte: new Date(first.getTime() - 86400_000), lt: new Date(next.getTime() + 86400_000) }, lead: { utmMedium: 'instant-form' } }, select: { date: true, amount: true, currency: true } }),
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
    return [label, r2(d.spend), d.impr, d.reach, r2(div(d.spend, d.impr) * 1000), d.clicks, r2(div(d.clicks, d.impr) * 100), r2(div(d.spend, d.clicks)),
      d.leads, r2(div(d.spend, d.leads)), r2(div(d.leads, d.clicks) * 100), d.apps, r2(div(d.spend, d.apps)), r2(div(d.apps, d.leads) * 100),
      d.calls, r2(div(d.spend, d.calls)), r2(div(d.calls, d.apps) * 100), d.sales, r2(div(d.sales, d.calls) * 100), r2(d.revenue), r2(d.cash), r2(div(d.spend, d.sales)),
      r2(d.revenue - d.spend), r2(d.cash - d.spend), r2(div(d.revenue - d.spend, d.spend) * 100), r2(div(d.cash - d.spend, d.spend) * 100)];
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
    where: { status: 'closed_won', updatedAt: { gte: since }, bookings: { none: {} } },
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, storeUrl: true, utmSource: true, updatedAt: true, payments: { select: { amount: true, currency: true, status: true, date: true } } },
  });
  const fx = Number((await prisma.setting.findUnique({ where: { key: 'money_fx_usd_inr' } }))?.value) || 84;
  const money = (ps: { amount: number; currency: string; status: string; date: Date }[]) => {
    const inr = (p: { amount: number; currency: string }) => (p.currency === 'USD' ? p.amount * fx : p.amount);
    const cash = ps.filter((p) => p.status === 'received').reduce((s, p) => s + inr(p), 0);
    const total = ps.reduce((s, p) => s + inr(p), 0);
    const due = ps.filter((p) => p.status === 'expected').map((p) => p.date).sort((a, b) => a.getTime() - b.getTime())[0];
    return { cash: r2(cash), total: r2(total), due: due ? ddmmyyyy(dayIST(due)) : '' };
  };
  const STATUS: Record<string, string> = { new: 'No decision yet', contacted: 'Following up', confirmed: 'Following up', call_booked: 'Call booked', showed: 'Call done — deciding', proposal_sent: 'Proposal sent', closed_won: 'CLOSED WON', closed_lost: 'Lost', disqualified: 'Disqualified' };
  const header = ['Date', 'Name', 'Email', 'Number', 'Link', 'Rep', 'Outcome', 'Cancel/Resc Reason', 'Summary', 'Objection', 'Next Call Date', 'Follow-Up Call Outcome', 'Cash Collected', 'Total Sales Value', 'Balance Due Date'];
  const rows: unknown[][] = [header];
  for (const b of bookings) {
    const l = b.funnelLead; const m = money(l?.payments || []);
    const outcome = b.status === 'completed' ? 'Showed' : b.status === 'no_show' ? 'No-show' : b.status === 'cancelled' ? 'Cancelled' : b.startTime > new Date() ? 'Scheduled' : 'Showed';
    const summary = (b.callSummary || '').replace(/[#*_>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
    rows.push([ddmmyyyy(dayIST(b.startTime)), b.name, b.email, l?.whatsapp || l?.phone || b.whatsapp || '', l?.storeUrl || '', 'Rachna', outcome, '', summary, '', '', l ? STATUS[l.status] || l.status : '', m.cash, m.total, m.due]);
  }
  for (const w of wonNoCall) {
    const m = money(w.payments);
    rows.push([ddmmyyyy(dayIST(w.updatedAt)), w.name, w.email.endsWith('@no-email.local') ? '' : w.email, w.whatsapp || w.phone || '', w.storeUrl || '', 'Rachna', `Closed without call (${w.utmSource || 'direct'})`, '', '', '', '', 'CLOSED WON', m.cash, m.total, m.due]);
  }
  return rows;
}
