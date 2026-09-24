// GET /api/admin/projects  — list ALL projects across all clients (with client name, section/doc counts)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

async function auth() {
  return isAdmin();
}

export async function GET(_req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const projects = await prisma.clientProject.findMany({
      orderBy: [{ client: { name: 'asc' } }, { displayOrder: 'asc' }],
      include: {
        client: { select: { id: true, name: true, slug: true } },
        _count: { select: { sections: true, documents: true } },
      },
    });

    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
