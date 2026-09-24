import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { mintReportToken, sessionCookieOptions, REPORT_TTL_MS } from '@/lib/auth';
import { rateLimit, rateLimitIp } from '@/lib/rateLimit';
import { sendPushToAll } from '@/lib/webpush';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await rateLimitIp(req, 'report-login', 10, 15 * 60_000)) || !(await rateLimit(`report-login-slug:${slug}`, 20, 3600_000))) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }
  const { password } = await req.json().catch(() => ({ password: '' }));

  const report = await prisma.report.findUnique({ where: { slug, isActive: true } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(String(password || ''), report.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  // Update view tracking
  await prisma.report.update({
    where: { id: report.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const token = await mintReportToken(slug);
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  sendPushToAll('Client Login', `${report.clientName} just logged into their portal`, `/admin/reports/${report.id}`).catch(() => {})

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`rp_${slug}`, token, sessionCookieOptions(REPORT_TTL_MS / 1000));
  return res;
}
