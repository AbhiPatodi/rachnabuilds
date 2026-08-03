import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cancelCalendarEvent } from '@/lib/googleCalendar';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = ['confirmed', 'cancelled', 'completed', 'no_show'];

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { status } = await req.json();

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (status === 'cancelled' && booking.googleEventId) {
      await cancelCalendarEvent(booking.googleEventId);
    }

    const updated = await prisma.booking.update({ where: { id }, data: { status } });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
