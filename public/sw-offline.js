const CACHE_NAME = 'lista-offline-v2';
const APP_SHELL = ['/', '/login', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cacheCopy = response.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, cacheCopy);
          }
          return response;
        } catch {
          return (await caches.match(request)) || (await caches.match('/'));
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok) {
          const cacheCopy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, cacheCopy);
        }
        return response;
      } catch {
        return new Response('', { status: 503, statusText: 'Service indisponible hors connexion' });
      }
    })()
  );
});
