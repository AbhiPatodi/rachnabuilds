// GET /api/portal/[clientSlug]/[projectId]/document-logs
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hasClientPortalAccess } from '@/lib/auth';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;

  if (!(await hasClientPortalAccess(clientSlug))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const logs = await prisma.projectDocumentLog.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ logs });
}
