// PATCH  /api/admin/projects/[projectId]/deliverables/[deliverableId]
// DELETE /api/admin/projects/[projectId]/deliverables/[deliverableId]
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

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { deliverableId } = await params;
  try {
    const data = await req.json();
    const updated = await prisma.projectDeliverable.update({
      where: { id: deliverableId },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.previewUrl !== undefined && { previewUrl: data.previewUrl?.trim() || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.milestoneId !== undefined && { milestoneId: data.milestoneId || null }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to update deliverable' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { deliverableId } = await params;
  try {
    await prisma.projectDeliverable.delete({ where: { id: deliverableId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete deliverable' }, { status: 500 });
  }
}
