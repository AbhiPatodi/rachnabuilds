import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ['new', 'confirmed', 'call_booked', 'showed', 'closed_won', 'closed_lost', 'disqualified'];

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await req.json();
  const data: { status?: string; notes?: string } = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    data.status = body.status;
  }
  if (body.notes !== undefined) data.notes = String(body.notes);

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const lead = await prisma.funnelLead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    await prisma.funnelLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
