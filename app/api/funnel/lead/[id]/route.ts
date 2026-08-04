import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Public, unauthenticated by design — this is the endpoint magic links in
// follow-up emails hit to restore a lead's session (bypass the /training/watch
// opt-in gate, prefill /training/apply). Only returns the self-submitted
// contact fields, never challenge/blocker/financial or internal notes.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const lead = await prisma.funnelLead.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, whatsapp: true, stage: true },
  });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}
