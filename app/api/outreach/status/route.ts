// Read-only cold-email status, outside /api/admin so it can be checked without a
// browser session. INSTANTLY_API_KEY is a sensitive Vercel variable and cannot be
// pulled back down, so the key never leaves the server: this endpoint reads
// Instantly here and returns only the numbers.
//
// Auth is the same derived-key trick the UAbility sheet feeds use, so nothing new
// has to be configured. It unlocks aggregate counts, not prospect data.
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { safeEqual } from '@/lib/auth';
import { listCampaigns, campaignAnalytics, listAccounts, warmupAnalytics, hasInstantlyKey, campaignSendingStatus, dailyAccountAnalytics, updateCampaignFields, getCampaign } from '@/lib/instantly';

export const dynamic = 'force-dynamic';

function statusKey(): string | null {
  if (!process.env.CRON_SECRET) return null;
  return createHash('sha256').update(`outreach:${process.env.CRON_SECRET}`).digest('hex').slice(0, 24);
}

export async function GET(req: NextRequest) {
  const want = statusKey();
  const got = req.nextUrl.searchParams.get('key');
  if (!want || !got || !safeEqual(got, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Our own side first: these are the numbers that matter and they never depend
  // on Instantly being reachable.
  // `replied` (promoted funnel leads) only counts replies a human has already
  // approved. The webhook itself sets prospects.stage = 'replied', and that is
  // the queue nobody was reading: a real reply sat there for two days (19–21 Oct)
  // while this endpoint reported zero. pendingReplies reads that stage directly.
  const [stages, replied, pendingReplies, lastHook, declines] = await Promise.all([
    prisma.prospect.groupBy({ by: ['stage'], _count: true }),
    prisma.funnelLead.findMany({
      where: { utmSource: 'cold-email' },
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
    prisma.prospect.findMany({
      where: { stage: 'replied' },
      orderBy: { updatedAt: 'desc' }, take: 20,
      select: { id: true, email: true, storeName: true, domain: true, coldReply: true, updatedAt: true },
    }),
    prisma.setting.findUnique({ where: { key: 'instantly_last_webhook' } }),
    // Declines are replies too. A human said "no thanks" — that is a result the
    // owner asked to hear about, and it is also the earliest signal on copy.
    prisma.prospect.findMany({
      where: { stage: 'declined' },
      orderBy: { updatedAt: 'desc' }, take: 20,
      select: { id: true, email: true, storeName: true, domain: true, coldReply: true, updatedAt: true },
    }),
  ]);

  const out: Record<string, unknown> = {
    crm: {
      stages: Object.fromEntries(stages.map((s) => [s.stage, s._count])),
      // Replies awaiting a human — the number that actually needs a same-day answer.
      pendingReplies: pendingReplies.length,
      pendingReplyList: pendingReplies.map((p) => {
        const cr = (p.coldReply || {}) as { at?: string; subject?: string; eaccount?: string };
        return { id: p.id, email: p.email, store: p.storeName || p.domain, repliedAt: cr.at ?? p.updatedAt, subject: cr.subject ?? null, inbox: cr.eaccount ?? null };
      }),
      declines: declines.length,
      recentDeclines: declines.map((p) => {
        const cr = (p.coldReply || {}) as { at?: string; replyText?: string; from?: string };
        return { email: p.email, store: p.storeName || p.domain, at: cr.at ?? p.updatedAt, said: (cr.replyText || '').slice(0, 140) };
      }),
      replies: replied.length,
      recentReplies: replied,
      lastWebhook: lastHook?.value ? JSON.parse(lastHook.value) : null,
    },
    instantly: { connected: hasInstantlyKey() },
  };

  if (hasInstantlyKey()) {
    try {
      const [campaigns, accounts] = await Promise.all([listCampaigns(), listAccounts()]);
      const analytics = await campaignAnalytics().catch(() => null);
      const warm = await warmupAnalytics(accounts.map((a) => a.email)).catch(() => null);
      out.instantly = {
        connected: true,
        campaigns: campaigns.map((c) => ({
          id: c.id, name: c.name, status: c.status,
          dailyLimit: (c as { daily_limit?: number }).daily_limit ?? null,
          leads: (c as { leads_count?: number }).leads_count ?? null,
          sent: (c as { emails_sent_count?: number }).emails_sent_count ?? null,
          replies: (c as { reply_count?: number }).reply_count ?? null,
          bounced: (c as { bounced_count?: number }).bounced_count ?? null,
          unsubscribed: (c as { unsubscribed_count?: number }).unsubscribed_count ?? null,
        })),
        accounts: accounts.map((a) => ({
          email: a.email, status: a.status, warmupStatus: a.warmup_status,
          dailyLimit: a.daily_limit ?? null, score: a.stat_warmup_score ?? null,
        })),
        analytics, warmup: warm,
        // The two questions the counts alone cannot answer: is it allowed to send
        // right now, and did anything actually go out today.
        sendingStatus: campaigns[0]
          ? await campaignSendingStatus(campaigns[0].id).catch((e) => ({ error: (e as Error).message.slice(0, 200) }))
          : null,
        today: await dailyAccountAnalytics(
          accounts.map((a) => a.email), new Date().toISOString().slice(0, 10),
        ).catch((e) => ({ error: (e as Error).message.slice(0, 200) })),
        // The follow-up steps themselves: how many, how long each waits, and the
        // first line of each variant. Without this there is no way to tell whether
        // follow-ups are configured at all, or just not reached yet.
        sequence: campaigns[0]
          ? await getCampaign(campaigns[0].id)
              .then((c) => {
                const seqs = (c as { sequences?: unknown[] }).sequences || [];
                return seqs.map((sq, si) => ({
                  sequence: si + 1,
                  steps: (((sq as { steps?: unknown[] }).steps) || []).map((st, i) => {
                    const step = st as { type?: string; delay?: number; variants?: { subject?: string; body?: string }[] };
                    return {
                      step: i + 1,
                      waitDays: step.delay ?? null,
                      variants: (step.variants || []).map((v) => ({
                        subject: v.subject || '(no subject — same thread)',
                        preview: (v.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180),
                      })),
                    };
                  }),
                }));
              })
              .catch((e) => ({ error: (e as Error).message.slice(0, 200) }))
          : null,
      };
    } catch (e) {
      out.instantly = { connected: true, error: (e as Error).message.slice(0, 300) };
    }
  }

  return NextResponse.json(out);
}


/**
 * Change the campaign send rate. Instantly applies daily_limit to the WHOLE
 * campaign, not per inbox — set it to 10 expecting 10-per-inbox and the batch
 * crawls at 10 a day. Same derived key as the GET.
 */
export async function POST(req: NextRequest) {
  const want = statusKey();
  const got = req.nextUrl.searchParams.get('key');
  if (!want || !got || !safeEqual(got, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasInstantlyKey()) return NextResponse.json({ error: 'INSTANTLY_API_KEY is not set' }, { status: 400 });
  const { campaignId, dailyLimit } = await req.json().catch(() => ({}));
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  const n = Number(dailyLimit);
  // Capped at 270 = the nine inboxes' own 30/day ceiling; anything more is wishful.
  if (!Number.isFinite(n) || n < 1 || n > 270) {
    return NextResponse.json({ error: 'dailyLimit must be between 1 and 270' }, { status: 400 });
  }
  try {
    const out = await updateCampaignFields(campaignId, { daily_limit: n });
    return NextResponse.json({ ok: true, dailyLimit: out.daily_limit ?? n });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
