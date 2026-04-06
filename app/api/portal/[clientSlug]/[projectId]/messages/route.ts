import { NextRequest, NextResponse } from 'next/server';
import crypto, { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

function verifyPortalCookie(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

async function verifyProjectBelongsToClient(projectId: string, clientSlug: string) {
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true, name: true } });
  if (!client) return null;
  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, name: true },
  });
  return project ? { ...project, clientName: client.name } : null;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!verifyPortalCookie(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await verifyProjectBelongsToClient(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const messages = await prisma.projectMessage.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
  });

  const unreadIds = messages
    .filter(m => m.senderType === 'admin' && !m.readByClient)
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await prisma.projectMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { readByClient: true },
    });
  }

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  if (!verifyPortalCookie(req, clientSlug)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await verifyProjectBelongsToClient(projectId, clientSlug);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as { text?: string; attachmentUrl?: string; attachmentName?: string };
  const text = body.text?.trim() || '';
  const attachmentUrl = body.attachmentUrl?.trim() || null;
  const attachmentName = body.attachmentName?.trim() || null;

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: 'text or attachment required' }, { status: 400 });
  }

  const [message] = await prisma.$transaction(async (tx) => {
    const msg = await tx.projectMessage.create({
      data: {
        id: randomBytes(12).toString('hex'),
        projectId: project.id,
        senderType: 'client',
        text: text || (attachmentName ? `📎 ${attachmentName}` : 'File attached'),
        readByClient: true,
        attachmentUrl,
        attachmentName,
      },
    });

    // Auto-add to project documents when attachment present
    if (attachmentUrl && attachmentName) {
      await tx.projectDocument.create({
        data: {
          id: randomBytes(12).toString('hex'),
          projectId: project.id,
          docType: 'client_required',
          title: attachmentName,
          url: attachmentUrl,
          notes: text || null,
        },
      });
    }

    return [msg];
  });

  return NextResponse.json(message, { status: 201 });
}
