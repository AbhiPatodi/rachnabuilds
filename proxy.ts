import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminToken, mintAdminToken, sessionCookieOptions, ADMIN_TTL_MS } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /api/admin/* (only the login endpoint itself is public — exact
  // match, so a future /api/admin/authors can't inherit the exemption).
  if (pathname.startsWith('/api/admin/') && pathname !== '/api/admin/auth') {
    if (!(await isAdminToken(req.cookies.get('admin_session')?.value))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Protect /admin/* pages
  if (pathname.startsWith('/admin') && pathname !== '/admin-login') {
    if (!(await isAdminToken(req.cookies.get('admin_session')?.value))) {
      return NextResponse.redirect(new URL('/admin-login', req.url));
    }
    // Rolling session: mint a fresh token on every authenticated page visit
    // so an actively-used admin PWA never hits the expiry cliff.
    const res = NextResponse.next();
    res.cookies.set('admin_session', await mintAdminToken(), sessionCookieOptions(ADMIN_TTL_MS / 1000));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin-login', '/api/admin/:path*'],
};
