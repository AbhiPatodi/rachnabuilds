import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Public beacon from the VSL player. Values are cumulative per session, so
// upserts use max() semantics — a late/out-of-order beacon can never shrink
// recorded progress.
export async function POST(req: NextRequest) {
  try {
    const { sessionId, email, secondsWatched, maxPosition, duration } = await req.json();

    if (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 64) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }
    const sec = Math.min(Math.max(0, Math.round(Number(secondsWatched) || 0)), 86400);
    const pos = Math.min(Math.max(0, Math.round(Number(maxPosition) || 0)), 86400);
    const dur = Math.min(Math.max(0, Math.round(Number(duration) || 0)), 86400);
    const cleanEmail =
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? email.trim().toLowerCase()
        : null;

    const existing = await prisma.videoWatch.findUnique({ where: { sessionId } });
    if (existing) {
      await prisma.videoWatch.update({
        where: { sessionId },
        data: {
          secondsWatched: Math.max(existing.secondsWatched, sec),
          maxPosition: Math.max(existing.maxPosition, pos),
          duration: Math.max(existing.duration, dur),
          ...(cleanEmail && !existing.email ? { email: cleanEmail } : {}),
        },
      });
    } else {
      await prisma.videoWatch.create({
        data: { sessionId, email: cleanEmail, secondsWatched: sec, maxPosition: pos, duration: dur },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
