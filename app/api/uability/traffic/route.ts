// CSV for the UAbility "Paid Traffic Tracking" sheet:
//   =IMPORTDATA("https://rachnabuilds.com/api/uability/traffic?month=2026-09&key=…")
import { NextRequest, NextResponse } from 'next/server';
import { keyOk, toCsv, trafficRows } from '@/lib/uability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!keyOk(req.nextUrl.searchParams.get('key'))) return new NextResponse('Unauthorized', { status: 401 });
  const month = req.nextUrl.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse('month must be YYYY-MM', { status: 400 });
  const csv = toCsv(await trafficRows(month));
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
}
