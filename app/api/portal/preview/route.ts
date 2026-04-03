// GET /api/portal/preview?slug=sage-and-veda&project=cp_xxx
// Admin-only: validates admin_session, sets portal cookie, redirects to portal
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const store = await cookies();
  const adminSession = store.get('admin_session')?.value;
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');

  if (!adminSession || adminSession !== adminHash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get('slug');
  const projectId = req.nextUrl.searchParams.get('project');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  // Set the portal cookie so the portal gate passes
  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const portalCookie = crypto.createHmac('sha256', secret).update(slug).digest('hex');

  const redirectUrl = projectId
    ? new URL(`/portal/${slug}/${projectId}`, req.nextUrl.origin)
    : new URL(`/portal/${slug}`, req.nextUrl.origin);

  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(`pc_${slug}`, portalCookie, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60, // 1 hour preview session
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}
