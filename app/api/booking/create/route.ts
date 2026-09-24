import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/googleCalendar';
import { isSlotStillAvailable, BOOKING_TIMEZONE } from '@/lib/availability';
import { sendPushToAll } from '@/lib/webpush';
import { notifyCallBooked, sendBookingConfirmationToLead } from '@/lib/email';
import { sendMetaCapiEvent, clientIpFromHeaders } from '@/lib/metaCapi';
import { rateLimitIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name: rawName, email, whatsapp: rawWhatsapp, start, end, funnelLeadId, metaEventId } = await req.json();

    // Every booking creates a real invite on Rachna's calendar and sends mail
    // from our Gmail — limit per IP and per attendee email.
    if (!(await rateLimitIp(req, 'booking', 3, 3600_000))) {
      return NextResponse.json({ error: 'Too many booking attempts — please try again later.' }, { status: 429 });
    }
    const name = typeof rawName === 'string' ? rawName.replace(/[\r\n\t]+/g, ' ').slice(0, 80) : '';
    const whatsapp = typeof rawWhatsapp === 'string' ? rawWhatsapp.replace(/[^\d+\s()-]/g, '').slice(0, 30) : '';

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
    const cleanEmail = email.trim().toLowerCase().slice(0, 200);
    if (!(await rateLimit(`booking-email:${cleanEmail}`, 2, 24 * 3600_000))) {
      return NextResponse.json({ error: 'You already have a call booked — check your email for the invite.' }, { status: 429 });
    }

    // Only link the lead when the booking email matches it — a lead id alone
    // (it appears in URLs) must not let a stranger flip someone's status.
    let linkedLeadId: string | null = null;
    if (funnelLeadId) {
      const l = await prisma.funnelLead.findUnique({ where: { id: String(funnelLeadId) }, select: { id: true, email: true } });
      if (l && l.email === cleanEmail) linkedLeadId = l.id;
    }
    if (!linkedLeadId) {
      const l = await prisma.funnelLead.findUnique({ where: { email: cleanEmail }, select: { id: true } });
      if (l) linkedLeadId = l.id;
    }

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
        funnelLeadId: linkedLeadId,
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

    if (linkedLeadId) {
      await prisma.funnelLead.update({
        where: { id: linkedLeadId },
        data: { status: 'call_booked' },
      }).catch(() => {});
    }

    // Fire-and-forget promises are not reliable on Vercel serverless — the
    // function can be frozen the instant the response below is sent, killing
    // any send still in flight. `after()` keeps the invocation alive until
    // these finish, without adding latency to the response itself.
    const fbp = req.cookies.get('_fbp')?.value;
    const fbc = req.cookies.get('_fbc')?.value;
    const clientIp = clientIpFromHeaders(req.headers);
    const userAgent = req.headers.get('user-agent') || undefined;
    after(async () => {
      await sendPushToAll('📅 Call booked!', `${name} booked a call`, '/admin/funnel-leads').catch(() => {});
      await notifyCallBooked({ name: name.trim(), email: cleanEmail, whatsapp, startTime, meetLink }).catch(() => {});
      try {
        const s = await prisma.setting.findUnique({ where: { key: 'funnel_reminder_confirmation' } });
        if (s?.value !== 'off') {
          await sendBookingConfirmationToLead({ name: name.trim(), email: cleanEmail, startTime, meetLink });
        }
      } catch {}
      if (metaEventId) {
        await sendMetaCapiEvent({
          eventName: 'Schedule',
          eventId: metaEventId,
          eventSourceUrl: 'https://rachnabuilds.com/training/apply',
          email: cleanEmail,
          phone: whatsapp,
          fbp, fbc,
          clientIpAddress: clientIp,
          clientUserAgent: userAgent,
        }).catch(() => {});
      }
    });

    return NextResponse.json({ ok: true, id: booking.id, meetLink, startTime: startTime.toISOString() });
  } catch (err) {
    console.error('Booking create error:', err);
    return NextResponse.json({ error: 'Something went wrong booking your call. Please try again or message us on WhatsApp.' }, { status: 500 });
  }
}
