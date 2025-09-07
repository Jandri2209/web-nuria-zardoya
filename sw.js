/* Nuria Zardoya PWA Service Worker */
const VERSION = "nz-v3";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE  = `pages-${VERSION}`;
const IMAGES_CACHE = `images-${VERSION}`;
const ALLOWLIST_CROSS = ["https://assets.calendly.com"];

const CORE_ASSETS = [
  "/",                      // start_url debe estar precacheado
  "/offline.html",
  "/assets/styles.css",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

// ===== utils =====
const timeout = (ms, promise) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(v => { clearTimeout(id); resolve(v); }, err => { clearTimeout(id); reject(err); });
  });

async function trimCache(cacheName, maxItems = 60) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const toDelete = keys.length - maxItems;
  for (let i = 0; i < toDelete; i++) await cache.delete(keys[i]);
}

// ===== install =====
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ===== activate =====
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (![STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE].includes(k)) {
            return caches.delete(k);
          }
        })
      );
      // mejora de performance
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
});

// ===== fetch =====
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only GET
  if (req.method !== "GET") return;

  // Navigations (HTML): network-first con timeout
  if (req.mode === "navigate" || (req.destination === "document")) {
    event.respondWith((async () => {
      try {
        // usa preload si existe
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // 3.5s timeout; si falla -> cache; si no hay -> offline
        const fresh = await timeout(3500, fetch(req));
        const cache = await caches.open(PAGES_CACHE);
        cache.put(req, fresh.clone());
        trimCache(PAGES_CACHE, 40);
        return fresh;
      } catch (_) {
        const cache = await caches.open(PAGES_CACHE);
        const cached = await cache.match(req);
        return cached || caches.match("/offline.html");
      }
    })());
    return;
  }

  // Misma origen: CSS/JS => stale-while-revalidate
  if (url.origin === location.origin) {
    if (req.destination === "style" || req.destination === "script" || req.destination === "font") {
      event.respondWith((async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchPromise || new Response("", { status: 504 });
      })());
      return;
    }

    // Imágenes => cache-first con recorte
    if (req.destination === "image") {
      event.respondWith((async () => {
        const cache = await caches.open(IMAGES_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.status === 200) {
            cache.put(req, res.clone());
            trimCache(IMAGES_CACHE, 80);
          }
          return res;
        } catch (_) {
          // placeholder mínimo si quieres: return caches.match("/images/placeholder.png");
          return new Response("", { status: 504 });
        }
      })());
      return;
    }
  }

  // Terceros permitidos (Calendly) => stale-while-revalidate
  if (ALLOWLIST_CROSS.some(origin => url.origin.startsWith(origin))) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      const freshP = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || freshP || new Response("", { status: 504 });
    })());
    return;
  }

  // Todo lo demás => passthrough
});

// Permitir skipWaiting manual (p.ej., desde la consola: navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'}))
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
