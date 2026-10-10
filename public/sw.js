// public/sw.js — يستقبل Web Push ويعرض الإشعار حتى لو التطبيق مقفول
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'الشافعي ستور'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url || './' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data.url, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
