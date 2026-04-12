// POST /api/portal/[clientSlug]/[projectId]/deliverables/[deliverableId]/feedback
// Client submits a bug / change request
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
    const body = await req.json();
    if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true, name: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const deliverable = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId: project.id },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Create feedback
    const feedback = await prisma.deliverableFeedback.create({
      data: {
        deliverableId,
        projectId: project.id,
        message: body.message.trim(),
        attachmentUrl: body.attachmentUrl || null,
        attachmentName: body.attachmentName || null,
        addedBy: 'client',
        status: 'open',
      },
    });

    // Move deliverable status to changes_requested
    await prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: { status: 'changes_requested' },
    });

    sendPushToAll(
      '🐛 New Feedback from Client',
      `${client.name}: ${body.message.trim().slice(0, 80)}`,
      `/admin/projects/${project.id}`
    ).catch(() => {});

    return NextResponse.json(feedback, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
