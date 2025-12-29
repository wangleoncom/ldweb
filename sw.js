const CACHE_NAME = 'deer-qa-v4'; // 版本號更新
const ASSETS = [
  './',
  './index.html',
  './deer_db.js',
  './manifest.json',
  './images/basic/icon.png',
  './images/basic/AI.png',
  './images/basic/medal.png',
  // 這裡預設快取 3 張背景，如果你有更多，請自己加
  './images/backgrounds/bg1.jpg',
  './images/backgrounds/bg2.jpg',
  './images/backgrounds/bg3.jpg',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Rounded+Mplus+1c:wght@400;700&display=swap'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keyList) => Promise.all(keyList.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); }))));
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});