// Employee Copilot — app-shell offline cache.
// Bump the version string whenever index.html/styles.css/app.js change
// so clients pick up the new files instead of stale cached ones.
var CACHE_VERSION = 'employee-copilot-v1';

var APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  '../shared/data.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_VERSION; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Network-first for navigation requests, cache-first for static assets,
// always falling back to the cache when offline.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetchPromise = fetch(req).then(function (networkRes) {
        if (networkRes && networkRes.ok) {
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, networkRes.clone()); });
        }
        return networkRes;
      }).catch(function () { return cached; });

      return cached || fetchPromise;
    })
  );
});
