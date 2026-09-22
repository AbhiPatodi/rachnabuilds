import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /api/admin/* routes (except the auth endpoint itself)
  if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/auth')) {
    const cookie = req.cookies.get('admin_session')?.value;
    if (!cookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const expected = await sha256Hex(process.env.ADMIN_PASSWORD || '');
    if (cookie !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Protect /admin/* pages
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    const cookie = req.cookies.get('admin_session')?.value;
    const expected = await sha256Hex(process.env.ADMIN_PASSWORD || '');
    if (cookie !== expected) return NextResponse.redirect(new URL('/admin-login', req.url));

    // Rolling session: re-issue the cookie on every authenticated page visit
    // so an actively-used admin PWA never hits the expiry cliff.
    const res = NextResponse.next();
    res.cookies.set('admin_session', cookie, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin-login', '/api/admin/:path*'],
};
