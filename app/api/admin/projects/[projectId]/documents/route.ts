// POST   /api/admin/projects/[projectId]/documents           — create a document
// PATCH  /api/admin/projects/[projectId]/documents?docId=x   — update a document
// DELETE /api/admin/projects/[projectId]/documents?docId=x   — delete a document
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { logDocAction } from '@/lib/docLog';
import { notifyDocumentAdded } from '@/lib/email';

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

    if (!docType || !title || (docType !== 'client_required' && !url)) {
      return NextResponse.json({ error: 'docType and title are required' }, { status: 400 });
    }

    const doc = await prisma.projectDocument.create({
      data: {
        projectId,
        docType,
        title,
        url: url || '',
        notes: notes || null,
      },
    });

    logDocAction({ projectId, documentId: doc.id, action: 'added', actorType: 'admin', docTitle: title, meta: { docType, url } });

    // Fire-and-forget: notify client when admin shares a document (not when requesting one from them)
    if (docType !== 'client_required') {
      const project = await prisma.clientProject.findUnique({
        where: { id: projectId },
        include: { client: true },
      });
      if (project?.client?.email) {
        const portalUrl = `https://rachnabuilds.com/portal/${project.client.slug}/${projectId}`;
        notifyDocumentAdded(
          project.client.email,
          project.client.name,
          title,
          project.name,
          portalUrl,
        ).catch(console.error);
      }
    }

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

    const existing = await prisma.projectDocument.findUnique({ where: { id: docId } });
    const updated = await prisma.projectDocument.update({
      where: { id: docId },
      data: {
        ...(docType !== undefined && { docType }),
        ...(title   !== undefined && { title }),
        ...(url     !== undefined && { url }),
        ...(notes   !== undefined && { notes: notes || null }),
      },
    });

    if (existing) {
      const projectId = existing.projectId;
      if (url !== undefined && url !== existing.url) {
        logDocAction({ projectId, documentId: docId, action: 'url_changed', actorType: 'admin', docTitle: updated.title, meta: { oldUrl: existing.url, newUrl: url } });
      }
      if (notes !== undefined && notes !== existing.notes) {
        logDocAction({ projectId, documentId: docId, action: 'note_edited', actorType: 'admin', docTitle: updated.title, meta: { oldNote: existing.notes, newNote: notes } });
      }
    }

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

    const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
    await prisma.projectDocument.delete({ where: { id: docId } });
    if (doc) {
      logDocAction({ projectId: doc.projectId, documentId: docId, action: 'deleted', actorType: 'admin', docTitle: doc.title });
    }
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
