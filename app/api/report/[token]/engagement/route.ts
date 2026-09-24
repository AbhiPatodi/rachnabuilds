// Public: engagement heartbeat from the teaser page — records how long the
// lead kept the report open and how far they scrolled, onto their view row.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const viewId = typeof body.viewId === 'string' ? body.viewId : '';
  const seconds = Math.min(7200, Math.max(0, Math.round(Number(body.seconds) || 0)));
  const scrollPct = Math.min(100, Math.max(0, Math.round(Number(body.scrollPct) || 0)));
  const screen = typeof body.screen === 'string' && /^\d{2,5}x\d{2,5}$/.test(body.screen) ? body.screen : null;
  const clicks: string[] = (Array.isArray(body.clicks) ? body.clicks : [])
    .filter((c: unknown) => c === 'whatsapp' || c === 'book');
  if (!viewId) return NextResponse.json({ ok: false }, { status: 400 });

  // Only update a view that belongs to the report this token names — the
  // token is the capability; a viewId alone can't touch another report's rows.
  const view = await prisma.storeProofReportView.findUnique({
    where: { id: viewId },
    select: { id: true, durationSec: true, scrollPct: true, clicks: true, report: { select: { publicToken: true } } },
  });
  if (!view || view.report.publicToken !== token) return NextResponse.json({ ok: false }, { status: 404 });

  const mergedClicks = [...new Set([...(view.clicks ? view.clicks.split(',') : []), ...clicks])];
  await prisma.storeProofReportView.update({
    where: { id: viewId },
    data: {
      durationSec: Math.max(seconds, view.durationSec ?? 0),
      scrollPct: Math.max(scrollPct, view.scrollPct ?? 0),
      ...(screen ? { screen } : {}),
      ...(mergedClicks.length ? { clicks: mergedClicks.join(',') } : {}),
    },
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
