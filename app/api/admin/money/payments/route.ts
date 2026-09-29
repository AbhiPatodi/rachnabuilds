import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { parsePayment } from '@/lib/moneyParse';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('leadId');
  const rows = await prisma.payment.findMany({ where: leadId ? { leadId } : undefined, orderBy: { date: 'desc' }, take: 500 });
  return NextResponse.json({ payments: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const data = parsePayment(body) as { clientName: string; amount: number; currency: string; date: Date; leadId?: string | null; status?: string; method?: string | null };
    const payment = await prisma.payment.create({ data });
    if (data.leadId) {
      const sym = data.currency === 'USD' ? '$' : '₹';
      const text = data.status === 'expected'
        ? `🧾 Payment expected: ${sym}${data.amount}${data.method ? ` via ${data.method}` : ''} (due ${data.date.toISOString().slice(0, 10)})`
        : `💰 Payment received: ${sym}${data.amount}${data.method ? ` via ${data.method}` : ''}`;
      await prisma.leadActivity.create({ data: { id: 'act_' + randomBytes(10).toString('hex'), leadId: data.leadId, type: 'note', text } }).catch(() => {});
    }
    return NextResponse.json({ payment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
