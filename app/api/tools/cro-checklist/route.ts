import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    await prisma.contactLead.create({
      data: {
        name: name?.trim() || 'CRO Checklist Download',
        email: email.trim().toLowerCase(),
        phone: null,
        service: 'CRO Checklist',
        budget: null,
        message: 'Downloaded the 50-point Shopify CRO Checklist',
        status: 'new',
      },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set('checklist_access', '1', { path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (err) {
    console.error('[cro-checklist]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
