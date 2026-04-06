// PATCH  /api/admin/projects/[projectId]/milestones/[milestoneId] — update a milestone
// DELETE /api/admin/projects/[projectId]/milestones/[milestoneId] — delete a milestone
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ projectId: string; milestoneId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { milestoneId } = await params;

  try {
    const data = await req.json();

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate || null }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { milestoneId } = await params;

  try {
    await prisma.projectMilestone.delete({ where: { id: milestoneId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete milestone' }, { status: 500 });
  }
}
