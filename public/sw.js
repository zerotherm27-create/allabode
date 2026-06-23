// All Abode service worker — installable + offline shell.
// Conservative by design: PRIVATE/auth/data routes are NEVER cached
// (/api, /admin, /dashboard, and Supabase) so no sensitive data is stored
// on-device and auth/session stays fresh.

const VERSION = "v1";
const CACHE = `allabode-${VERSION}`;
const PRECACHE = ["/", "/offline", "/icon-192.png", "/icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const NETWORK_ONLY = ["/api", "/admin", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin: only cache Google Fonts; leave Supabase + everything else to the network.
  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request));
    return;
  }

  // Private/auth/data routes → network only (never cached, never intercepted).
  if (NETWORK_ONLY.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    return;
  }

  // Build assets, icons, fonts, images → cache-first (stale-while-revalidate).
  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Public page navigations → network-first, fall back to cache then /offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request)
      .then((res) => { if (res && res.ok) cache.put(request, res.clone()); })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await cache.match("/offline")) || Response.error();
  }
}
