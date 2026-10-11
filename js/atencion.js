import { nombreCat } from "./gemelo.js";
import { C1, JUEGO_DIA, ordenarCuentas, SUEÑO_DEFECTO } from "./prioridades.js";

const DIA = 86400000;

/** Una etiqueta, una cuenta. La primera aparición gana. */
export function unicas(cuentas) {
  const vistos = new Set();
  const out = [];
  for (const cuenta of cuentas || []) {
    if (!cuenta || !cuenta.tag || vistos.has(cuenta.tag)) continue;
    vistos.add(cuenta.tag);
    out.push(cuenta);
  }
  return out;
}

export function hibernacionDe(hibernadas, tag, now) {
  const item = (hibernadas || []).find((h) => h && h.tag === tag);
  if (!item) return null;
  if (item.modo === "indef" || item.hasta == null) return item;
  if (Number(item.hasta) > Number(now || 0)) return item;
  return null;
}

function viva(cuenta, hibernadas, now) {
  return cuenta && !hibernacionDe(hibernadas, cuenta.tag, now);
}

/**
 * Lo que la sesión puede hacer. No trata un temporizador vencido como mejora acabada:
 * una cuenta desactualizada no aporta constructor ni laboratorio libres.
 * C1 no genera un paso de héroes.
 */
export function tareasAtencion(cuenta) {
  if (!cuenta) return [];
  if (cuenta.desactualizada || !cuenta.tag) {
    if (!cuenta || !cuenta.tag) return [];
    return [{
      id: `${cuenta.tag}:traer`,
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      cola: "exportacion",
      titulo: "Traer una exportación nueva",
      minutos: 2,
      obligatoria: true,
      origen: "confirmado",
      frase: "Los datos son viejos. No se da por libre un constructor ni por acabada una mejora.",
    }];
  }
  const out = [];
  if (Number(cuenta.libreAccion) > 0) {
    out.push({
      id: `${cuenta.tag}:constructor`,
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      cola: "constructor",
      titulo: "Constructor libre",
      minutos: 3,
      obligatoria: true,
      origen: "confirmado",
      frase: "Libre en la exportación.",
    });
  }
  if (cuenta.labLibre) {
    out.push({
      id: `${cuenta.tag}:laboratorio`,
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      cola: "laboratorio",
      titulo: "Laboratorio libre",
      minutos: 2,
      obligatoria: true,
      origen: "confirmado",
      frase: "Libre en la exportación.",
    });
  }
  return out;
}

function ordenVivas(cuentas, hibernadas, now) {
  return ordenarCuentas(unicas(cuentas).filter((cuenta) => viva(cuenta, hibernadas, now)));
}

/** Reparte el presupuesto de la sesión. C1 va primero. Lo que no cabe es un conflicto. */
export function repartir(cuentas, opts = {}) {
  const minutos = Number(opts.minutos) > 0 ? Number(opts.minutos) : 60;
  const ahora = opts.now || 0;
  const asignadas = [];
  const fuera = [];
  let usados = 0;
  for (const cuenta of ordenVivas(cuentas, opts.hibernadas, ahora)) {
    for (const tarea of tareasAtencion(cuenta)) {
      const paso = { ...tarea, estado: "pendiente" };
      if (asignadas.length && usados + paso.minutos > minutos) fuera.push(paso);
      else {
        asignadas.push(paso);
        usados += paso.minutos;
      }
    }
  }
  return { minutos, usados, asignadas, fuera };
}

export function pasosRecomendados(cuentas, opts = {}) {
  const reparto = repartir(cuentas, opts);
  const tienen = new Set(reparto.asignadas.map((paso) => paso.tag));
  const out = reparto.asignadas.slice();
  let usados = reparto.usados;
  for (const cuenta of ordenVivas(cuentas, opts.hibernadas, opts.now || 0)) {
    if (tienen.has(cuenta.tag) || tareasAtencion(cuenta).some((tarea) => tarea.obligatoria)) continue;
    if (out.length && usados + 2 > reparto.minutos) continue;
    out.push({
      id: `${cuenta.tag}:abrir`,
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      cola: "visita",
      titulo: "Abrir la cuenta",
      minutos: 2,
      obligatoria: false,
      origen: "estimado",
      estado: "pendiente",
      frase: "No hay una cola libre confirmada.",
    });
    usados += 2;
  }
  return out;
}

export function bandeja(cuentas, opts = {}) {
  const ahora = opts.now || 0;
  const items = [];
  for (const cuenta of ordenVivas(cuentas, opts.hibernadas, ahora)) {
    const tareas = tareasAtencion(cuenta);
    if (tareas.length) {
      for (const tarea of tareas) items.push(tarea);
      continue;
    }
    const bajas = categoriasBajas(cuenta);
    if (bajas.length) {
      items.push({
        id: `${cuenta.tag}:peso`,
        tag: cuenta.tag,
        nombre: cuenta.nombre || cuenta.tag,
        titulo: bajas.map((cat) => cat.label).join(", "),
        minutos: 0,
        origen: "estimado",
        frase: "Por debajo del peso. Es una comparación, no un dato del temporizador.",
      });
    }
  }
  return items;
}

