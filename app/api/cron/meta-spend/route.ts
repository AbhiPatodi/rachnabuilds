// Daily: store yesterday's + today's Meta spend/leads, refresh the prepaid
// balance, and push a low-balance warning once a day when it's under the line.
import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { hasAdsToken, syncAdSpend, syncBalance, syncTopUps, maybeLowBalanceAlert } from '@/lib/metaAds';
import { dayKey } from '@/lib/money';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasAdsToken()) return NextResponse.json({ skipped: 'no META_ADS_ACCESS_TOKEN' });
  try {
    const days = await syncAdSpend(dayKey(new Date(Date.now() - 3 * 86400_000)), dayKey(new Date()));
    const topUps = await syncTopUps(new Date(Date.now() - 45 * 86400_000).toISOString()).catch(() => 0);
    const balance = await syncBalance().catch(() => null);
    const alerted = await maybeLowBalanceAlert(balance);
    return NextResponse.json({ ok: true, days, topUps, balance, alerted });
  } catch (e) {
    // 200 on purpose: a Meta-side error shouldn't turn the scheduled workflow red every run.
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
