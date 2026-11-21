const scope = new URL(self.registration.scope);
const cachePrefix = `metro-draft-shell:${scope.pathname}:`;
const cacheName = `${cachePrefix}0.2.0`;
const shell = scope.href;
const assets = new Set([
  './drafts.css',
  './drafts.js',
  './sender.js',
  '../../dist/metro-ui.js',
].map(path => new URL(path, scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([shell, ...assets].map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = '';
  const navigation = event.request.mode === 'navigate'
    && (url.href === shell || url.href === new URL('index.html', scope).href);
  if (!navigation && !assets.has(url.href)) return;

  // Keep the installed shell and scripts on the same revision, including offline.
  const key = navigation ? shell : url.href;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(key)) ?? fetch(event.request);
  })());
});
