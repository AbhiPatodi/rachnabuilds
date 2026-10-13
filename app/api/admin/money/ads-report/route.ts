// Meta Ads report for an arbitrary date range, served from the synced tables so
// the page never waits on the Graph API. Same shape the shared image uses:
// totals, a day series, top-ups, and the state / platform / audience cuts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AD_ACCOUNT_ID, hasAdsToken } from '@/lib/metaAds';
import { getMoneySettings, channelOf, toInr } from '@/lib/money';

export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const utc = (d: string) => new Date(`${d}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Pretty label for an age_gender key ("25-34|female"). */
function splitAgeGender(key: string) {
  const [age, gender] = key.split('|');
  return { age: age || '?', gender: gender ? gender[0].toUpperCase() + gender.slice(1) : 'Unknown' };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const to = q.get('to') || iso(new Date());
  // Default window is the account's whole history; the UI always sends both.
  const from = q.get('from') || '2026-08-01';
  if (!DAY.test(from) || !DAY.test(to)) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
  }
  if (from > to) return NextResponse.json({ error: 'from is after to' }, { status: 400 });

  const range = { gte: utc(from), lte: utc(to) };
  const [days, topUps, breakdowns, settings, adLeads] = await Promise.all([
    prisma.adSpendDay.findMany({
      where: { accountId: AD_ACCOUNT_ID, date: range },
      orderBy: { date: 'asc' },
      select: { date: true, spend: true, impressions: true, reach: true, clicks: true, leads: true },
    }),
    prisma.adTopUp.findMany({
      where: { accountId: AD_ACCOUNT_ID, date: range },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, amount: true, method: true, note: true, source: true },
    }),
    prisma.adBreakdownDay.findMany({
      where: { accountId: AD_ACCOUNT_ID, date: range },
      select: { dimension: true, key: true, spend: true, impressions: true, reach: true, clicks: true, leads: true },
    }),
    getMoneySettings(),
    // What the ads actually earned. Attribution is the same channelOf() rule the
    // Money page uses, and "received" is what reached the bank: the recorded
    // INR where we have it, otherwise the amount less the payment fee.
    prisma.funnelLead.findMany({
      where: { NOT: { id: { startsWith: 'demo' } } },
      select: {
        id: true, name: true, status: true, utmSource: true, utmMedium: true, utmCampaign: true,
        payments: { select: { amount: true, currency: true, status: true, fee: true, inrReceived: true, date: true, method: true, note: true } },
      },
    }),
  ]);

  // Roll each dimension up over the window.
  type Agg = { key: string; spend: number; impressions: number; reach: number; clicks: number; leads: number };
  const rollup = (dim: string): Agg[] => {
    const by = new Map<string, Agg>();
    for (const r of breakdowns) {
      if (r.dimension !== dim) continue;
      const cur = by.get(r.key) || { key: r.key, spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 };
      cur.spend += r.spend; cur.impressions += r.impressions; cur.reach += r.reach;
      cur.clicks += r.clicks; cur.leads += r.leads;
      by.set(r.key, cur);
    }
    return [...by.values()].sort((a, b) => b.spend - a.spend);
  };
  const withRates = (a: Agg) => ({
    ...a,
    cpm: a.impressions ? (a.spend / a.impressions) * 1000 : null,
    ctr: a.impressions ? (a.clicks / a.impressions) * 100 : null,
    cpl: a.leads ? a.spend / a.leads : null,
  });

  // Revenue from leads this channel produced. Payments are counted whenever they
  // landed, not only inside the window, because a lead from August can pay in
  // October and the ad spend still earned it.
  const metaLeads = adLeads.filter((l) => channelOf(l) === 'meta-ads');
  let booked = 0, received = 0, fees = 0;
  const clients: { name: string; status: string; bookedInr: number; receivedInr: number; feesInr: number; pending: number }[] = [];
  for (const l of metaLeads) {
    if (!l.payments.length) continue;
    let b = 0, rec = 0, fee = 0, pending = 0;
    for (const p of l.payments) {
      const gross = toInr(p.amount, p.currency, settings.fxUsdInr);
      b += gross;
      if (p.status === 'received') {
        const net = p.inrReceived ?? toInr(p.amount - (p.fee || 0), p.currency, settings.fxUsdInr);
        rec += net; fee += gross - net;
      } else pending += gross;
    }
    booked += b; received += rec; fees += fee;
    clients.push({ name: l.name, status: l.status, bookedInr: b, receivedInr: rec, feesInr: fee, pending });
  }
  clients.sort((a, b) => b.bookedInr - a.bookedInr);

  const spend = days.reduce((s, d) => s + d.spend, 0);
  const impressions = days.reduce((s, d) => s + d.impressions, 0);
  const clicks = days.reduce((s, d) => s + d.clicks, 0);
  const leads = days.reduce((s, d) => s + d.leads, 0);
  const added = topUps.reduce((s, t) => s + t.amount, 0);
  const gstPct = settings.gstPct ?? 18;
  const gst = spend * (gstPct / 100);

  return NextResponse.json({
    range: { from, to, days: days.length },
    connected: hasAdsToken(),
    totals: {
      spend, impressions, clicks, leads, added, gst, gstPct,
      // What is left of the money paid in, once spend and its tax come off.
      remaining: added - spend - gst,
      cpm: impressions ? (spend / impressions) * 1000 : null,
      ctr: impressions ? (clicks / impressions) * 100 : null,
      cpl: leads ? spend / leads : null,
    },
    days: days.map((d) => ({
      day: iso(d.date), spend: d.spend, impressions: d.impressions,
      reach: d.reach, clicks: d.clicks, leads: d.leads,
    })),
    topUps: topUps.map((t) => ({
      id: t.id, date: iso(t.date), amount: t.amount,
      method: t.method || 'Manual payment', note: t.note, source: t.source,
    })),
    revenue: {
      booked, received, fees,
      // The true cost of the ads is spend plus its GST; compare money in the
      // bank against money that actually left it.
      netVsSpend: received - (spend + spend * (gstPct / 100)),
      clients,
    },
    states: rollup('region').map(withRates),
    platforms: rollup('platform').map((a) => withRates({ ...a, key: a.key === 'instagram' ? 'Instagram' : a.key === 'facebook' ? 'Facebook' : 'Unattributed' })),
    audience: rollup('age_gender').map((a) => ({ ...withRates(a), ...splitAgeGender(a.key) })),
  });
}
