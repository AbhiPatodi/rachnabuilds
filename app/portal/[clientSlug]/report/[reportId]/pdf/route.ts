// Technical PDF download for the client — same portal gate as the report page.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; reportId: string }> },
) {
  const { clientSlug, reportId } = await params;
  const cookieStore = await cookies();

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, isActive: true },
  });
  if (!client || !client.isActive) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  const cookieValue = cookieStore.get(`pc_${clientSlug}`)?.value;
  const adminSession = cookieStore.get('admin_session')?.value;
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  if (cookieValue !== expected && adminSession !== adminHash) {
    return NextResponse.redirect(new URL(`/portal/${clientSlug}`, req.url));
  }

  const report = await prisma.storeProofReport.findUnique({
    where: { id: reportId },
    select: { clientId: true, host: true, runStamp: true, pdfData: true },
  });
  if (!report || report.clientId !== client.id || !report.pdfData) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return new NextResponse(Buffer.from(report.pdfData), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.host}-technical-report.pdf"`,
    },
  });
}
