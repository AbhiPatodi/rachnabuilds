// GET  /api/admin/projects/[projectId]/milestones — list milestones ordered by order asc
// POST /api/admin/projects/[projectId]/milestones — create a milestone
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
    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ milestones });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const data = await req.json();

    if (!data.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        status: data.status || 'pending',
        dueDate: data.dueDate || null,
        order: data.order ?? 0,
      },
    });
    return NextResponse.json(milestone, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}
