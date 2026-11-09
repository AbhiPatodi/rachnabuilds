import { NextResponse } from 'next/server';
import { currentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getPipelineSettings } from '@/lib/team';

export const dynamic = 'force-dynamic';

/** Who is logged in, plus what the lead pages need to render for them:
 *  sub-stage options and (for admins) the team to assign leads to. */
export async function GET() {
  const s = await currentSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { subStatus } = await getPipelineSettings();
  const team = s.role === 'admin'
    ? await prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } })
    : [];
  return NextResponse.json({ ...s, subStatus, team });
}
