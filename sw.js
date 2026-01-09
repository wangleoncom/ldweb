const CACHE_NAME = 'deer-qa-v4.1.0';
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
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(e.request).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic') {
          return networkRes;
        }

        if (e.request.url.match(/\.(jpg|jpeg|png|gif|webp|mp3)$/i)) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }

        return networkRes;
      }).catch(() => {});
    })
  );
});