import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAuditReport } from '@/lib/auditBot';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (!lead.storeUrl) return NextResponse.json({ error: 'Lead has no store URL' }, { status: 400 });

  const audit = await prisma.auditReport.create({
    data: { funnelLeadId: id, storeUrl: lead.storeUrl, status: 'generating' },
  });

  try {
    await generateAuditReport(audit.id);
    const fresh = await prisma.auditReport.findUnique({ where: { id: audit.id } });
    return NextResponse.json({ ok: true, id: audit.id, token: fresh?.token, status: fresh?.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Audit generation failed', id: audit.id },
      { status: 500 }
    );
  }
}
