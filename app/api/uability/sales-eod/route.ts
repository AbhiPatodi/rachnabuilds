// CSV for the UAbility "Sales EOD Report" sheet:
//   =IMPORTDATA("https://rachnabuilds.com/api/uability/sales-eod?key=…")
import { NextRequest, NextResponse } from 'next/server';
import { keyOk, toCsv, salesEodRows } from '@/lib/uability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!keyOk(req.nextUrl.searchParams.get('key'))) return new NextResponse('Unauthorized', { status: 401 });
  const csv = toCsv(await salesEodRows());
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
}
