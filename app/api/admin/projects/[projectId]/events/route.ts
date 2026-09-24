// GET /api/admin/projects/[projectId]/events?limit=30
// Returns last N portal events and comments for this project, ordered by createdAt DESC
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

async function auth() {
  return isAdmin();
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');

  try {
    const events = await prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const comments = await prisma.projectComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ events, comments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
