import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sendPushToAll } from '@/lib/webpush'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = await sendPushToAll(
    '🔔 Test Notification',
    'Push notifications are working on Rachna Builds!',
    '/admin/dashboard'
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ ok: true, sent, failed, total: results.length })
}
