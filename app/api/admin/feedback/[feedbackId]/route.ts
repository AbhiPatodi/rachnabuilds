// PATCH /api/admin/feedback/[feedbackId] — update bug status
// POST  /api/admin/feedback/[feedbackId]/reply — handled in /reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';

interface RouteContext {
  params: Promise<{ feedbackId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { feedbackId } = await params;
  try {
    const data = await req.json();
    const validStatuses = ['open', 'in_progress', 'resolved', 'reopened', 'wont_fix'];
    if (data.status && !validStatuses.includes(data.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.deliverableFeedback.update({
      where: { id: feedbackId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { feedbackId } = await params;
  try {
    const data = await req.json();
    if (!data.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });

    const reply = await prisma.feedbackReply.create({
      data: {
        feedbackId,
        message: data.message.trim(),
        attachmentUrl: data.attachmentUrl || null,
        attachmentName: data.attachmentName || null,
        addedBy: 'admin',
      },
    });

    // Notify client via push if we have project info
    if (data.clientSlug) {
      sendPushToAll(
        '💬 Rachna replied to your feedback',
        data.message.trim().slice(0, 80),
        `/portal/${data.clientSlug}`
      ).catch(() => {});
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 });
  }
}
