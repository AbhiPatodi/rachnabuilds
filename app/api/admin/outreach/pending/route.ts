// Cold-email replies whose report is built and waiting to be approved, plus the
// approval action itself. A report only reaches a prospect once a human has read
// it — three checker families have shipped false findings, and a wrong claim
// about someone's own store ends the conversation.
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { replyToEmail, hasInstantlyKey } from '@/lib/instantly';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

type ColdReply = {
  emailId?: string; eaccount?: string; subject?: string;
  at?: string; readyAt?: string; sentAt?: string; token?: string; jobId?: string;
};

/** Everything a reply has told us, newest first. */
export async function GET() {
  const rows = await prisma.prospect.findMany({
    where: { stage: 'replied', NOT: { coldReply: { equals: Prisma.JsonNull } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true, email: true, name: true, storeName: true, domain: true,
      finding: true, issueCount: true, reportId: true, coldReply: true, promotedLeadId: true,
    },
  });
  const items = rows.map((r) => {
    const cr = (r.coldReply || {}) as ColdReply;
    return {
      id: r.id, email: r.email, name: r.name, storeName: r.storeName, domain: r.domain,
      finding: r.finding, issueCount: r.issueCount, leadId: r.promotedLeadId,
      repliedAt: cr.at || null,
      readyAt: cr.readyAt || null,
      sentAt: cr.sentAt || null,
      reportUrl: cr.token ? `https://rachnabuilds.com/report/${cr.token}` : null,
      canSend: !!(cr.readyAt && !cr.sentAt && cr.emailId && cr.eaccount),
      // Why it can't be sent yet, so the page doesn't just show a dead button.
      blocked: !cr.readyAt ? 'audit still running'
        : cr.sentAt ? null
        : !cr.emailId || !cr.eaccount ? 'no reply thread recorded — send it by hand'
        : null,
    };
  });
  return NextResponse.json({ items, instantly: hasInstantlyKey() });
}

/** Approve one: send the report link back in the prospect's own reply thread. */
export async function POST(req: NextRequest) {
  if (!hasInstantlyKey()) return NextResponse.json({ error: 'Instantly key is not configured' }, { status: 400 });
  const { id } = await req.json().catch(() => ({ id: '' }));
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const cr = (p.coldReply || {}) as ColdReply;
  if (cr.sentAt) return NextResponse.json({ error: 'Already sent' }, { status: 409 });
  if (!cr.token) return NextResponse.json({ error: 'The report is not ready yet' }, { status: 409 });
  if (!cr.emailId || !cr.eaccount) return NextResponse.json({ error: 'No reply thread recorded — send this one by hand' }, { status: 409 });

  const link = `https://rachnabuilds.com/report/${cr.token}`;
  const first = (p.name || '').split(' ')[0] || 'there';
  const store = p.storeName || p.domain || 'your store';
  try {
    await replyToEmail(
      cr.emailId, cr.eaccount,
      `Re: ${(cr.subject || '').replace(/^re:\s*/i, '') || 'your store'}`,
      `Here you go, ${first}: ${link}\n\nThat's the full check-up of ${store}, done on a phone the way your customers see it. The first findings are open; the rest unlock if you want to go through them together.\n\nIf anything's unclear, just reply here.\n\nRachna`,
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  await prisma.prospect.update({ where: { id }, data: { coldReply: { ...cr, sentAt: new Date().toISOString() } } });
  if (p.promotedLeadId) {
    await prisma.leadActivity.create({
      data: { leadId: p.promotedLeadId, type: 'system', text: `✅ Report approved and sent in the cold-email thread (${link})` },
    }).catch(() => {});
  }
  sendPushToAll('✅ Report sent', `${store} → ${p.email}`, '/admin/outreach').catch(() => {});
  return NextResponse.json({ ok: true, link });
}
