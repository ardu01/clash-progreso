import { builderStatus, upgradesOf } from "./progress.js";

/**
 * Un solo cálculo de constructores, laboratorio, mascotas y temporizadores.
 * Lo usan Inicio, Cuentas, Agenda y el resto: no hay una segunda suma.
 *
 * real: lo que decía la exportación en su fecha (un hueco sin temporizador).
 * estimado: el temporizador de esa exportación ya llegó a cero. No es un dato nuevo.
 * Una cuenta desactualizada no convierte esos ceros en urgencia.
 */
export function estadoColas(exp, now, opts = {}) {
  const staleMs = opts.staleMs == null ? 7 * 86400000 : opts.staleMs;
  const exportAt = exp && typeof exp.timestamp === "number" ? exp.timestamp * 1000 : null;
  const ageMs = exportAt == null ? null : now - exportAt;
  const desactualizada = exportAt == null || ageMs > staleMs;
  const snap = builderStatus(exp || {});
  const timers = upgradesOf(exp || {}).filter((u) => !u.extra).map((u) => {
    const vencido = typeof u.end === "number" && u.end <= now;
    return { ...u, vencido, clase: vencido ? "estimado" : "real" };
  });
  const de = (queue) => {
    const items = timers.filter((u) => u.queue === queue);
    return {
      items,
      enCurso: items.filter((u) => !u.vencido),
      vencidos: items.filter((u) => u.vencido),
    };
  };
  const ctor = de("constructor");
  const lab = de("laboratorio");
  const pets = de("mascotas");
  const th = opts.th;
  const hayMascotas = th == null || th >= 14;
  const libresReales = snap.known && !snap.over ? snap.free : null;
  const vencidos = ctor.vencidos.length;
  const libresEstimados = libresReales == null ? null : Math.min(snap.total, libresReales + vencidos);
  return {
    exportAt,
    ageMs,
    desactualizada,
    builders: {
      known: snap.known,
      total: snap.total,
      over: snap.over,
      ocupadosReales: snap.occupied,
      enCurso: ctor.enCurso.length,
      vencidos,
      libresReales,
      libresEstimados,
      libresAccion: desactualizada ? 0 : (libresReales || 0),
      confianza: desactualizada ? "baja" : (vencidos > 0 ? "estimada" : "alta"),
    },
    laboratorio: {
      enCurso: lab.enCurso.length,
      vencidos: lab.vencidos.length,
      libreReal: lab.items.length === 0,
      libreEstimado: lab.enCurso.length === 0,
      libreAccion: !desactualizada && lab.items.length === 0,
    },
    mascotas: {
      enCurso: hayMascotas ? pets.enCurso.length : 0,
      vencidos: hayMascotas ? pets.vencidos.length : 0,
      libreReal: hayMascotas && pets.items.length === 0,
      libreEstimado: hayMascotas && pets.enCurso.length === 0,
      libreAccion: hayMascotas && !desactualizada && pets.items.length === 0,
    },
    timers,
  };
}

export function resumenFlota(estados) {
  const out = {
    cuentas: 0,
    libresReales: 0,
    ocupadosReales: 0,
    enCurso: 0,
    vencidos: 0,
    labReales: 0,
    labEstimados: 0,
    petReales: 0,
    petEstimados: 0,
    desactualizadas: 0,
    over: 0,
    sinDato: 0,
  };
  for (const e of estados) {
    if (!e) continue;
    out.cuentas += 1;
    if (e.desactualizada) out.desactualizadas += 1;
    const b = e.builders;
    if (!b || !b.known) { out.sinDato += 1; continue; }
    if (b.over) { out.over += 1; continue; }
    out.libresReales += b.libresReales || 0;
    out.ocupadosReales += b.ocupadosReales || 0;
    out.enCurso += b.enCurso || 0;
    out.vencidos += b.vencidos || 0;
    if (e.laboratorio.libreReal) out.labReales += 1;
    else if (e.laboratorio.libreEstimado) out.labEstimados += 1;
    if (e.mascotas.libreReal) out.petReales += 1;
    else if (e.mascotas.libreEstimado) out.petEstimados += 1;
  }
  return out;
}

