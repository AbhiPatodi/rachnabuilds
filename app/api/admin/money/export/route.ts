// CSV of one month's money: income, expenses (recurring expanded), ad spend by day.
import { NextRequest, NextResponse } from 'next/server';
import { monthSummary, ymOf } from '@/lib/money';

export const dynamic = 'force-dynamic';

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const ym = req.nextUrl.searchParams.get('month') || ymOf(new Date());
  if (!/^\d{4}-\d{2}$/.test(ym)) return NextResponse.json({ error: 'month=YYYY-MM' }, { status: 400 });
  const s = await monthSummary(ym);
  const rows: string[] = ['type,date,description,category,amount,currency,amount_inr,method,status,note'];
  for (const p of s.payments) rows.push(['income', p.date, p.clientName, 'client', p.amount, p.currency, Math.round(p.inr), p.method || '', p.status, p.note || ''].map(q).join(','));
  for (const e of s.expenses.lines) rows.push(['expense', e.date, e.title + (e.vendor ? ` (${e.vendor})` : ''), e.category, e.amount, e.currency, Math.round(e.inr), '', e.recurring, ''].map(q).join(','));
  for (const d of s.ads.days) rows.push(['ad_spend', d.date, `Meta ads — ${d.leads} lead(s)`, 'ads', d.spend, 'INR', Math.round(d.spend), '', '', `${d.impressions} impressions, ${d.clicks} clicks`].map(q).join(','));
  return new NextResponse(rows.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rachna-builds-money-${ym}.csv"` },
  });
}
