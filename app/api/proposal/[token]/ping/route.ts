// Public: read-time heartbeat from /proposal/<token>, onto its view row.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimitIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const CLICKS = new Set(['report', 'whatsapp', 'pdf', 'choose_launch', 'choose_fix']);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await rateLimitIp(req, 'proposal-ping', 720, 3600_000))) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const viewId = typeof body.viewId === 'string' ? body.viewId : '';
  if (!viewId) return NextResponse.json({ ok: false }, { status: 400 });
  const seconds = Math.min(7200, Math.max(0, Math.round(Number(body.seconds) || 0)));
  const scrollPct = Math.min(100, Math.max(0, Math.round(Number(body.scrollPct) || 0)));
  const clicks: string[] = (Array.isArray(body.clicks) ? body.clicks : []).filter((c: unknown) => typeof c === 'string' && CLICKS.has(c));

  const view = await prisma.proposalView.findUnique({
    where: { id: viewId },
    select: { id: true, durationSec: true, scrollPct: true, clicks: true, proposal: { select: { token: true } } },
  });
  if (!view || view.proposal.token !== token) return NextResponse.json({ ok: false }, { status: 404 });
  const merged = [...new Set([...(view.clicks ? view.clicks.split(',') : []), ...clicks])];
  await prisma.proposalView.update({
    where: { id: viewId },
    data: {
      durationSec: Math.max(seconds, view.durationSec ?? 0),
      scrollPct: Math.max(scrollPct, view.scrollPct ?? 0),
      ...(merged.length ? { clicks: merged.join(',') } : {}),
    },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
