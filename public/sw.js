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

// Web Push: new-lead alerts for staff and specialists. The payload is
// {title, body, url}; only same-origin relative paths are ever opened.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" && data.title ? data.title : "All Abode";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
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
