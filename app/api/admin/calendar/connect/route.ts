import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUrl } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // CSRF guard for the OAuth dance: the callback only accepts a code whose
    // `state` matches this one-time cookie, so nobody can make the admin's
    // browser connect an attacker's Google account.
    const state = crypto.randomBytes(24).toString('base64url');
    const res = NextResponse.redirect(getAuthUrl(state));
    res.cookies.set('g_oauth_state', state, {
      httpOnly: true,
      path: '/api/admin/calendar',
      maxAge: 600,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to start OAuth' }, { status: 500 });
  }
}
