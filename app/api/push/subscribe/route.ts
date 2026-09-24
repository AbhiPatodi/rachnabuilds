import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const v = cookieStore.get('admin_session')?.value
  if (!v) return false
  const adminHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('hex')
  return v === adminHash
}

export async function POST(req: NextRequest) {
  // Only admin can subscribe — the cookie VALUE must match, not merely exist,
  // or anyone could register their own device for every admin push.
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { p256dh: keys.p256dh, auth: keys.auth },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { endpoint } = await req.json()
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
  }
  return NextResponse.json({ ok: true })
}
