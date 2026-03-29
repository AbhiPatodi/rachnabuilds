import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

async function authReport(slug: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get(`rp_${slug}`)?.value
  if (!token) return null
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update(slug).digest('hex')
  if (token !== expected) return null
  return prisma.report.findUnique({ where: { slug } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const report = await authReport(slug)
  if (!report) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Only allow safe profile fields
  const allowed = ['email', 'phone', 'whatsapp', 'website', 'instagram', 'linkedin', 'twitter', 'notes']
  const profile: Record<string, string> = {}
  for (const key of allowed) {
    if (typeof body[key] === 'string') profile[key] = body[key].trim()
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { clientProfile: profile },
  })

  return NextResponse.json({ ok: true, profile: updated.clientProfile })
}
