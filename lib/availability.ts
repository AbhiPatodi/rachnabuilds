import { prisma } from './prisma';
import { getBusyIntervals } from './googleCalendar';

const TIMEZONE = 'Asia/Kolkata';

interface BookingConfig {
  slotMinutes: number;
  bufferMinutes: number;
  lookaheadDays: number;
  minNoticeHours: number;
  workHours: Record<number, { start: number; end: number } | null>; // Sun=0..Sat=6, 24h decimal
}

const DEFAULT_CONFIG: BookingConfig = {
  slotMinutes: 20,
  bufferMinutes: 10,
  lookaheadDays: 14,
  minNoticeHours: 12,
  workHours: {
    0: null,
    1: { start: 9, end: 18 },
    2: { start: 9, end: 18 },
    3: { start: 9, end: 18 },
    4: { start: 9, end: 18 },
    5: { start: 9, end: 18 },
    6: { start: 10, end: 14 },
  },
};

const CONFIG_KEY = 'booking_config';

export async function getBookingConfig(): Promise<BookingConfig> {
  const row = await prisma.setting.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(row.value);
    return { ...DEFAULT_CONFIG, ...parsed, workHours: { ...DEFAULT_CONFIG.workHours, ...(parsed.workHours || {}) } };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveBookingConfig(config: BookingConfig): Promise<void> {
  await prisma.setting.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify(config) },
    update: { value: JSON.stringify(config) },
  });
}

export function defaultBookingConfig(): BookingConfig {
  return DEFAULT_CONFIG;
}

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
  const config = await getBookingConfig();
  const now = new Date();
  const minBookable = new Date(now.getTime() + config.minNoticeHours * 60 * 60 * 1000);
  const rangeStart = now.toISOString();
  const rangeEnd = new Date(now.getTime() + config.lookaheadDays * 24 * 60 * 60 * 1000).toISOString();

  const [busy, existingBookings] = await Promise.all([
    getBusyIntervals(rangeStart, rangeEnd),
    prisma.booking.findMany({
      where: { status: 'confirmed', startTime: { gte: now } },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const blocked = [...busy, ...existingBookings.map((b) => ({ start: b.startTime, end: b.endTime }))];

  const slots: Slot[] = [];
  for (let dayOffset = 0; dayOffset < config.lookaheadDays; dayOffset++) {
    const { y, m, d, dow } = istDateParts(now, dayOffset);
    const hours = config.workHours[dow];
    if (!hours) continue;

    for (let h = Math.floor(hours.start); h < Math.ceil(hours.end); h++) {
      for (let min = 0; min < 60; min += config.slotMinutes) {
        const start = istPartsToUtcDate(y, m, d, h, min);
        const end = new Date(start.getTime() + config.slotMinutes * 60 * 1000);
        const slotStartIst = h + min / 60;
        const slotEndIst = new Date(end.getTime() + 5.5 * 60 * 60 * 1000);
        const slotEndHourIst = slotEndIst.getUTCHours() + slotEndIst.getUTCMinutes() / 60;
        if (slotStartIst < hours.start - 0.001) continue;
        if (slotEndHourIst > hours.end + 0.001) continue;
        if (start < minBookable) continue;

        const overlaps = blocked.some((b) => {
          const bufStart = new Date(b.start.getTime() - config.bufferMinutes * 60 * 1000);
          const bufEnd = new Date(b.end.getTime() + config.bufferMinutes * 60 * 1000);
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
export async function getBookingSlotMinutes() {
  return (await getBookingConfig()).slotMinutes;
}
