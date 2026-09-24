// Fathom notetaker webhook: after a call, Fathom POSTs the meeting summary /
// action items / transcript here. We match an attendee email to a funnel lead
// and attach the notes to their timeline, then push the admin.
//
// Setup (Fathom → Settings → Integrations → Webhooks): URL
//   https://rachnabuilds.com/api/webhooks/fathom?key=<CRON_SECRET value>
// Include summary + action items (transcript optional — we keep a capped copy).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { safeEqual } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fathom's payload shape has varied across versions — walk the JSON and
// collect anything email-shaped rather than trusting one field path.
function collectEmails(node: unknown, out: Set<string>, depth = 0) {
  if (depth > 6 || out.size > 30) return;
  if (typeof node === 'string') {
    const s = node.trim().toLowerCase();
    if (s.length < 120 && EMAIL_RE.test(s)) out.add(s);
  } else if (Array.isArray(node)) {
    for (const v of node) collectEmails(v, out, depth + 1);
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectEmails(v, out, depth + 1);
  }
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object') {
      const nested = pickString(v as Record<string, unknown>, ['markdown_formatted', 'markdown', 'plaintext', 'text', 'summary']);
      if (nested) return nested;
    }
  }
  return '';
}

// Fathom delivers action items and the transcript as ARRAYS of objects
// (action_items: [{description,...}], transcript: [{speaker:{display_name}, text}]),
// while older/other payloads use plain strings — accept both.
function actionItemsText(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (!Array.isArray(v)) return '';
  return v
    .map((a, i) => {
      const t = typeof a === 'string' ? a : (a as Record<string, unknown>)?.description ?? (a as Record<string, unknown>)?.text;
      return t ? `${i + 1}. ${String(t).trim()}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function transcriptText(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (!Array.isArray(v)) return '';
  return v
    .map((t) => {
      if (typeof t === 'string') return t;
      const o = t as Record<string, unknown>;
      const sp = o.speaker as Record<string, unknown> | string | undefined;
      const who = typeof sp === 'string' ? sp : (sp?.display_name as string) || 'Speaker';
      return o.text ? `${who}: ${String(o.text).trim()}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

// Standard Webhooks signature (what Fathom uses): HMAC-SHA256 over
// "<webhook-id>.<webhook-timestamp>.<raw body>" with the base64-decoded
// secret ("whsec_" prefix optional); header holds "v1,<base64sig>" entries.
function validFathomSignature(req: NextRequest, raw: string, secret: string): boolean {
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sigHeader = req.headers.get('webhook-signature');
  if (!id || !ts || !sigHeader) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // 5-min replay window
  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  } catch {
    return false;
  }
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
  return sigHeader.split(' ').some((part) => {
    const sig = part.includes(',') ? part.split(',')[1] : part;
    return safeEqual(sig, expected);
  });
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!safeEqual(key, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await req.text();
  // Once FATHOM_WEBHOOK_SECRET is configured, also require Fathom's signature.
  const whSecret = process.env.FATHOM_WEBHOOK_SECRET;
  if (whSecret && !validFathomSignature(req, raw, whSecret)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }

  let body: Record<string, unknown> | null = null;
  try { body = JSON.parse(raw); } catch { /* handled below */ }
  if (!body) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

  const title = pickString(body, ['title', 'meeting_title', 'name']) || 'Call';
  // Keep Fathom's markdown structure (headings/bullets/bold — the admin UI
  // renders it); only inline timestamp links get flattened to their text.
  const deLinks = (s: string) => s.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1');
  const summary = deLinks(pickString(body, ['summary', 'ai_summary', 'default_summary', 'notes']));
  const actionItems = actionItemsText(body.action_items ?? body.actionItems) || pickString(body, ['next_steps']);
  const recordingUrl = pickString(body, ['share_url', 'recording_url', 'url', 'fathom_url']);
  const transcript = transcriptText(body.transcript) || pickString(body, ['transcript_plaintext', 'full_transcript']);

  const emails = new Set<string>();
  collectEmails(body, emails);
  const leads = emails.size
    ? await prisma.funnelLead.findMany({ where: { email: { in: [...emails] } }, select: { id: true, name: true } })
    : [];

  // Timeline stays a timeline: one lean event line. The full summary,
  // action items, transcript and recording live on the Booking (Bookings tab).
  const text = `📝 Call notes filed — ${title} (see Bookings tab)`;

  for (const lead of leads) {
    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: 'system', text, actor: 'Fathom' },
    }).catch(() => {});
    // Attach full call record to the lead's nearest booking (±36h) so the
    // transcript is queryable later for follow-up drafting.
    const booking = await prisma.booking.findFirst({
      where: {
        funnelLeadId: lead.id,
        startTime: { gte: new Date(Date.now() - 36 * 3600_000), lte: new Date(Date.now() + 36 * 3600_000) },
      },
      orderBy: { startTime: 'desc' },
      select: { id: true },
    }).catch(() => null);
    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'completed',
          ...(summary || actionItems ? { callSummary: [summary, actionItems && `ACTION ITEMS:\n${actionItems}`].filter(Boolean).join('\n\n').slice(0, 20_000) } : {}),
          ...(transcript ? { callTranscript: transcript.slice(0, 150_000) } : {}),
          ...(recordingUrl ? { recordingUrl } : {}),
        },
      }).catch(() => {});
    }
  }

  // Receipt log — lets us confirm delivery even when no lead matched.
  await prisma.setting.upsert({
    where: { key: 'fathom_last_webhook' },
    create: { key: 'fathom_last_webhook', value: '' },
    update: {},
  }).then(() =>
    prisma.setting.update({
      where: { key: 'fathom_last_webhook' },
      data: {
        value: JSON.stringify({
          at: new Date().toISOString(), title,
          matched: leads.map((l) => l.name),
          emailsSeen: [...emails].slice(0, 8),
          hasSummary: !!summary, hasActionItems: !!actionItems, hasTranscript: !!transcript, transcriptChars: transcript.length,
        }).slice(0, 1500),
      },
    }),
  ).catch(() => {});

  await sendPushToAll(
    '📝 Call notes ready',
    leads.length ? `${title} — filed to ${leads.map((l) => l.name).join(', ')}` : `${title} — no matching lead (check Inbox)`,
    leads.length ? `/admin/funnel-leads/${leads[0].id}` : '/admin/funnel-leads',
  ).catch(() => {});

  return NextResponse.json({ ok: true, matchedLeads: leads.length });
}
