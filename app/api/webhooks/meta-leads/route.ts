// Meta Lead Ads (Instant Forms) → CRM auto-sync.
//
// Meta pushes a webhook here the moment someone submits an instant form.
// We fetch the full lead via the Graph API (needs META_PAGE_ACCESS_TOKEN with
// leads_retrieval), upsert it into funnel_leads as an opt-in from facebook /
// instant-form, send the lead the training magic-link email, and notify admin.
//
// Env:
//   META_LEADS_VERIFY_TOKEN — echoed during Meta's GET verification handshake
//   META_PAGE_ACCESS_TOKEN  — long-lived Page/system-user token (leads_retrieval)
//   META_APP_SECRET         — optional; enables X-Hub-Signature-256 validation
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { notifyNewLead, sendInstantFormWelcome } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Meta's one-time endpoint verification handshake ──
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get('hub.mode') === 'subscribe' &&
    params.get('hub.verify_token') === process.env.META_LEADS_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get('hub.challenge') || '', { status: 200 });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

interface LeadgenChange {
  field: string;
  value: { leadgen_id: string; page_id: string; form_id: string; created_time: number };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Validate payload really came from Meta (when app secret configured)
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get('x-hub-signature-256') || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    if (!sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Bad signature' }, { status: 403 });
    }
  }

  let body: { entry?: Array<{ changes?: LeadgenChange[] }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 });
  }

  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  const results: Array<{ leadgenId: string; ok: boolean; reason?: string }> = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;

      if (!pageToken) {
        results.push({ leadgenId, ok: false, reason: 'no_page_token' });
        continue;
      }

      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,created_time,form_id,ad_id,ad_name,campaign_name&access_token=${pageToken}`,
        );
        const lead = await res.json();
        if (!res.ok) {
          console.error('Meta lead fetch failed:', JSON.stringify(lead).slice(0, 300));
          results.push({ leadgenId, ok: false, reason: 'fetch_failed' });
          continue;
        }

        // field_data: [{name: 'full_name', values: ['…']}, …] — names vary by form
        const fields: Record<string, string> = {};
        for (const f of lead.field_data || []) {
          fields[(f.name || '').toLowerCase()] = f.values?.[0] || '';
        }
        const pick = (...keys: string[]) => {
          for (const k of keys) if (fields[k]) return fields[k];
          const fuzzy = Object.keys(fields).find((k) => keys.some((key) => k.includes(key)));
          return fuzzy ? fields[fuzzy] : '';
        };

        const name = pick('full_name', 'name') || 'Instant Form Lead';
        const email = pick('email').trim().toLowerCase();
        const phone = pick('phone_number', 'phone');
        if (!email) {
          results.push({ leadgenId, ok: false, reason: 'no_email' });
          continue;
        }

        const dbLead = await prisma.funnelLead.upsert({
          where: { email },
          create: {
            name, email, phone: phone || null,
            utmSource: 'facebook',
            utmMedium: 'instant-form',
            utmCampaign: lead.campaign_name || null,
            utmContent: lead.ad_name || null,
          },
          update: { name, ...(phone ? { phone } : {}) },
        });

        await sendInstantFormWelcome({ id: dbLead.id, name, email }).catch(() => {});
        await sendPushToAll('⚡ Instant Form Lead!', `${name} (${email}) via Meta lead ad`, '/admin/funnel-leads').catch(() => {});
        await notifyNewLead({
          source: 'Meta Instant Form (auto-synced)',
          fields: [
            { label: 'Name', value: name },
            { label: 'Email', value: email },
            ...(phone ? [{ label: 'Phone', value: phone }] : []),
            ...(lead.campaign_name ? [{ label: 'Campaign', value: lead.campaign_name }] : []),
            ...(lead.ad_name ? [{ label: 'Ad', value: lead.ad_name }] : []),
          ],
        }).catch(() => {});

        results.push({ leadgenId, ok: true });
      } catch (err) {
        console.error('Meta lead sync error:', err);
        results.push({ leadgenId, ok: false, reason: 'exception' });
      }
    }
  }

  // Always 200 so Meta doesn't retry-storm; failures are logged above.
  return NextResponse.json({ received: results.length, results });
}
