/**
 * Después de guardar una exportación.
 * Marca las sesiones abiertas de esa cuenta para recalcular.
 * Un paso declarado como hecho no pasa a confirmado: eso solo lo cubre el JSON.
 */

export function claveRoadmap({ tag, timestamp, plan, sueno, now }) {
  const minuto = Math.floor(Number(now) / 60000);
  return [tag, timestamp ?? "", JSON.stringify(plan ?? null), JSON.stringify(sueno ?? null), minuto].join("\0");
}

function tocaCuenta(doc, tag) {
  if (!doc || doc.cerrada) return false;
  if (doc.tipo !== "sesion" && doc.tipo !== "mantenimiento") return false;
  if (doc.tag === tag) return true;
  if (Array.isArray(doc.orden) && doc.orden.includes(tag)) return true;
  return Array.isArray(doc.pasos) && doc.pasos.some((p) => p && p.tag === tag);
}

export function trasImportar({ tag, documentos, now }) {
  let cambiados = 0;
  const out = (documentos || []).map((doc) => {
    if (!tocaCuenta(doc, tag)) return doc;
    cambiados += 1;
    const pasos = Array.isArray(doc.pasos) ? doc.pasos.map((p) => ({ ...p })) : doc.pasos;
    return { ...doc, pasos, recalcular: now };
  });
  return { documentos: out, cambiados };
}
