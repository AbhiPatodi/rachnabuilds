// Technical PDF download (admin). Auth: admin_session via proxy.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { id },
    select: { host: true, runStamp: true, pdfData: true },
  });
  if (!report?.pdfData) return NextResponse.json({ error: 'No PDF for this report' }, { status: 404 });
  return new NextResponse(Buffer.from(report.pdfData), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.host}-technical-report-${report.runStamp}.pdf"`,
    },
  });
}
