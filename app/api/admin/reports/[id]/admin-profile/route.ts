import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

interface RouteContext { params: Promise<{ id: string }> }

async function auth() {
  return isAdmin();
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const allowed = ['email', 'phone', 'whatsapp', 'website', 'instagram', 'linkedin', 'twitter', 'notes'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile: Record<string, any> = {};
  for (const key of allowed) {
    if (typeof body[key] === 'string') profile[key] = body[key].trim();
  }
  // Boolean flags
  if (typeof body.proposalVisible === 'boolean') profile.proposalVisible = body.proposalVisible;
  const updated = await prisma.report.update({
    where: { id },
    data: { adminProfile: profile },
  });
  return NextResponse.json({ ok: true, adminProfile: updated.adminProfile });
}
