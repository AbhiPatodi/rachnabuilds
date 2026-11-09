import webpush from 'web-push'
import { prisma } from './prisma'

function initVapid() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (subject && publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    return true
  }
  return false
}

type Sub = { endpoint: string; p256dh: string; auth: string }

/** Owner + admin-role team members' devices. Reps never get business-wide
 *  alerts (money, ads, every lead) — they get sendPushToMember for theirs. */
export async function sendPushToAll(title: string, body: string, url = '/admin/dashboard') {
  if (!initVapid()) return [] // Push not configured yet
  const subs = await prisma.pushSubscription.findMany({
    where: { OR: [{ memberId: null }, { member: { role: 'admin', active: true } }] },
  })
  return sendToSubs(subs, title, body, url)
}

/** One team member's devices (their assigned leads, their alarms, their digest). */
export async function sendPushToMember(memberId: string, title: string, body: string, url = '/admin/funnel-leads') {
  if (!initVapid()) return []
  const subs = await prisma.pushSubscription.findMany({ where: { memberId, member: { active: true } } })
  return sendToSubs(subs, title, body, url)
}

async function sendToSubs(subs: Sub[], title: string, body: string, url: string) {

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      ).catch(async (err: unknown) => {
        // Remove stale subscriptions (404/410 = expired or unsubscribed)
        const code = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 0
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
        }
        throw err
      })
    )
  )

  // Keep a record so a notification missed on the phone is still findable,
  // and so delivery failures are visible instead of silent.
  const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
  await prisma.notificationLog
    .create({
      data: {
        title,
        body,
        url,
        devices: subs.length,
        delivered: results.length - failures.length,
        failed: failures.length,
        error: failures.length
          ? failures
              .map(f => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
              .join(' | ')
              .slice(0, 500)
          : null,
      },
    })
    .catch(() => {}) // never let logging break the send

  return results
}
