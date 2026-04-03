// GET    /api/admin/clients/[clientId]  — get client with all projects (section/doc counts)
// PATCH  /api/admin/clients/[clientId]  — update client fields
// DELETE /api/admin/clients/[clientId]  — delete client (cascades to all projects)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
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

    return NextResponse.json(client);
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
    const client = await prisma.client.update({
      where: { id: clientId },
      data: body,
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
