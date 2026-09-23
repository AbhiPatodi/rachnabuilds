// Pull historical Instant Form leads out of Meta into the CRM.
//
// Leads submitted before the webhook was wired up sit in Meta's Leads Center
// only. This walks every lead form on the Page, fetches its leads, and imports
// any we don't already have.
//
//   GET            → dry run: forms, lead counts, which would be imported
//   POST           → import missing leads (silent by default)
//   POST ?notify=1 → also send each imported lead the welcome email
//
// Auth: Bearer CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPageAuth } from '@/lib/metaPage';
import { sendInstantFormWelcome } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GRAPH = 'https://graph.facebook.com/v21.0';

interface RawLead {
  id: string;
  created_time?: string;
  ad_name?: string;
  campaign_name?: string;
  field_data?: Array<{ name?: string; values?: string[] }>;
}

function parseLead(raw: RawLead) {
  const fields: Record<string, string> = {};
  for (const f of raw.field_data || []) fields[(f.name || '').toLowerCase()] = f.values?.[0] || '';
  const pick = (...keys: string[]) => {
    for (const k of keys) if (fields[k]) return fields[k];
    const fuzzy = Object.keys(fields).find((k) => keys.some((key) => k.includes(key)));
    return fuzzy ? fields[fuzzy] : '';
  };
  // Custom qualifying answers (anything that isn't a contact field) — same
  // treatment as the live webhook: structured formAnswers, not a notes blob.
  const CONTACT_KEYS = ['full_name', 'name', 'email', 'phone_number', 'phone'];
  const formAnswers: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v && !CONTACT_KEYS.some((c) => k === c || k.includes(c))) {
      formAnswers[k.replace(/_/g, ' ').replace(/\?$/, '')] = v;
    }
  }

  return {
    metaId: raw.id,
    // Meta's Lead Ads Testing Tool submits dummy rows — never import them
    isMetaTest: pick('email').includes('@meta.com') || (pick('full_name', 'name') || '').startsWith('<test lead'),
    name: pick('full_name', 'name') || 'Instant Form Lead',
    email: pick('email').trim().toLowerCase(),
    phone: pick('phone_number', 'phone'),
    formAnswers: Object.keys(formAnswers).length ? formAnswers : null,
    createdTime: raw.created_time,
    adName: raw.ad_name,
    campaignName: raw.campaign_name,
  };
}

// Follow Graph pagination, bounded so a runaway never hangs the lambda
async function fetchAll<T>(url: string, cap = 10): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  for (let i = 0; i < cap && next; i++) {
    const page: { data?: T[]; paging?: { next?: string } } = await fetch(next).then((r) => r.json());
    if (Array.isArray(page?.data)) out.push(...page.data);
    next = page?.paging?.next ?? null;
  }
  return out;
}

async function collect(token: string, pageId: string) {
  const forms = await fetchAll<{ id: string; name?: string; leads_count?: number }>(
    `${GRAPH}/${pageId}/leadgen_forms?fields=id,name,leads_count,status&limit=50&access_token=${token}`,
  );

  const perForm: Array<{ formId: string; formName?: string; leads: ReturnType<typeof parseLead>[] }> = [];
  for (const form of forms) {
    const raw = await fetchAll<RawLead>(
      `${GRAPH}/${form.id}/leads?fields=id,created_time,field_data,ad_name,campaign_name&limit=100&access_token=${token}`,
    );
    perForm.push({ formId: form.id, formName: form.name, leads: raw.map(parseLead) });
  }
  return { forms, perForm };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const page = await getPageAuth(null);
  if (!page) return NextResponse.json({ error: 'No Page token' }, { status: 400 });

  const { forms, perForm } = await collect(page.token, page.pageId);
  const emails = perForm.flatMap((f) => f.leads.map((l) => l.email)).filter(Boolean);
  const existing = emails.length
    ? await prisma.funnelLead.findMany({ where: { email: { in: emails } }, select: { email: true } })
    : [];
  const have = new Set(existing.map((e) => e.email));

  return NextResponse.json({
    pageId: page.pageId,
    forms: forms.map((f) => ({ id: f.id, name: f.name, leads_count: f.leads_count })),
    totals: {
      leadsInMeta: emails.length,
      alreadyInCrm: emails.filter((e) => have.has(e)).length,
      wouldImport: emails.filter((e) => !have.has(e)).length,
    },
    preview: perForm.flatMap((f) =>
      f.leads
        .filter((l) => l.email && !have.has(l.email))
        .map((l) => ({ form: f.formName, name: l.name, email: l.email, created: l.createdTime })),
    ),
  });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const page = await getPageAuth(null);
  if (!page) return NextResponse.json({ error: 'No Page token' }, { status: 400 });

  const notify = req.nextUrl.searchParams.get('notify') === '1';
  const { perForm } = await collect(page.token, page.pageId);

  const imported: string[] = [];
  const skipped: string[] = [];

  for (const form of perForm) {
    for (const lead of form.leads) {
      if (!lead.email || lead.isMetaTest) continue;
      const exists = await prisma.funnelLead.findUnique({ where: { email: lead.email } });
      if (exists) {
        // Patch in structured answers if an earlier import missed them, and
        // clean up the legacy notes-blob format while we're here.
        if (lead.formAnswers && !exists.formAnswers) {
          const cleanedNotes = exists.notes
            ?.split('\n')
            .filter((s) => !s.startsWith('Instant Form answers'))
            .join('\n')
            .trim() || null;
          await prisma.funnelLead.update({
            where: { id: exists.id },
            data: { formAnswers: lead.formAnswers, notes: cleanedNotes },
          }).catch(() => {});
        }
        skipped.push(lead.email);
        continue;
      }
      const created = await prisma.funnelLead.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone || null,
          utmSource: 'facebook',
          utmMedium: 'instant-form',
          utmCampaign: lead.campaignName || null,
          utmContent: lead.adName || form.formName || null,
          ...(lead.formAnswers ? { formAnswers: lead.formAnswers } : {}),
          ...(lead.createdTime ? { createdAt: new Date(lead.createdTime) } : {}),
        },
      });
      imported.push(lead.email);
      if (notify) {
        await sendInstantFormWelcome({ id: created.id, name: lead.name, email: lead.email }).catch(
          () => {},
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    notified: notify,
    imported: imported.length,
    skipped: skipped.length,
    importedEmails: imported,
  });
}
