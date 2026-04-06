// GET /api/admin/analytics — aggregate analytics across all projects
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest) {
  if (!(await auth())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const projects = await prisma.clientProject.findMany({
      orderBy: { lastViewedAt: { sort: 'desc', nulls: 'last' } },
      include: {
        client: { select: { name: true, slug: true } },
        _count: { select: { sessions: true } },
      },
    });

    // Fetch recent events for each project in one batched query
    const projectIds = projects.map(p => p.id);
    const recentEvents = await prisma.projectEvent.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, projectId: true, eventType: true, meta: true, createdAt: true },
    });

    // Group events by projectId (keep last 5 per project)
    const eventsByProject: Record<string, typeof recentEvents> = {};
    for (const ev of recentEvents) {
      if (!eventsByProject[ev.projectId]) eventsByProject[ev.projectId] = [];
      if (eventsByProject[ev.projectId].length < 5) {
        eventsByProject[ev.projectId].push(ev);
      }
    }

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      clientName: p.client.name,
      clientSlug: p.client.slug,
      status: p.status,
      viewCount: p.viewCount,
      lastViewedAt: p.lastViewedAt,
      sessionCount: p._count.sessions,
      recentEvents: eventsByProject[p.id] ?? [],
    }));

    // Summary totals
    const totalProjects = result.length;
    const totalSessions = result.reduce((sum, p) => sum + p.sessionCount, 0);
    const totalViews = result.reduce((sum, p) => sum + p.viewCount, 0);

    return NextResponse.json({ projects: result, totals: { totalProjects, totalSessions, totalViews } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
