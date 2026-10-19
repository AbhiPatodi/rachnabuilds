// Every cold-email thread for a campaign, grouped by prospect, so the whole
// history is readable here instead of in Instantly's Unibox.
//
// Unlike the other routes in this folder this one is behind isAdmin(): it
// returns prospect addresses and full message bodies, not aggregate counts.
//
// Steps come back 0-indexed from Instantly (step "0" is the first touch) and
// `ue_type` 2 marks a received reply. `replies_automatic` is a different thing
// from a human reply — an out-of-office counts as auto, and because the
// campaign has stop_on_auto_reply set, an auto-reply ENDS that sequence. The
// `stopped` flag below is what surfaces that.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { listCampaignEmails, listCampaigns, hasInstantlyKey } from '@/lib/instantly';

export const dynamic = 'force-dynamic';

const MAX_PAGES = 6; // 600 emails — well past batch 1, and bounds a slow call

interface Msg {
  id: string;
  at: string | null;
  inbound: boolean;
  step: number | null;
  subject: string;
  body: string;
  inbox: string;
  auto: boolean;
}

/** Heuristic: does this inbound message read as a machine reply? */
function looksAutomatic(subject: string, body: string): boolean {
  const s = `${subject} ${body}`.toLowerCase();
  return /out of office|out-of-office|ooo\b|automatic reply|auto-reply|autoreply|otomatik|away from (my|the) (desk|office)|on (vacation|holiday|leave)|has been received|your message has been received|we('| ha)?ve received your|response within|thanks for reaching out|ticket/.test(s);
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasInstantlyKey()) return NextResponse.json({ error: 'INSTANTLY_API_KEY is not set' }, { status: 400 });

  let campaignId = req.nextUrl.searchParams.get('campaignId');
  if (!campaignId) {
    const camps = await listCampaigns().catch(() => []);
    campaignId = camps[0]?.id ?? null;
  }
  if (!campaignId) return NextResponse.json({ error: 'No campaign found' }, { status: 404 });

  // Page through the Unibox and bucket by lead.
  const byLead = new Map<string, Msg[]>();
  let cursor: string | undefined;
  let pages = 0;
  try {
    do {
      const page = await listCampaignEmails(campaignId, 100, cursor);
      for (const e of page.items || []) {
        const lead = (e.lead || e.to_address_email_list || '').toLowerCase();
        if (!lead) continue;
        const inbound = e.ue_type === 2;
        const body = (e.body?.text || e.body?.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const subject = e.subject || '';
        // Instantly's `step` ("0_0_1") is the THREAD's opening step, not this
        // message's: in-thread follow-ups carry the same string, so every
        // thread would read as a first touch. The real step is the message's
        // position among the sends in that thread, assigned after sorting.
        const msgs = byLead.get(lead) || [];
        msgs.push({
          id: e.id,
          at: e.timestamp_created || null,
          inbound,
          step: null, // filled in below, from order within the thread
          subject,
          body: body.slice(0, 4000),
          inbox: e.eaccount || '',
          auto: inbound && looksAutomatic(subject, body),
        });
        byLead.set(lead, msgs);
      }
      cursor = page.next_starting_after;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }

  // Our own record of these prospects, so the thread sits next to the finding
  // the email actually quoted.
  const emails = [...byLead.keys()];
  const prospects = emails.length
    ? await prisma.prospect.findMany({
        where: { email: { in: emails, mode: 'insensitive' } },
        select: { id: true, email: true, storeName: true, domain: true, finding: true, issueCount: true, stage: true, promotedLeadId: true },
      })
    : [];
  const pMap = new Map(prospects.map((p) => [p.email.toLowerCase(), p]));

  const threads = [...byLead.entries()]
    .map(([email, msgs]) => {
      msgs.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
      const sent = msgs.filter((m) => !m.inbound);
      sent.forEach((m, i) => { m.step = i; });
      const inbound = msgs.filter((m) => m.inbound);
      const human = inbound.filter((m) => !m.auto);
      const p = pMap.get(email);
      return {
        email,
        storeName: p?.storeName || p?.domain || email.split('@')[1] || email,
        prospectId: p?.id ?? null,
        stage: p?.stage ?? null,
        finding: p?.finding ?? null,
        issueCount: p?.issueCount ?? null,
        leadId: p?.promotedLeadId ?? null,
        sentCount: sent.length,
        lastStep: sent.length ? Math.max(...sent.map((m) => m.step ?? 0)) : null,
        lastAt: msgs[msgs.length - 1]?.at ?? null,
        replied: human.length > 0,
        autoReplied: inbound.length > 0 && human.length === 0,
        // An auto-reply ends the sequence while stop_on_auto_reply is on, so
        // these are the people who silently fell out mid-sequence.
        stopped: inbound.length > 0 && human.length === 0,
        messages: msgs,
      };
    })
    // Anything needing a human first, then most recent activity.
    .sort((a, b) => {
      const rank = (t: typeof a) => (t.replied ? 0 : t.stopped ? 1 : 2);
      return rank(a) - rank(b) || (b.lastAt || '').localeCompare(a.lastAt || '');
    });

  return NextResponse.json({
    campaignId,
    truncated: Boolean(cursor),
    totals: {
      threads: threads.length,
      emails: threads.reduce((n, t) => n + t.sentCount, 0),
      replied: threads.filter((t) => t.replied).length,
      autoStopped: threads.filter((t) => t.stopped).length,
      byStep: threads.reduce((a, t) => {
        if (t.lastStep !== null) a[t.lastStep] = (a[t.lastStep] || 0) + 1;
        return a;
      }, {} as Record<number, number>),
    },
    threads,
  });
}
