import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: reportId } = await params;
  const { sectionType, title, content, displayOrder } = await req.json();

  if (!sectionType || !title) {
    return NextResponse.json({ error: 'sectionType and title are required' }, { status: 400 });
  }

  const section = await prisma.reportSection.create({
    data: {
      reportId,
      sectionType,
      title,
      content: content ?? {},
      displayOrder: displayOrder ?? 0,
    },
  });
  return NextResponse.json(section, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  await params; // consume params (reportId unused for cascade-safe delete)
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get('sectionId');
  if (!sectionId) return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });
  await prisma.reportSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ ok: true });
}
