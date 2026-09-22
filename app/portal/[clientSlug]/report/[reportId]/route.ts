// Client-facing Store Health Report, gated behind the existing portal auth.
//
// The stored HTML is fully self-contained (inline CSS, client's own logo), so
// we serve it directly with the same cookie check the portal page uses:
// pc_<slug> HMAC cookie, or admin preview (?preview=1 + admin_session).
// Every real client open is logged for engagement tracking.
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
  if (!client || !client.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Same gate as the portal page
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  const cookieValue = cookieStore.get(`pc_${clientSlug}`)?.value;
  const adminSession = cookieStore.get('admin_session')?.value;
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  const isAdminPreview = adminSession === adminHash;

  if (cookieValue !== expected && !isAdminPreview) {
    // Send them to the portal login; they land back on the portal home.
    return NextResponse.redirect(new URL(`/portal/${clientSlug}`, req.url));
  }

  // A report is only reachable by the client it is assigned to.
  const report = await prisma.storeProofReport.findUnique({ where: { id: reportId } });
  if (!report || report.clientId !== client.id) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Engagement tracking — real client views only, never admin previews.
  if (cookieValue === expected) {
    const device = req.headers.get('user-agent')?.slice(0, 120) || null;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await prisma.$transaction([
      prisma.storeProofReportView.create({ data: { reportId: report.id, device, ip } }),
      prisma.storeProofReport.update({
        where: { id: report.id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
          ...(report.firstViewedAt ? {} : { firstViewedAt: new Date() }),
        },
      }),
    ]).catch(() => {});
  }

  return new NextResponse(report.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, no-store',
    },
  });
}
