// Manual "pull now" from the Money page.
import { NextRequest, NextResponse } from 'next/server';
import { hasAdsToken, syncAdSpend, syncBalance, syncTopUps, maybeLowBalanceAlert, syncBreakdowns } from '@/lib/metaAds';
import { dayKey } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!hasAdsToken()) return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN is not set in Vercel yet.' }, { status: 400 });
  try {
    const until = dayKey(new Date());
    // ?days=N widens the window — the report needs the whole account history the
    // first time the breakdown tables are filled, not just the last month.
    const back = Math.min(120, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 34));
    const since = dayKey(new Date(Date.now() - back * 86400_000));
    const days = await syncAdSpend(since, until);
    // Region / platform / age+gender, so the report can be cut by date range.
    const breakdowns = await syncBreakdowns(since, until).catch(() => ({}));
    const topUps = await syncTopUps(new Date(Date.now() - 400 * 86400_000).toISOString()).catch(() => 0);
    const balance = await syncBalance().catch(() => null);
    const alerted = await maybeLowBalanceAlert(balance);
    return NextResponse.json({ ok: true, days, breakdowns, topUps, balance, alerted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
