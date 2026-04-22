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

    await prisma.contactLead.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: null,
        service: 'Free Shopify Audit',
        budget: revenue || null,
        message,
        status: 'new',
      },
    });

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
