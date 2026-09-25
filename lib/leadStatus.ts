// Keep FunnelLead.status in step with what happens to their booking, so the
// pipeline reflects reality without manual updates. Never touches a lead that
// is already closed (won/lost) or disqualified.
import { prisma } from './prisma';

const TERMINAL = new Set(['closed_won', 'closed_lost', 'disqualified']);

export async function syncLeadFromBooking(leadId: string | null | undefined, bookingStatus: string, note?: string) {
  if (!leadId) return;
  const lead = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { status: true } });
  if (!lead || TERMINAL.has(lead.status)) return;

  let next: string | null = null;
  let text = '';
  if (bookingStatus === 'completed') {
    next = lead.status === 'proposal_sent' ? null : 'showed';
    text = note || 'Call completed';
  } else if (bookingStatus === 'no_show') {
    next = lead.status === 'call_booked' ? 'confirmed' : null;
    text = 'Missed the booked call (no-show)';
  } else if (bookingStatus === 'cancelled') {
    next = lead.status === 'call_booked' ? 'confirmed' : null;
    text = 'Booked call was cancelled';
  } else if (bookingStatus === 'confirmed') {
    next = lead.status === 'new' || lead.status === 'confirmed' ? 'call_booked' : null;
    text = 'Call booked';
  }

  if (next && next !== lead.status) {
    await prisma.funnelLead.update({ where: { id: leadId }, data: { status: next } });
    await prisma.leadActivity.create({
      data: { leadId, type: 'status', text: `Status: ${lead.status} → ${next} (${text.toLowerCase()})` },
    }).catch(() => {});
  } else if (text && bookingStatus !== 'confirmed') {
    await prisma.leadActivity.create({ data: { leadId, type: 'system', text } }).catch(() => {});
  }
}
