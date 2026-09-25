// Admin management for published StoreProof reports.
// Auth: admin_session cookie (enforced by proxy.ts for /api/admin/*).
//
//   GET   → list reports with assignment, CRM link, and view stats
//   PATCH → { reportId, clientId } assign to a client (null to unassign)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [reports, clients, jobs] = await Promise.all([
    prisma.storeProofReport.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, host: true, runStamp: true, storeName: true, status: true,
        publicToken: true, clientId: true, funnelLeadId: true, viewCount: true,
        firstViewedAt: true, lastViewedAt: true, createdAt: true, findingsJson: true,
        competitorsRequested: true, publicFull: true,
        client: { select: { id: true, name: true, slug: true } },
        views: { orderBy: { viewedAt: 'desc' }, take: 5, select: { viewedAt: true, device: true } },
      },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    // Audit queue health: anything not done, plus recent failures.
    prisma.storeProofJob.findMany({
      where: { OR: [{ status: { in: ['queued', 'running'] } }, { status: 'failed', updatedAt: { gte: new Date(Date.now() - 14 * 86400_000) } }] },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, host: true, name: true, status: true, error: true, attempts: true, funnelLeadId: true, createdAt: true, startedAt: true },
    }),
  ]);

  return NextResponse.json({
    clients,
    jobs,
    reports: reports.map((r) => {
      let topFindings: string[] = [];
      try {
        const f = JSON.parse(r.findingsJson);
        topFindings = (f.findings || []).slice(0, 3).map((x: { title?: string }) => x.title || '').filter(Boolean);
      } catch { /* ignore malformed findings */ }
      return { ...r, findingsJson: undefined, topFindings };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  // Retry a failed audit job
  if (body.jobId && body.action === 'retry') {
    const job = await prisma.storeProofJob.update({
      where: { id: String(body.jobId) },
      data: { status: 'queued', error: null, attempts: 0, startedAt: null, finishedAt: null },
      select: { id: true, status: true },
    });
    return NextResponse.json({ ok: true, job });
  }
  // Share the FULL report on its public link (existing clients) — or back to teaser
  if (body.reportId && typeof body.publicFull === 'boolean') {
    const r = await prisma.storeProofReport.update({
      where: { id: String(body.reportId) },
      data: { publicFull: body.publicFull },
      select: { id: true, publicFull: true },
    });
    return NextResponse.json({ ok: true, report: r });
  }
  const { reportId, clientId } = body;
  if (!reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 });

  const report = await prisma.storeProofReport.update({
    where: { id: reportId },
    data: {
      clientId: clientId || null,
      status: clientId ? 'assigned' : 'published',
    },
    select: { id: true, clientId: true, status: true, client: { select: { slug: true } } },
  });
  return NextResponse.json({ ok: true, report });
}
