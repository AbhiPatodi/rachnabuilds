// Admin: schedule a call with this lead directly — creates the Google
// Calendar event with a Meet link (the lead gets the invite email from
// Google automatically), stores the Booking, and logs the timeline.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent, isCalendarConnected } from '@/lib/googleCalendar';
import { BOOKING_TIMEZONE } from '@/lib/availability';
import { sendPushToAll } from '@/lib/webpush';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, whatsapp: true, phone: true },
  });
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (!(await isCalendarConnected())) {
    return NextResponse.json({ error: 'Google Calendar is not connected — connect it in Admin → Calendar first.' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const startTime = new Date(body.start || '');
  const durationMin = Math.min(120, Math.max(15, Math.round(Number(body.durationMin) || 20)));
  if (isNaN(startTime.getTime()) || startTime.getTime() < Date.now() - 5 * 60_000) {
    return NextResponse.json({ error: 'Pick a valid future start time' }, { status: 400 });
  }
  const endTime = new Date(startTime.getTime() + durationMin * 60_000);

  const { eventId, meetLink } = await createCalendarEvent({
    summary: `Rachna Builds — Store walkthrough with ${lead.name}`,
    description: `Store audit walkthrough call (scheduled from admin).\n\nName: ${lead.name}\nEmail: ${lead.email}${lead.whatsapp || lead.phone ? `\nWhatsApp: ${lead.whatsapp || lead.phone}` : ''}`,
    startTime,
    endTime,
    attendeeEmail: lead.email,
    timezone: BOOKING_TIMEZONE,
  });

  const booking = await prisma.booking.create({
    data: {
      funnelLeadId: lead.id,
      name: lead.name,
      email: lead.email,
      whatsapp: lead.whatsapp || lead.phone || null,
      startTime,
      endTime,
      timezone: BOOKING_TIMEZONE,
      googleEventId: eventId,
      meetLink,
    },
  });
  await prisma.funnelLead.update({ where: { id: lead.id }, data: { status: 'call_booked' } }).catch(() => {});
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id, type: 'system',
      text: `Call scheduled for ${startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })} IST — Google invite sent to ${lead.email}`,
    },
  }).catch(() => {});
  await sendPushToAll('📅 Call scheduled', `${lead.name} — ${startTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })} IST`, `/admin/funnel-leads/${lead.id}`).catch(() => {});

  return NextResponse.json({ ok: true, booking: { id: booking.id, meetLink, startTime } });
}
