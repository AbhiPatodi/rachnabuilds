'use client'
import { useState, useEffect } from 'react'

export function PushSubscribeButton() {
  const [status, setStatus] = useState<'unknown' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('unknown')
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
    // Register service worker
    navigator.serviceWorker.register('/sw.js').catch(console.error)
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setStatus(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      setStatus('subscribed')
    } catch (err) {
      console.error(err)
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

  if (status === 'unsupported') return null
  if (status === 'denied') return <span style={{fontSize:12,color:'#ef4444'}}>Notifications blocked in browser settings</span>

  return (
    <button
      onClick={status === 'subscribed' ? unsubscribe : subscribe}
      disabled={loading || status === 'unknown'}
      style={{
        background: status === 'subscribed' ? '#1e293b' : '#06D6A0',
        color: status === 'subscribed' ? '#94a3b8' : '#0B0F1A',
        border: '1px solid ' + (status === 'subscribed' ? '#334155' : '#06D6A0'),
        borderRadius: 8,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '...' : status === 'subscribed' ? 'Notifications On' : 'Enable Notifications'}
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
