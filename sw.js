const CACHE_NAME = 'scripturestudy-v4';
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'lds-scriptures.json',
  'lds-scriptures.js',
  'cfm2026.json',
  'cfm2026.js',
  'assets/seek-scriptures.json',
  'assets/seek-scriptures.js'
];
// Note: assets/embeddings.bin and assets/embeddings-meta.json are fetched lazily
// (only when the user toggles on semantic search) and cached on-demand via the
// fetch handler below.

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
