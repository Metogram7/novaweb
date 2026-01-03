// sw.js
const CACHE_NAME = 'nova-cache-v1';
const urlsToCache = [
  '/index.html',   // karşılama ekranı
  '/chat.html',    // chat ekranı
  '/chat.css',     // chat stil dosyası
  '/chat.js',      // chat JS dosyası
  '/manifest.json' // manifest
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
