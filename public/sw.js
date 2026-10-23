// Cache media only. HTML, scripts, styles, map JSON and account/save APIs stay live.
// Bump this version when media must be invalidated before the one-day expiry.
const ASSET_CACHE = 'jxidle-media-v1';
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 512;
const DEVELOPMENT = self.__JXIDLE_DEVELOPMENT__ === true;
const MEDIA = /^\/(?:img|fx|snd|music|fonts|ui)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif|svg|mp3|ogg|wav|m4a|woff2?|ttf)$/i;
const MAP_IMAGE = /^\/app\/maps\/(?:content\/[1-9]\d*|objects)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/i;
let writes = Promise.resolve();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('jxidle-') && (DEVELOPMENT || key !== ASSET_CACHE))
    .map(key => caches.delete(key))))
    .catch(() => {})
    .then(() => self.clients.claim())
));

async function assetResponse(request) {
  // Storage can be disabled or full; media must still load from the network.
  const cache = await caches.open(ASSET_CACHE).catch(() => null);
  const cached = cache && await cache.match(request).catch(() => null);
  const savedAt = cached && Number(cached.headers.get('X-JXIdle-Cached-At'));
  if (cached && savedAt && Date.now() - savedAt < MAX_AGE) return { response: cached };
  let response;
  try { response = await fetch(request); }
  catch (error) {
    if (cached) return { response: cached };
    throw error;
  }
  if (cache && response.status === 200 && !response.redirected &&
      !/\bno-store\b/i.test(response.headers.get('Cache-Control') || '')) {
    const copy = response.clone();
    const headers = new Headers(copy.headers);
    headers.set('X-JXIdle-Cached-At', String(Date.now()));
    // Serialize writes/eviction, and never wait for the body to be cached before rendering.
    writes = writes.catch(() => {}).then(async () => {
      await cache.put(request, new Response(copy.body, { status: copy.status, statusText: copy.statusText, headers }));
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
    });
    return { response, update: writes };
  }
  return { response };
}

self.addEventListener('fetch', event => {
  const request = event.request;
  // Range audio requests need their original network/HTTP-cache response.
  if (DEVELOPMENT || request.method !== 'GET' || request.headers.has('range') ||
      request.cache === 'no-store' || request.cache === 'reload') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !(MEDIA.test(url.pathname) || MAP_IMAGE.test(url.pathname))) return;
  const result = assetResponse(request);
  event.respondWith(result.then(value => value.response));
  event.waitUntil(result.then(value => value.update).catch(() => {}));
});
