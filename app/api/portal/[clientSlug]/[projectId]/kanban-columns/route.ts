import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ clientSlug: string; projectId: string }>;
}

async function isAdminSession() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

function verifyPortalCookie(req: NextRequest, clientSlug: string) {
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const expected = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');
  return req.cookies.get(`pc_${clientSlug}`)?.value === expected;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  const authed = verifyPortalCookie(req, clientSlug) || await isAdminSession();
  if (!authed) return NextResponse.json({ columns: [] });

  try {
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
    if (!client) return NextResponse.json({ columns: [] });
    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { tabConfig: true },
    });
    const cfg = (project?.tabConfig as Record<string, unknown>) ?? {};
    return NextResponse.json({ columns: cfg.kanbanColumns ?? [] });
  } catch { return NextResponse.json({ columns: [] }); }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  const authed = verifyPortalCookie(req, clientSlug) || await isAdminSession();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { columns } = await req.json();
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true, tabConfig: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const existing = (project.tabConfig as Record<string, unknown>) ?? {};
    await prisma.clientProject.update({
      where: { id: project.id },
      data: { tabConfig: { ...existing, kanbanColumns: columns } },
    });
    return NextResponse.json({ columns });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
