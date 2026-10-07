const SHELL = "cp-shell-v1";
const IMAGES = "cp-img-v1";

const APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/views.css",
  "./js/app.js",
  "./js/progress.js",
  "./js/format.js",
  "./js/store.js",
  "./assets/manifest.json",
  "./data/caps_clashrecord.json",
  "./data/bundle.json",
  "./data/snapshots.csv",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const bundle = await fetch("./data/bundle.json").then((r) => r.json());
    const data = bundle.exportaciones.map((p) => "./" + p);
    await cache.addAll(APP.concat(data));
    const manRes = await fetch("./assets/manifest.json");
    const man = await manRes.json();
    const imgCache = await caches.open(IMAGES);
    const urls = [];
    for (const item of Object.values(man.items)) {
      if (item.categoria !== "townhall" && item.categoria !== "hero") continue;
      if (item.imagen && item.imagen.ruta) urls.push("./assets/" + item.imagen.ruta);
      for (const im of Object.values(item.imagenes_por_nivel || {})) {
        if (im && im.ruta) urls.push("./assets/" + im.ruta);
      }
    }
    await imgCache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, IMAGES]);
    for (const key of await caches.keys()) {
      if (!keep.has(key)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(IMAGES);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response("", { status: 503, statusText: "offline" });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok && request.method === "GET") {
      const cache = await caches.open(SHELL);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const hit = await caches.match(request);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await caches.match("./index.html");
      if (shell) return shell;
    }
    return new Response("", { status: 503, statusText: "offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.includes("/assets/images/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
