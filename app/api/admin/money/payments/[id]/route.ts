import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parsePayment } from '@/lib/moneyParse';

export const dynamic = 'force-dynamic';
interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const data = parsePayment(body, true);
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const payment = await prisma.payment.update({ where: { id }, data });
    return NextResponse.json({ payment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.payment.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
