// GET /api/admin/projects/[projectId]/sessions
// Returns session list with tab enrichment + aggregate stats
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await params;

  try {
    const sessions = await prisma.projectSession.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    // Tab view breakdown per session
    const tabEvents = await prisma.projectEvent.findMany({
      where: { projectId, eventType: 'tab_view', sessionId: { not: null } },
      select: { sessionId: true, meta: true, createdAt: true },
    });

    // Group tab events by sessionId
    const tabsBySession: Record<string, string[]> = {};
    for (const ev of tabEvents) {
      if (!ev.sessionId) continue;
      const tab = (ev.meta as Record<string, unknown>)?.tab as string;
      if (!tab) continue;
      if (!tabsBySession[ev.sessionId]) tabsBySession[ev.sessionId] = [];
      if (!tabsBySession[ev.sessionId].includes(tab)) tabsBySession[ev.sessionId].push(tab);
    }

    const enriched = sessions.map(s => ({
      ...s,
      tabsViewed: tabsBySession[s.sessionId] ?? [],
    }));

    const totalSessions = sessions.length;
    const returnSessions = sessions.filter((_, i) => i > 0).length;
    const avgDuration = totalSessions
      ? Math.round(sessions.reduce((sum, s) => sum + s.totalDuration, 0) / totalSessions)
      : 0;

    // Most viewed tab across all sessions
    const tabCounts: Record<string, number> = {};
    for (const ev of tabEvents) {
      const tab = (ev.meta as Record<string, unknown>)?.tab as string;
      if (tab) tabCounts[tab] = (tabCounts[tab] ?? 0) + 1;
    }
    const topTab = Object.entries(tabCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return NextResponse.json({
      sessions: enriched,
      stats: { totalSessions, returnSessions, avgDuration, topTab },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
