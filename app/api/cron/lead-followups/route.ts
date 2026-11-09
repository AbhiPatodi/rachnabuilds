import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeEqual } from '@/lib/auth';
import { sendPushToAll, sendPushToMember } from '@/lib/webpush';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Runs every 10 minutes (GitHub Actions, call-reminders.yml). Two jobs:
//  1. Speed-to-lead alarm — a new lead nobody has acted on gets a push at
//     15 minutes (to whoever it's assigned to, else the owner) and at 60
//     (to the assignee AND the owner — the escalation). "Acted on" = any
//     note, status change or one-tap outcome (system entries don't count).
//  2. Morning digest — once a day after 9 AM IST: the owner gets every lead
//     due today or overdue; each team member gets just their own.

const MIN = 60_000;
const ALARMS = [15, 60]; // minutes after the lead arrived

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = Date.now();

  // ── 1. Speed-to-lead alarm ──
  const fresh = await prisma.funnelLead.findMany({
    where: {
      status: 'new',
      speedAlarms: { lt: ALARMS.length },
      createdAt: { gte: new Date(now - 3 * 3600_000), lte: new Date(now - ALARMS[0] * MIN) },
      NOT: { id: { startsWith: 'imp' } },
    },
    select: { id: true, name: true, createdAt: true, speedAlarms: true, lastTouchAt: true, utmMedium: true, utmSource: true, assignedToId: true, assignedTo: { select: { name: true } }, activities: { where: { type: { in: ['note', 'status'] } }, take: 1, select: { id: true } } },
  });
  const alarmed: string[] = [];
  for (const l of fresh) {
    if (l.activities.length || l.lastTouchAt) {
      await prisma.funnelLead.update({ where: { id: l.id }, data: { speedAlarms: ALARMS.length } });
      continue;
    }
    const mins = (now - l.createdAt.getTime()) / MIN;
    const due = ALARMS.filter((a) => mins >= a).length;
    if (due <= l.speedAlarms) continue;
    // Claim the alarm before sending so an overlapping run can't double-push.
    const claimed = await prisma.funnelLead.updateMany({ where: { id: l.id, speedAlarms: l.speedAlarms }, data: { speedAlarms: due } });
    if (!claimed.count) continue;
    const src = l.utmMedium === 'instant-form' ? 'Meta form' : l.utmSource === 'cold-email' ? 'cold-email reply' : 'website';
    const late = due >= 2;
    const title = late ? `🚨 ${l.name} — 1 hour, still no reply` : `⏰ ${l.name} is waiting (${Math.round(mins)} min)`;
    const body = late
      ? `New ${src} lead from an hour ago — nobody has messaged them${l.assignedTo ? ` (assigned to ${l.assignedTo.name})` : ''}. Leads go cold fast.`
      : `New ${src} lead, not contacted yet. Message them now while they remember filling the form.`;
    const url = `/admin/funnel-leads/${l.id}`;
    if (l.assignedToId) await sendPushToMember(l.assignedToId, title, body, url).catch(() => {});
    if (!l.assignedToId || late) await sendPushToAll(title, body, url).catch(() => {});
    await prisma.leadActivity.create({ data: { leadId: l.id, type: 'system', text: late ? '🚨 1-hour no-contact alarm sent' : '⏰ 15-minute no-contact alarm sent' } }).catch(() => {});
    alarmed.push(l.name);
  }

  // ── 2. Morning digest (9 AM IST = 03:30 UTC) ──
  let digest: string | null = null;
  const ist = new Date(now + 330 * MIN);
  const istDate = ist.toISOString().slice(0, 10);
  const istMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (istMinutes >= 9 * 60) {
    const last = await prisma.setting.findUnique({ where: { key: 'followup_digest_last' } });
    if (last?.value !== istDate) {
      await prisma.setting.upsert({ where: { key: 'followup_digest_last' }, update: { value: istDate }, create: { key: 'followup_digest_last', value: istDate } });
      const endOfTodayIst = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - 330 * MIN);
      const due = await prisma.funnelLead.findMany({
        where: { nextFollowUpAt: { lt: endOfTodayIst }, status: { notIn: ['closed_won', 'closed_lost', 'disqualified'] } },
        orderBy: { nextFollowUpAt: 'asc' },
        select: { name: true, nextFollowUpAt: true, assignedToId: true },
      });
      const startOfTodayIst = endOfTodayIst.getTime() - 24 * 3600_000;
      const summary = (list: typeof due) => {
        const overdue = list.filter((d) => d.nextFollowUpAt!.getTime() < startOfTodayIst).length;
        const names = list.slice(0, 5).map((d) => d.name.split(' ')[0]).join(', ') + (list.length > 5 ? ` +${list.length - 5} more` : '');
        return `${list.length} follow-up${list.length === 1 ? '' : 's'} today${overdue ? ` (${overdue} overdue)` : ''}: ${names}`;
      };
      if (due.length) {
        digest = summary(due);
        await sendPushToAll('☀️ Who to message today', digest, '/admin/dashboard').catch(() => {});
        const byMember = new Map<string, typeof due>();
        for (const d of due) if (d.assignedToId) byMember.set(d.assignedToId, [...(byMember.get(d.assignedToId) || []), d]);
        for (const [memberId, list] of byMember) {
          await sendPushToMember(memberId, '☀️ Your follow-ups today', summary(list), '/admin/funnel-leads').catch(() => {});
        }
      } else {
        digest = 'none due';
      }
    }
  }

  return NextResponse.json({ ok: true, alarmed, digest });
}
