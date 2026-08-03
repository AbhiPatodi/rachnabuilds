import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const stage = searchParams.get('stage');

  const leads = await prisma.funnelLead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(leads);
}
