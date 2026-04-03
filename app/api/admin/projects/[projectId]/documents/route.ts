// POST   /api/admin/projects/[projectId]/documents           — create a document
// PATCH  /api/admin/projects/[projectId]/documents?docId=x   — update a document
// DELETE /api/admin/projects/[projectId]/documents?docId=x   — delete a document
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
    const { docType, title, url, notes } = await req.json();

    if (!docType || !title || !url) {
      return NextResponse.json({ error: 'docType, title, and url are required' }, { status: 400 });
    }

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        docType,
        title,
        url,
        notes: notes || null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await params; // consume params

  try {
    const { docId, docType, title, url, notes } = await req.json();
    if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 });

    const updated = await prisma.projectDocument.update({
      where: { id: docId },
      data: {
        ...(docType !== undefined && { docType }),
        ...(title   !== undefined && { title }),
        ...(url     !== undefined && { url }),
        ...(notes   !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await params; // consume params

  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 });

    await prisma.projectDocument.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
