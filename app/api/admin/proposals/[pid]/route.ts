import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseContent } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

interface RouteContext { params: Promise<{ pid: string }> }

const TERMINAL = new Set(['closed_won', 'closed_lost', 'disqualified']);

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { pid } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.proposal.findUnique({ where: { id: pid }, select: { id: true, leadId: true, status: true } });
  if (!existing) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  if (body.action === 'mark_sent') {
    const proposal = await prisma.proposal.update({
      where: { id: pid },
      data: { status: existing.status === 'accepted' ? 'accepted' : 'sent', sentAt: new Date() },
    });
    const lead = await prisma.funnelLead.findUnique({ where: { id: existing.leadId }, select: { status: true } });
    if (lead && !TERMINAL.has(lead.status) && lead.status !== 'proposal_sent') {
      await prisma.funnelLead.update({ where: { id: existing.leadId }, data: { status: 'proposal_sent' } });
      await prisma.leadActivity.create({ data: { leadId: existing.leadId, type: 'status', text: `Status: ${lead.status} → proposal_sent` } }).catch(() => {});
    }
    await prisma.leadActivity.create({ data: { leadId: existing.leadId, type: 'system', text: '📤 Proposal sent' } }).catch(() => {});
    return NextResponse.json({ proposal });
  }

  const data: { title?: string; content?: object; validUntil?: Date | null; reportToken?: string | null; status?: string } = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 200);
  if (body.content !== undefined) {
    const content = parseContent(body.content);
    if (!content) return NextResponse.json({ error: 'content must include a tiers array' }, { status: 400 });
    data.content = JSON.parse(JSON.stringify(content));
  }
  if (body.validUntil !== undefined) {
    const d = body.validUntil ? new Date(body.validUntil) : null;
    if (d && isNaN(d.getTime())) return NextResponse.json({ error: 'invalid validUntil' }, { status: 400 });
    data.validUntil = d;
  }
  if (body.reportToken !== undefined) data.reportToken = body.reportToken ? String(body.reportToken).slice(0, 64) : null;
  if (body.status !== undefined) {
    if (!['draft', 'sent', 'accepted', 'declined'].includes(body.status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    data.status = body.status;
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  const proposal = await prisma.proposal.update({ where: { id: pid }, data });
  return NextResponse.json({ proposal });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { pid } = await params;
  await prisma.proposal.delete({ where: { id: pid } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
