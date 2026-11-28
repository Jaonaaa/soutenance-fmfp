const CACHE_NAME = 'soutenance-fmfp-preparation-v92';
const APP_BASE = '__APP_BASE__';
const PRECACHE = __PRECACHE__;
// These same-origin static files are identical across the hosting server's Origin variants.
const CACHE_MATCH_OPTIONS = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('soutenance-fmfp-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return;
  if (url.pathname.endsWith('.mp4')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => (await caches.match(request, CACHE_MATCH_OPTIONS))
        || (await caches.match(`${APP_BASE}index.html`, CACHE_MATCH_OPTIONS))
        || fetch(request))(),
    );
    return;
  }

  event.respondWith(
    caches.match(request, CACHE_MATCH_OPTIONS).then((saved) => saved || fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    })),
  );
});
