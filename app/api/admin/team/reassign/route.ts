import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentSession } from '@/lib/auth';
import { assignLead } from '@/lib/team';

export const dynamic = 'force-dynamic';

/** Bulk move every OPEN lead from one person to another (or to/from
 *  "unassigned" with null) — e.g. someone leaves or goes on holiday. */
export async function POST(req: NextRequest) {
  const { from, to } = await req.json().catch(() => ({}));
  if ((from ?? null) === (to ?? null)) return NextResponse.json({ error: 'from and to are the same' }, { status: 400 });
  const leads = await prisma.funnelLead.findMany({
    where: { assignedToId: from || null, status: { notIn: ['closed_won', 'closed_lost', 'disqualified'] } },
    select: { id: true },
  });
  const by = (await currentSession())?.name || 'Owner';
  for (const l of leads) await assignLead(l.id, to || null, by);
  return NextResponse.json({ moved: leads.length });
}
