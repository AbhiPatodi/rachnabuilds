// Keep FunnelLead.status in step with what happens to their booking, so the
// pipeline reflects reality without manual updates. Never touches a lead that
// is already closed (won/lost) or disqualified.
import { after } from 'next/server';
import { prisma } from './prisma';
import { sendLeadStageToMeta, type LeadStage } from './metaCapi';

export const LEAD_STATUSES = ['new', 'contacted', 'no_reply', 'confirmed', 'call_booked', 'showed', 'proposal_sent', 'closed_won', 'closed_lost', 'disqualified'];
const TERMINAL = new Set(['closed_won', 'closed_lost', 'disqualified']);

// CRM status → the quality signal Meta hears about that Instant Form lead.
// One event per stage per lead (event_id dedupe in sendLeadStageToMeta).
// The negative signals matter as much as the positive ones: without them Meta
// keeps hunting for more people like the ones who went nowhere. contacted /
// no_reply say nothing about quality yet, so they send nothing.
const STATUS_TO_META_STAGE: Record<string, LeadStage> = {
  call_booked: 'lead_qualified',
  showed: 'lead_qualified',
  proposal_sent: 'lead_qualified',
  closed_won: 'lead_converted',
  closed_lost: 'lead_disqualified',
  disqualified: 'lead_disqualified',
};

/** Raw-lead stage for every Instant Form lead, sent once per leadgen id.
 *  Runs from the lead webhook (instantly) and from the hourly cron, which
 *  also picks up anything the webhook missed. A rejection is logged on the
 *  lead once and not retried, so a bad id can't loop every hour. */
export async function sendRawLeadSignals(limit = 25): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.$queryRaw<{ leadgenId: string; createdAt: Date; leadId: string; email: string; phone: string | null }[]>`
    SELECT m."leadgenId", m."createdAt", f.id AS "leadId", f.email, f.phone
    FROM meta_lead_events m
    JOIN funnel_leads f ON lower(f.email) = lower(m.email)
    WHERE m.email NOT LIKE '%@meta.com'
      AND NOT EXISTS (SELECT 1 FROM lead_activities a WHERE a."leadId" = f.id
                      AND a.text LIKE '📡%lead_received%' AND a.text LIKE '%' || m."leadgenId" || '%')
    ORDER BY m."createdAt" DESC LIMIT ${limit}`;
  let sent = 0, failed = 0;
  for (const p of pending) {
    // 1 s after we stored it, so it's never before Meta's own lead time.
    const eventTime = Math.floor(p.createdAt.getTime() / 1000) + 1;
    const r = await sendLeadStageToMeta({ stage: 'lead_received', leadgenId: p.leadgenId, email: p.email, phone: p.phone, eventTime });
    if (r.reason === 'not_configured') break;
    if (r.ok) sent++; else failed++;
    await prisma.leadActivity.create({
      data: {
        leadId: p.leadId, type: 'system',
        text: r.ok
          ? `📡 Sent "lead_received" (raw lead) to Meta · lead ${p.leadgenId}`
          : `📡 Meta did not accept "lead_received" for lead ${p.leadgenId}: ${r.reason}`,
      },
    }).catch(() => {});
  }
  return { sent, failed };
}

/** "lead_engaged" for Instant Form leads that replied to us. Picks up every
 *  "✅ They replied" note (outcome button or logged by hand), once per lead,
 *  with the reply's own time. Runs hourly and right after a Replied tap. */
export async function sendEngagedSignals(limit = 25): Promise<{ sent: number; failed: number }> {
  const pending = await prisma.$queryRaw<{ leadId: string; email: string; phone: string | null; leadgenId: string; repliedAt: Date }[]>`
    SELECT DISTINCT ON (f.id) f.id AS "leadId", f.email, f.phone, m."leadgenId", a."createdAt" AS "repliedAt"
    FROM lead_activities a
    JOIN funnel_leads f ON f.id = a."leadId"
    JOIN meta_lead_events m ON lower(m.email) = lower(f.email)
    WHERE a.text LIKE '✅ They replied%'
      AND m.email NOT LIKE '%@meta.com'
      AND NOT EXISTS (SELECT 1 FROM lead_activities x WHERE x."leadId" = f.id AND x.text LIKE '📡%lead_engaged%')
    ORDER BY f.id, a."createdAt" ASC LIMIT ${limit}`;
  let sent = 0, failed = 0;
  for (const p of pending) {
    const eventTime = Math.min(Math.floor(p.repliedAt.getTime() / 1000), Math.floor(Date.now() / 1000));
    const r = await sendLeadStageToMeta({ stage: 'lead_engaged', leadgenId: p.leadgenId, email: p.email, phone: p.phone, eventTime });
    if (r.reason === 'not_configured') break;
    if (r.ok) sent++; else failed++;
    await prisma.leadActivity.create({
      data: {
        leadId: p.leadId, type: 'system',
        text: r.ok ? `📡 Sent "lead_engaged" (they replied) to Meta · lead ${p.leadgenId}`
                   : `📡 Meta did not accept "lead_engaged" for lead ${p.leadgenId}: ${r.reason}`,
      },
    }).catch(() => {});
  }
  return { sent, failed };
}

