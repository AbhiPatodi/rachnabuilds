// POST — client marks a document as reviewed
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { isClientSession } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ clientSlug: string; projectId: string; docId: string }>;
}

async function portalAuth(_req: NextRequest, clientSlug: string): Promise<boolean> {
  return isClientSession(clientSlug);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId, docId } = await params;
  if (!(await portalAuth(req, clientSlug))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const reviewedBy = (body.reviewedBy as string)?.trim();
  if (!reviewedBy) {
    return NextResponse.json({ error: 'reviewedBy is required' }, { status: 400 });
  }

  const doc = await prisma.projectDocument.findFirst({
    where: { id: docId, projectId: project.id },
    select: { id: true, approvedAt: true, approvedBy: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (doc.approvedAt) {
    return NextResponse.json(
      { error: 'Already approved', approvedAt: doc.approvedAt, approvedBy: doc.approvedBy },
      { status: 409 },
    );
  }

  const now = new Date();
  const updated = await prisma.projectDocument.update({
    where: { id: doc.id },
    data: { approvedAt: now, approvedBy: reviewedBy },
    select: { approvedAt: true, approvedBy: true },
  });

  return NextResponse.json({ ok: true, approvedAt: updated.approvedAt, approvedBy: updated.approvedBy });
}
