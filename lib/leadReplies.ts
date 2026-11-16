// Email replies from leads → CRM. Every few minutes we look in the connected
// Gmail inbox (hello@rachnabuilds.com) for new mail FROM an open lead's
// address, log it on the lead, move them to "replied" and push the owner's
// phones. Needs the gmail.readonly scope: until Google is reconnected with
// it, this returns { skipped } and does nothing.
import { google } from 'googleapis';
import { prisma } from './prisma';
import { getAuthedClient } from './googleCalendar';
import { applyOutcome } from './leadStatus';
import { sendPushToAll } from './webpush';

const OPEN = ['new', 'contacted', 'no_reply', 'confirmed', 'call_booked', 'showed', 'proposal_sent'];

export async function checkLeadReplies(): Promise<{ found: number; skipped?: string }> {
  const auth = await getAuthedClient();
  if (!auth) return { found: 0, skipped: 'google not connected' };
  const gmail = google.gmail({ version: 'v1', auth });

  const since = new Date(Date.now() - 45 * 86400_000);
  const leads = await prisma.funnelLead.findMany({
    where: { status: { in: OPEN }, email: { not: '' }, OR: [{ createdAt: { gte: since } }, { lastTouchAt: { gte: since } }] },
    select: { id: true, name: true, email: true },
    take: 200,
  });
  const byEmail = new Map(leads.map((l) => [l.email.toLowerCase(), l]));
  if (!byEmail.size) return { found: 0 };

  let found = 0;
  const emails = [...byEmail.keys()];
  for (let i = 0; i < emails.length; i += 20) {
    const q = `in:inbox newer_than:3d from:(${emails.slice(i, i + 20).join(' OR ')})`;
    let list;
    try {
      list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 });
    } catch (e) {
      const msg = (e as Error).message || '';
      if (/insufficient|scope|403/i.test(msg)) return { found, skipped: 'needs gmail.readonly — reconnect Google in Admin → Calendar' };
      throw e;
    }
    for (const m of list.data.messages || []) {
      if (!m.id) continue;
      const tag = `gmail:${m.id}`;
      if (await prisma.leadActivity.findFirst({ where: { text: { contains: tag } }, select: { id: true } })) continue;
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject'] });
      const h = (n: string) => full.data.payload?.headers?.find((x) => x.name?.toLowerCase() === n)?.value || '';
      const from = (h('from').match(/<([^>]+)>/)?.[1] || h('from')).trim().toLowerCase();
      const lead = byEmail.get(from);
      if (!lead) continue;
      const snippet = (full.data.snippet || '').replace(/\s+/g, ' ').slice(0, 220);
      await prisma.leadActivity.create({
        data: { leadId: lead.id, type: 'note', actor: 'auto', text: `📩 Email reply — "${h('subject')}": ${snippet} · ${tag}` },
      });
      await applyOutcome(lead.id, 'replied', 'auto').catch(() => {});
      await sendPushToAll(`📩 ${lead.name.split(' ')[0]} replied by email`, snippet.slice(0, 120), `/admin/funnel-leads/${lead.id}`).catch(() => {});
      found++;
    }
  }
  return { found };
}
