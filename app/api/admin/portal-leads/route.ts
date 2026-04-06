// GET  /api/admin/portal-leads        — list leads (filter by status)
// (creation is via public /api/onboarding endpoint)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function auth() {
  const store = await cookies();
  return !!store.get('admin_session')?.value;
}

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const leads = await prisma.portalLead.findMany({
    where: status && status !== 'all' ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(leads);
}
