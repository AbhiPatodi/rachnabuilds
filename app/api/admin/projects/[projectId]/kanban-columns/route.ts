import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

async function isAdmin() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await isAdmin()) return NextResponse.json({ columns: [] });
  const { projectId } = await params;
  try {
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { tabConfig: true } });
    const cfg = (project?.tabConfig as Record<string, unknown>) ?? {};
    return NextResponse.json({ columns: cfg.kanbanColumns ?? [] });
  } catch { return NextResponse.json({ columns: [] }); }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  try {
    const { columns } = await req.json();
    const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { id: true, tabConfig: true } });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = (project.tabConfig as Record<string, unknown>) ?? {};
    await prisma.clientProject.update({
      where: { id: projectId },
      data: { tabConfig: { ...existing, kanbanColumns: columns } },
    });
    return NextResponse.json({ columns });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
