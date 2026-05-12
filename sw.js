// JobHunter Global — Service Worker v2.0.7
const CACHE = 'jhg-v2.0.7';
const OFFLINE_URL = '/jobhunter.global.ai/';

const PRECACHE = [
  '/jobhunter.global.ai/',
  '/jobhunter.global.ai/index.html',
  '/jobhunter.global.ai/manifest.json',
  '/jobhunter.global.ai/support.html',
  '/jobhunter.global.ai/privacy-policy.html',
];

// ── Install: cache critical assets ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {
        // Fail silently if some assets unavailable
        return cache.add(OFFLINE_URL);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first with cache fallback ─────────────────
self.addEventListener('fetch', e => {
  // Skip non-GET, chrome-extension, and external API calls
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  // For GAS (licence server) and Razorpay — always network, no cache
  const noCache = ['script.google.com', 'razorpay', 'fonts.googleapis', 'fonts.gstatic'];
  if (noCache.some(d => e.request.url.includes(d))) {
    return e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
  }

  // Network-first strategy
  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Push notifications (future) ──────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'JobHunter Global', body: 'You have an update' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/jobhunter.global.ai/icons/icon-192.png',
      badge: '/jobhunter.global.ai/icons/icon-192.png',
      tag: 'jhg-notification',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/jobhunter.global.ai/'));
});
