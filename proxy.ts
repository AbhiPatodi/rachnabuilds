import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sessionFromToken, remintSession, sessionCookieOptions, ADMIN_TTL_MS, type AdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Reps (team members with role "rep") only work their own leads: the
// pipeline list, the lead pages assigned to them, and the few APIs those
// pages call. Everything else is owner / admin-role only.
const REP_LEAD_SUBPATHS = new Set(['', 'outcome', 'schedule-call', 'audit']);
const RESERVED = new Set(['duplicates', 'ad-report']);

function leadIdIn(pathname: string, base: string): { id: string; sub: string } | null {
  if (!pathname.startsWith(`${base}/`)) return null;
  const [id, sub = '', ...more] = pathname.slice(base.length + 1).split('/');
  if (!id || RESERVED.has(id) || more.length) return null;
  return { id, sub };
}

async function repMayAccess(s: AdminSession, req: NextRequest): Promise<boolean> {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/funnel-leads' || pathname === '/api/admin/me') return true;
  if (pathname === '/api/admin/funnel-leads' || pathname === '/api/admin/pipeline-settings') return req.method === 'GET';
  const lead = leadIdIn(pathname, '/admin/funnel-leads') ?? leadIdIn(pathname, '/api/admin/funnel-leads');
  if (!lead || !REP_LEAD_SUBPATHS.has(lead.sub) || req.method === 'DELETE') return false;
  const row = await prisma.funnelLead.findUnique({ where: { id: lead.id }, select: { assignedToId: true } });
  return row?.assignedToId === s.id;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api/admin/');

  // Protect /api/admin/* (only the login endpoint itself is public — exact
  // match, so a future /api/admin/authors can't inherit the exemption).
  if (isApi && pathname === '/api/admin/auth') return NextResponse.next();
  if (!isApi && (pathname === '/admin-login' || !pathname.startsWith('/admin'))) return NextResponse.next();

  const s = await sessionFromToken(req.cookies.get('admin_session')?.value);
  if (!s) {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/admin-login', req.url));
  }
  if (s.role === 'rep' && !(await repMayAccess(s, req))) {
    return isApi
      ? NextResponse.json({ error: 'Not available for your role' }, { status: 403 })
      : NextResponse.redirect(new URL('/admin/funnel-leads', req.url));
  }
  if (isApi) return NextResponse.next();

  // Rolling session: mint a fresh token on every authenticated page visit
  // so an actively-used admin PWA never hits the expiry cliff.
  const res = NextResponse.next();
  const fresh = await remintSession(s);
  if (fresh) res.cookies.set('admin_session', fresh, sessionCookieOptions(ADMIN_TTL_MS / 1000));
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/admin-login', '/api/admin/:path*'],
};
