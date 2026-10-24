const CACHE_NAME = 'soutenance-fmfp-v1';
const APP_SCOPE = self.registration.scope;
const VIRGIL_FONT = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.6/dist/excalidraw-assets/Virgil.woff2';
const asset = (path) => new URL(path, APP_SCOPE).toString();
const OFFLINE_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/app-icon.svg',
  'icons/icon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'img/assistant-dossier-btp.png',
  'img/figure-05-analyse-annotated.png',
  'img/figure-11.png',
  'img/figure-17-historique-annotated.png',
  'img/figure-18-comparaison-annotated.png',
  'img/figure-19-messagerie-annotated.png',
  'img/figure-20-tableau-de-bord-annotated.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(OFFLINE_FILES.map(asset));
        try {
          const font = await fetch(VIRGIL_FONT, { mode: 'cors' });
          if (font.ok) await cache.put(VIRGIL_FONT, font);
        } catch (_) {
          // The system cursive font remains available if the CDN is offline.
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('soutenance-fmfp-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.href === VIRGIL_FONT) {
    event.respondWith(caches.match(request).then((saved) => saved || fetch(request)));
    return;
  }
  if (url.origin !== self.location.origin || !url.href.startsWith(APP_SCOPE)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            } catch (_) {
              // The online page can still be shown if storage is unavailable.
            }
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(asset('index.html'))) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((saved) => saved || fetch(request).then(async (response) => {
      if (response.ok) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (_) {
          // Keep serving the network response if storage is unavailable.
        }
      }
      return response;
    }))
  );
});
