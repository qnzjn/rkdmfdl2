// 소셜랜드 서비스워커 — 앱 설치(PWA) + 오프라인 셸 캐시
const CACHE = 'socialland-v1'
const SHELL = ['/', '/index.html', '/favicon.png', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  if (!req.url.startsWith(self.location.origin)) return // 외부(서버 wss 등)는 건드리지 않음
  // network-first: 온라인이면 항상 최신, 오프라인이면 캐시
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  )
})
