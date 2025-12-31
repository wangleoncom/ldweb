const CACHE_NAME = 'deer-qa-ultimate-v3.1-CHT';
const ASSETS = [
  './',
  './index.html',
  './deer_db.js',
  './manifest.json',
  // 核心圖片資源
  './images/basic/icon.png',
  './images/basic/AI.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map(url => cache.add(url).catch(err => console.log('SW Skip:', url)))
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});