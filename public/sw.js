/**
 * Ares Core offline shell.
 * Navigations: network first, cached document fallback.
 * Hashed and local static assets: cache first.
 * Dev module URLs: network first, cache fallback.
 * Non-GET and cross-origin requests are not intercepted.
 */
const CACHE = "ares-core-v1";

const SEED = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/ibm-plex-sans-400.woff2",
  "/fonts/ibm-plex-sans-500.woff2",
  "/fonts/ibm-plex-sans-600.woff2",
  "/fonts/ibm-plex-sans-ext-400.woff2",
  "/fonts/ibm-plex-sans-ext-500.woff2",
  "/fonts/ibm-plex-sans-ext-600.woff2",
  "/fonts/ibm-plex-sans-greek-400.woff2",
  "/fonts/ibm-plex-sans-greek-500.woff2",
  "/fonts/ibm-plex-sans-greek-600.woff2",
  "/fonts/ibm-plex-mono-400.woff2",
  "/fonts/ibm-plex-mono-500.woff2",
  "/fonts/ibm-plex-mono-600.woff2",
  "/fonts/ibm-plex-mono-ext-400.woff2",
  "/fonts/ibm-plex-mono-ext-500.woff2",
  "/fonts/ibm-plex-mono-ext-600.woff2",
];

const PRECACHE_LIMIT = 200;

function sameOrigin(href, base) {
  try {
    const url = new URL(href, base);
    if (url.origin !== self.location.origin) return null;
    if (url.pathname === "/sw.js") return null;
    return url.href;
  } catch {
    return null;
  }
}

function shouldHarvest(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/@") ||
    pathname.startsWith("/node_modules/") ||
    pathname.startsWith("/__grok/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.svg" ||
    /\.(?:js|mjs|css|woff2|svg|png|jpe?g|webp|ico|webmanifest)$/i.test(pathname)
  );
}

function extractRefs(text, base) {
  const found = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /(?:src|href)\s*=\s*["']([^"']+)["']/g,
    /url\(\s*["']?([^"')\s]+)["']?\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1];
      if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("#")) continue;
      const abs = sameOrigin(raw, base);
      if (!abs) continue;
      const path = new URL(abs).pathname;
      if (shouldHarvest(path)) found.push(abs);
    }
  }
  return found;
}

function isTextAsset(pathname, contentType) {
  return (
    contentType.includes("text/html") ||
    contentType.includes("javascript") ||
    contentType.includes("text/css") ||
    contentType.includes("json") ||
    /\.(?:js|mjs|css|html|webmanifest)$/i.test(pathname)
  );
}

function isImmutableAsset(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.svg" ||
    pathname === "/manifest.webmanifest" ||
    /\.(?:woff2|png|svg|jpe?g|webp|ico|webmanifest)$/i.test(pathname)
  );
}

async function precache() {
  const cache = await caches.open(CACHE);
  const queue = SEED.map((path) => new URL(path, self.location.origin).href);
  const seen = new Set();

  while (queue.length > 0 && seen.size < PRECACHE_LIMIT) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    let response;
    try {
      response = await fetch(url, { cache: "reload" });
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const contentType = response.headers.get("content-type") || "";
    const path = new URL(url).pathname;
    const copy = response.clone();
    await cache.put(url, copy);

    if (!isTextAsset(path, contentType)) continue;
    let text = "";
    try {
      text = await response.text();
    } catch {
      continue;
    }
    for (const next of extractRefs(text, url)) {
      if (!seen.has(next)) queue.push(next);
    }
  }
}

async function serveManifest(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  let source = hit;
  if (!source) {
    source = await fetch(request);
  }
  const body = await source.arrayBuffer();
  const response = new Response(body, {
    status: source.ok ? 200 : source.status,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
  if (!hit && source.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = (await cache.match(request)) || (await cache.match("/"));
    if (hit) return hit;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(serveManifest(request));
    return;
  }

  const accept = request.headers.get("accept") || "";
  const isDocument = request.mode === "navigate" || accept.includes("text/html");
  if (isDocument) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(networkFirst(request));
  }
});
