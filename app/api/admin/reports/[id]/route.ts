import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { displayOrder: 'asc' } },
      documents: { orderBy: { uploadedAt: 'desc' } },
    },
  });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(report);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await req.json();
  const report = await prisma.report.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(report);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
