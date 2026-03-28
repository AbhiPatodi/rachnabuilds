import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin') || pathname === '/admin-login') return NextResponse.next();
  const cookie = req.cookies.get('admin_session')?.value;
  const expected = await sha256Hex(process.env.ADMIN_PASSWORD || '');
  if (cookie !== expected) return NextResponse.redirect(new URL('/admin-login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/admin-login'] };