/**
 * Reparte chozas, laboratorio y mascotas.
 * Un temporizador que ya llegó a cero ocupa un hueco estimado.
 * Un hueco sin temporizador en la exportación es un dato real.
 */
export function repartirColas(actuales, opts = {}) {
  const now = opts.now || 0;
  const builders = opts.builders || {};
  const list = actuales || [];
  const running = list
    .filter((u) => u && u.queue === "constructor" && !u.extra && !u.done)
    .sort((a, b) => (a.exacta ? a.fin : Infinity) - (b.exacta ? b.fin : Infinity));
  const known = !!(builders.known && typeof builders.total === "number");
  const total = known ? builders.total : running.length;
  const libresReales = known && !builders.over && typeof builders.free === "number" ? builders.free : 0;
  const constructores = [];
  let i = 0;
  for (const cur of running) {
    if (i >= total) break;
    constructores.push(hueco(`c${i}`, "constructor", `Constructor ${i + 1}`, cur));
    i += 1;
  }
  for (let n = 0; n < libresReales && i < total; n += 1) {
    constructores.push(hueco(`c${i}`, "constructor", `Constructor ${i + 1}`, null));
    i += 1;
  }
  const vencido = { done: true, exacta: true, fin: now };
  while (i < total) {
    constructores.push(hueco(`c${i}`, "constructor", `Constructor ${i + 1}`, vencido));
    i += 1;
  }
  for (let j = total; j < running.length; j += 1) {
    constructores.push(hueco(`x${j}`, "constructor", "Mejora sin constructor conocido", running[j]));
  }
  return {
    constructores,
    laboratorio: hueco("lab", "laboratorio", "Laboratorio", colaActual(list, "laboratorio")),
    mascotas: opts.mascotas ? hueco("pets", "mascotas", "Casa de mascotas", colaActual(list, "mascotas")) : null,
    known,
    avisoHora: list.some((u) => u && !u.done && !u.exacta),
  };
}

function hueco(id, cola, titulo, cur) {
  return { id, cola, titulo, cur };
}

function colaActual(list, queue) {
  const items = list.filter((u) => u && u.queue === queue && !u.extra);
  return items.find((u) => !u.done) || items.find((u) => u.done) || null;
}

/** real: hueco vacío en la exportación. estimado: el temporizador de esa exportación ya llegó a cero. */
export function clasificarHueco(cur, now) {
  if (!cur || cur.done) {
    return { libreYa: true, freeAt: now, blocked: false, clase: cur && cur.done ? "estimado" : "real" };
  }
  if (!cur.exacta) return { libreYa: false, freeAt: now, blocked: true, clase: "real" };
  if (cur.fin <= now) return { libreYa: true, freeAt: now, blocked: false, clase: "estimado" };
  return { libreYa: false, freeAt: cur.fin, blocked: false, clase: "real" };
}

export function fraseConstructores(r) {
  const bits = [
    r.libresReales === 1 ? "1 libre en la exportación" : `${r.libresReales} libres en la exportación`,
    r.ocupadosReales === 1 ? "1 ocupado en la exportación" : `${r.ocupadosReales} ocupados en la exportación`,
  ];
  if (r.vencidos) bits.push(r.vencidos === 1 ? "1 ya habría acabado (estimado)" : `${r.vencidos} ya habrían acabado (estimado)`);
  if (r.over) bits.push(r.over === 1 ? "1 cuenta con más mejoras que chozas" : `${r.over} cuentas con más mejoras que chozas`);
  if (r.desactualizadas) bits.push(r.desactualizadas === 1 ? "1 necesita actualización" : `${r.desactualizadas} necesitan actualización`);
  return bits.join(" · ");
}
