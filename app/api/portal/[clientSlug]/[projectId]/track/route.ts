import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  if (req.cookies.get(`pc_${clientSlug}`)?.value !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { eventType, meta, sessionId } = await req.json();
  if (!eventType) return NextResponse.json({ error: 'eventType required' }, { status: 400 });

  // Verify project belongs to client
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ ok: false }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.projectEvent.create({
    data: {
      id: crypto.randomBytes(12).toString('hex'),
      projectId: project.id,
      eventType,
      meta: meta ?? undefined,
      sessionId: sessionId ?? undefined,
    },
  });

  if (sessionId) {
    await prisma.projectSession.updateMany({
      where: { sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
