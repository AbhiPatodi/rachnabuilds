// PATCH /api/portal/[clientSlug]/[projectId]/documents/[docId]
// Lets a client edit their own client_upload document (note and/or URL)
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logDocAction } from '@/lib/docLog';

interface RouteContext { params: Promise<{ clientSlug: string; projectId: string; docId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId, docId } = await params;

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  if (req.cookies.get(`pc_${clientSlug}`)?.value !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify project belongs to client
  const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await prisma.clientProject.findFirst({
    where: { id: projectId, clientId: client.id },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch doc — must belong to this project and be a client_upload
  const doc = await prisma.projectDocument.findFirst({
    where: { id: docId, projectId: project.id },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (doc.docType !== 'client_upload' && doc.docType !== 'client_required') {
    return NextResponse.json({ error: 'Can only edit client-uploaded documents' }, { status: 403 });
  }

  const body = await req.json();
  const { url, notes } = body as { url?: string; notes?: string };

  if (url !== undefined && url !== '') {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (url !== undefined) updateData.url = url.trim();
  if (notes !== undefined) updateData.notes = notes?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await prisma.projectDocument.update({
    where: { id: docId },
    data: updateData,
  });

  // Log changes
  if (url !== undefined && url.trim() !== doc.url) {
    logDocAction({ projectId: project.id, documentId: docId, action: 'url_changed', actorType: 'client', docTitle: doc.title, meta: { oldUrl: doc.url, newUrl: url.trim() } });
  }
  if (notes !== undefined && (notes?.trim() || null) !== doc.notes) {
    logDocAction({ projectId: project.id, documentId: docId, action: 'note_edited', actorType: 'client', docTitle: doc.title, meta: { oldNote: doc.notes, newNote: notes?.trim() || null } });
  }

  return NextResponse.json(updated);
}
