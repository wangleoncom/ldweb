const CACHE_NAME = 'deer-qa-v5'; // 再次更新版本號
const ASSETS = [
  './',
  './index.html',
  './deer_db.js',
  './manifest.json',
  // 只快取本地重要圖片，確保這些檔案在 GitHub 上真的存在！
  './images/basic/icon.png',
  './images/basic/AI.png',
  // './images/basic/medal.png', // 先註解掉這個，因為你 GitHub 上似乎還沒上傳成功，避免報錯
  './images/backgrounds/bg1.jpg',
  './images/backgrounds/bg2.jpg',
  './images/backgrounds/bg3.jpg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 使用 map 允許單一檔案失敗不影響整體
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.warn('快取失敗，跳過:', url));
        })
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 對於跨域資源 (如 Tailwind)，直接回傳網絡請求，不強制快取
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});