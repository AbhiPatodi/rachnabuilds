// Public technical-PDF download — only for reports explicitly shared in full
// (publicFull), never for lead teasers where the detail is the incentive to talk.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { publicToken: token },
    select: { host: true, publicFull: true, pdfData: true, funnelLeadId: true, clientId: true },
  });
  if (!report || !report.publicFull || !report.pdfData || (report.funnelLeadId && !report.clientId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(Buffer.from(report.pdfData), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.host}-technical-report.pdf"`,
    },
  });
}
