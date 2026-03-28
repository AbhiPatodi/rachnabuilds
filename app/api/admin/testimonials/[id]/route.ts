import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const expected = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex');
  return session === expected;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(testimonial);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update testimonial' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.testimonial.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete testimonial' }, { status: 500 });
  }
}
