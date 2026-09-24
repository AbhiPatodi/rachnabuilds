// Admin full-report viewer (auth via admin layout / proxy.ts).
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import FullReport, { FullReportPayload } from '@/app/components/storeproof/FullReport';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

export const dynamic = 'force-dynamic';

export default async function AdminFullReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { id },
    select: { id: true, storeName: true, host: true, findingsJson: true, html: true, pdfData: true },
  });
  if (!report) notFound();

  let payload: FullReportPayload = {};
  try { payload = JSON.parse(report.findingsJson); } catch { /* legacy */ }

  if (!payload.findings?.length) {
    // Legacy publish without a structured payload — serve the stored HTML as-is
    return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.html) }} />;
  }

  return (
    <FullReport
      payload={payload}
      storeName={report.storeName}
      host={report.host}
      pdfUrl={report.pdfData ? `/api/admin/storeproof/${report.id}/pdf` : null}
    />
  );
}
