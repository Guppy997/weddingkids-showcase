// Die Versionsnummer wird beim Build automatisch aus package.json gesetzt
// (siehe vite.config.ts → sw-version-Plugin). Dadurch ändert sich sw.js bei
// jeder neuen App-Version → Browser erkennt das Update → Banner erscheint.
const CACHE_NAME = 'weddingkids-v1.11.6';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
    // skipWaiting wird vom Client per postMessage getriggert (User-kontrolliert)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Client kann „SKIP_WAITING" senden → neuer SW übernimmt sofort
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Web Push: System-Notification anzeigen ─────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'WeddingKids', body: '', url: '/', tag: undefined };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* nicht-JSON-Payload ignorieren */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url },
      requireInteraction: false,
    })
  );
});

// Bei Klick auf die Notification → App öffnen / fokussieren
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // Bereits geöffnetes Fenster fokussieren
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      // Sonst neues Fenster öffnen
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network only, no caching
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests (HTML): network first, fallback offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Service Worker selbst & Manifest: immer Netzwerk (sonst keine Updates)
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});
