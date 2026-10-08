/** Imagen oficial por nivel (v2.1). Sin DOM: la usan la app, el service worker y las pruebas. */

export const SCALE_PX = 96;
/** En un iPhone @3x, 1 px CSS son 3 px físicos. */
export const DEVICE_SCALE = 3;
/** Padding de `.thumb`: 8 % por lado. El interior es size × (1 − 2 × PAD). */
export const THUMB_PAD = 0.08;
export const HEAVY_BYTES = 3000000;

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
 * Escala uniforme para que la caja útil quepa en el interior de esta miniatura
 * y, a DPR 3, no ocupe más px físicos que su resolución.
 * Si llenar el interior exigiría ampliar por encima, se amplía menos y queda más margen.
 * escala = min(interior / max(caja.w, caja.h), 1/3).
 */
export function fitOf(im, size = SCALE_PX) {
  if (!im || !im.caja_visible) return null;
  const ancho = Number(im.ancho);
  const alto = Number(im.alto);
  const { x, y, w, h } = im.caja_visible;
  if (!(ancho > 0) || !(alto > 0) || !(w > 0) || !(h > 0)) return null;
  const lado = thumbInterior(size, im.tipo_visual === "tile_fondo_opaco");
  if (!(lado > 0)) return null;
  const escala = Math.min(lado / Math.max(w, h), 1 / DEVICE_SCALE);
  const dw = ancho * escala;
  const dh = alto * escala;
  return {
    escala,
    dw,
    dh,
    tx: dw / 2 - (x + w / 2) * escala,
    ty: dh / 2 - (y + h / 2) * escala,
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
