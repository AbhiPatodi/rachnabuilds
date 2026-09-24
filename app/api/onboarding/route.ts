// POST /api/onboarding  — public endpoint, no auth
// Clients fill the "Get Started" form → creates a PortalLead record
import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { notifyNewLead } from '@/lib/email';
import { sendPushToAll } from '@/lib/webpush';
import { rateLimitIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!(await rateLimitIp(req, 'onboarding', 5, 3600_000))) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  try {
    const { name, email, phone, businessName, website, clientType, platform, message } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const lead = await prisma.portalLead.create({
      data: {
        id: crypto.randomBytes(12).toString('hex'),
        name: String(name).trim().slice(0, 120),
        email: String(email).trim().toLowerCase().slice(0, 200),
        phone: phone?.trim()?.slice(0, 40) || null,
        businessName: businessName?.trim()?.slice(0, 160) || null,
        website: website?.trim()?.slice(0, 300) || null,
        clientType: String(clientType || 'new_build').slice(0, 40),
        platform: platform ? String(platform).slice(0, 40) : null,
        message: message?.trim()?.slice(0, 5000) || null,
      },
    });

    const cap = (v: unknown, n: number) => (v ? String(v).trim().slice(0, n) : '');
    after(async () => {
      // "Start a Project" is the main site CTA — it must reach the phone like every other form.
      await sendPushToAll('🚀 New project enquiry!', `${cap(name, 80)}${businessName ? ` · ${cap(businessName, 60)}` : ''}`, '/admin/portal-leads').catch(() => {});
      await notifyNewLead({
      source: 'Get Started',
      fields: [
        { label: 'Name',          value: name.trim() },
        { label: 'Email',         value: email.trim().toLowerCase() },
        ...(phone?.trim()         ? [{ label: 'Phone',         value: phone.trim() }]         : []),
        ...(businessName?.trim()  ? [{ label: 'Business',      value: businessName.trim() }]  : []),
        ...(website?.trim()       ? [{ label: 'Website',       value: website.trim() }]       : []),
        { label: 'Project Type',  value: clientType || 'new_build' },
        ...(platform              ? [{ label: 'Platform',      value: platform }]             : []),
      ],
      message: message?.trim() || undefined,
      }).catch(() => {});
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[onboarding]', err);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