export function excepciones(cuentas, opts = {}) {
  const todas = listaPlana(cuentas, opts);
  if (opts.mostrarTodas) return { modo: "todas", items: todas };
  return { modo: "atencion", items: todas.filter((item) => item.pide) };
}

function listaPlana(cuentas, opts) {
  const ahora = opts.now || 0;
  const out = [];
  for (const cuenta of ordenarCuentas(unicas(cuentas))) {
    const dormida = hibernacionDe(opts.hibernadas, cuenta.tag, ahora);
    if (dormida) {
      out.push({
        tag: cuenta.tag,
        nombre: cuenta.nombre || cuenta.tag,
        titulo: "Hibernada",
        origen: "manual",
        pide: false,
        frase: dormida.modo === "indef" ? "Sin fecha de vuelta." : "Vuelve cuando pase el plazo.",
      });
      continue;
    }
    const tareas = tareasAtencion(cuenta);
    if (!tareas.length) {
      out.push({
        tag: cuenta.tag,
        nombre: cuenta.nombre || cuenta.tag,
        titulo: "Al día",
        origen: "confirmado",
        pide: false,
        frase: "Nada que intervenir con los datos actuales.",
      });
      continue;
    }
    for (const tarea of tareas) out.push({ ...tarea, pide: true });
  }
  return out;
}

export function presupuestoSemanal(cuentas, opts = {}) {
  const alDia = Math.min(JUEGO_DIA.max, Math.max(JUEGO_DIA.min, Number(opts.horasDia) || 90));
  const semana = alDia * 7;
  const reparto = repartir(cuentas, { ...opts, minutos: semana });
  return {
    alDia,
    semana,
    necesario: reparto.usados,
    cabe: reparto.fuera.length === 0,
    fuera: reparto.fuera.length,
    frase: "Estimación de la semana. No cambia la agenda ni los temporizadores.",
  };
}

export function ventanas(cuentas, opts = {}) {
  const sueno = opts.sueno && opts.sueno.desde && opts.sueno.hasta ? opts.sueno : SUEÑO_DEFECTO;
  const ahora = opts.now || 0;
  const juntas = [];
  const sinHora = [];
  const fuera = [];
  for (const cuenta of ordenarCuentas(unicas(cuentas))) {
    const fila = { tag: cuenta.tag, nombre: cuenta.nombre || cuenta.tag };
    if (hibernacionDe(opts.hibernadas, cuenta.tag, ahora)) {
      fuera.push({ ...fila, origen: "manual" });
      continue;
    }
    if (cuenta.desactualizada) {
      sinHora.push({ ...fila, origen: "confirmado" });
      continue;
    }
    if (Number(cuenta.libreAccion) > 0 || cuenta.labLibre) juntas.push({ ...fila, origen: "confirmado" });
  }
  return {
    sueno,
    juntas,
    sinHora,
    fuera,
    frase: `Misma franja, fuera del sueño ${sueno.desde}–${sueno.hasta}. Sin avisos nuevos.`,
  };
}

function categoriasBajas(cuenta) {
  if (!cuenta || cuenta.desactualizada) return [];
  return Object.entries(cuenta.cats || {})
    .filter(([key, pct]) => pct != null && pct < 50 && !(cuenta.tag === C1 && key === "heroes"))
    .map(([key, pct]) => ({ key, pct, label: nombreCat(key) }))
    .sort((a, b) => a.pct - b.pct || a.label.localeCompare(b.label, "es"));
}

/** Categorías por debajo del 50 %. Los héroes de C1 no entran. */
export function detector(cuentas) {
  const filas = [];
  for (const cuenta of ordenarCuentas(unicas(cuentas))) {
    if (cuenta.desactualizada) continue;
    const bajas = categoriasBajas(cuenta);
    if (!bajas.length) continue;
    filas.push({
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      origen: "estimado",
      categorias: bajas,
    });
  }
  return filas;
}

export function conflictos(cuentas, opts = {}) {
  const reparto = repartir(cuentas, opts);
  return {
    minutos: reparto.minutos,
    asignadas: reparto.asignadas,
    fuera: reparto.fuera,
    frase: reparto.fuera.length
      ? "No caben en los minutos de la sesión. C1 conserva su sitio."
      : "Caben en la sesión.",
  };
}

export function rescate(cuentas, opts = {}) {
  const ahora = opts.now || 0;
  const dormidas = [];
  const viejas = [];
  for (const cuenta of ordenarCuentas(unicas(cuentas))) {
    const fila = { tag: cuenta.tag, nombre: cuenta.nombre || cuenta.tag };
    if (hibernacionDe(opts.hibernadas, cuenta.tag, ahora)) dormidas.push({ ...fila, origen: "manual" });
    else if (cuenta.desactualizada) viejas.push({ ...fila, origen: "confirmado" });
  }
  return {
    dormidas,
    viejas,
    frase: "Despertar solo quita la hibernación. No toca temporizadores.",
  };
}

export const DIAS_HIBERNAR = [7, 14, 30];
