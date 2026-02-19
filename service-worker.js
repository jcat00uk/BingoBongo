// service-worker.js
const CACHE_NAME = 'bingobongo-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/Bingocaller.html',
  '/playgame.html',
  '/printCards.html',
  '/startmenu.css',
  '/playercard.css',
  '/playercard.js',
  '/cards.js',
  'ding.mp3',
  'app.js',
  'startmenu.js',
  'style.css',
  // Add other assets like images, fonts, etc.
];

// Install event – cache all files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app files');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate event – cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event – serve cached files first
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResp => cachedResp || fetch(event.request))
  );
});
