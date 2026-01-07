const CACHE_NAME = 'deer-qa-v3.1.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './deer_db.js',
  './quiz_db.js',
  './images/basic/icon.png',
  './images/basic/AI.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => {});
    })
  );
});