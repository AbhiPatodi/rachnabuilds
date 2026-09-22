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
