// Lead assignment + pipeline settings (custom sub-stages, assign method).
import { prisma } from './prisma';
import { sendPushToMember } from './webpush';

export type AssignMethod = 'off' | 'round_robin' | 'fewest_open';
const OPEN = { notIn: ['closed_won', 'closed_lost', 'disqualified'] };

// Custom sub-stages under each built-in status. The built-in statuses stay
// fixed (Meta quality signals and automations key off them); sub-stages are
// the free part — reasons, flavours, "asked to call back in Jan".
export const DEFAULT_SUBSTATUS: Record<string, string[]> = {
  contacted: ['Asked to message later', 'Sent store link', 'Wants price first'],
  no_reply: ['Seen, no reply', 'Message not delivered'],
  call_booked: ['Rescheduled once'],
  proposal_sent: ['Thinking it over', 'Negotiating price'],
  closed_lost: ['Too expensive', 'Not ready yet', 'Went with someone else', 'Just browsing', 'Never replied'],
  disqualified: ['No store yet', 'Not on Shopify', 'Spam / fake details', 'Wrong country / budget'],
};

export async function getPipelineSettings(): Promise<{ assignMethod: AssignMethod; subStatus: Record<string, string[]> }> {
  const rows = await prisma.setting.findMany({ where: { key: { in: ['lead_assign_method', 'lead_substatus_options'] } } });
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  let subStatus = DEFAULT_SUBSTATUS;
  try { const v = get('lead_substatus_options'); if (v) subStatus = JSON.parse(v); } catch {}
  const m = get('lead_assign_method');
  return { assignMethod: m === 'round_robin' || m === 'fewest_open' ? m : 'off', subStatus };
}

/** Give a new lead to the next person in the rotation (if auto-assign is on
 *  and anyone is in it). Leads nobody is assigned stay with the owner. */
export async function autoAssign(leadId: string): Promise<string | null> {
  const { assignMethod } = await getPipelineSettings();
  if (assignMethod === 'off') return null;
  const members = await prisma.teamMember.findMany({
    where: { active: true, receivesLeads: true },
    select: { id: true, name: true, lastAssignedAt: true, _count: { select: { leads: { where: { status: OPEN } } } } },
  });
  if (!members.length) return null;
  const pick = assignMethod === 'fewest_open'
    ? members.sort((a, b) => a._count.leads - b._count.leads || (a.lastAssignedAt?.getTime() ?? 0) - (b.lastAssignedAt?.getTime() ?? 0))[0]
    : members.sort((a, b) => (a.lastAssignedAt?.getTime() ?? 0) - (b.lastAssignedAt?.getTime() ?? 0))[0];
  return assignLead(leadId, pick.id, 'auto');
}

/** Assign (or unassign with memberId=null), log it, and tell the new owner. */
export async function assignLead(leadId: string, memberId: string | null, by: string | null): Promise<string | null> {
  const lead = await prisma.funnelLead.findUnique({ where: { id: leadId }, select: { name: true, assignedToId: true } });
  if (!lead || lead.assignedToId === memberId) return memberId;
  const member = memberId ? await prisma.teamMember.findUnique({ where: { id: memberId }, select: { id: true, name: true } }) : null;
  if (memberId && !member) throw new Error('member not found');
  await prisma.funnelLead.update({ where: { id: leadId }, data: { assignedToId: memberId } });
  if (member) await prisma.teamMember.update({ where: { id: member.id }, data: { lastAssignedAt: new Date() } });
  await prisma.leadActivity.create({
    data: { leadId, type: 'system', text: member ? `👤 Assigned to ${member.name}${by === 'auto' ? ' (auto)' : ''}` : '👤 Unassigned', actor: by === 'auto' ? null : by },
  }).catch(() => {});
  if (member) {
    await sendPushToMember(member.id, '🆕 New lead for you', `${lead.name} — message them now`, `/admin/funnel-leads/${leadId}`).catch(() => {});
  }
  return memberId;
}
