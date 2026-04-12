// GET  /api/admin/projects/[projectId]/deliverables — list deliverables
// POST /api/admin/projects/[projectId]/deliverables — create deliverable
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
    const deliverables = await prisma.projectDeliverable.findMany({
      where: { projectId },
      orderBy: { displayOrder: 'asc' },
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
          include: { replies: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    return NextResponse.json({ deliverables });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  try {
    const data = await req.json();
    if (!data.title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const deliverable = await prisma.projectDeliverable.create({
      data: {
        projectId,
        milestoneId: data.milestoneId || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        previewUrl: data.previewUrl?.trim() || null,
        status: data.status || 'draft',
        addedBy: 'admin',
        displayOrder: data.displayOrder ?? 0,
      },
    });
    return NextResponse.json(deliverable, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create deliverable' }, { status: 500 });
  }
}
