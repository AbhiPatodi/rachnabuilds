'use client'
import { useState, useEffect } from 'react'

type Status = 'unknown' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'error'

// Readable device name for the Notifications page.
function deviceLabel(): string {
  const ua = navigator.userAgent
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Device'
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser'
  return `${os} · ${standalone ? 'Home Screen app' : browser}`
}

async function saveOnServer(sub: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sub.toJSON(), label: deviceLabel() }),
  }).catch(() => null)
  return !!res?.ok
}

export function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>('unknown')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.register('/sw.js').catch(console.error)
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setStatus('unsubscribed'); return }
      // Re-confirm with the server on every visit: a device can hold a local
      // subscription the server never stored or has since dropped.
      setStatus((await saveOnServer(sub)) ? 'subscribed' : 'error')
    })
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      setStatus((await saveOnServer(sub)) ? 'subscribed' : 'error')
    } catch (err) {
      console.error(err)
      setStatus(Notification.permission === 'denied' ? 'denied' : 'error')
    }
    setLoading(false)
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  // Never render nothing — silent absence is impossible to debug on a phone.
  const note = (text: string, color: string) => (
    <span style={{ fontSize: 11.5, lineHeight: 1.4, color, display: 'block' }}>{text}</span>
  )
  if (status === 'unsupported') {
    return note(
      'Push unavailable in this browser. On iPhone: Safari → Share → Add to Home Screen, then open from the icon.',
      '#FBBF24',
    )
  }
  if (status === 'denied') {
    return note(
      'Notifications blocked. Tap the lock icon in the address bar → Permissions → Notifications → Allow, then reload.',
      '#ef4444',
    )
  }
  if (status === 'unknown') {
    return note('Checking notification support…', '#94a3b8')
  }

  const on = status === 'subscribed'
  return (
    <button
      onClick={on ? unsubscribe : subscribe}
      disabled={loading}
      style={{
        background: on ? '#1e293b' : status === 'error' ? '#FBBF24' : '#06D6A0',
        color: on ? '#94a3b8' : '#0B0F1A',
        border: '1px solid ' + (on ? '#334155' : status === 'error' ? '#FBBF24' : '#06D6A0'),
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '...' : on ? 'Notifications On' : status === 'error' ? 'Not connected: tap to retry' : 'Enable Notifications'}
    </button>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
