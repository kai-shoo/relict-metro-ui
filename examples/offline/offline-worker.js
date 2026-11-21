const scope = new URL(self.registration.scope);
const cachePrefix = `metro-offline-shell:${scope.pathname}:`;
const cacheName = `${cachePrefix}0.2.0`;
const index = new URL('index.html', scope);
const shell = new Set(['./', './offline.css', './offline.js', '../../dist/metro-ui.js'].map(path => new URL(path, scope).href));

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(cacheName);
  await cache.addAll([...shell].map(url => new Request(url, { cache: 'reload' })));
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName).map(key => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const navigation = event.request.mode === 'navigate' && (url.pathname === scope.pathname ||
    url.pathname === index.pathname) && url.origin === scope.origin;
  const href = navigation ? scope.href : url.href;
  if (!shell.has(href)) return;
  event.respondWith((async () => (await (await caches.open(cacheName)).match(href)) ?? fetch(event.request))());
});
