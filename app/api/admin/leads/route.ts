import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const leads = await prisma.contactLead.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(leads);
}
