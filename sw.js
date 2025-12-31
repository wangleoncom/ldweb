const CACHE_NAME = 'deer-qa-ultimate-v2-20250101';
const ASSETS = [
  './',
  './index.html',
  './deer_db.js',
  './manifest.json',
  // 只快取核心資源，避免外部資源 CORS 錯誤
  './images/basic/icon.png',
  './images/basic/AI.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 使用 map 允許單一檔案失敗不影響整體
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
  // 忽略非 GET 請求和外部 CDN
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});