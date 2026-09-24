import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ['new', 'confirmed', 'call_booked', 'showed', 'closed_won', 'closed_lost', 'disqualified'];

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({
    where: { id },
    include: {
      auditReports: { orderBy: { createdAt: 'desc' } },
      bookings: { orderBy: { startTime: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // StoreProof report engagement for the timeline
  const spReports = await prisma.storeProofReport.findMany({
    where: { funnelLeadId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, storeName: true, host: true, publicToken: true, viewCount: true,
      lastViewedAt: true, createdAt: true,
      views: { orderBy: { viewedAt: 'desc' }, take: 10, select: { viewedAt: true, durationSec: true, scrollPct: true, country: true, city: true, os: true, browser: true, screen: true, clicks: true, ip: true, sections: true } },
    },
  });

  // Latest audit job for this lead (drives the Store Audit card status)
  const auditJob = await prisma.storeProofJob.findFirst({
    where: { funnelLeadId: id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, host: true, error: true, createdAt: true, startedAt: true },
  });

  const emailLogs = await prisma.funnelEmailLog.findMany({
    where: { email: lead.email.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const watches = await prisma.videoWatch.findMany({ where: { email: lead.email } });
  const videoWatch = watches.length
    ? watches.reduce(
        (acc, w) => ({
          secondsWatched: acc.secondsWatched + w.secondsWatched,
          maxPosition: Math.max(acc.maxPosition, w.maxPosition),
          duration: Math.max(acc.duration, w.duration),
        }),
        { secondsWatched: 0, maxPosition: 0, duration: 0 },
      )
    : null;

  return NextResponse.json({ ...lead, videoWatch, emailLogs, spReports, auditJob });
}

/** Add a manual note to the lead's timeline (PWA quick action). */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { text, actor } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });
  const activity = await prisma.leadActivity.create({
    data: { leadId: id, type: 'note', text: String(text).trim().slice(0, 2000), actor: actor || null },
  });
  return NextResponse.json({ ok: true, activity });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await req.json();
  const data: { status?: string; notes?: string } = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    data.status = body.status;
  }
  if (body.notes !== undefined) data.notes = String(body.notes);

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const before = data.status !== undefined
      ? await prisma.funnelLead.findUnique({ where: { id }, select: { status: true } })
      : null;
    const lead = await prisma.funnelLead.update({ where: { id }, data });
    if (data.status !== undefined && before && before.status !== data.status) {
      await prisma.leadActivity.create({
        data: { leadId: id, type: 'status', text: `Status: ${before.status} → ${data.status}` },
      }).catch(() => {});
    }
    return NextResponse.json(lead);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.funnelLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
