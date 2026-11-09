import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Edit a member. Changing the password or deactivating logs them out
 *  everywhere (their session is bound to the password hash + active flag). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const data: { name?: string; role?: string; active?: boolean; receivesLeads?: boolean; passwordHash?: string } = {};
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim().slice(0, 80);
  if (b.role === 'admin' || b.role === 'rep') data.role = b.role;
  if (typeof b.active === 'boolean') data.active = b.active;
  if (typeof b.receivesLeads === 'boolean') data.receivesLeads = b.receivesLeads;
  if (b.password !== undefined) {
    if (String(b.password).length < 8) return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
    data.passwordHash = hashPassword(String(b.password));
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  const member = await prisma.teamMember.update({ where: { id }, data, select: { id: true, name: true, role: true, active: true, receivesLeads: true } }).catch(() => null);
  if (!member) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ member });
}
