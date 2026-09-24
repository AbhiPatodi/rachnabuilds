import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { mintAdminToken, safeEqual, sessionCookieOptions, ADMIN_TTL_MS } from '@/lib/auth';
import { rateLimitIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!(await rateLimitIp(req, 'admin-login', 10, 15 * 60_000))) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (!safeEqual(String(password || ''), process.env.ADMIN_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cookieStore = await cookies();
  // 90 days — PWA on personal phone; proxy.ts also re-mints it on every visit
  cookieStore.set('admin_session', await mintAdminToken(), sessionCookieOptions(ADMIN_TTL_MS / 1000));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return NextResponse.json({ ok: true });
}
