// Reads daily spend/leads and the prepaid balance for the Meta ad account.
// Uses META_ADS_ACCESS_TOKEN, or the CAPI system-user token when that user has
// been given the ad account (its token carries ads_management/ads_read).
import { prisma } from './prisma';
import { MONEY_SETTINGS, setSetting, getMoneySettings, dayKey } from './money';
import { sendPushToAll } from './webpush';

const GRAPH = 'https://graph.facebook.com/v21.0';
export const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '1054469927180158';

function token(): string | null {
  return process.env.META_ADS_ACCESS_TOKEN || process.env.META_CAPI_ACCESS_TOKEN || null;
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const t = token();
  if (!t) throw new Error('No Meta ads token configured (META_ADS_ACCESS_TOKEN)');
  const qs = new URLSearchParams({ ...params, access_token: t }).toString();
  const res = await fetch(`${GRAPH}/${path}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`Meta: ${json.error.message || JSON.stringify(json.error)}`);
  return json as T;
}

interface InsightRow {
  date_start: string; spend?: string; impressions?: string; clicks?: string;
  actions?: { action_type: string; value: string }[];
}

/** Pull spend/impressions/clicks/leads per day for [since, until] and upsert. */
export async function syncAdSpend(since: string, until: string) {
  const data = await graph<{ data: InsightRow[] }>(`act_${AD_ACCOUNT_ID}/insights`, {
    fields: 'spend,impressions,clicks,actions',
    time_increment: '1',
    time_range: JSON.stringify({ since, until }),
    level: 'account',
  });
  let days = 0;
  for (const r of data.data || []) {
    const leads = (r.actions || []).filter((a) => /^(lead|onsite_conversion\.lead_grouped|leadgen_grouped)$/.test(a.action_type))
      .reduce((m, a) => Math.max(m, Number(a.value) || 0), 0);
    const date = new Date(`${r.date_start}T00:00:00.000Z`);
    await prisma.adSpendDay.upsert({
      where: { accountId_date: { accountId: AD_ACCOUNT_ID, date } },
      create: { accountId: AD_ACCOUNT_ID, date, spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0, leads, currency: 'INR', source: 'api' },
      update: { spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0, leads, source: 'api' },
    });
    days++;
  }
  return days;
}

interface ActivityRow { event_type: string; event_time: string; extra_data?: string }

/** Top-ups: Meta logs each prepaid payment as a funding_event_successful activity (amount in paise). */
export async function syncTopUps(sinceIso: string) {
  const data = await graph<{ data: ActivityRow[] }>(`act_${AD_ACCOUNT_ID}/activities`, {
    fields: 'event_type,event_time,extra_data',
    since: sinceIso,
    limit: '500',
  });
  let added = 0;
  for (const a of data.data || []) {
    if (a.event_type !== 'funding_event_successful') continue;
    let extra: { amount?: number; currency?: string; network_id?: string } = {};
    try { extra = JSON.parse(a.extra_data || '{}'); } catch { /* ignore */ }
    if (!extra.amount) continue;
    const date = new Date(a.event_time);
    const amount = extra.amount / 100;
    const externalKey = `${AD_ACCOUNT_ID}:${Math.floor(date.getTime() / 1000)}:${amount}`;
    const r = await prisma.adTopUp.upsert({
      where: { externalKey },
      create: { accountId: AD_ACCOUNT_ID, date, amount, currency: extra.currency || 'INR', method: extra.network_id || null, source: 'api', externalKey },
      update: {},
    });
    if (r.createdAt.getTime() > Date.now() - 60_000) added++;
  }
  return added;
}

/** Balance = everything paid in minus everything spent; used when Meta's display string can't be parsed. */
export async function computedBalance(): Promise<number> {
  const [t, s] = await Promise.all([
    prisma.adTopUp.aggregate({ where: { accountId: AD_ACCOUNT_ID }, _sum: { amount: true } }),
    prisma.adSpendDay.aggregate({ where: { accountId: AD_ACCOUNT_ID }, _sum: { spend: true } }),
  ]);
  const { gstPct } = await getMoneySettings();
  return (t._sum.amount || 0) - (s._sum.spend || 0) * (1 + gstPct / 100);
}

/** Prepaid balance: funding_source_details.display_string / balance fields. */
export async function syncBalance(): Promise<number | null> {
  const acc = await graph<{ balance?: string; funding_source_details?: { display_string?: string }; currency?: string; amount_spent?: string }>(`act_${AD_ACCOUNT_ID}`, {
    fields: 'balance,currency,funding_source_details,amount_spent',
  });
  // For prepaid accounts Meta returns the remaining amount in the display string
  // ("Available balance: ₹2,370.00"); `balance` is the unpaid amount for postpaid.
  const ds = acc.funding_source_details?.display_string || '';
  const m = ds.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  const bal = m ? Number(m[1]) : await computedBalance();
  if (bal != null) {
    await setSetting(MONEY_SETTINGS.metaBalance, String(bal));
    await setSetting(MONEY_SETTINGS.metaBalanceAt, new Date().toISOString());
  }
  return bal;
}

/** Push once a day when the balance is under the minimum line. */
export async function maybeLowBalanceAlert(balance: number | null) {
  if (balance == null) return false;
  const s = await getMoneySettings();
  if (balance >= s.minBalance) return false;
  const today = dayKey(new Date());
  const last = await prisma.setting.findUnique({ where: { key: MONEY_SETTINGS.lowBalanceAlertOn } });
  if (last?.value === today) return false;
  await sendPushToAll('⚠️ Meta ad balance low', `₹${Math.round(balance).toLocaleString('en-IN')} left (line is ₹${s.minBalance.toLocaleString('en-IN')}). Top up to keep the ads running.`, '/admin/money?tab=ads');
  await setSetting(MONEY_SETTINGS.lowBalanceAlertOn, today);
  return true;
}

export function hasAdsToken() { return !!token(); }
