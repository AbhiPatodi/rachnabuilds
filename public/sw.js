self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Rachna Builds'
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/admin/dashboard' },
    // Longer, more urgent buzz — a lead alert is worth interrupting for
    vibrate: [300, 120, 300, 120, 300],
    // Explicitly ask for an alerting (not silent) notification. Android still
    // has the final say via the app's notification channel importance.
    silent: false,
    // Re-alert even when an earlier notification with this tag is showing,
    // so a second lead doesn't land quietly behind the first.
    tag: data.tag || 'rb-alert',
    renotify: true,
    // Keeps it on screen until acted on (honoured on desktop; ignored on some
    // Android versions, harmless either way).
    requireInteraction: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      const url = event.notification.data.url
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Cache strategy for PWA
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
