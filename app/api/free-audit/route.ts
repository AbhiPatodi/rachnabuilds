import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { notifyNewLead } from '@/lib/email';
import { rateLimitIp } from '@/lib/rateLimit';
import { normalizeStoreUrl } from '@/lib/storeUrl';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    if (!(await rateLimitIp(req, 'free-audit', 5, 3600_000))) {
      return NextResponse.json({ error: 'Too many requests — please try again in an hour.' }, { status: 429 });
    }
    const { name, email, storeUrl, revenue } = await req.json();

    if (!name?.trim() || String(name).length > 120) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!email?.trim() || String(email).length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const store = normalizeStoreUrl(storeUrl);
    if (!store) {
      return NextResponse.json({ error: 'Please enter your store’s public web address (e.g. yourstore.com)' }, { status: 400 });
    }

    // Single source of truth: funnel_leads. Blurred-report funnel: lead into
    // the CRM + a StoreProof job for the audit worker; the report link goes
    // out by email when done.
    const cleanEmail = email.trim().toLowerCase();
    const cleanRevenue = revenue ? String(revenue).slice(0, 60) : null;

    const lead = await prisma.funnelLead.upsert({
      where: { email: cleanEmail },
      create: {
        name: name.trim(),
        email: cleanEmail,
        storeUrl: store.url,
        revenue: cleanRevenue,
        utmSource: 'website',
        utmMedium: 'free-audit',
      },
      update: { storeUrl: store.url, ...(cleanRevenue ? { revenue: cleanRevenue } : {}) },
    });

    // A double submit by the same person shouldn't burn two audit runs — but a
    // DIFFERENT lead asking about the same store still gets their own job (the
    // worker reuses a fresh run for that host instead of re-crawling).
    const pending = await prisma.storeProofJob.findFirst({
      where: { host: store.host, email: cleanEmail, status: { in: ['queued', 'running'] } },
    });
    if (!pending) {
      await prisma.storeProofJob.create({
        data: { storeUrl: store.url, host: store.host, name: name.trim(), email: cleanEmail, funnelLeadId: lead.id },
      });
    }

    const leadPath = `/admin/funnel-leads/${lead.id}`;
    after(async () => {
      await sendPushToAll(
        '🔍 New Free Audit Request!',
        `${name.trim()} · ${store.host} · ${cleanRevenue || 'revenue n/a'}`,
        leadPath,
      ).catch(() => {});
      await notifyNewLead({
        source: 'Free Audit',
        adminPath: leadPath,
        fields: [
          { label: 'Name', value: name.trim() },
          { label: 'Email', value: cleanEmail },
          { label: 'Store URL', value: store.url },
          ...(cleanRevenue ? [{ label: 'Revenue', value: cleanRevenue }] : []),
        ],
      }).catch(() => {});
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[free-audit]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
