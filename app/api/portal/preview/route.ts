// GET /api/portal/preview?slug=sage-and-veda&project=cp_xxx
// Admin-only: validates admin_session, sets a short-lived portal cookie, redirects to portal
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, mintClientPortalToken, sessionCookieOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get('slug');
  const projectId = req.nextUrl.searchParams.get('project');

  if (!slug || !/^[a-z0-9-]+$/i.test(slug) || (projectId && !/^[a-z0-9_-]+$/i.test(projectId))) {
    return NextResponse.json({ error: 'Missing or invalid slug' }, { status: 400 });
  }

  // Set the portal cookie so the portal gate passes
  const portalCookie = await mintClientPortalToken(slug);
  if (!portalCookie) return NextResponse.json({ error: 'Client not found or inactive' }, { status: 404 });

  const redirectUrl = projectId
    ? new URL(`/portal/${slug}/${projectId}`, req.nextUrl.origin)
    : new URL(`/portal/${slug}`, req.nextUrl.origin);

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(`pc_${slug}`, portalCookie, sessionCookieOptions(60 * 60)); // 1 hour preview session
  return res;
}
