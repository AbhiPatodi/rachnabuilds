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

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Bad payload' }, { status: 400 });

  const title = pickString(body, ['title', 'meeting_title', 'name']) || 'Call';
  // Fathom summaries arrive as markdown — strip the syntax so the admin UI
  // (which renders plain text) reads cleanly.
  const deMd = (s: string) => s
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/^#{1,4}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
  const summary = deMd(pickString(body, ['summary', 'ai_summary', 'default_summary', 'notes']));
  const actionItems = pickString(body, ['action_items', 'actionItems', 'next_steps']);
  const recordingUrl = pickString(body, ['share_url', 'recording_url', 'url', 'fathom_url']);
  const transcript = pickString(body, ['transcript', 'transcript_plaintext', 'full_transcript']);

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
          hasSummary: !!summary, hasActionItems: !!actionItems,
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
