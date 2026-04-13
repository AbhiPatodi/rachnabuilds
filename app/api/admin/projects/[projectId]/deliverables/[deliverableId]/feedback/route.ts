// POST /api/admin/projects/[projectId]/deliverables/[deliverableId]/feedback
// Admin posts a comment on a task
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ projectId: string; deliverableId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId, deliverableId } = await params;

  try {
    const body = await req.json();
    if (!body.message?.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });

    const deliverable = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, projectId },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const feedback = await prisma.deliverableFeedback.create({
      data: {
        deliverableId,
        projectId,
        message: body.message.trim(),
        attachmentUrl: body.attachmentUrl || null,
        attachmentName: body.attachmentName || null,
        addedBy: 'admin',
        status: 'open',
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
