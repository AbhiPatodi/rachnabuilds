// POST /api/portal/[clientSlug]/[projectId]/deliverables/[deliverableId]/approve
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext {
  params: Promise<{ clientSlug: string; projectId: string; deliverableId: string }>;
}

async function isAdminSession() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

function verifyPortalCookie(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId, deliverableId } = await params;
  const authed = verifyPortalCookie(req, clientSlug) || await isAdminSession();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true, name: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const deliverable = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId: project.id },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: { status: 'completed' },
    });

    sendPushToAll(
      '✅ Deliverable Approved!',
      `${client.name} approved: ${deliverable.title}`,
      `/admin/projects/${project.id}`
    ).catch(() => {});

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to approve deliverable' }, { status: 500 });
  }
}
