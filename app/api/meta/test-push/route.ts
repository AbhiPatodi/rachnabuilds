// Fires a test push to every subscribed device, so notification setup can be
// verified without waiting for a real lead.
//
//   GET  → how many devices are subscribed
//   POST → send a test notification to all of them
//
// Auth: Bearer CRON_SECRET.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { safeEqual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function unauthorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return !process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    devices: subs.length,
    subscriptions: subs.map((s) => ({
      id: s.id,
      // endpoint host tells us which browser/platform registered
      provider: (() => {
        try {
          return new URL(s.endpoint).host;
        } catch {
          return 'unknown';
        }
      })(),
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const count = await prisma.pushSubscription.count();
  if (!count) {
    return NextResponse.json(
      { ok: false, devices: 0, hint: 'No device subscribed — click "Enable Notifications" in /admin first' },
      { status: 400 },
    );
  }
  await sendPushToAll(
    '⚡ Test notification',
    'If you can read this, lead alerts will reach this device.',
    '/admin/funnel-leads',
  );
  return NextResponse.json({ ok: true, devices: count });
}
