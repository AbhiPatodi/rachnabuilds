// GET /api/admin/projects/[projectId]/document-logs
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

interface RouteContext { params: Promise<{ projectId: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const store = await cookies();
  if (!store.get('admin_session')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const logs = await prisma.projectDocumentLog.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ logs });
}
