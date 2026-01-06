const CACHE_NAME = 'ld-qa-v6.0.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './images/basic/icon.png',
  './images/basic/AI.png'
];

const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Rounded+Mplus+1c:wght@400;700;900&display=swap'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      EXTERNAL_ASSETS.forEach(url => {
          fetch(url).then(res => {
              if(res.ok) cache.put(url, res);
          }).catch(() => {});
      });
      return cache.addAll(ASSETS);
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
  if (!e.request.url.startsWith('http')) return;
  const url = new URL(e.request.url);

  if (url.pathname.endsWith('deer_db.js') || 
      url.pathname.endsWith('quiz_db.js') || 
      url.hostname === 'api.github.com') {
    e.respondWith(
      fetch(e.request).then(response => {
          if (!response || response.status !== 200) return response;
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
          return response;
        }).catch(() => caches.match(e.request))
    );
    return;
  }

  if (url.hostname.includes('githubusercontent') || 
      url.hostname.includes('unsplash') ||
      url.hostname.includes('fonts.gstatic.com') ||
      e.request.destination === 'image') {
      
      e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(e.request).then((networkResponse) => {
             if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                 return networkResponse;
             }
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
             return networkResponse;
          });
        })
      );
      return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
          return networkResponse;
        }).catch(err => {});
      return cachedResponse || fetchPromise;
    })
  );
});