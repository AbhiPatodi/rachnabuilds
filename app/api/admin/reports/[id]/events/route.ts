// GET /api/admin/reports/[id]/events?limit=30
// Returns last N portal events and comments for this report, ordered by createdAt DESC
// Requires admin session cookie
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

  const events = await prisma.portalEvent.findMany({
    where: { reportId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const comments = await prisma.portalComment.findMany({
    where: { reportId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ events, comments })
}
