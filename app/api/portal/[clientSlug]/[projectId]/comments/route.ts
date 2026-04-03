import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function verifyPortalCookie(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

async function verifyProjectBelongsToClient(projectId: string, clientSlug: string) {
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return null;
  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, name: true },
  });
  return project;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!verifyPortalCookie(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await verifyProjectBelongsToClient(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const context = searchParams.get('context') || 'general';

  const comments = await prisma.projectComment.findMany({
    where: { projectId: project.id, context },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!verifyPortalCookie(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await verifyProjectBelongsToClient(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { context = 'general', author, text } = await req.json();
  if (!author?.trim() || !text?.trim()) return NextResponse.json({ error: 'author and text required' }, { status: 400 });

  const comment = await prisma.projectComment.create({
    data: {
      id: randomBytes(12).toString('hex'),
      projectId: project.id,
      context,
      author: author.trim(),
      text: text.trim(),
    },
  });

  sendPushToAll(
    'New Comment',
    `${author.trim()}: ${text.trim().slice(0, 80)}`,
    `/admin/clients/${clientSlug}/projects/${project.id}`
  ).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}
