/** Imagen oficial por nivel (v2.1). Sin DOM: la usan la app, el service worker y las pruebas. */

import CAJAS_ALFA from "../assets/cajas-alfa.json" with { type: "json" };

/** Padding de `.thumb`: 8 % por lado. El interior es size × (1 − 2 × PAD). */
export const THUMB_PAD = 0.08;
/** Objetivo: el lado largo del dibujo ocupa el 85 % del lado de la miniatura. */
export const DRAW_TARGET = 0.85;
/** 1 px CSS son 3 px físicos en un iPhone. */
export const DEVICE_SCALE = 3;
/** Si el PNG no llega al 85 % a 1 px físico por px de bitmap, se puede ampliar hasta 1,5×. */
export const UPSCALE_MAX = 1.5;
export const HEAVY_BYTES = 3000000;

export { CAJAS_ALFA };

export function isHeavy(im, item) {
  if (item && item.pesado === true) return true;
  if (!im) return false;
  if (im.pesado === true) return true;
  return Number(im.bytes) > HEAVY_BYTES;
}

/**
 * 1) imagenes_por_nivel[lvl] si existe.
 * 2) si no, item.imagen, sin marca.
 * fallback es el PNG del edificio cuando la ruta del nivel es otra: sin conexión
 * y sin esa ruta en caché, o si falla al cargar, se pinta ese PNG y se quita la marca.
 */
export function imageChoice(item, lvl) {
  if (!item) return { im: null, fallback: null, marca: null };
  const base = item.imagen && item.imagen.ruta ? item.imagen : null;
  const key = lvl == null || lvl === "" ? null : String(lvl);
  const por = key && item.imagenes_por_nivel ? item.imagenes_por_nivel[key] : null;
  if (por && por.ruta) {
    const same = !!(base && base.ruta === por.ruta);
    return {
      im: por,
      fallback: same || !base ? null : base,
      marca: por.es_inferior && por.marca ? por.marca : null,
    };
  }
  return { im: base, fallback: null, marca: null };
}

/** Lado interior de la miniatura, en px CSS. Un tile no tiene padding. */
export function thumbInterior(size, tile) {
  const side = Number(size);
  if (!(side > 0)) return 0;
  return tile ? side : side * (1 - 2 * THUMB_PAD);
}

/**
 * La imagen entera dentro de la miniatura, sin recortar `caja_visible` y sin
 * pasar de 1 px CSS por px de imagen. escala = min(1, interior/ancho, interior/alto).
 * El CSS (object-fit: contain, max-width/height 100 %) hace lo mismo; esto lo comprueban las pruebas.
 */
export function containOf(im, size, opts = {}) {
  if (!im) return null;
  const ancho = Number(im.ancho);
  const alto = Number(im.alto);
  if (!(ancho > 0) || !(alto > 0)) return null;
  const lado = interiorOf(im, size, opts);
  if (!(lado > 0)) return null;
  const escala = Math.min(1, lado / ancho, lado / alto);
  return { escala, dw: ancho * escala, dh: alto * escala };
}

function interiorOf(im, size, opts) {
  if (opts.interior != null) return Number(opts.interior);
  if (opts.pad != null) return Math.max(0, Number(size) - 2 * Number(opts.pad));
  return thumbInterior(size, im && im.tipo_visual === "tile_fondo_opaco");
}

/** Caja de píxeles con alfa > 0. Está en `assets/cajas-alfa.json`; `caja_visible` del manifiesto es el umbral antiguo (alfa > 8). */
export function cajaAlfa(im) {
  if (!im || !im.ruta) return null;
  return CAJAS_ALFA[im.ruta] || null;
}

/**
 * Encuadra el dibujo (bbox de alfa > 0) al 85 % del lado, centrado.
 * Safari iOS 16 no aplica `object-view-box`, así que el resultado es ancho,
 * alto y posición del `<img>` dentro de un contenedor con `overflow: hidden`.
 * La escala es uniforme. El tope es 1,5 px de bitmap por px físico
 * (`UPSCALE_MAX / DEVICE_SCALE` px CSS por px de imagen). `null` si no hay caja.
 */
export function ajusteOf(im, size, opts = {}) {
  const box = opts.caja || cajaAlfa(im);
  if (!im || !box) return null;
  const ancho = Number(im.ancho);
  const alto = Number(im.alto);
  const x = Number(box.x);
  const y = Number(box.y);
  const w = Number(box.w);
  const h = Number(box.h);
  const lado = Number(size);
  if (!(ancho > 0) || !(alto > 0) || !(w > 0) || !(h > 0) || !(lado > 0)) return null;
  if (x < 0 || y < 0 || x + w > ancho || y + h > alto) return null;
  const escala = Math.min((DRAW_TARGET * lado) / Math.max(w, h), UPSCALE_MAX / DEVICE_SCALE);
  if (!(escala > 0)) return null;
  return {
    escala,
    dw: ancho * escala,
    dh: alto * escala,
    left: lado / 2 - (x + w / 2) * escala,
    top: lado / 2 - (y + h / 2) * escala,
    x, y, w, h,
  };
}

function imageList(item) {
  const images = [];
  if (item && item.imagen) images.push(item.imagen);
  if (item && item.imagenes_por_nivel) {
    for (const im of Object.values(item.imagenes_por_nivel)) images.push(im);
  }
  return images;
}

/** Rutas únicas, sin pesadas (> 3 MB). La misma ruta en varios niveles cuenta una vez. */
export function catalog(manifest) {
  const byUrl = new Map();
  for (const item of Object.values((manifest && manifest.items) || {})) {
    for (const im of imageList(item)) {
      if (!im || !im.ruta || isHeavy(im, item)) continue;
      const url = "./assets/" + im.ruta;
      const prev = byUrl.get(url);
      if (prev) {
        if (im.precarga === true) prev.precache = true;
        continue;
      }
      byUrl.set(url, { url, bytes: Number(im.bytes) || 0, precache: im.precarga === true });
    }
  }
  return [...byUrl.values()];
}

/** Solo precarga === true, deduplicado por URL. */
export function precacheUrls(manifest) {
  const urls = new Set();
  for (const item of Object.values((manifest && manifest.items) || {})) {
    for (const im of imageList(item)) {
      if (!im || !im.ruta || im.precarga !== true) continue;
      urls.add("./assets/" + im.ruta);
    }
  }
  return [...urls];
}
