const CACHE_NAME = 'quarry-chanyuth-v2.9.4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './css/app.css',
  './data/seed_data.json',
  './js/config.js',
  './js/camera.js',
  './js/store.js',
  './js/auth.js',
  './js/ai-engine.js',
  './js/components/login-view.js',
  './js/components/driver-view.js',
  './js/components/excavator-view.js',
  './js/components/admin-dashboard.js',
  './js/components/reports-view.js',
  './js/components/settings-view.js',
  './js/components/ai-copilot-view.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Network-First for instant live updates, fallback to cache when offline
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
