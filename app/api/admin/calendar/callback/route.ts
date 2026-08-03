import { NextRequest, NextResponse } from 'next/server';
import { saveTokensFromCode } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const base = req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${base}/admin/settings?calendar_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${base}/admin/settings?calendar_error=missing_code`);
  }

  try {
    const email = await saveTokensFromCode(code);
    return NextResponse.redirect(`${base}/admin/settings?calendar_connected=${encodeURIComponent(email || '')}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.redirect(`${base}/admin/settings?calendar_error=${encodeURIComponent(msg)}`);
  }
}
