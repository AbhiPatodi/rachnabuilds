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

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  await params; // consume params
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('docId');
  if (!docId) return NextResponse.json({ error: 'docId is required' }, { status: 400 });
  await prisma.clientDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
