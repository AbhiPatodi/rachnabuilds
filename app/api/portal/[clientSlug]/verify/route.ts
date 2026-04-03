import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;
  const { password } = await req.json();

  const client = await prisma.client.findUnique({ where: { slug: clientSlug, isActive: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  const secret = process.env.ADMIN_PASSWORD || 'secret';
  const token = crypto.createHmac('sha256', secret).update(clientSlug).digest('hex');

  sendPushToAll(
    'Client Login',
    `${client.name} just logged into their portal`,
    `/admin/clients/${client.id}`
  ).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`pc_${clientSlug}`, token, { httpOnly: true, maxAge: 86400 * 7, path: '/' });
  return res;
}
