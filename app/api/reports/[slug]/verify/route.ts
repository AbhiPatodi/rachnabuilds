import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { password } = await req.json();

  const report = await prisma.report.findUnique({ where: { slug, isActive: true } });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(password, report.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  // Update view tracking
  await prisma.report.update({
    where: { id: report.id },
    data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
  });

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const token = crypto.createHmac('sha256', secret).update(slug).digest('hex');

  sendPushToAll('Client Login', `${report.clientName} just logged into their portal`, `/admin/reports/${report.id}`).catch(() => {})

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`rp_${slug}`, token, { httpOnly: true, maxAge: 86400, path: '/' });
  return res;
}
