import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function isAdmin() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { tabConfig: true } });
  const cfg = (project?.tabConfig as Record<string, unknown>) ?? {};
  return NextResponse.json({ links: cfg.buildLinks ?? [] });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const { links } = await req.json();
  const project = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { tabConfig: true } });
  const existing = (project?.tabConfig as Record<string, unknown>) ?? {};
  await prisma.clientProject.update({
    where: { id: projectId },
    data: { tabConfig: { ...existing, buildLinks: links } },
  });
  return NextResponse.json({ links });
}
