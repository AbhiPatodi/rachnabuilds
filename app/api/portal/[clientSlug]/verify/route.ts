import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { mintClientPortalToken, sessionCookieOptions, PORTAL_TTL_MS } from '@/lib/auth';
import { rateLimit, rateLimitIp } from '@/lib/rateLimit';
import { sendPushToAll } from '@/lib/webpush';

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;

  // 10 attempts / 15 min per IP, and 20 / hour per portal regardless of IP
  if (!(await rateLimitIp(req, 'portal-login', 10, 15 * 60_000)) || !(await rateLimit(`portal-login-slug:${clientSlug}`, 20, 3600_000))) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({ password: '' }));

  const client = await prisma.client.findUnique({ where: { slug: clientSlug } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!client.isActive) return NextResponse.json({ error: 'inactive' }, { status: 403 });

  const valid = await bcrypt.compare(String(password || ''), client.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  const token = await mintClientPortalToken(clientSlug);
  if (!token) return NextResponse.json({ error: 'inactive' }, { status: 403 });

  sendPushToAll(
    'Client Login',
    `${client.name} just logged into their portal`,
    `/admin/clients/${client.id}`
  ).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`pc_${clientSlug}`, token, sessionCookieOptions(PORTAL_TTL_MS / 1000));
  return res;
}
