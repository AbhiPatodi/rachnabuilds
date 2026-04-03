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
          take: 1,
          select: { updatedAt: true },
        },
      },
    });

    const result = clients.map(c => ({
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
    }));

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
        passwordPlain: password,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A client with this slug already exists' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
