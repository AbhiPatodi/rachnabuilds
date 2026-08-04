import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCallReminderToLead, ReminderKind } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Reminder windows in minutes-until-call. Wide enough that a 10-minute cron
// cadence never skips one; the sent-keys check prevents duplicates.
const WINDOWS: Array<{ kind: ReminderKind; min: number; max: number }> = [
  { kind: '12h', min: 65, max: 720 },
  { kind: '1h', min: 35, max: 65 },
  { kind: '30m', min: 5, max: 35 },
  { kind: 'live', min: -15, max: 5 },
];

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'confirmed',
      startTime: {
        gte: new Date(now - 15 * 60 * 1000),
        lte: new Date(now + 720 * 60 * 1000),
      },
    },
  });

  const results: Array<{ id: string; kind: ReminderKind; ok: boolean }> = [];

  for (const b of bookings) {
    const minutesUntil = (b.startTime.getTime() - now) / 60000;
    let sent: string[] = [];
    try { sent = JSON.parse(b.remindersSent); } catch {}

    const due = WINDOWS.find(
      (w) => minutesUntil > w.min && minutesUntil <= w.max && !sent.includes(w.kind),
    );
    if (!due) continue;

    // Mark as sent BEFORE sending so a slow Gmail call + overlapping cron
    // run can't double-send; a failed send is logged in the response.
    await prisma.booking.update({
      where: { id: b.id },
      data: { remindersSent: JSON.stringify([...sent, due.kind]) },
    });

    const { ok } = await sendCallReminderToLead({
      name: b.name,
      email: b.email,
      startTime: b.startTime,
      meetLink: b.meetLink,
      kind: due.kind,
    });
    results.push({ id: b.id, kind: due.kind, ok });
  }

  return NextResponse.json({ checked: bookings.length, sent: results });
}
