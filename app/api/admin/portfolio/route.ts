import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const expected = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  return session === expected;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const projects = await prisma.project.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const {
    title,
    description,
    tags,
    imageUrl,
    liveUrl,
    stats,
    featured,
    isVisible,
    displayOrder,
  } = body;

  if (!title || !description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        title,
        description,
        tags: Array.isArray(tags) ? tags : [],
        imageUrl: imageUrl || null,
        liveUrl: liveUrl || null,
        stats: stats || null,
        featured: featured ?? false,
        isVisible: isVisible ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
