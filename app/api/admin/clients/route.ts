// GET  /api/admin/clients        — list all clients with project count + last activity
// POST /api/admin/clients        — create a new client
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { projects: true } },
        projects: {
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true, status: true, adminProfile: true },
        },
      },
    });

    const result = clients.map(c => {
      const statuses = c.projects.map(p => p.status);
      const hasActive    = statuses.some(s => s === 'active');
      const hasCompleted = statuses.some(s => s === 'completed');
      const allCompleted = statuses.length > 0 && statuses.every(s => s === 'completed');
      // prospect = no active/completed projects, or all projects are draft
      const isProspect   = !c.isActive || statuses.length === 0 || statuses.every(s => s === 'draft');

      const overallStatus = !c.isActive       ? 'inactive'
        : allCompleted                         ? 'completed'
        : hasActive                            ? 'active'
        : isProspect                           ? 'prospect'
        : 'draft';

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        slug: c.slug,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        projectCount: c._count.projects,
        lastActivity: c.projects[0]?.updatedAt ?? c.updatedAt,
        overallStatus,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email, phone, slug, password } = await req.json();

    if (!name || !slug || !password) {
      return NextResponse.json({ error: 'name, slug, and password are required' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        slug,
        passwordHash,
        clientProfile: { portalPassword: password },
      },
    });

    const { passwordHash: _ph, ...safeClient } = client;
    return NextResponse.json(safeClient, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A client with this slug already exists' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
