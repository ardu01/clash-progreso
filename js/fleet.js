import { averagePct } from "./progress.js";

/**
 * Panel de todas las cuentas. Los números salen de las exportaciones ya
 * analizadas: no se inventa un constructor ni un laboratorio.
 */
export function fleetSnapshot(rows) {
  const medias = rows.map((r) => r.media).filter((v) => v != null);
  let libres = 0;
  let ocupados = 0;
  let conConstructores = 0;
  let labLibres = 0;
  let mascotasLibres = 0;
  let proxima = null;
  for (const row of rows) {
    const b = row.builders;
    if (b && b.known && !b.over) {
      conConstructores += 1;
      libres += b.free || 0;
      ocupados += b.occupied || 0;
    }
    if (row.labLibre) labLibres += 1;
    if (row.mascotasLibres) mascotasLibres += 1;
    if (row.proxima && (proxima == null || row.proxima < proxima.fin)) {
      proxima = { tag: row.tag, nombre: row.nombre, fin: row.proxima };
    }
  }
  return {
    cuentas: rows.length,
    media: averagePct(medias),
    constructoresLibres: libres,
    constructoresOcupados: ocupados,
    cuentasConConstructores: conConstructores,
    laboratoriosLibres: labLibres,
    mascotasLibres,
    proxima,
  };
}

/** Cuentas con algo que hacer según la exportación y el reloj. */
export function whatNow(rows, now = Date.now()) {
  const out = [];
  for (const row of rows) {
    const motivos = [];
    const b = row.builders;
    if (b && b.known && !b.over && b.free > 0) {
      motivos.push(b.free === 1 ? "1 constructor libre" : `${b.free} constructores libres`);
    }
    if (row.labLibre) motivos.push("Laboratorio libre");
    if (row.mascotasLibres) motivos.push("Casa de mascotas libre");
    const terminadas = (row.mejoras || []).filter((u) => u.end <= now && !u.extra);
    if (terminadas.length) {
      motivos.push(terminadas.length === 1 ? "1 mejora terminada" : `${terminadas.length} mejoras terminadas`);
    }
    if (!motivos.length) continue;
    out.push({ tag: row.tag, nombre: row.nombre, chip: row.chip, th: row.th, motivos });
  }
  out.sort((a, b) => (b.th || 0) - (a.th || 0) || String(a.nombre).localeCompare(String(b.nombre), "es"));
  return out;
}

export function rankAccounts(rows, key = "media") {
  const list = rows.slice();
  list.sort((a, b) => {
    if (key === "th") {
      const d = (b.th || 0) - (a.th || 0);
      if (d) return d;
    } else if (key === "libres") {
      const fa = a.builders && a.builders.free != null ? a.builders.free : -1;
      const fb = b.builders && b.builders.free != null ? b.builders.free : -1;
      const d = fb - fa;
      if (d) return d;
    } else {
      const d = (b.media ?? -1) - (a.media ?? -1);
      if (d) return d;
    }
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  return list.map((row, i) => ({ ...row, puesto: i + 1 }));
}

/** De 2 a 3 tags, en el orden pedido. Ignora los que no existen. */
export function compareAccounts(rows, tags) {
  const by = new Map(rows.map((r) => [r.tag, r]));
  const picked = [];
  for (const tag of tags || []) {
    if (picked.length >= 3) break;
    const row = by.get(tag);
    if (row && !picked.some((p) => p.tag === tag)) picked.push(row);
  }
  return picked;
}
