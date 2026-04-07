// GET    /api/admin/clients/[clientId]  — get client with all projects (section/doc counts)
// PATCH  /api/admin/clients/[clientId]  — update client fields (supports newPassword for password reset)
// DELETE /api/admin/clients/[clientId]  — delete client (cascades to all projects)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcryptjs from 'bcryptjs';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ clientId: string }>;
}

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await params;

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { sections: true, documents: true } },
          },
        },
      },
    });

    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordPlain: _pp, passwordHash: _ph, ...safeClient } = client as typeof client & { passwordPlain?: string };
    return NextResponse.json(safeClient);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await params;

  try {
    const body = await req.json();
    const { newPassword, ...rest } = body;
    const updateData: Record<string, unknown> = { ...rest };

    if (newPassword?.trim() && newPassword.trim().length >= 6) {
      const hash = await bcryptjs.hash(newPassword.trim(), 10);
      updateData.passwordHash = hash;
      // Store plain text in clientProfile so admin can retrieve to share with client
      const existing = await prisma.client.findUnique({ where: { id: clientId }, select: { clientProfile: true } });
      const existingProfile = (existing?.clientProfile as Record<string, unknown>) ?? {};
      updateData.clientProfile = { ...existingProfile, portalPassword: newPassword.trim() };
    }

    const client = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });
    return NextResponse.json(client);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await params;

  try {
    await prisma.client.delete({ where: { id: clientId } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
