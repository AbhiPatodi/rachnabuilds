// Instantly → CRM. Registered with ?key=CRON_SECRET (Instantly doesn't sign webhooks).
//   reply_received     → prospect stage=replied, promote to a funnel lead, push alert;
//                        clear "send it"/yes replies get the report link back in-thread automatically
//   lead_unsubscribed  → stage=suppressed (never contact again)
//   email_bounced      → verifyStatus=invalid, stage=suppressed
//   lead_interested / lead_meeting_booked → push, promote
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { safeEqual } from '@/lib/auth';
import { sendPushToAll } from '@/lib/webpush';
import { emailsForLead, replyToEmail, hasInstantlyKey } from '@/lib/instantly';

export const dynamic = 'force-dynamic';

const POSITIVE = /\b(send it|send me|yes please|yes,? send|sure|go ahead|please share|share it|sounds good|would love|interested|let'?s see it|ok send)\b/i;
const NEGATIVE = /\b(unsubscribe|remove me|not interested|no thanks|stop emailing|don'?t email|take me off)\b/i;

interface Payload {
  event_type?: string; campaign_id?: string; campaign_name?: string; lead_email?: string; email?: string;
  email_account?: string; eaccount?: string; reply_text?: string; reply_text_snippet?: string; reply_subject?: string;
  firstName?: string; first_name?: string; lastName?: string; unibox_url?: string; email_id?: string; uuid?: string;
  [k: string]: unknown;
}

export async function POST(req: NextRequest) {
  const k = req.nextUrl.searchParams.get('key');
  if (!process.env.CRON_SECRET || !safeEqual(k, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const p = (await req.json().catch(() => ({}))) as Payload;
  const type = String(p.event_type || '');
  const email = String(p.lead_email || p.email || '').toLowerCase().trim();
  if (!email) return NextResponse.json({ ok: false, reason: 'no lead email' });

  const prospect = await prisma.prospect.findUnique({ where: { email } });
  const receipt = { at: new Date().toISOString(), type, email, campaign: p.campaign_name || p.campaign_id || null, known: !!prospect };
  await prisma.setting.upsert({ where: { key: 'instantly_last_webhook' }, create: { key: 'instantly_last_webhook', value: JSON.stringify(receipt) }, update: { value: JSON.stringify(receipt) } }).catch(() => {});

  if (type === 'lead_unsubscribed' || type === 'lead_not_interested') {
    if (prospect) await prisma.prospect.update({ where: { id: prospect.id }, data: { stage: 'suppressed' } });
    return NextResponse.json({ ok: true, action: 'suppressed' });
  }
  if (type === 'email_bounced' || type === 'account_error') {
    if (prospect && type === 'email_bounced') await prisma.prospect.update({ where: { id: prospect.id }, data: { stage: 'suppressed', verifyStatus: 'invalid' } });
    return NextResponse.json({ ok: true, action: 'bounced' });
  }
  if (!['reply_received', 'lead_interested', 'lead_meeting_booked', 'lead_neutral'].includes(type)) {
    return NextResponse.json({ ok: true, action: 'ignored' });
  }

  const text = String(p.reply_text || p.reply_text_snippet || '').replace(/\s+/g, ' ').trim();
  const negative = NEGATIVE.test(text);
  const positive = !negative && POSITIVE.test(text.slice(0, 400));
  const name = String(p.first_name || p.firstName || prospect?.name || '').trim() || email.split('@')[0];

  // Promote to the CRM (idempotent on email)
  let lead = await prisma.funnelLead.findUnique({ where: { email } });
  if (!lead) {
    lead = await prisma.funnelLead.create({
      data: {
        name, email, storeUrl: prospect?.websiteUrl || (prospect?.domain ? `https://${prospect.domain}` : null),
        stage: 'applied', status: 'new', utmSource: 'cold-email', utmMedium: 'cold-email', utmCampaign: String(p.campaign_name || p.campaign_id || ''),
        notes: prospect?.finding ? `Cold-email finding: ${prospect.finding}` : null,
      },
    });
  }
  await prisma.leadActivity.create({
    data: { id: 'act_' + randomBytes(10).toString('hex'), leadId: lead.id, type: 'system', text: `✉️ Replied to cold email${p.campaign_name ? ` (${p.campaign_name})` : ''}${text ? `: "${text.slice(0, 220)}"` : ''}` },
  }).catch(() => {});
  if (prospect) await prisma.prospect.update({ where: { id: prospect.id }, data: { stage: negative ? 'suppressed' : 'replied', promotedLeadId: lead.id } });

  // Report link: the prospect's pre-built teaser, if the scan made one
  let reportUrl: string | null = null;
  if (prospect?.reportId) {
    const r = await prisma.storeProofReport.findUnique({ where: { id: prospect.reportId }, select: { publicToken: true } });
    if (r?.publicToken) reportUrl = `https://rachnabuilds.com/report/${r.publicToken}`;
  }

  let autoReplied = false;
  if (positive && reportUrl && hasInstantlyKey()) {
    try {
      const eaccount = String(p.email_account || p.eaccount || '');
      let replyId = String(p.email_id || p.uuid || '');
      if (!replyId || !eaccount) {
        const mails = await emailsForLead(email, p.campaign_id);
        const last = mails.find((m) => m.ue_type === 2) || mails[0];
        if (last) replyId = last.id;
      }
      if (replyId && eaccount) {
        const first = name.split(' ')[0];
        await replyToEmail(replyId, eaccount, `Re: ${String(p.reply_subject || '').replace(/^re:\s*/i, '') || 'your store'}`,
          `Here you go, ${first}: ${reportUrl}\n\nIt's the full check-up of your store, with the two biggest issues open and the rest ready when you are. If anything's unclear just reply here and I'll explain.\n\nRachna`);
        autoReplied = true;
        await prisma.leadActivity.create({ data: { id: 'act_' + randomBytes(10).toString('hex'), leadId: lead.id, type: 'system', text: `🤖 Auto-sent their report link in the thread (${reportUrl})` } }).catch(() => {});
      }
    } catch (e) {
      await prisma.leadActivity.create({ data: { id: 'act_' + randomBytes(10).toString('hex'), leadId: lead.id, type: 'system', text: `⚠️ Auto-reply failed: ${(e as Error).message.slice(0, 160)}` } }).catch(() => {});
    }
  }

  sendPushToAll(
    negative ? '🚫 Cold-email opt-out' : positive ? (autoReplied ? '✅ Cold-email reply — report sent' : '🔥 Cold-email reply (wants report)') : '💬 Cold-email reply',
    `${name}${prospect?.storeName ? ` · ${prospect.storeName}` : ''}${text ? `: ${text.slice(0, 90)}` : ''}${autoReplied ? '' : negative ? '' : ' — reply within the hour'}`,
    `/admin/funnel-leads/${lead.id}`,
  ).catch(() => {});

  return NextResponse.json({ ok: true, leadId: lead.id, positive, negative, autoReplied, reportUrl: !!reportUrl });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST from Instantly with ?key=CRON_SECRET' });
}
