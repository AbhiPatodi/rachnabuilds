// GET    /api/admin/projects/[projectId]  — get project with sections, documents, analytics, client info
// PATCH  /api/admin/projects/[projectId]  — update project fields
// DELETE /api/admin/projects/[projectId]  — delete project
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const project = await prisma.clientProject.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, slug: true, passwordPlain: true } },
        sections: { orderBy: { displayOrder: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [commentCount, eventCounts] = await Promise.all([
      prisma.projectComment.count({ where: { projectId } }),
      prisma.projectEvent.groupBy({
        by: ['eventType'],
        where: { projectId },
        _count: { eventType: true },
      }),
    ]);

    return NextResponse.json({ ...project, analytics: { commentCount, eventCounts } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const body = await req.json();
    const project = await prisma.clientProject.update({
      where: { id: projectId },
      data: body,
    });
    return NextResponse.json(project);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    await prisma.clientProject.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
