import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  const cookieStore = await cookies();
  cookieStore.set('admin_session', hash, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return NextResponse.json({ ok: true });
}
