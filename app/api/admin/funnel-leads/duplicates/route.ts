import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentSession } from '@/lib/auth';
import { phoneKey } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const nameKey = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
// Marketplaces where thousands of different stores share one domain: the path
// (shop name) is the store's identity, so the domain alone never matches.
const SHARED_HOSTS = new Set(['etsy.com', 'amazon.com', 'amazon.in', 'ebay.com', 'flipkart.com', 'instagram.com', 'facebook.com', 'linktr.ee']);
const hostKey = (u: string | null) => {
  if (!u) return null;
  const s = u.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, '');
  const host = s.replace(/[/?#].*$/, '');
  if (!host) return null;
  if (SHARED_HOSTS.has(host)) {
    const path = s.slice(host.length).replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
    return path ? `${host}/${path}` : null;
  }
  return host;
};

/** Groups of leads that look like the same person: same phone (last 10
 *  digits), same store, or same name. Email is unique, so never a match. */
export async function GET() {
  const leads = await prisma.funnelLead.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, storeUrl: true, status: true, utmSource: true, utmMedium: true, createdAt: true, _count: { select: { activities: true, bookings: true, proposals: true, payments: true } } },
  });
  const groups = new Map<string, typeof leads>();
  const add = (key: string | null, l: (typeof leads)[number]) => {
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), l]);
  };
  for (const l of leads) {
    add(phoneKey(l.phone) && `phone:${phoneKey(l.phone)}`, l);
    const w = phoneKey(l.whatsapp);
    if (w && w !== phoneKey(l.phone)) add(`phone:${w}`, l);
    const h = hostKey(l.storeUrl);
    if (h) add(`store:${h}`, l);
    const n = nameKey(l.name);
    if (n.length >= 5) add(`name:${n}`, l);
  }
  // One entry per distinct set of leads, strongest reason first.
  const seen = new Set<string>();
  const out: { reason: string; leads: typeof leads }[] = [];
  for (const prefix of ['phone:', 'store:', 'name:']) {
    for (const [key, list] of groups) {
      if (!key.startsWith(prefix) || list.length < 2) continue;
      const ids = [...new Set(list.map((l) => l.id))].sort().join(',');
      if (ids.split(',').length < 2 || seen.has(ids)) continue;
      seen.add(ids);
      out.push({ reason: prefix === 'phone:' ? 'Same phone number' : prefix === 'store:' ? 'Same store' : 'Same name', leads: list.filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i) });
    }
  }
  return NextResponse.json({ groups: out });
}

/** Merge `mergeId` INTO `keepId`: everything attached to the duplicate moves
 *  over, empty fields on the kept lead are filled from it, then it's deleted. */
export async function POST(req: NextRequest) {
  const { keepId, mergeId } = await req.json().catch(() => ({}));
  if (!keepId || !mergeId || keepId === mergeId) return NextResponse.json({ error: 'keepId and mergeId required' }, { status: 400 });
  const [keep, dup] = await Promise.all([
    prisma.funnelLead.findUnique({ where: { id: keepId } }),
    prisma.funnelLead.findUnique({ where: { id: mergeId } }),
  ]);
  if (!keep || !dup) return NextResponse.json({ error: 'lead not found' }, { status: 404 });

  const FILL = ['phone', 'whatsapp', 'storeUrl', 'role', 'profession', 'challenge', 'revenue', 'blocker', 'financial', 'readiness', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'appliedAt', 'nextFollowUpAt', 'lastTouchAt', 'assignedToId', 'subStatus'] as const;
  const fill: Record<string, unknown> = {};
  for (const f of FILL) if (keep[f] == null && dup[f] != null) fill[f] = dup[f];
  const notes = [keep.notes, dup.notes ? `[merged from ${dup.email}] ${dup.notes}` : null].filter(Boolean).join('\n\n') || null;
  const formAnswers = keep.formAnswers || dup.formAnswers ? { ...(dup.formAnswers as object || {}), ...(keep.formAnswers as object || {}) } : undefined;
  const by = (await currentSession())?.name || null;

  await prisma.$transaction([
    prisma.leadActivity.updateMany({ where: { leadId: mergeId }, data: { leadId: keepId } }),
    prisma.booking.updateMany({ where: { funnelLeadId: mergeId }, data: { funnelLeadId: keepId } }),
    prisma.auditReport.updateMany({ where: { funnelLeadId: mergeId }, data: { funnelLeadId: keepId } }),
    prisma.proposal.updateMany({ where: { leadId: mergeId }, data: { leadId: keepId } }),
    prisma.payment.updateMany({ where: { leadId: mergeId }, data: { leadId: keepId } }),
    prisma.storeProofReport.updateMany({ where: { funnelLeadId: mergeId }, data: { funnelLeadId: keepId } }),
    prisma.storeProofJob.updateMany({ where: { funnelLeadId: mergeId }, data: { funnelLeadId: keepId } }),
    prisma.prospect.updateMany({ where: { promotedLeadId: mergeId }, data: { promotedLeadId: keepId } }),
    // Meta's lead id must keep pointing at a live CRM lead, or the quality
    // signal for this person can never be sent.
    prisma.metaLeadEvent.updateMany({ where: { email: dup.email }, data: { email: keep.email } }),
    prisma.funnelLead.delete({ where: { id: mergeId } }),
    prisma.funnelLead.update({
      where: { id: keepId },
      data: { ...fill, notes, ...(formAnswers ? { formAnswers } : {}), createdAt: dup.createdAt < keep.createdAt ? dup.createdAt : keep.createdAt },
    }),
    prisma.leadActivity.create({ data: { leadId: keepId, type: 'system', text: `🔗 Merged duplicate lead "${dup.name}" (${dup.email}) into this one`, actor: by } }),
  ]);
  return NextResponse.json({ ok: true });
}
