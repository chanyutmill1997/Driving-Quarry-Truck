const CACHE_NAME = 'quarry-v1';
const ASSETS = [
  './',
  './index.html',
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
