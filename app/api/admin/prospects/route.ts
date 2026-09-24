// Admin: cold-email prospects (imported from Vela). Read + light state edits.
// Auth: admin_session cookie via proxy.ts.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tier = sp.get('tier');
  const verify = sp.get('verify');
  const scan = sp.get('scan');
  const stage = sp.get('stage');
  const q = sp.get('q')?.trim();
  const page = Math.max(1, Number(sp.get('page') || 1));

  const where = {
    ...(tier ? { tier } : {}),
    ...(verify ? { verifyStatus: verify } : {}),
    ...(scan ? { scanStatus: scan } : {}),
    ...(stage ? { stage } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { name: { contains: q, mode: 'insensitive' as const } },
            { domain: { contains: q, mode: 'insensitive' as const } },
            { storeName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, rows, tierCounts, stageCounts] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      orderBy: [{ tier: 'asc' }, { score: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, email: true, name: true, country: true, storeName: true,
        domain: true, firstSeenApp: true, tier: true, verifyStatus: true,
        scanStatus: true, finding: true, issueCount: true, stage: true, score: true,
        promotedLeadId: true,
      },
    }),
    prisma.prospect.groupBy({ by: ['tier'], _count: true }),
    prisma.prospect.groupBy({ by: ['stage'], _count: true }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    rows,
    tierCounts: Object.fromEntries(tierCounts.map((t) => [t.tier, t._count])),
    stageCounts: Object.fromEntries(stageCounts.map((s) => [s.stage, s._count])),
  });
}

export async function PATCH(req: NextRequest) {
  const { id, stage } = await req.json();
  if (!id || !stage) return NextResponse.json({ error: 'id and stage required' }, { status: 400 });
  const ALLOWED = ['new', 'queued', 'contacted', 'replied', 'promoted', 'suppressed'];
  if (!ALLOWED.includes(stage)) return NextResponse.json({ error: 'bad stage' }, { status: 400 });
  const row = await prisma.prospect.update({ where: { id }, data: { stage } });
  return NextResponse.json({ ok: true, id: row.id, stage: row.stage });
}

/**
 * POST { id } — promote a prospect who replied into the lead pipeline.
 * Creates (or links) a FunnelLead tagged as a cold-email reply, marks the
 * prospect promoted, and returns the lead id.
 */
export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const p = await prisma.prospect.findUnique({ where: { id: String(id) } });
  if (!p) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const email = p.email.toLowerCase();
  const existing = await prisma.funnelLead.findUnique({ where: { email }, select: { id: true } });
  const lead = existing ?? await prisma.funnelLead.create({
    data: {
      name: p.name || p.storeName || email.split('@')[0],
      email,
      storeUrl: p.websiteUrl || (p.domain ? `https://${p.domain}` : null),
      utmSource: 'cold-email',
      utmMedium: 'cold-email',
    },
    select: { id: true },
  });
  await prisma.prospect.update({ where: { id: p.id }, data: { stage: 'promoted', promotedLeadId: lead.id } });
  await prisma.leadActivity.create({
    data: { leadId: lead.id, type: 'system', text: `Promoted from cold-email prospects${p.tier ? ` (tier ${p.tier})` : ''}` },
  }).catch(() => {});
  return NextResponse.json({ ok: true, leadId: lead.id, existed: !!existing });
}
