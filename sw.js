import { IMAGE_CACHE, SHELL_CACHE } from "./js/caches.js?v=4.2.4";
import { precacheUrls } from "./js/images.js?v=4.2.4";

const SHELL = SHELL_CACHE;
const IMAGES = IMAGE_CACHE;

const APP = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/views.css",
  "./css/estilo-3.1.css",
  "./css/operaciones.css",
  "./css/atencion.css",
  "./js/app.js",
  "./js/progress.js",
  "./js/format.js",
  "./js/parse.js",
  "./js/import.js",
  "./js/store.js",
  "./js/caches.js",
  "./js/calendario.js",
  "./js/recursos.js",
  "./js/th-costes.js",
  "./js/juego-datos.js",
  "./js/images.js",
  "./js/roster.js",
  "./js/filters.js",
  "./js/backup.js",
  "./js/paste.js",
  "./js/range.js",
  "./js/fleet.js",
  "./js/plan.js",
  "./js/history.js",
  "./js/costs.js",
  "./js/equipo.js",
  "./js/perfil.js",
  "./js/actualizar.js",
  "./js/nav.js",
  "./js/origen.js",
  "./js/gancho.js",
  "./js/migracion.js",
  "./js/prioridades.js",
  "./js/sesion.js",
  "./js/simulacion.js",
  "./js/prediccion.js",
  "./js/gemelo.js",
  "./js/equilibrio.js",
  "./js/evento.js",
  "./js/guerra.js",
  "./js/diario.js",
  "./js/plantillas.js",
  "./js/replan.js",
  "./js/fuentes.js",
  "./js/temas-paquete.js",
  "./js/operaciones.js",
  "./js/ui-operaciones.js",
  "./js/atencion.js",
  "./js/ui-atencion.js",
  "./js/ui-evolucion.js",
  "./js/evolucion.worker.js",
  "./js/evolucion/control.js",
  "./js/evolucion/empaquetar.js",
  "./js/evolucion/sesiones.js",
  "./js/evolucion/prng.js",
  "./js/evolucion/evaluar.js",
  "./js/evolucion/nsga.js",
  "./js/charts.js",
  "./js/colas.js",
  "./js/schedule.js",
  "./js/desbloqueos.js",
  "./js/roadmap.js",
  "./js/recomendador.js",
  "./js/coste-tarjeta.js",
  "./js/provisional.js",
  "./data/costes.json",
  "./data/ref/desbloqueos.json",
  "./data/armas-th.json",
  "./data/supercargas.json",
  "./assets/manifest.json",
  "./assets/cajas-alfa.json",
  "./data/caps_clashrecord.json",
  "./data/bundle.json",
  "./data/snapshots.csv",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
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
    const urls = precacheUrls(man);
    if (urls.length) await imgCache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, IMAGES]);
    for (const key of await caches.keys()) {
      if (!keep.has(key) && !key.startsWith(TEMAS_CACHE)) await caches.delete(key);
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
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(request, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok && request.method === "GET") {
      const cache = await caches.open(SHELL);
      const bare = new URL(request.url);
      bare.search = "";
      cache.put(bare.toString(), res.clone());
    }
    return res;
  } catch {
    clearTimeout(timer);
    const hit = await caches.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === "navigate") {
      const shell = await caches.match("./index.html");
      if (shell) return shell;
    }
    return new Response("", { status: 503, statusText: "offline" });
  }
}

// Paquete estético (temas): caché propia por versión del paquete, cp-temas-<versión>; no depende de SHELL_CACHE.
// paquete.json: red primero (trae la versión) y copia sin conexión. CSS (?v=<versión>): caché primero en cp-temas-<versión>.
const TEMAS_CACHE = "cp-temas-";
async function paqueteEstetico(request, url) {
  const v = url.searchParams.get("v");
  if (!v) {
    try {
      const res = await fetch(request, { cache: "no-cache" });
      const p = res.ok ? await res.clone().json() : null;
      if (p && p.version) {
        await (await caches.open(TEMAS_CACHE + p.version)).put(url.origin + url.pathname, res.clone());
        for (const key of await caches.keys()) if (key.startsWith(TEMAS_CACHE) && key !== TEMAS_CACHE + p.version) await caches.delete(key);
      }
      return res;
    } catch {
      return (await caches.match(url.origin + url.pathname)) || new Response("", { status: 503, statusText: "offline" });
    }
  }
  const cache = await caches.open(TEMAS_CACHE + v);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.includes("/paquete-estetico/")) {
    event.respondWith(paqueteEstetico(event.request, url));
    return;
  }
  if (url.pathname.includes("/assets/images/") || url.pathname.includes("/assets/oficial/resources/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  event.respondWith(networkFirst(event.request));
});
