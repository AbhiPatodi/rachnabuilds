// Admin full-report viewer: serves the stored Store Health Report HTML for
// any published report, no client assignment required.
// Auth: admin_session cookie (proxy.ts guards /api/admin/*).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await prisma.storeProofReport.findUnique({
    where: { id },
    select: { html: true },
  });
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(report.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}
