import { NextRequest, NextResponse } from 'next/server';
import { saveTokensFromCode } from '@/lib/googleCalendar';
import { safeEqual } from '@/lib/auth';

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
  const state = req.nextUrl.searchParams.get('state');
  if (!safeEqual(state, req.cookies.get('g_oauth_state')?.value)) {
    return NextResponse.redirect(`${base}/admin/settings?calendar_error=invalid_state_start_again`);
  }

  try {
    const email = await saveTokensFromCode(code);
    const res = NextResponse.redirect(`${base}/admin/settings?calendar_connected=${encodeURIComponent(email || '')}`);
    res.cookies.delete('g_oauth_state');
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.redirect(`${base}/admin/settings?calendar_error=${encodeURIComponent(msg)}`);
  }
}
