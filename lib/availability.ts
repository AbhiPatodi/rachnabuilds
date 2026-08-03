import { prisma } from './prisma';
import { getBusyIntervals } from './googleCalendar';

const TIMEZONE = 'Asia/Kolkata';
const SLOT_MINUTES = 20;
const BUFFER_MINUTES = 10;
const LOOKAHEAD_DAYS = 14;
const MIN_NOTICE_HOURS = 12;

// Business hours in IST, 24h format. Sun=0 ... Sat=6.
const WORK_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null,
  1: { start: 9, end: 18 },
  2: { start: 9, end: 18 },
  3: { start: 9, end: 18 },
  4: { start: 9, end: 18 },
  5: { start: 9, end: 18 },
  6: { start: 10, end: 14 },
};

function istPartsToUtcDate(y: number, m: number, d: number, h: number, min: number) {
  // IST is UTC+5:30 with no DST — construct UTC instant directly.
  return new Date(Date.UTC(y, m, d, h - 5, min - 30));
}

function istDateParts(base: Date, dayOffset: number) {
  const istNow = new Date(base.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCDate(istNow.getUTCDate() + dayOffset);
  return { y: istNow.getUTCFullYear(), m: istNow.getUTCMonth(), d: istNow.getUTCDate(), dow: istNow.getUTCDay() };
}

export interface Slot {
  start: string; // ISO
  end: string;   // ISO
}

export async function getAvailableSlots(): Promise<Slot[]> {
  const now = new Date();
  const minBookable = new Date(now.getTime() + MIN_NOTICE_HOURS * 60 * 60 * 1000);
  const rangeStart = now.toISOString();
  const rangeEnd = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [busy, existingBookings] = await Promise.all([
    getBusyIntervals(rangeStart, rangeEnd),
    prisma.booking.findMany({
      where: { status: 'confirmed', startTime: { gte: now } },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const blocked = [...busy, ...existingBookings.map((b) => ({ start: b.startTime, end: b.endTime }))];

  const slots: Slot[] = [];
  for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS; dayOffset++) {
    const { y, m, d, dow } = istDateParts(now, dayOffset);
    const hours = WORK_HOURS[dow];
    if (!hours) continue;

    for (let h = hours.start; h < hours.end; h++) {
      for (let min = 0; min < 60; min += SLOT_MINUTES) {
        const start = istPartsToUtcDate(y, m, d, h, min);
        const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
        const slotEndIst = new Date(end.getTime() + 5.5 * 60 * 60 * 1000);
        if (slotEndIst.getUTCHours() + slotEndIst.getUTCMinutes() / 3600 > hours.end + 0.001) continue;
        if (start < minBookable) continue;

        const overlaps = blocked.some((b) => {
          const bufStart = new Date(b.start.getTime() - BUFFER_MINUTES * 60 * 1000);
          const bufEnd = new Date(b.end.getTime() + BUFFER_MINUTES * 60 * 1000);
          return start < bufEnd && end > bufStart;
        });
        if (overlaps) continue;

        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }

  return slots;
}

export async function isSlotStillAvailable(startIso: string, endIso: string): Promise<boolean> {
  const slots = await getAvailableSlots();
  return slots.some((s) => s.start === startIso && s.end === endIso);
}

export const BOOKING_TIMEZONE = TIMEZONE;
export const BOOKING_SLOT_MINUTES = SLOT_MINUTES;
