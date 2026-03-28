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
  const faqs = await prisma.faq.findMany({
    orderBy: { displayOrder: 'asc' },
  });
  return NextResponse.json(faqs);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
  const { question, answer, category, displayOrder, isVisible } = body;

  if (!question || !answer) {
    return NextResponse.json({ error: 'question and answer are required' }, { status: 400 });
  }

  try {
    const faq = await prisma.faq.create({
      data: {
        question,
        answer,
        category: category || null,
        displayOrder: displayOrder ?? 0,
        isVisible: isVisible ?? true,
      },
    });
    return NextResponse.json(faq, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 });
  }
}
