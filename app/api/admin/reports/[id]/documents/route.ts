import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: reportId } = await params;
  const { docType, title, url, notes } = await req.json();

  if (!docType || !title || !url) {
    return NextResponse.json({ error: 'docType, title, and url are required' }, { status: 400 });
  }

  const doc = await prisma.clientDocument.create({
    data: {
      reportId,
      docType,
      title,
      url,
      notes: notes || null,
    },
  });
  return NextResponse.json(doc, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  await params;
  const { docId, docType, title, url, notes } = await req.json();
  if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 });
  const updated = await prisma.clientDocument.update({
    where: { id: docId },
    data: {
      ...(docType !== undefined && { docType }),
      ...(title   !== undefined && { title }),
      ...(url     !== undefined && { url }),
      ...(notes   !== undefined && { notes: notes || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  await params; // consume params
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('docId');
  if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 });
  await prisma.clientDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
