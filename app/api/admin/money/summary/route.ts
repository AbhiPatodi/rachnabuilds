import { NextRequest, NextResponse, after } from 'next/server';
import { monthSummary, ymOf } from '@/lib/money';
import { hasAdsToken, syncIfStale } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  after(() => syncIfStale(6)); // refresh Meta numbers in the background when the cron has fallen behind
  const ym = req.nextUrl.searchParams.get('month') || ymOf(new Date());
  if (!/^\d{4}-\d{2}$/.test(ym)) return NextResponse.json({ error: 'month=YYYY-MM' }, { status: 400 });
  // Current month plus the five before it, for the comparison strip.
  const [y, m] = ym.split('-').map(Number);
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(y, m - 1 - i, 1)); months.push(ymOf(d)); }
  const [current, ...rest] = await Promise.all([monthSummary(ym), ...months.filter((x) => x !== ym).map(monthSummary)]);
  const history = [...rest, current].sort((a, b) => a.month.localeCompare(b.month)).map((s) => ({ month: s.month, income: s.income.inr, expenses: s.expenses.inr, net: s.net, adSpend: s.ads.spendInr, leads: s.ads.leads }));
  return NextResponse.json({ ...current, history, adsConnected: hasAdsToken() });
}
