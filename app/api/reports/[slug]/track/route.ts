import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { isReportSession } from '@/lib/auth';

interface RouteContext { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;

  if (!(await isReportSession(slug))) return NextResponse.json({ ok: false }, { status: 401 });

  const { eventType, meta, sessionId } = await req.json();
  if (!eventType) return NextResponse.json({ error: 'eventType required' }, { status: 400 });

  const report = await prisma.report.findUnique({ where: { slug }, select: { id: true } });
  if (!report) return NextResponse.json({ ok: false });

  // Create event
  await prisma.portalEvent.create({
    data: {
      id: crypto.randomBytes(12).toString('hex'),
      reportId: report.id,
      eventType,
      meta: meta ?? undefined,
      sessionId: sessionId ?? undefined,
    },
  });

  // Update session lastActiveAt if sessionId provided
  if (sessionId) {
    await prisma.portalSession.updateMany({
      where: { sessionId, reportId: report.id },
      data: { lastActiveAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
