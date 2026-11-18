/* ============================================================
   sw.js — Service Worker PWA (offline-first para el shell)
   La data dinámica NO se cachea: siempre se lee del storage local.
   ============================================================ */
var CACHE = 'migl-shell-v17';
var SHELL = [
  './', './index.html', './explorar.html', './comercio.html', './promociones.html',
  './favoritos.html', './registrar-negocio.html', './mi-negocio.html', './cuenta.html', './admin.html',
  './login.html', './registro.html',
  './nosotros.html', './contacto.html', './preguntas-frecuentes.html',
  './manifest.json', './icons/icon.svg',
  './css/variables.css?v=17', './css/global.css?v=17', './css/pages.css?v=17',
  './js/icons.js?v=17', './js/firebase-config.js?v=17', './js/appwrite-config.js?v=17',
  './js/firestore-service.js?v=17',
  './js/ai-menu-scanner.js?v=17', './js/data-service.js?v=17', './js/auth-service.js?v=17',
  './js/ui-core.js?v=17', './js/menu-loader.js?v=17',
  './js/page-home.js?v=17', './js/page-explorar.js?v=17', './js/page-comercio.js?v=17', './js/page-promociones.js?v=17',
  './js/page-favoritos.js?v=17', './js/page-cuenta.js?v=17', './js/page-registro.js?v=17',
  './js/page-mi-negocio.js?v=17', './js/page-admin.js?v=17',
  './js/page-login.js?v=17', './js/page-registro-usuario.js?v=17',
  './js/page-nosotros.js?v=17', './js/page-contacto.js?v=17', './js/page-faq.js?v=17'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.allSettled(SHELL.map(function (url) { return c.add(url); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/js/ai-') !== -1) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (cached) {
    return cached || fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
