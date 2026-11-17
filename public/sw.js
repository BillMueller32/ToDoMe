// ToDoMe service worker: makes the app open instantly and offline.
// The app shell and assets are served from cache and refreshed in the background, so a
// new version appears on the next open. /api is never cached.
const CACHE = "todome-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  const key = req.mode === "navigate" ? "/" : req;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key, { ignoreVary: true, ignoreSearch: req.mode === "navigate" });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (cached) {
        e.waitUntil(fresh);
        return cached;
      }
      return (await fresh) ?? new Response("Offline", { status: 503 });
    })(),
  );
});
