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
  const links = await prisma.socialLink.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { platform, url, handle, isVisible, displayOrder } = body;

  if (!platform || !url) {
    return NextResponse.json({ error: 'platform and url are required' }, { status: 400 });
  }

  try {
    const link = await prisma.socialLink.create({
      data: {
        platform,
        url,
        handle: handle || null,
        isVisible: isVisible ?? true,
        displayOrder: displayOrder ?? 0,
      },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
  }
}
