// SiteWallet service worker — minimal app-shell + offline fallback.
// Version bump CACHE_NAME to invalidate clients on deploy.

const CACHE_NAME = "sitewallet-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== CACHE_NAME)
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only intercept GET. Other methods (POST for server actions, etc.) pass
  // through directly so we don't break mutations.
  if (req.method !== "GET") return;

  // Navigations: network-first, fall back to cached offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? new Response("offline")),
      ),
    );
    return;
  }

  // Same-origin static assets: cache-first.
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/favicon.png" ||
      url.pathname === "/manifest.webmanifest"
    ) {
      event.respondWith(
        caches.match(req).then(
          (cached) =>
            cached ??
            fetch(req).then((resp) => {
              const copy = resp.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
              return resp;
            }),
        ),
      );
    }
  }
});
