import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToAll } from '@/lib/webpush';
import { notifyNewLead } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, storeUrl, revenue, challenge, details } = await req.json();

    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!storeUrl?.trim()) return NextResponse.json({ error: 'Store URL required' }, { status: 400 });

    const message = [
      `Store: ${storeUrl.trim()}`,
      `Biggest Challenge: ${challenge || 'Not specified'}`,
      details?.trim() ? `\nDetails: ${details.trim()}` : '',
    ].filter(Boolean).join('\n');

    // Single source of truth: funnel_leads (was also mirrored into
    // contact_leads — removed, it duplicated every submission across two
    // admin tabs). Blurred-report funnel: lead into the CRM + a StoreProof
    // job for the audit worker; report link goes out by email when done.
    const cleanEmail = email.trim().toLowerCase();
    const rawUrl = storeUrl.trim();
    const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    let host = rawUrl;
    try { host = new URL(normalizedUrl).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }

    const lead = await prisma.funnelLead.upsert({
      where: { email: cleanEmail },
      create: {
        name: name.trim(),
        email: cleanEmail,
        storeUrl: normalizedUrl,
        challenge: challenge || null,
        utmSource: 'website',
        utmMedium: 'free-audit',
      },
      update: { storeUrl: normalizedUrl },
    });

    // One queued/running job per store at a time — a double submit shouldn't
    // burn two 10-minute audit runs.
    const pending = await prisma.storeProofJob.findFirst({
      where: { host, status: { in: ['queued', 'running'] } },
    });
    if (!pending) {
      await prisma.storeProofJob.create({
        data: { storeUrl: normalizedUrl, host, name: name.trim(), email: cleanEmail, funnelLeadId: lead.id },
      });
    }

    sendPushToAll(
      '🔍 New Free Audit Request!',
      `${name.trim()} · ${storeUrl.trim()} · ${revenue || 'revenue n/a'}`,
      '/admin/leads'
    ).catch(() => {});

    notifyNewLead({
      source: 'Free Audit',
      fields: [
        { label: 'Name',      value: name.trim() },
        { label: 'Email',     value: email.trim().toLowerCase() },
        { label: 'Store URL', value: storeUrl.trim() },
        ...(revenue          ? [{ label: 'Revenue',   value: revenue }]           : []),
        ...(challenge        ? [{ label: 'Challenge', value: String(challenge) }] : []),
      ],
      message: details?.trim() || undefined,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[free-audit]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
