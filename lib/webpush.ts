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

export async function sendPushToAll(title: string, body: string, url = '/admin/dashboard') {
  if (!initVapid()) return [] // Push not configured yet
  const subs = await prisma.pushSubscription.findMany()

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      ).catch(async (err: unknown) => {
        // Remove stale subscriptions (410 = unsubscribed)
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } })
        }
        throw err
      })
    )
  )

  return results
}
