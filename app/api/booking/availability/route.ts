import { NextResponse } from 'next/server';
import { getAvailableSlots, BOOKING_TIMEZONE, BOOKING_SLOT_MINUTES } from '@/lib/availability';
import { isCalendarConnected } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  const connected = await isCalendarConnected();
  if (!connected) {
    return NextResponse.json({ connected: false, slots: [] });
  }
  const slots = await getAvailableSlots();
  return NextResponse.json({ connected: true, slots, timezone: BOOKING_TIMEZONE, slotMinutes: BOOKING_SLOT_MINUTES });
}
