import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const OPEN = { notIn: ['closed_won', 'closed_lost', 'disqualified'] };

export async function GET() {
  const members = await prisma.teamMember.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, email: true, role: true, active: true, receivesLeads: true, lastAssignedAt: true, createdAt: true, _count: { select: { leads: { where: { status: OPEN } }, pushSubs: true } } },
  });
  const unassigned = await prisma.funnelLead.count({ where: { assignedToId: null, status: OPEN } });
  return NextResponse.json({ members, unassigned });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const password = String(b.password || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'name and a valid email required' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
  if (await prisma.teamMember.findUnique({ where: { email } })) return NextResponse.json({ error: 'someone with this email already exists' }, { status: 409 });
  const member = await prisma.teamMember.create({
    data: { name, email, passwordHash: hashPassword(password), role: b.role === 'admin' ? 'admin' : 'rep', receivesLeads: b.receivesLeads !== false },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json({ member });
}
