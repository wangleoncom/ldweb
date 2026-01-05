const CACHE_NAME = 'deer-qa-v4.2'; // 升級版本號以強制更新
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
      // 使用 map 個別加入，避免單一檔案失敗導致全部失敗
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
  // 1. 忽略非 http/https 請求 (例如 chrome-extension://)
  if (!e.request.url.startsWith('http')) return;

  const url = new URL(e.request.url);

  // 2. 針對資料庫 (deer_db.js) 使用 "Network First"
  if (url.pathname.endsWith('deer_db.js')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 3. 其他靜態資源使用 "Stale-While-Revalidate" (更安全的寫法)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // 即使有快取，也偷偷在背景更新
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          // 檢查回應是否有效，無效則不快取
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(err => {
            // 網路失敗時，如果有快取就沒事，單純忽略錯誤
            // console.log('Fetch failed, keeping cache', err);
        });

      // 如果有快取就先回傳快取，沒有才回傳網路請求
      return cachedResponse || fetchPromise;
    })
  );
});