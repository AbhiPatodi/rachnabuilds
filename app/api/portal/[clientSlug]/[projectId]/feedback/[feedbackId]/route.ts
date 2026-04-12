// POST /api/portal/[clientSlug]/[projectId]/feedback/[feedbackId] — client replies or reopens
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext {
  params: Promise<{ clientSlug: string; projectId: string; feedbackId: string }>;
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
  const { clientSlug, projectId, feedbackId } = await params;
  const authed = verifyPortalCookie(req, clientSlug) || await isAdminSession();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action; // 'reply' | 'reopen'

    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true, name: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fb = await prisma.deliverableFeedback.findFirst({
      where: { id: feedbackId, projectId: project.id },
    });
    if (!fb) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (action === 'reopen') {
      const updated = await prisma.deliverableFeedback.update({
        where: { id: feedbackId },
        data: { status: 'reopened' },
      });

      // Also reopen the deliverable
      await prisma.projectDeliverable.update({
        where: { id: fb.deliverableId },
        data: { status: 'changes_requested' },
      });

      sendPushToAll(
        '🔄 Feedback Reopened',
        `${client.name} reopened a bug`,
        `/admin/projects/${project.id}`
      ).catch(() => {});

      return NextResponse.json(updated);
    }

    if (action === 'reply') {
      if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });

      const reply = await prisma.feedbackReply.create({
        data: {
          feedbackId,
          message: body.message.trim(),
          attachmentUrl: body.attachmentUrl || null,
          attachmentName: body.attachmentName || null,
          addedBy: 'client',
        },
      });

      sendPushToAll(
        '💬 Client replied to feedback',
        `${client.name}: ${body.message.trim().slice(0, 80)}`,
        `/admin/projects/${project.id}`
      ).catch(() => {});

      return NextResponse.json(reply, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process feedback action' }, { status: 500 });
  }
}
