// GET /api/portal/[clientSlug]/[projectId]/deliverables — fetch deliverables for client
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
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const project = await prisma.clientProject.findFirst({
      where: { id: projectId, clientId: client.id },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only show non-draft deliverables to client
    const deliverables = await prisma.projectDeliverable.findMany({
      where: { projectId: project.id, status: { not: 'draft' } },
      orderBy: { displayOrder: 'asc' },
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
          include: { replies: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    return NextResponse.json({ deliverables });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { clientSlug, projectId } = await params;
  const authed = verifyPortalCookie(req, clientSlug) || await isAdminSession();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await prisma.client.findUnique({ where: { slug: clientSlug }, select: { id: true } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const project = await prisma.clientProject.findFirst({ where: { id: projectId, clientId: client.id }, select: { id: true } });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { title, description, status } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const count = await prisma.projectDeliverable.count({ where: { projectId: project.id } });
    const deliverable = await prisma.projectDeliverable.create({
      data: { projectId: project.id, title: title.trim(), description: description?.trim() || null, status: status || 'backlog', addedBy: 'client', displayOrder: count },
      include: { feedback: { include: { replies: true } } },
    });
    return NextResponse.json(deliverable, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
