// DB-backed rate limiting (in-memory maps reset per serverless instance, so
// they don't actually limit anything on Vercel). One row per allowed hit.
import type { NextRequest } from 'next/server';
import { prisma } from './prisma';

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  return (
    h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Returns true if this hit is allowed (and records it), false if `key` has
 * already made `limit` hits within `windowMs`. Fails OPEN on DB errors so a
 * database hiccup never blocks real leads.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
    if (count >= limit) return false;
    await prisma.rateLimitHit.create({ data: { key } });
    if (Math.random() < 0.02) {
      await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 24 * 3600_000) } } });
    }
    return true;
  } catch {
    return true;
  }
}

/** Convenience: limit by route + IP. */
export async function rateLimitIp(req: NextRequest | Request, route: string, limit: number, windowMs: number) {
  return rateLimit(`${route}:${clientIp(req)}`, limit, windowMs);
}
