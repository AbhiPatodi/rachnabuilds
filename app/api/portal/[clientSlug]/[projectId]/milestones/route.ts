// GET /api/portal/[clientSlug]/[projectId]/milestones — read-only milestones for client portal
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

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: project.id },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ milestones });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 });
  }
}
