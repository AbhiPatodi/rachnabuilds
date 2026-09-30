// Admin home: what needs attention today, this month's numbers, and the
// latest activity — leads, calls, proposals, payments, ads, cold email.
// Website content and the client portal moved to a compact row at the bottom.
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ContactIcons from '@/app/components/admin/ContactIcons';
import { getMoneySettings, monthSummary, ymOf } from '@/lib/money';
import { placeWithFlag } from '@/lib/flag';
import { after } from 'next/server';
import { syncIfStale } from '@/lib/metaAds';

export const dynamic = 'force-dynamic';

const DAY = 86400_000;
const ago = (d: Date) => { const h = Math.round((Date.now() - d.getTime()) / 3600_000); return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`; };
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const when = (d: Date) => d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

type Todo = { tone: 'bad' | 'warn' | 'good' | 'info'; icon: string; text: string; sub?: string; href: string; at: number; contact?: { phone?: string | null; whatsapp?: string | null; email?: string | null } };

export default async function DashboardPage() {
  after(() => syncIfStale(6)); // self-heal when the GitHub cron is late
  const now = new Date();
  const ym = ymOf(now);
  const [leads, recentViews, proposals, pendingPayments, bookings, jobs, activities, money, settings, prospectStages, prospectVerify, content, coldReplies] = await Promise.all([
    prisma.funnelLead.findMany({
      where: { status: { notIn: ['closed_won', 'closed_lost', 'disqualified'] } },
      select: { id: true, name: true, email: true, phone: true, whatsapp: true, status: true, createdAt: true, utmSource: true, utmMedium: true, storeUrl: true, activities: { where: { type: 'note' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, text: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.storeProofReportView.findMany({
      where: { viewedAt: { gte: new Date(Date.now() - 2 * DAY) }, NOT: { city: 'Indore' }, report: { funnelLeadId: { not: null } } },
      select: { viewedAt: true, city: true, country: true, durationSec: true, report: { select: { storeName: true, funnelLeadId: true } } },
      orderBy: { viewedAt: 'desc' }, take: 10,
    }),
    prisma.proposal.findMany({ where: { status: 'sent' }, select: { id: true, leadId: true, validUntil: true, viewCount: true, lead: { select: { name: true } } } }),
    prisma.payment.findMany({ where: { status: 'expected', date: { lte: new Date(Date.now() + 7 * DAY) } }, orderBy: { date: 'asc' }, select: { id: true, clientName: true, amount: true, currency: true, date: true, leadId: true } }),
    prisma.booking.findMany({ where: { status: 'confirmed', startTime: { gte: new Date(Date.now() - 2 * 3600_000), lte: new Date(Date.now() + 3 * DAY) } }, orderBy: { startTime: 'asc' }, select: { id: true, name: true, startTime: true, meetLink: true, funnelLeadId: true } }),
    prisma.storeProofJob.findMany({ where: { OR: [{ status: { in: ['queued', 'running'] } }, { status: 'failed', updatedAt: { gte: new Date(Date.now() - DAY) } }] }, select: { id: true, host: true, status: true, funnelLeadId: true, updatedAt: true, error: true } }),
    prisma.leadActivity.findMany({ orderBy: { createdAt: 'desc' }, take: 14, select: { id: true, text: true, type: true, createdAt: true, lead: { select: { id: true, name: true } } } }),
    monthSummary(ym),
    getMoneySettings(),
    prisma.prospect.groupBy({ by: ['stage'], _count: true }),
    prisma.prospect.groupBy({ by: ['verifyStatus'], where: { tier: { in: ['A+', 'A'] } }, _count: true }),
    Promise.all([prisma.project.count({ where: { isVisible: true } }), prisma.blogPost.count({ where: { isPublished: true } }), prisma.testimonial.count({ where: { isVisible: true } }), prisma.client.count({ where: { isActive: true } }), prisma.contactLead.count({ where: { status: 'new' } })]),
    prisma.funnelLead.count({ where: { utmSource: 'cold-email', status: 'new', activities: { none: { type: 'note' } } } }),
  ]);

  // ── Needs you today ──
  const todos: Todo[] = [];
  for (const l of leads) {
    const last = l.activities[0]?.createdAt ?? null;
    const isCold = l.utmSource === 'cold-email';
    if (!last && l.status === 'new' && Date.now() - l.createdAt.getTime() > 12 * 3600_000) {
      todos.push({ tone: isCold ? 'bad' : 'warn', icon: isCold ? '✉️' : '👋', text: `${l.name} — ${isCold ? 'replied to cold email, nobody has answered' : 'never contacted'}`, sub: `${l.storeUrl ? l.storeUrl.replace(/^https?:\/\/(www\.)?/, '') + ' · ' : 'no store link yet · '}${ago(l.createdAt)}`, href: `/admin/funnel-leads/${l.id}`, at: isCold ? 0 : 2, contact: l });
    } else if (last && ['new', 'confirmed', 'showed'].includes(l.status) && Date.now() - last.getTime() > 4 * DAY) {
      todos.push({ tone: 'warn', icon: '🔁', text: `${l.name} — follow-up due`, sub: `last message ${ago(last)}${l.activities[0]?.text ? ` · "${l.activities[0].text.slice(0, 40)}"` : ''}`, href: `/admin/funnel-leads/${l.id}`, at: 4, contact: l });
    }
  }
  for (const v of recentViews) {
    if (!v.report.funnelLeadId) continue;
    todos.push({ tone: 'good', icon: '👁', text: `${v.report.storeName} opened their report${v.durationSec ? ` (read ${v.durationSec >= 60 ? `${Math.floor(v.durationSec / 60)}m` : `${v.durationSec}s`})` : ''}`, sub: `${placeWithFlag(v.city, v.country)} · ${ago(v.viewedAt)} — good moment to message`, href: `/admin/funnel-leads/${v.report.funnelLeadId}`, at: 1 });
  }
  for (const p of proposals) {
    if (!p.validUntil) continue;
    const days = Math.ceil((p.validUntil.getTime() - Date.now()) / DAY);
    if (days <= 3) todos.push({ tone: days < 0 ? 'info' : 'warn', icon: '📄', text: `${p.lead.name} — proposal pricing ${days < 0 ? 'has expired' : days === 0 ? 'expires today' : `expires in ${days} day${days === 1 ? '' : 's'}`}`, sub: `${p.viewCount} open${p.viewCount === 1 ? '' : 's'}`, href: `/admin/funnel-leads/${p.leadId}`, at: 3 });
  }
  for (const p of pendingPayments) {
    const overdue = p.date.getTime() < Date.now() - DAY;
    todos.push({ tone: overdue ? 'bad' : 'info', icon: '💰', text: `${p.clientName} — ${p.currency === 'USD' ? '$' : '₹'}${p.amount} ${overdue ? 'overdue' : 'due'} ${p.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`, href: p.leadId ? `/admin/funnel-leads/${p.leadId}` : '/admin/money?tab=income', at: overdue ? 1 : 5 });
  }
  for (const b of bookings) todos.push({ tone: 'good', icon: '📞', text: `Call with ${b.name} — ${when(b.startTime)}`, sub: b.meetLink || undefined, href: b.funnelLeadId ? `/admin/funnel-leads/${b.funnelLeadId}` : '/admin/bookings', at: 0 });
  for (const j of jobs) todos.push({ tone: j.status === 'failed' ? 'bad' : 'info', icon: j.status === 'failed' ? '⚠️' : '⏳', text: `Audit ${j.status} — ${j.host}`, sub: j.error ? j.error.slice(0, 80) : `${ago(j.updatedAt)}${j.status === 'queued' ? ' · is the Mac worker running?' : ''}`, href: j.funnelLeadId ? `/admin/funnel-leads/${j.funnelLeadId}` : '/admin/storeproof', at: j.status === 'failed' ? 1 : 6 });
  if (settings.metaBalance != null && settings.metaBalance < settings.minBalance) todos.push({ tone: 'bad', icon: '📉', text: `Meta ad balance ${inr(settings.metaBalance)} — under your ${inr(settings.minBalance)} line`, sub: 'top up or the ads stop', href: '/admin/money?tab=ads', at: 0 });
  todos.sort((a, b) => a.at - b.at);

  // ── This month ──
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [leadsMonth, callsMonth, proposalsMonth, wonMonth] = await Promise.all([
    prisma.funnelLead.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.booking.count({ where: { createdAt: { gte: monthStart }, status: { in: ['confirmed', 'completed'] } } }),
    prisma.proposal.count({ where: { sentAt: { gte: monthStart } } }),
    prisma.funnelLead.count({ where: { status: 'closed_won', updatedAt: { gte: monthStart } } }),
  ]);
  const stage = Object.fromEntries(prospectStages.map((r) => [r.stage, r._count]));
  const verify = Object.fromEntries(prospectVerify.map((r) => [r.verifyStatus, r._count]));
  const [portfolioCount, blogCount, testimonialCount, activeClients, contactNew] = content;
  const TONE: Record<Todo['tone'], string> = { bad: 'var(--danger)', warn: 'var(--warn)', good: 'var(--accent)', info: 'var(--info)' };

  return (
    <div className="admin-content">
      <style>{`
        .dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 1100px) { .dash-grid { grid-template-columns: repeat(2, 1fr); } }
        .dash-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; text-decoration: none; display: block; }
        .dash-stat:hover { border-color: var(--border-hover); }
        .dash-stat-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
        .dash-stat-value { font-size: 28px; font-weight: 700; font-family: var(--heading); line-height: 1; color: var(--text); }
        .dash-stat-value.accent { color: var(--accent); }
        .dash-stat-sub { font-size: 11.5px; color: var(--text-muted); margin-top: 6px; }
        .dash-row { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 900px) { .dash-row { grid-template-columns: 1fr; } }
        .dash-section-title { font-family: var(--heading); font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .dash-section-title a { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; color: var(--accent); letter-spacing: .06em; text-transform: uppercase; text-decoration: none; }
        .todo { display: flex; gap: 12px; align-items: flex-start; padding: 11px 0; border-bottom: 1px solid var(--border); text-decoration: none; color: var(--text); }
        .todo:last-child { border-bottom: none; }
        .todo:hover .todo-text { color: var(--accent); }
        .todo-bar { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
        .todo-text { font-size: 13.5px; font-weight: 600; }
        .todo-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .feed { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--text-secondary); align-items: baseline; }
        .feed:last-child { border-bottom: none; }
        .feed a { color: var(--text); font-weight: 600; text-decoration: none; white-space: nowrap; }
        .feed time { margin-left: auto; color: var(--text-muted); font-size: 11px; white-space: nowrap; }
        .dash-empty { text-align: center; padding: 28px; color: var(--text-muted); font-size: 13px; }
        .site-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .site-row a { font-size: 12.5px; color: var(--text-secondary); text-decoration: none; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 99px; padding: 6px 12px; }
        .site-row a:hover { color: var(--accent); border-color: var(--accent-dim); }
      `}</style>

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Today</h1>
          <p className="admin-page-subtitle">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })} · {todos.length ? `${todos.length} thing${todos.length === 1 ? '' : 's'} need you` : 'nothing waiting on you'}</p>
        </div>
        <Link href="/admin/funnel-leads" className="admin-btn admin-btn-primary">Leads →</Link>
      </div>

      <div className="dash-grid">
        <Link href="/admin/funnel-leads" className="dash-stat"><div className="dash-stat-label">Leads this month</div><div className="dash-stat-value">{leadsMonth}</div><div className="dash-stat-sub">{callsMonth} call{callsMonth === 1 ? '' : 's'} booked · {proposalsMonth} proposal{proposalsMonth === 1 ? '' : 's'} sent</div></Link>
        <Link href="/admin/money" className="dash-stat"><div className="dash-stat-label">Won · money in</div><div className="dash-stat-value accent">{wonMonth}</div><div className="dash-stat-sub">{inr(money.income.inr)} received{money.pendingInr ? ` · ${inr(money.pendingInr)} pending` : ''}</div></Link>
        <Link href="/admin/money?tab=ads" className="dash-stat"><div className="dash-stat-label">Meta ads</div><div className="dash-stat-value" style={{ color: settings.metaBalance != null && settings.metaBalance < settings.minBalance ? 'var(--danger)' : undefined }}>{settings.metaBalance != null ? inr(settings.metaBalance) : '—'}</div><div className="dash-stat-sub">balance · {inr(money.ads.spendInr)} spent this month · {money.ads.leads} lead{money.ads.leads === 1 ? '' : 's'}{money.ads.costPerLead ? ` at ${inr(money.ads.costPerLead)}` : ''}</div></Link>
        <Link href="/admin/outreach" className="dash-stat"><div className="dash-stat-label">Cold email</div><div className="dash-stat-value">{(stage.contacted || 0) + (stage.replied || 0) + (stage.promoted || 0)}</div><div className="dash-stat-sub">contacted · {(verify.valid || 0) + (verify.risky || 0)} verified · {stage.replied || 0} replied{coldReplies ? ` · ${coldReplies} unanswered` : ''}</div></Link>
      </div>

      <div className="dash-row">
        <div className="admin-card">
          <div className="dash-section-title">Needs you <Link href="/admin/funnel-leads">All leads →</Link></div>
          {todos.length === 0 ? <div className="dash-empty">All caught up. New leads, replies and report opens will appear here.</div> : todos.slice(0, 14).map((t, i) => (
            <div key={i} className="todo">
              <span className="todo-bar" style={{ background: TONE[t.tone] }} />
              <span style={{ fontSize: 16, lineHeight: '20px' }}>{t.icon}</span>
              <Link href={t.href} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0, flex: 1 }}><div className="todo-text">{t.text}</div>{t.sub && <div className="todo-sub">{t.sub}</div>}</Link>
              {t.contact && <ContactIcons phone={t.contact.phone} whatsapp={t.contact.whatsapp} email={t.contact.email} />}
            </div>
          ))}
        </div>
        <div className="admin-card">
          <div className="dash-section-title">Latest activity</div>
          {activities.length === 0 ? <div className="dash-empty">Nothing yet.</div> : activities.map((a) => (
            <div key={a.id} className="feed"><Link href={`/admin/funnel-leads/${a.lead.id}`}>{a.lead.name.split(' ')[0]}</Link><span style={{ minWidth: 0 }}>{a.text.slice(0, 90)}</span><time>{ago(a.createdAt)}</time></div>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ padding: 16 }}>
        <div className="dash-section-title" style={{ marginBottom: 10 }}>Website &amp; client portal</div>
        <div className="site-row">
          <Link href="/admin/clients">{activeClients} active client{activeClients === 1 ? '' : 's'}</Link>
          <Link href="/admin/projects">Projects</Link>
          <Link href="/admin/leads">{contactNew ? `${contactNew} website enquir${contactNew === 1 ? 'y' : 'ies'}` : 'Website enquiries'}</Link>
          <Link href="/admin/portfolio">{portfolioCount} portfolio items</Link>
          <Link href="/admin/blog">{blogCount} blog posts</Link>
          <Link href="/admin/testimonials">{testimonialCount} testimonials</Link>
          <Link href="/admin/settings">Site settings</Link>
        </div>
      </div>
    </div>
  );
}
