// Service worker simples: cache app-shell para funcionar offline.
const CACHE = 'safefiscas-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Cache-first para os arquivos do app; rede como fallback (e vice-versa para o resto).
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
