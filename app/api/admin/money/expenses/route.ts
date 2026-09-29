import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextOccurrence } from '@/lib/money';
import { parseExpense } from '@/lib/moneyParse';

export const dynamic = 'force-dynamic';


export async function GET() {
  const rows = await prisma.expense.findMany({ orderBy: [{ recurring: 'desc' }, { date: 'desc' }] });
  return NextResponse.json({ expenses: rows.map((e) => ({ ...e, nextDue: nextOccurrence(e) })) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const data = parseExpense(body) as { title: string; category: string; amount: number; currency: string; date: Date };
    const expense = await prisma.expense.create({ data });
    return NextResponse.json({ expense });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
