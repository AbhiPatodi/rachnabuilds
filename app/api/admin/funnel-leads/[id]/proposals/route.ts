import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { defaultProposalContent, newProposalToken } from '@/lib/proposal';

export const dynamic = 'force-dynamic';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const proposals = await prisma.proposal.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' },
    include: { views: { orderBy: { viewedAt: 'desc' }, take: 20 } },
  });
  return NextResponse.json({ proposals });
}

/** Create a draft from the default two-tier template, linked to the lead's latest report. */
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({ where: { id }, select: { id: true, name: true, storeUrl: true } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const report = await prisma.storeProofReport.findFirst({
    where: { funnelLeadId: id, publicToken: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { publicToken: true },
  });
  const proposal = await prisma.proposal.create({
    data: {
      leadId: id,
      token: newProposalToken(),
      title: `Proposal for ${lead.name}`,
      content: JSON.parse(JSON.stringify(defaultProposalContent(lead))),
      reportToken: report?.publicToken ?? null,
      validUntil: new Date(Date.now() + 7 * 86400_000),
    },
  });
  await prisma.leadActivity.create({ data: { leadId: id, type: 'system', text: '📄 Proposal draft created' } }).catch(() => {});
  return NextResponse.json({ proposal });
}
