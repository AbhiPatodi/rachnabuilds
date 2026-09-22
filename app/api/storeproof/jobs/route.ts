// StoreProof worker queue (polled by the Mac worker; Railway later).
//
//   GET  ?action=claim    → atomically claim the oldest queued job (or 204)
//   POST { jobId, ok, host?, runStamp?, error? }
//        → complete a job: link the published report, mint the public token,
//          email the lead their blurred-report link, notify admin.
//
// Auth: Bearer STOREPROOF_PUBLISH_SECRET. Lives outside /api/admin (proxy.ts
// cookie-guards those paths).
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendAuditReportReady } from '@/lib/email';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function unauthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return !process.env.STOREPROOF_PUBLISH_SECRET || auth !== `Bearer ${process.env.STOREPROOF_PUBLISH_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (req.nextUrl.searchParams.get('action') !== 'claim') {
    // Plain status listing for debugging
    const jobs = await prisma.storeProofJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    return NextResponse.json({ jobs });
  }

  // Atomic claim: only one worker instance can win a given job.
  const claimed = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE storeproof_jobs SET status = 'running', "startedAt" = now(),
      attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM storeproof_jobs WHERE status = 'queued'
      ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING id`;
  if (!claimed.length) return new NextResponse(null, { status: 204 });

  const job = await prisma.storeProofJob.findUnique({ where: { id: claimed[0].id } });
  return NextResponse.json({ job });
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jobId, ok, host, runStamp, error } = await req.json();
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  const job = await prisma.storeProofJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: 'job not found' }, { status: 404 });

  if (!ok) {
    await prisma.storeProofJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: String(error || 'unknown'), finishedAt: new Date() },
    });
    await sendPushToAll('⚠️ StoreProof audit failed', `${job.host} — ${String(error || 'unknown').slice(0, 80)}`, '/admin/storeproof').catch(() => {});
    return NextResponse.json({ ok: true, status: 'failed' });
  }

  // The worker publishes the report (existing /api/storeproof/publish) before
  // calling complete — find it and mint the public token.
  const report = await prisma.storeProofReport.findUnique({
    where: { host_runStamp: { host: host || job.host, runStamp } },
  });
  if (!report) {
    return NextResponse.json({ error: 'published report not found for job' }, { status: 400 });
  }

  const publicToken = report.publicToken || crypto.randomBytes(18).toString('base64url');
  // Sequential on purpose: the report row is large (inline screenshots) and
  // batch transactions hit Prisma's 5s interactive timeout over remote pg.
  await prisma.storeProofReport.update({
    where: { id: report.id },
    data: { publicToken, ...(job.funnelLeadId ? { funnelLeadId: job.funnelLeadId } : {}) },
  });
  await prisma.storeProofJob.update({
    where: { id: jobId },
    data: { status: 'done', reportId: report.id, finishedAt: new Date() },
  });

  await sendAuditReportReady({
    name: job.name,
    email: job.email,
    storeName: report.storeName,
    token: publicToken,
    leadId: job.funnelLeadId,
  }).catch(() => {});
  await sendPushToAll('⚡ Audit report delivered', `${report.storeName} → ${job.email}`, '/admin/storeproof').catch(() => {});

  return NextResponse.json({ ok: true, status: 'done', publicToken });
}
