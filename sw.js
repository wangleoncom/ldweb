const CACHE_NAME = 'deer-qa-v4.1'; 
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './deer_db.js',
  './manifest.json',
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
  const url = new URL(e.request.url);

  // 1. 針對資料庫 (deer_db.js) 使用 "Network First" (優先聯網下載最新版)
  if (url.pathname.endsWith('deer_db.js')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 2. 其他靜態資源使用 "Stale-While-Revalidate" (先給快取，背景更新)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse.clone()));
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});