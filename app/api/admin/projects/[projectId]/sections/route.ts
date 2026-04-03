// POST   /api/admin/projects/[projectId]/sections              — create a section
// DELETE /api/admin/projects/[projectId]/sections?sectionId=x  — delete a section
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

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const { sectionType, title, content, displayOrder } = await req.json();

    if (!sectionType || !title) {
      return NextResponse.json({ error: 'sectionType and title are required' }, { status: 400 });
    }

    const section = await prisma.projectSection.create({
      data: {
        projectId,
        sectionType,
        title,
        content: content ?? {},
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await params; // consume params (projectId unused for cascade-safe delete)

  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    if (!sectionId) return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });

    await prisma.projectSection.delete({ where: { id: sectionId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
