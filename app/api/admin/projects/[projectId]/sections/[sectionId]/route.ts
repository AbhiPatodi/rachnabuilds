// PATCH  /api/admin/projects/[projectId]/sections/[sectionId]  — update section
// DELETE /api/admin/projects/[projectId]/sections/[sectionId]  — delete section
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ projectId: string; sectionId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { sectionId } = await params;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.sectionType === 'string') data.sectionType = body.sectionType;
    if (typeof body.displayOrder === 'number') data.displayOrder = body.displayOrder;
    if (body.content !== undefined) data.content = body.content;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const section = await prisma.projectSection.update({ where: { id: sectionId }, data });
    return NextResponse.json(section);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId, sectionId } = await params;

  try {
    await prisma.projectSection.delete({ where: { id: sectionId } });
    await prisma.projectComment.deleteMany({
      where: { projectId, context: `section:${sectionId}` },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
