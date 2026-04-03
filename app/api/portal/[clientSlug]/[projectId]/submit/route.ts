import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  if (req.cookies.get(`pc_${clientSlug}`)?.value !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, url, note } = await req.json();
  if (!title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'title and url required' }, { status: 400 });
  }

  // Verify project belongs to client
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const doc = await prisma.projectDocument.create({
    data: {
      id: randomBytes(12).toString('hex'),
      projectId: project.id,
      docType: 'client_upload',
      title: title.trim(),
      url: url.trim(),
      notes: note?.trim() || null,
    },
  });

  sendPushToAll(
    'File Submitted',
    `Client submitted: ${title.trim()}`,
    `/admin/clients/${clientSlug}/projects/${project.id}`
  ).catch(() => {});

  return NextResponse.json(doc, { status: 201 });
}
