// GET  /api/admin/clients/[clientId]/projects  — list projects for a client
// POST /api/admin/clients/[clientId]/projects  — create a project for a client
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
    const projects = await prisma.clientProject.findMany({
      where: { clientId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { sections: true, documents: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { clientId } = await params;

  try {
    const { name, clientType, status, displayOrder } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const project = await prisma.clientProject.create({
      data: {
        clientId,
        name,
        clientType: clientType ?? 'new_build',
        status: status ?? 'active',
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
