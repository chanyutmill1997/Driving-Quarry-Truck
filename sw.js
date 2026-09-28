const CACHE_NAME = 'quarry-chanyuth-v2.2';
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
  './js/components/login-view.js',
  './js/components/driver-view.js',
  './js/components/excavator-view.js',
  './js/components/admin-dashboard.js',
  './js/components/reports-view.js',
  './js/components/settings-view.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
