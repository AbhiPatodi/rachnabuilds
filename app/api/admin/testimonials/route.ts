import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const expected = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  return session === expected;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const testimonials = await prisma.testimonial.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return NextResponse.json(testimonials);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { clientName, role, company, quote, projectName, rating, isVisible, displayOrder } = body;

  if (!clientName || !quote) {
    return NextResponse.json({ error: 'clientName and quote are required' }, { status: 400 });
  }

  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        clientName,
        role: role || null,
        company: company || null,
        quote,
        projectName: projectName || null,
        rating: rating ?? 5,
        isVisible: isVisible ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });
    return NextResponse.json(testimonial, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }
}
