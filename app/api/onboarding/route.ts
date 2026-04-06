// POST /api/onboarding  — public endpoint, no auth
// Clients fill the "Get Started" form → creates a PortalLead record
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Simple rate limit: 5 submissions per IP per hour
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(ip)) {
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
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        website: website?.trim() || null,
        clientType: clientType || 'new_build',
        platform: platform || null,
        message: message?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[onboarding]', err);
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
  }
}
