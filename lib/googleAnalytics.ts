import { google } from 'googleapis';
import { prisma } from './prisma';
import { getAuthedClient } from './googleCalendar';

// GA4 Data API reads, reusing the same Google OAuth connection as
// Calendar/Gmail (scope analytics.readonly — added 2026-08; connections made
// before that need a one-time Reconnect on /admin/calendar).
//
// The DATA API needs the numeric property id (not the G- measurement id).
// We auto-discover it via the Admin API when possible and cache it in the
// settings table; it can also be saved manually from the admin UI.

const PROPERTY_KEY = 'ga4_property_id';

export async function getStoredPropertyId(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: PROPERTY_KEY } });
  return row?.value ?? null;
}

export async function savePropertyId(id: string): Promise<void> {
  const clean = id.replace(/[^0-9]/g, '');
  if (!clean) throw new Error('Property ID must be numeric');
  await prisma.setting.upsert({
    where: { key: PROPERTY_KEY },
    create: { key: PROPERTY_KEY, value: clean },
    update: { value: clean },
  });
}

/** Try to find the GA4 property via the Analytics Admin API (may fail if
 *  that API isn't enabled on the GCP project — that's fine, we fall back to
 *  the manually entered id). */
async function discoverPropertyId(auth: InstanceType<typeof google.auth.OAuth2>): Promise<string | null> {
  try {
    const admin = google.analyticsadmin({ version: 'v1beta', auth });
    const { data } = await admin.accountSummaries.list({ pageSize: 50 });
    for (const account of data.accountSummaries || []) {
      for (const prop of account.propertySummaries || []) {
        // property: "properties/123456789"
        const id = prop.property?.split('/')[1];
        if (id) {
          await savePropertyId(id);
          return id;
        }
      }
    }
  } catch {
    // Admin API not enabled or no access — caller falls back to stored id
  }
  return null;
}

export interface GaSnapshot {
  propertyId: string;
  totals: { activeUsers: number; newUsers: number; sessions: number; pageViews: number };
  daily: Array<{ date: string; activeUsers: number; sessions: number }>;
  topPages: Array<{ path: string; views: number }>;
  topSources: Array<{ source: string; sessions: number }>;
}

export type GaResult =
  | { ok: true; snapshot: GaSnapshot }
  | { ok: false; reason: 'not_connected' | 'property_missing' | 'reconnect_needed' | 'api_error'; detail?: string };

export async function getTrafficSnapshot(days = 28): Promise<GaResult> {
  const auth = await getAuthedClient();
  if (!auth) return { ok: false, reason: 'not_connected' };

  let propertyId = await getStoredPropertyId();
  if (!propertyId) propertyId = await discoverPropertyId(auth);
  if (!propertyId) return { ok: false, reason: 'property_missing' };

  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
  const property = `properties/${propertyId}`;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  try {
    const [totalsRes, dailyRes, pagesRes, sourcesRes] = await Promise.all([
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          metrics: [
            { name: 'activeUsers' }, { name: 'newUsers' },
            { name: 'sessions' }, { name: 'screenPageViews' },
          ],
        },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '8',
        },
      }),
      analyticsdata.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: '8',
        },
      }),
    ]);

    const totalsRow = totalsRes.data.rows?.[0]?.metricValues || [];
    const num = (i: number) => Number(totalsRow[i]?.value || 0);

    return {
      ok: true,
      snapshot: {
        propertyId,
        totals: { activeUsers: num(0), newUsers: num(1), sessions: num(2), pageViews: num(3) },
        daily: (dailyRes.data.rows || []).map((r) => ({
          date: r.dimensionValues?.[0]?.value || '',
          activeUsers: Number(r.metricValues?.[0]?.value || 0),
          sessions: Number(r.metricValues?.[1]?.value || 0),
        })),
        topPages: (pagesRes.data.rows || []).map((r) => ({
          path: r.dimensionValues?.[0]?.value || '',
          views: Number(r.metricValues?.[0]?.value || 0),
        })),
        topSources: (sourcesRes.data.rows || []).map((r) => ({
          source: r.dimensionValues?.[0]?.value || '',
          sessions: Number(r.metricValues?.[0]?.value || 0),
        })),
      },
    };
  } catch (err) {
    const e = err as { code?: number; message?: string };
    // 403 with insufficient scopes = old refresh token without analytics scope
    if (e.code === 403 && /insufficient|scope/i.test(e.message || '')) {
      return { ok: false, reason: 'reconnect_needed', detail: e.message };
    }
    if (e.code === 403) {
      return { ok: false, reason: 'reconnect_needed', detail: e.message };
    }
    return { ok: false, reason: 'api_error', detail: e.message };
  }
}
