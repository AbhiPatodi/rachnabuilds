// Manual "pull now" from the Money page.
import { NextResponse } from 'next/server';
import { hasAdsToken, syncAdSpend, syncBalance, maybeLowBalanceAlert } from '@/lib/metaAds';
import { dayKey } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!hasAdsToken()) return NextResponse.json({ error: 'META_ADS_ACCESS_TOKEN is not set in Vercel yet.' }, { status: 400 });
  try {
    const until = dayKey(new Date());
    const since = dayKey(new Date(Date.now() - 34 * 86400_000));
    const days = await syncAdSpend(since, until);
    const balance = await syncBalance().catch(() => null);
    const alerted = await maybeLowBalanceAlert(balance);
    return NextResponse.json({ ok: true, days, balance, alerted });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
