import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // Only admin can subscribe — the cookie VALUE must match, not merely exist,
  // or anyone could register their own device for every admin push.
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, keys, label, oldEndpoint } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  const name = typeof label === 'string' ? label.slice(0, 80) : null

  // Browsers rotate push endpoints; drop the one this device replaced.
  if (typeof oldEndpoint === 'string' && oldEndpoint !== endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: oldEndpoint } })
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, label: name, lastSeenAt: new Date() },
    update: { p256dh: keys.p256dh, auth: keys.auth, lastSeenAt: new Date(), ...(name ? { label: name } : {}) },
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
