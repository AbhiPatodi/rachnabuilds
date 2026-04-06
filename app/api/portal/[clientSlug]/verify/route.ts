import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPushToAll } from '@/lib/webpush';

// Simple in-memory rate limiter: max 10 attempts per IP per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = ip;
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientSlug: string }> }) {
  const { clientSlug } = await params;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
             req.headers.get('x-real-ip') ??
             '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  const { password } = await req.json();

  const client = await prisma.client.findUnique({ where: { slug: clientSlug, isActive: true } });
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
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