/** Send the Meta quality signal for this lead's new status, if it came from
 *  an Instant Form. Every status-changing code path calls this — the signal
 *  used to fire only from the admin dropdown, so it never fired at all. */
export async function sendMetaSignalForStatus(leadId: string, status: string): Promise<boolean> {
  const stage = STATUS_TO_META_STAGE[status];
  if (!stage) return false;
  const lead = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { email: true, phone: true } });
  if (!lead?.email) return false;
  const ev = await prisma.metaLeadEvent.findFirst({ where: { email: { equals: lead.email, mode: 'insensitive' } } });
  if (!ev) return false;
  const r = await sendLeadStageToMeta({ stage, leadgenId: ev.leadgenId, email: lead.email, phone: lead.phone });
  if (r.ok) {
    await prisma.leadActivity.create({
      data: { leadId, type: 'system', text: `📡 Sent "${stage}" quality signal to Meta for this ad lead` },
    }).catch(() => {});
  } else {
    console.error('lead-stage CAPI failed:', leadId, stage, r.reason);
  }
  return r.ok;
}

/** Fire-and-forget version for request handlers: runs after the response so
 *  the admin UI never waits on Meta. */
export function queueMetaSignal(leadId: string, status: string) {
  if (!STATUS_TO_META_STAGE[status]) return;
  const run = () => sendMetaSignalForStatus(leadId, status).catch((e) => console.error('lead-stage CAPI hook failed:', e));
  try { after(run); } catch { void run(); }
}

// ── One-tap outcomes (lead page) ─────────────────────────────────────────
// Each button logs what happened, moves the status forward (never back),
// and sets when to chase next — so nothing goes quiet without anyone noticing.
const DAY = 86400_000;
const RANK: Record<string, number> = { new: 0, contacted: 1, no_reply: 1, confirmed: 2, call_booked: 3, showed: 4, proposal_sent: 5 };

export const OUTCOMES: Record<string, { label: string; status: string | null; followUpDays: number | null; note: string }> = {
  whatsapp_sent: { label: '💬 Messaged', status: 'contacted', followUpDays: 2, note: '💬 Messaged on WhatsApp' },
  no_reply: { label: '🔕 No reply', status: 'no_reply', followUpDays: 2, note: '🔕 No reply yet — chasing again' },
  replied: { label: '✅ Replied', status: 'contacted', followUpDays: 1, note: '✅ They replied' },
  call_booked: { label: '📞 Call booked', status: 'call_booked', followUpDays: null, note: '📞 Call booked' },
  not_interested: { label: '✖ Not interested', status: 'closed_lost', followUpDays: null, note: '✖ Not interested — closed' },
};

/** `auto` = logged by tapping a WhatsApp / iMessage button rather than an
 *  outcome button. Opening the same chat twice in 15 minutes logs once. */
export async function applyOutcome(leadId: string, outcome: string, actor?: string | null, auto = false) {
  const o = OUTCOMES[outcome];
  if (!o) throw new Error('unknown outcome');
  const lead = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { status: true, lastTouchAt: true } });
  if (!lead) throw new Error('not found');
  if (auto && lead.lastTouchAt && Date.now() - lead.lastTouchAt.getTime() < 15 * 60_000) {
    return prisma.funnelLead.findUniqueOrThrow({ where: { id: leadId } });
  }

  let next: string | null = null;
  if (o.status && o.status !== lead.status) {
    if (TERMINAL.has(o.status)) next = o.status;
    // "Replied" lifts a no_reply lead back to contacted; otherwise only forward.
    else if (!TERMINAL.has(lead.status) && ((RANK[o.status] ?? 0) > (RANK[lead.status] ?? 0) || (outcome === 'replied' && lead.status === 'no_reply'))) next = o.status;
  }
  const now = new Date();
  const followUp = o.followUpDays == null ? null : new Date(now.getTime() + o.followUpDays * DAY);
  const updated = await prisma.funnelLead.update({
    where: { id: leadId },
    data: { ...(next ? { status: next } : {}), lastTouchAt: now, nextFollowUpAt: followUp },
  });
  await prisma.leadActivity.create({ data: { leadId, type: 'note', text: auto ? `${o.note} (logged when the chat was opened)` : o.note, actor: actor || null } });
  if (next) {
    await prisma.leadActivity.create({ data: { leadId, type: 'status', text: `Status: ${lead.status} → ${next}` } }).catch(() => {});
    queueMetaSignal(leadId, next);
  }
  if (outcome === 'replied') {
    const run = () => sendEngagedSignals(5).catch((e) => console.error('lead_engaged CAPI failed:', e));
    try { after(run); } catch { void run(); }
  }
  return updated;
}

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
    queueMetaSignal(leadId, next);
  } else if (text && bookingStatus !== 'confirmed') {
    await prisma.leadActivity.create({ data: { leadId, type: 'system', text } }).catch(() => {});
  }
}
