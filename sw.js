// Service worker di Minigames Hub: rende l'app installabile e avviabile offline.
// La versione della cache deve seguire APP_VERSION nel file HTML.
const VERSION = '1.15.0';
const CACHE = 'mgh-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (!res || !res.ok) return res;
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  return res;
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch (err) {
    return;
  }
  if (url.origin !== self.location.origin) return; // CDN (PeerJS, font) gestiti dal browser

  if (req.mode === 'navigate') {
    // Rete prima: così un aggiornamento si vede subito; offline si usa la copia in cache.
    e.respondWith(
      Promise.race([
        fetch(req).then((r) => {
          // Un 5xx (server/proxy giù) non è la shell: meglio la copia in cache.
          if (r && r.ok) return put(req, r);
          return caches.match(req).then((hit) => hit || r);
        }),
        timeout(4000).then(() => {
          throw new Error('timeout');
        })
      ]).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((r) => {
          put(req, r);
          return r;
        })
    )
  );
});
