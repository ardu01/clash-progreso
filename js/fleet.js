import { averagePct } from "./progress.js";
import { fraseConstructores, resumenFlota } from "./colas.js";

/**
 * Panel de todas las cuentas. Los números salen de las exportaciones ya
 * analizadas: no se inventa un constructor ni un laboratorio.
 */
export function fleetSnapshot(rows) {
  const medias = rows.map((r) => r.media).filter((v) => v != null);
  const resumen = resumenFlota(rows.map((r) => r.colas).filter(Boolean));
  let proxima = null;
  for (const row of rows) {
    if (row.proxima && (proxima == null || row.proxima < proxima.fin)) {
      proxima = { tag: row.tag, nombre: row.nombre, fin: row.proxima };
    }
  }
  return {
    cuentas: rows.length,
    media: averagePct(medias),
    constructoresLibres: resumen.libresReales,
    constructoresOcupados: resumen.ocupadosReales,
    constructoresEstimados: resumen.vencidos,
    cuentasConConstructores: resumen.cuentas - resumen.sinDato - resumen.over,
    laboratoriosLibres: resumen.labReales,
    laboratoriosEstimados: resumen.labEstimados,
    mascotasLibres: resumen.petReales,
    mascotasEstimadas: resumen.petEstimados,
    desactualizadas: resumen.desactualizadas,
    frase: fraseConstructores(resumen),
    proxima,
  };
}

/** Cuentas con algo que hacer según la exportación y el reloj. */
export function whatNow(rows, now = Date.now()) {
  const out = [];
  for (const row of rows) {
    const motivos = [];
    const colas = row.colas;
    if (colas && colas.desactualizada) continue;
    const b = row.builders;
    if (b && b.known && !b.over && b.free > 0) {
      motivos.push(b.free === 1 ? "1 constructor libre en la exportación" : `${b.free} constructores libres en la exportación`);
    }
    if (b && b.vencidos > 0) {
      motivos.push(b.vencidos === 1 ? "1 constructor estimado" : `${b.vencidos} constructores estimados`);
    }
    if (row.labLibre) motivos.push("Laboratorio libre en la exportación");
    else if (colas && colas.laboratorio.libreEstimado && colas.laboratorio.vencidos) motivos.push("Laboratorio estimado");
    if (row.mascotasLibres) motivos.push("Casa de mascotas libre en la exportación");
    else if (colas && colas.mascotas.libreEstimado && colas.mascotas.vencidos) motivos.push("Casa de mascotas estimada");
    const terminadas = (row.mejoras || []).filter((u) => u.end <= now && !u.extra);
    if (terminadas.length) {
      motivos.push(terminadas.length === 1 ? "1 mejora estimada como terminada" : `${terminadas.length} mejoras estimadas como terminadas`);
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
