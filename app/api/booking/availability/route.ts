import { NextResponse } from 'next/server';
import { getAvailableSlots, BOOKING_TIMEZONE, getBookingSlotMinutes } from '@/lib/availability';
import { isCalendarConnected } from '@/lib/googleCalendar';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connected = await isCalendarConnected();
  if (!connected) {
    // Fallback: Google Calendar "appointment schedule" booking-page embed, if configured
    const embed = await prisma.setting.findUnique({ where: { key: 'booking_embed_url' } });
    return NextResponse.json({ connected: false, slots: [], embedUrl: embed?.value || null });
  }
  const [slots, slotMinutes] = await Promise.all([getAvailableSlots(), getBookingSlotMinutes()]);
  return NextResponse.json({ connected: true, slots, timezone: BOOKING_TIMEZONE, slotMinutes });
}
