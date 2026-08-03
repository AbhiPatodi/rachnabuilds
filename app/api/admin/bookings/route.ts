import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: 'asc' },
    include: { funnelLead: { select: { challenge: true, revenue: true, readiness: true, financial: true } } },
  });
  return NextResponse.json(bookings);
}
