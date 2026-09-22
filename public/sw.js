const SHELL_CACHE = 'genius-shell-v13'
const RUNTIME_CACHE = 'genius-runtime-v13'
const SHELL = ['/', '/tasks']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => ![SHELL_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/task-bank/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then(cache => cache.put(url.pathname, copy))
          return response
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/')))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()))
        return response
      }).catch(() => cached)
      return cached || network
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/?screen=performance'
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(openClients => {
    const existing=openClients[0]
    if(existing){existing.navigate(target);return existing.focus()}
    return clients.openWindow(target)
  }))
})
