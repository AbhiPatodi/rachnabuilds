// Everything we can learn about a lead, saved on FunnelLead.leadIntel (JSON):
//   meta   — from Meta's lead record: Facebook vs Instagram, organic, ad / ad set / campaign / form, submit time
//   email  — own domain vs free mailbox
//   visits — device, browser and IP city/state each time they open one of our links (welcome email etc.)
// Only real data: Meta's own lead fields, and what we measure (email domain, link visits).
// Meta never shares a lead's device or location per lead; a visit records them when the lead opens our link.
import { prisma } from './prisma';

const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|proton|protonmail|gmx|mail|zoho|yandex)\./i;

export type LeadIntel = {
  meta?: { platform?: string | null; organic?: boolean | null; adId?: string | null; adName?: string | null; adsetId?: string | null; adsetName?: string | null; campaignId?: string | null; campaignName?: string | null; formId?: string | null; formName?: string | null; submittedAt?: string | null; fetchedAt?: string };
  email?: { domain: string; type: 'own' | 'free' };
  visits?: { at: string; device: string; os: string; browser: string; city?: string | null; region?: string | null; country?: string | null; path?: string }[];
};

export function emailInfo(email?: string | null): LeadIntel['email'] | undefined {
  const domain = (email || '').split('@')[1]?.toLowerCase();
  if (!domain) return undefined;
  return { domain, type: FREE_MAIL.test(domain) ? 'free' : 'own' };
}

export function deviceFromUA(ua: string) {
  const s = ua || '';
  const os = /iPhone/.test(s) ? 'iOS' : /iPad/.test(s) ? 'iPadOS' : /Android/.test(s) ? 'Android'
    : /Mac OS X/.test(s) ? 'macOS' : /Windows/.test(s) ? 'Windows' : /Linux/.test(s) ? 'Linux' : 'other';
  const device = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? (/Mobile/.test(s) ? 'Android phone' : 'Android tablet')
    : /Macintosh|Windows|Linux|CrOS/.test(s) ? 'Desktop' : 'other';
  const browser = /FBAN|FBAV/.test(s) ? 'Facebook app' : /Instagram/.test(s) ? 'Instagram app' : /CriOS|Chrome/.test(s) ? 'Chrome'
    : /Safari/.test(s) ? 'Safari' : /Firefox|FxiOS/.test(s) ? 'Firefox' : 'other';
  return { device, os, browser };
}

/** Merge a patch into the lead's intel (shallow per section). */
export async function saveLeadIntel(leadId: string, patch: Partial<LeadIntel>) {
  const row = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { leadIntel: true } });
  const cur = (row?.leadIntel as LeadIntel | null) || {};
  const next: LeadIntel = { ...cur, ...patch };
  await prisma.funnelLead.update({ where: { id: leadId }, data: { leadIntel: next as object } });
  return next;
}

/** Record a visit from one of our links (device + IP location from Vercel's geo headers). Keeps the last 10. */
export async function recordLeadVisit(leadId: string, headers: Headers, path?: string) {
  const ua = headers.get('user-agent') || '';
  if (!ua || /bot|crawler|spider|preview|facebookexternalhit|WhatsApp|Slack|Google-|Mediapartners/i.test(ua)) return;
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return v; } };
  const visit = { at: new Date().toISOString(), ...deviceFromUA(ua), city: dec(headers.get('x-vercel-ip-city')), region: headers.get('x-vercel-ip-country-region'), country: headers.get('x-vercel-ip-country'), path };
  const row = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { leadIntel: true } });
  if (!row) return;
  const cur = (row.leadIntel as LeadIntel | null) || {};
  const visits = [...(cur.visits || []), visit].slice(-10);
  await prisma.funnelLead.update({ where: { id: leadId }, data: { leadIntel: { ...cur, visits } as object } });
}

