import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendColdOptinNudge, sendWatchedStalledNudge, sendBookCallNudge, hasSentKind } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const HOUR = 60 * 60 * 1000;
const MAX_AGE_DAYS = 14; // don't resurrect very old dead leads
const RESOLVED_STATUSES = ['closed_won', 'closed_lost', 'disqualified'];

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const toggleRows = await prisma.setting.findMany({
    where: { key: { in: ['funnel_nudge_cold', 'funnel_nudge_watched', 'funnel_nudge_book'] } },
  });
  const off = new Set(toggleRows.filter((r) => r.value === 'off').map((r) => r.key));

  const now = Date.now();
  const maxAge = new Date(now - MAX_AGE_DAYS * 24 * HOUR);
  const results: Array<{ email: string; kind: string; ok: boolean }> = [];

  // ── Segment 1 & 2: opt-in only, never progressed to application ──
  if (!off.has('funnel_nudge_cold') || !off.has('funnel_nudge_watched')) {
    const optins = await prisma.funnelLead.findMany({
      where: {
        stage: 'optin',
        createdAt: { lte: new Date(now - 2 * HOUR), gte: maxAge },
      },
    });

    for (const lead of optins) {
      const watches = await prisma.videoWatch.findMany({ where: { email: lead.email } });
      const agg = watches.reduce(
        (acc, w) => ({
          maxPosition: Math.max(acc.maxPosition, w.maxPosition),
          duration: Math.max(acc.duration, w.duration),
          updatedAt: w.updatedAt > acc.updatedAt ? w.updatedAt : acc.updatedAt,
        }),
        { maxPosition: 0, duration: 0, updatedAt: new Date(0) },
      );
      const pct = agg.duration > 0 ? agg.maxPosition / agg.duration : 0;

      if (pct >= 0.5 && !off.has('funnel_nudge_watched')) {
        if (agg.updatedAt.getTime() > now - 2 * HOUR) continue; // give them time to apply on their own first
        if (await hasSentKind(lead.email, 'nudge_watched')) continue;
        const r = await sendWatchedStalledNudge({ id: lead.id, name: lead.name, email: lead.email, watchedPct: Math.round(pct * 100) });
        results.push({ email: lead.email, kind: 'nudge_watched', ok: r.ok });
      } else if (pct < 0.1 && !off.has('funnel_nudge_cold')) {
        if (await hasSentKind(lead.email, 'nudge_cold')) continue;
        const r = await sendColdOptinNudge({ id: lead.id, name: lead.name, email: lead.email });
        results.push({ email: lead.email, kind: 'nudge_cold', ok: r.ok });
      }
    }
  }

  // ── Segment 3: applied, never booked a call ──
  if (!off.has('funnel_nudge_book')) {
    const applied = await prisma.funnelLead.findMany({
      where: {
        stage: 'applied',
        appliedAt: { lte: new Date(now - 3 * HOUR), gte: maxAge },
        status: { notIn: RESOLVED_STATUSES },
      },
      include: { bookings: { where: { status: { in: ['confirmed', 'completed'] } }, select: { id: true } } },
    });

    for (const lead of applied) {
      if (lead.bookings.length > 0) continue;
      if (await hasSentKind(lead.email, 'nudge_book')) continue;
      const r = await sendBookCallNudge({ id: lead.id, name: lead.name, email: lead.email });
      results.push({ email: lead.email, kind: 'nudge_book', ok: r.ok });
    }
  }

  return NextResponse.json({ sent: results });
}
