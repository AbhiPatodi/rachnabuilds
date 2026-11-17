// Daily: store yesterday's + today's Meta spend/leads, refresh the prepaid
// balance, and push a low-balance warning once a day when it's under the line.
import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { hasAdsToken, syncAdSpend, syncBalance, syncTopUps, maybeLowBalanceAlert, syncBreakdowns, adsPulse } from '@/lib/metaAds';
import { dayKey } from '@/lib/money';
import { sendRawLeadSignals, sendEngagedSignals } from '@/lib/leadStatus';
import { enrichMetaLeads, autoAttributeLeads } from '@/lib/leadIntel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Raw-lead stage to Meta for any Instant Form lead not sent yet (needs only the CAPI token).
  const rawLeads = await sendRawLeadSignals().catch((e) => ({ error: (e as Error).message }));
  const engaged = await sendEngagedSignals().catch((e) => ({ error: (e as Error).message }));
  const intel = await enrichMetaLeads().catch((e) => ({ error: (e as Error).message }));
  const attribution = await autoAttributeLeads().catch((e) => ({ error: (e as Error).message }));
  // ?apps=1: which Meta app each token belongs to (names/ids only, never the tokens).
  let apps: unknown = undefined;
  if (req.nextUrl.searchParams.get('apps')) {
    const who = async (t?: string) => { if (!t) return null; try { return await (await fetch(`https://graph.facebook.com/v21.0/app?fields=id,name&access_token=${t}`)).json(); } catch (e) { return { error: (e as Error).message }; } };
    const { getPageAuth } = await import('@/lib/metaPage');
    const page = await getPageAuth(null).catch(() => null);
    apps = { adsToken: await who(process.env.META_ADS_ACCESS_TOKEN), pageToken: await who(page?.token), pageEnvToken: await who(process.env.META_PAGE_ACCESS_TOKEN), capiToken: await who(process.env.META_CAPI_ACCESS_TOKEN) };
  }
  if (!hasAdsToken()) return NextResponse.json({ skipped: 'no META_ADS_ACCESS_TOKEN', rawLeads, engaged, intel, attribution, apps });
  try {
    // ?days=N re-pulls a longer window (backfill after adding a field); default 3.
    const back = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 3));
    const since = dayKey(new Date(Date.now() - back * 86400_000));
    const days = await syncAdSpend(since, dayKey(new Date()));
    // Region / platform / age+gender for the same window, feeding the Meta Ads report.
    const breakdowns = await syncBreakdowns(since, dayKey(new Date())).catch(() => ({}));
    const topUps = await syncTopUps(new Date(Date.now() - 45 * 86400_000).toISOString()).catch(() => 0);
    const balance = await syncBalance().catch(() => null);
    const alerted = await maybeLowBalanceAlert(balance);
    // ?pulse=1 (hourly run): push today's numbers to the owner's phones when they moved.
    const pulse = req.nextUrl.searchParams.get('pulse') ? await adsPulse(balance).catch(() => null) : null;
    return NextResponse.json({ ok: true, days, breakdowns, topUps, balance, alerted, pulse, rawLeads, engaged, intel, attribution, apps });
  } catch (e) {
    // 200 on purpose: a Meta-side error shouldn't turn the scheduled workflow red every run.
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
