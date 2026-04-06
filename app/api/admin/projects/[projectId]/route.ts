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
        client: { select: { id: true, name: true, email: true, phone: true, slug: true, clientProfile: true } },
        sections: { orderBy: { displayOrder: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        milestones: { orderBy: { order: 'asc' } },
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

    // If adminProfile is in the patch, deep-merge it with existing to avoid overwriting keys
    // (e.g. proposalAcceptedAt set by portal should not be wiped by admin editing notes)
    let patchData = body;
    if (body.adminProfile && typeof body.adminProfile === 'object') {
      const existing = await prisma.clientProject.findUnique({
        where: { id: projectId },
        select: { adminProfile: true },
      });
      const existingProfile = (existing?.adminProfile ?? {}) as Record<string, unknown>;
      patchData = { ...body, adminProfile: { ...existingProfile, ...body.adminProfile } };
    }

    const project = await prisma.clientProject.update({
      where: { id: projectId },
      data: patchData,
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
