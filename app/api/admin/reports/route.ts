import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(_req: NextRequest) {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { sections: true, documents: true },
      },
    },
  });
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const { clientName, slug, clientEmail, password } = await req.json();

  if (!clientName || !slug || !password) {
    return NextResponse.json({ error: 'clientName, slug, and password are required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const report = await prisma.report.create({
      data: {
        clientName,
        slug,
        clientEmail: clientEmail || null,
        passwordHash,
      },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A report with this slug already exists' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
