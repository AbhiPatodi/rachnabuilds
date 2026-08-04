import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const stage = searchParams.get('stage');

  const leads = await prisma.funnelLead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      auditReports: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, token: true, error: true, updatedAt: true },
      },
    },
  });

  // Attach VSL watch progress (a lead may have several sessions — aggregate)
  const watches = await prisma.videoWatch.findMany({
    where: { email: { in: leads.map((l) => l.email) } },
  });
  const watchByEmail = new Map<string, { secondsWatched: number; maxPosition: number; duration: number }>();
  for (const w of watches) {
    if (!w.email) continue;
    const cur = watchByEmail.get(w.email) || { secondsWatched: 0, maxPosition: 0, duration: 0 };
    watchByEmail.set(w.email, {
      secondsWatched: cur.secondsWatched + w.secondsWatched,
      maxPosition: Math.max(cur.maxPosition, w.maxPosition),
      duration: Math.max(cur.duration, w.duration),
    });
  }

  return NextResponse.json(leads.map((l) => ({
    ...l,
    hasCallScript: !!l.callScript,
    callScript: undefined,
    videoWatch: watchByEmail.get(l.email) || null,
  })));
}
