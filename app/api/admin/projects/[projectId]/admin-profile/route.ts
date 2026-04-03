// PATCH /api/admin/projects/[projectId]/admin-profile
// Merges allowed fields into project.adminProfile JSONB (does not replace the whole object)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const body = await req.json();

    const allowedStrings = ['email', 'phone', 'whatsapp', 'website', 'instagram', 'linkedin', 'twitter', 'notes'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incoming: Record<string, any> = {};
    for (const key of allowedStrings) {
      if (typeof body[key] === 'string') incoming[key] = body[key].trim();
    }
    // Boolean flag
    if (typeof body.proposalVisible === 'boolean') incoming.proposalVisible = body.proposalVisible;

    // Fetch existing adminProfile and merge
    const existing = await prisma.clientProject.findUnique({
      where: { id: projectId },
      select: { adminProfile: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const merged = {
      ...(existing.adminProfile as Record<string, unknown>),
      ...incoming,
    };

    const updated = await prisma.clientProject.update({
      where: { id: projectId },
      data: { adminProfile: merged },
    });

    return NextResponse.json({ ok: true, adminProfile: updated.adminProfile });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update admin profile' }, { status: 500 });
  }
}
