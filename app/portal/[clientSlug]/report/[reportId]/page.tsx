// Client-facing FULL Store Health Report, gated behind portal auth.
// Same pc_<slug> cookie gate as the portal home; admin_session previews.
// Real client opens are view-logged for engagement tracking.
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import FullReport, { FullReportPayload } from '@/app/components/storeproof/FullReport';
import { isAdminToken, isClientPortalToken } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

export const dynamic = 'force-dynamic';

export default async function PortalReportPage({
  params,
}: {
  params: Promise<{ clientSlug: string; reportId: string }>;
}) {
  const { clientSlug, reportId } = await params;
  const cookieStore = await cookies();

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true, isActive: true },
  });
  if (!client || !client.isActive) notFound();

  const clientOk = await isClientPortalToken(clientSlug, cookieStore.get(`pc_${clientSlug}`)?.value);
  const isAdminPreview = await isAdminToken(cookieStore.get('admin_session')?.value);

  if (!clientOk && !isAdminPreview) {
    redirect(`/portal/${clientSlug}`);
  }

  const report = await prisma.storeProofReport.findUnique({ where: { id: reportId } });
  if (!report || report.clientId !== client.id) notFound();

  // Engagement tracking — real client views only, never admin previews
  if (clientOk && !isAdminPreview) {
    await prisma.storeProofReportView.create({ data: { reportId: report.id, device: 'portal' } }).catch(() => {});
    await prisma.storeProofReport.update({
      where: { id: report.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        ...(report.firstViewedAt ? {} : { firstViewedAt: new Date() }),
      },
    }).catch(() => {});
  }

  let payload: FullReportPayload = {};
  try { payload = JSON.parse(report.findingsJson); } catch { /* legacy */ }

  if (!payload.findings?.length) {
    return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.html) }} />;
  }

  return (
    <FullReport
      payload={payload}
      storeName={report.storeName}
      host={report.host}
      pdfUrl={report.pdfData ? `/portal/${clientSlug}/report/${report.id}/pdf` : null}
    />
  );
}
