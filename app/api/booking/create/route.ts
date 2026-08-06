import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/googleCalendar';
import { isSlotStillAvailable, BOOKING_TIMEZONE } from '@/lib/availability';
import { sendPushToAll } from '@/lib/webpush';
import { notifyCallBooked, sendBookingConfirmationToLead } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, whatsapp, start, end, funnelLeadId } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!start || !end) return NextResponse.json({ error: 'A time slot is required' }, { status: 400 });

    const stillFree = await isSlotStillAvailable(start, end);
    if (!stillFree) {
      return NextResponse.json({ error: 'That slot was just booked — please pick another time.' }, { status: 409 });
    }

    const startTime = new Date(start);
    const endTime = new Date(end);
    const cleanEmail = email.trim().toLowerCase();

    const { eventId, meetLink } = await createCalendarEvent({
      summary: `Rachna Builds — Strategy Call with ${name.trim()}`,
      description: `Free Shopify Conversion Audit / strategy call.\n\nName: ${name.trim()}\nEmail: ${cleanEmail}${whatsapp ? `\nWhatsApp: ${whatsapp}` : ''}`,
      startTime,
      endTime,
      attendeeEmail: cleanEmail,
      timezone: BOOKING_TIMEZONE,
    });

    const booking = await prisma.booking.create({
      data: {
        funnelLeadId: funnelLeadId || null,
        name: name.trim(),
        email: cleanEmail,
        whatsapp: whatsapp?.trim() || null,
        startTime,
        endTime,
        timezone: BOOKING_TIMEZONE,
        googleEventId: eventId,
        meetLink,
      },
    });

    if (funnelLeadId) {
      await prisma.funnelLead.update({
        where: { id: funnelLeadId },
        data: { status: 'call_booked' },
      }).catch(() => {});
    }

    // Fire-and-forget promises are not reliable on Vercel serverless — the
    // function can be frozen the instant the response below is sent, killing
    // any send still in flight. `after()` keeps the invocation alive until
    // these finish, without adding latency to the response itself.
    after(async () => {
      await sendPushToAll('📅 Call booked!', `${name} booked a call`, '/admin/funnel-leads').catch(() => {});
      await notifyCallBooked({ name: name.trim(), email: cleanEmail, whatsapp, startTime, meetLink }).catch(() => {});
      try {
        const s = await prisma.setting.findUnique({ where: { key: 'funnel_reminder_confirmation' } });
        if (s?.value !== 'off') {
          await sendBookingConfirmationToLead({ name: name.trim(), email: cleanEmail, startTime, meetLink });
        }
      } catch {}
    });

    return NextResponse.json({ ok: true, id: booking.id, meetLink, startTime: startTime.toISOString() });
  } catch (err) {
    console.error('Booking create error:', err);
    const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
