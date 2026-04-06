// GET   /api/admin/portal-leads/[id]  — get single lead
// PATCH /api/admin/portal-leads/[id]  — update status / notes
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ id: string }> }

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const lead = await prisma.portalLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = ['status', 'message'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    const lead = await prisma.portalLead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
