// Public: a lead on their teaser page tells us which competitors to compare
// against. Saves the request, alerts admin, logs to the lead's timeline —
// the benchmark itself runs on the next audit pass.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { publicToken: token },
    select: { id: true, storeName: true, host: true, funnelLeadId: true },
  });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const competitors: string[] = (Array.isArray(body.competitors) ? body.competitors : [])
    .map((c: unknown) => String(c).trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0])
    .filter((c: string) => /^[a-z0-9][a-z0-9.-]{2,60}\.[a-z]{2,}$/.test(c))
    .slice(0, 3);
  if (!competitors.length) return NextResponse.json({ error: 'Enter at least one valid store domain' }, { status: 400 });

  await prisma.storeProofReport.update({
    where: { id: report.id },
    data: { competitorsRequested: competitors.join(',') },
  });
  if (report.funnelLeadId) {
    await prisma.leadActivity.create({
      data: {
        leadId: report.funnelLeadId, type: 'system',
        text: `Asked to be compared against: ${competitors.join(', ')}`,
      },
    }).catch(() => {});
  }
  await sendPushToAll(
    '🥊 Competitor comparison requested',
    `${report.storeName} vs ${competitors.join(', ')}`,
    report.funnelLeadId ? `/admin/funnel-leads/${report.funnelLeadId}` : '/admin/storeproof',
  ).catch(() => {});

  return NextResponse.json({ ok: true, competitors });
}