/** Extra Meta lead fields, fetched separately so a field Meta rejects can never break lead capture. */
export async function fetchMetaLeadMeta(leadgenId: string, token: string): Promise<LeadIntel['meta'] | null> {
  const fields = 'platform,is_organic,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,created_time';
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${leadgenId}?fields=${fields}&access_token=${token}`);
    const j = await r.json();
    if (!r.ok || j.error) {
      // Retry without the two optional fields if Meta refuses them.
      const r2 = await fetch(`https://graph.facebook.com/v21.0/${leadgenId}?fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,created_time&access_token=${token}`);
      const j2 = await r2.json();
      if (!r2.ok || j2.error) { console.error('meta lead details failed:', JSON.stringify(j2).slice(0, 200)); return null; }
      return toMeta(j2);
    }
    return toMeta(j);
  } catch (e) { console.error('meta lead details error:', e); return null; }
}
function toMeta(j: Record<string, unknown>): LeadIntel['meta'] {
  const s = (k: string) => (j[k] == null ? null : String(j[k]));
  return { platform: s('platform'), organic: j.is_organic == null ? null : Boolean(j.is_organic), adId: s('ad_id'), adName: s('ad_name'), adsetId: s('adset_id'), adsetName: s('adset_name'), campaignId: s('campaign_id'), campaignName: s('campaign_name'), formId: s('form_id'), submittedAt: s('created_time'), fetchedAt: new Date().toISOString() };
}

/** Fill intel for Meta leads that don't have it yet (hourly cron + right after each lead). */
export async function enrichMetaLeads(limit = 25): Promise<{ enriched: number; skipped?: string }> {
  const { getPageAuth } = await import('./metaPage');
  const auth = await getPageAuth(null);
  const rows = await prisma.$queryRaw<{ id: string; email: string; phone: string | null; leadgenId: string; createdAt: Date }[]>`
    SELECT DISTINCT ON (f.id) f.id, f.email, f.phone, m."leadgenId", m."createdAt"
    FROM funnel_leads f JOIN meta_lead_events m ON lower(m.email) = lower(f.email)
    WHERE m.email NOT LIKE '%@meta.com' AND m."createdAt" > now() - interval '85 days'
      AND (f."leadIntel" IS NULL OR f."leadIntel"->'meta' IS NULL
           OR (f."leadIntel"->'meta'->>'adId' IS NULL AND coalesce(f."leadIntel"->'meta'->>'retried','') <> '2'))
    ORDER BY f.id, m."createdAt" DESC LIMIT ${limit}`;
  let enriched = 0;
  for (const r of rows) {
    let meta = auth?.token ? await fetchMetaLeadMeta(r.leadgenId, auth.token) : null;
    // The Page token often leaves ad / ad set / campaign empty: ask again with the ads token, then name the ad and form.
    if (!meta?.adId) {
      const { leadAdsMeta } = await import('./metaAds');
      const a = await leadAdsMeta(r.leadgenId);
      if (a) meta = { ...(meta || {}), ...toMeta(a as Record<string, unknown>), platform: meta?.platform ?? a.platform ?? null, organic: meta?.organic ?? (a.is_organic == null ? null : a.is_organic === 'true') };
    }
    if (meta?.adId && (!meta.adName || !meta.campaignName)) {
      const { adNamesFor } = await import('./metaAds');
      const n = await adNamesFor(meta.adId);
      meta = { ...meta, adName: meta.adName || n.adName, campaignName: meta.campaignName || n.campaignName };
    }
    if (meta?.formId && !meta.formName) {
      // Forms belong to the Page, so read the name with the Page token first.
      let name: string | null = null;
      if (auth?.token) {
        try { const j = await (await fetch(`https://graph.facebook.com/v21.0/${meta.formId}?fields=name&access_token=${auth.token}`)).json(); name = j.name || null; if (!name) console.error('form name:', JSON.stringify(j).slice(0, 200)); } catch { /* ignore */ }
      }
      if (!name) { const { formNameFor } = await import('./metaAds'); name = await formNameFor(meta.formId); }
      meta = { ...meta, formName: name };
    }
    if (meta && !meta.adId) console.error('lead has no ad_id from Meta:', r.leadgenId);
    if (meta) (meta as Record<string, unknown>).retried = '2';
    await saveLeadIntel(r.id, {
      ...(meta ? { meta } : {}),
      ...(emailInfo(r.email) ? { email: emailInfo(r.email) } : {}),
    });
    if (meta) enriched++;
  }
  return auth?.token ? { enriched } : { enriched, skipped: 'no page token' };
}
