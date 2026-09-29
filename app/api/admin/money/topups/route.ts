import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AD_ACCOUNT_ID } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

export async function GET() {
  const topUps = await prisma.adTopUp.findMany({ where: { accountId: AD_ACCOUNT_ID }, orderBy: { date: 'desc' }, take: 200 });
  return NextResponse.json({ topUps });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const amount = Number(b.amount);
  if (!(amount > 0)) return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
  const date = new Date(b.date ? `${String(b.date).slice(0, 10)}T12:00:00.000Z` : Date.now());
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'bad date' }, { status: 400 });
  const topUp = await prisma.adTopUp.create({
    data: { accountId: AD_ACCOUNT_ID, date, amount, currency: 'INR', method: b.method ? String(b.method).slice(0, 30) : null, source: 'manual', note: b.note ? String(b.note).slice(0, 300) : null },
  });
  return NextResponse.json({ topUp });
}
