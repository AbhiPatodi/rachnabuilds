// Public: the lead picks a plan on /proposal/<token>. Records the choice,
// logs it on the lead timeline and pings the admin phone. Payment is
// arranged by hand on WhatsApp afterwards.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimitIp } from '@/lib/rateLimit';
import { sendPushToAll } from '@/lib/webpush';
import { money, parseContent } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimitIp(req, 'proposal-accept', 10, 3600_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const proposal = await prisma.proposal.findUnique({
    where: { token },
    select: { id: true, leadId: true, content: true, acceptedTier: true, lead: { select: { name: true } } },
  });
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const content = parseContent(proposal.content);
  const tier = content?.tiers.find((t) => t.id === body.tierId);
  if (!tier) return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: 'accepted', acceptedTier: tier.id, acceptedNote: note || null, acceptedAt: new Date() },
  });
  const label = `${tier.name} (${money(tier.price, tier.currency)})`;
  await prisma.leadActivity.create({
    data: {
      leadId: proposal.leadId,
      type: 'system',
      text: `✅ Chose ${label} on the proposal${proposal.acceptedTier && proposal.acceptedTier !== tier.id ? ' (changed plan)' : ''}${note ? ` — "${note}"` : ''}`,
    },
  }).catch(() => {});
  sendPushToAll('✅ Proposal accepted!', `${proposal.lead.name} chose ${label} — send payment details`, `/admin/funnel-leads/${proposal.leadId}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
