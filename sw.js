/* CRS game service worker.
 * Keep this file at ./sw.js forever. BUILD is stamped by tools/build.sh; app file URLs carry ?v=BUILD
 * so one version is always served together. Content JSON (content/*.json) is network-first so daily
 * updates show on the next open; the cached copy is only an offline fallback.
 * This worker only touches Cache Storage entries starting with PREFIX. It never touches IndexedDB or
 * localStorage, where scores and progress live. */
const BUILD = 'v6';
const PREFIX = 'crs-game-';
const CACHE = `${PREFIX}${BUILD}`;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json?v=v6",
  "./css/app.css?v=v6",
  "./js/app.js?v=v6",
  "./js/common.js?v=v6",
  "./js/diagram.js?v=v6",
  "./js/engine.js?v=v6",
  "./js/play.js?v=v6",
  "./js/reader.js?v=v6",
  "./js/screens.js?v=v6",
  "./js/state.js?v=v6",
  "./js/ui.js?v=v6",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./content/badges.json",
  "./content/case.json",
  "./content/changelog.json",
  "./content/comparison.json",
  "./content/diagrams.json",
  "./content/elements.json",
  "./content/flashcards.json",
  "./content/industries.json",
  "./content/levels.json",
  "./content/library.json",
  "./content/meta.json",
  "./content/news.json",
  "./content/provisions.json",
  "./content/quiz.json",
  "./content/roles.json",
  "./content/sessions.json",
  "./content/sources.json",
  "./content/terms.json",
  "./content/timeline.json",
  "./content/trees.json",
  "./content/unverified.json"
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      const response = await fetch(new Request(url, { cache: 'reload' }));
      if (!response.ok) throw new Error(`precache ${url} ${response.status}`);
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // keep the newest content copies from the old cache so offline still works if precache of content was older
    await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;
  if (url.pathname.endsWith('/sw.js')) return;
  if (request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (/\.(png|ico|svg|webp)$/i.test(url.pathname)) { event.respondWith(cacheFirst(request)); return; }
  event.respondWith(networkFirst(request));
});

function storable(response) { return response && response.ok && response.type === 'basic' && !response.redirected; }

async function navigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (storable(response)) { cache.put('./', response.clone()).catch(() => {}); return response; }
    if (response.ok && response.redirected) { const body = await response.blob(); return new Response(body, { status: 200, headers: response.headers }); }
    return response;
  } catch {
    const cached = await cache.match('./') || await cache.match('./index.html')
      || await caches.match('./', { ignoreSearch: true }) || await caches.match('./index.html', { ignoreSearch: true });
    return cached || offlinePage();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  const isContent = url.pathname.includes('/content/');
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (storable(response)) {
      cache.put(request, response.clone()).catch(() => {});
      // content: also keep a version-less copy so any later ?cv= can fall back offline
      if (isContent) cache.put(url.origin + url.pathname, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request) || (isContent && await cache.match(url.origin + url.pathname))
      || await cache.match(request, { ignoreSearch: true }) || await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (storable(response)) cache.put(request, response.clone()).catch(() => {});
  return response;
}

function offlinePage() {
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>離線</title><body style="font:17px -apple-system,system-ui,sans-serif;padding:24px;background:#0e1430;color:#eef1ff">'
    + '<h1>離線</h1><p>未有快取，請連上網再開。你部機嘅進度冇受影響。</p><p><a style="color:#3cc8ff" href="./">重新載入</a></p></body>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
