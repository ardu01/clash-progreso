import { madridDayKey } from "./format.js";
import { levelCost } from "./costs.js";

const ZONE = "Europe/Madrid";

/** «23:00» → minutos desde medianoche. null si no es una hora. */
export function parseClock(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** null si falta una hora o las dos son la misma: no hay tramo que aplicar. */
export function sleepFromClocks(desde, hasta) {
  const a = parseClock(desde);
  const b = parseClock(hasta);
  if (a == null || b == null || a === b) return null;
  return { desde: a, hasta: b };
}

function parts(ms) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const o = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== "literal") o[p.type] = Number(p.value);
  }
  return o;
}

function offset(ms) {
  const p = parts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
}

function atClock(year, month, day, minutes) {
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  let utc = Date.UTC(year, month - 1, day, h, min, 0) - offset(Date.UTC(year, month - 1, day, h, min, 0));
  utc = Date.UTC(year, month - 1, day, h, min, 0) - offset(utc);
  return utc;
}

export function inSleep(ms, sleep) {
  if (!sleep) return false;
  const p = parts(ms);
  const mins = p.hour * 60 + p.minute;
  if (sleep.desde < sleep.hasta) return mins >= sleep.desde && mins < sleep.hasta;
  return mins >= sleep.desde || mins < sleep.hasta;
}

/** El mismo instante si está despierto; si no, el próximo despertar en Madrid. */
export function nextAwake(ms, sleep) {
  if (!inSleep(ms, sleep)) return ms;
  const p = parts(ms);
  const mins = p.hour * 60 + p.minute;
  const add = sleep.desde > sleep.hasta && mins >= sleep.desde ? 1 : 0;
  const civil = new Date(Date.UTC(p.year, p.month - 1, p.day + add));
  return atClock(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate(), sleep.hasta);
}

/**
 * Fin de una mejora en curso. Solo es exacto si `timestamp` y `timer`
 * son segundos finitos. No se redondea ni se inventa una hora.
 */
export function finDe(timestamp, timer) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return { exacta: false, fin: null };
  if (typeof timer !== "number" || !Number.isFinite(timer)) return { exacta: false, fin: null };
  return { exacta: true, fin: (timestamp + timer) * 1000 };
}

/** Segundos oficiales del siguiente nivel. null si la fuente no los trae. */
export function segundosDe(id, lvl) {
  const row = levelCost(id, (lvl || 0) + 1);
  if (!row || typeof row.s !== "number" || !Number.isFinite(row.s)) return null;
  return row.s;
}

/**
 * La mejora en curso conserva su fin. La siguiente no empieza ni acaba
 * dentro del sueño si cabe en el tiempo despierto. Si dura más, el fin
 * es el real y `finEnSueno` lo dice: no se mueve a una hora inventada.
 */
export function scheduleNext(freeAt, durationSec, sleep) {
  const dur = typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec >= 0
    ? durationSec * 1000
    : null;
  const start0 = nextAwake(freeAt, sleep);
  if (dur == null) {
    return { inicio: start0, fin: null, sinDuracion: true, finEnSueno: false, ajustado: start0 !== freeAt };
  }
  if (!inSleep(start0 + dur, sleep)) {
    return { inicio: start0, fin: start0 + dur, sinDuracion: false, finEnSueno: false, ajustado: start0 !== freeAt };
  }
  const wake = nextAwake(start0 + dur, sleep);
  const earlier = wake - dur;
  if (earlier >= freeAt && !inSleep(earlier, sleep)) {
    return { inicio: earlier, fin: wake, sinDuracion: false, finEnSueno: false, ajustado: true };
  }
  const start = wake;
  const end = start + dur;
  return { inicio: start, fin: end, sinDuracion: false, finEnSueno: inSleep(end, sleep), ajustado: true };
}

function lineFrom(cola, titulo, cur, nowMs, sleep) {
  if (!cur) {
    return { cola, titulo, actual: null, libreYa: true, libreEn: nowMs, libreExacta: true, enSueno: false, siguiente: null };
  }
  if (!cur.exacta) {
    return {
      cola,
      titulo,
      actual: { nombre: cur.nombre, exacta: false },
      libreYa: false,
      libreEn: null,
      libreExacta: false,
      enSueno: false,
      siguiente: null,
    };
  }
  const libreYa = cur.fin <= nowMs;
  return {
    cola,
    titulo,
    actual: { nombre: cur.nombre, exacta: true, fin: cur.fin },
    libreYa,
    libreEn: libreYa ? nowMs : cur.fin,
    libreExacta: true,
    enSueno: !libreYa && inSleep(cur.fin, sleep),
    siguiente: null,
  };
}

/**
 * Una línea por constructor conocido, más laboratorio y casa de mascotas.
 * `actuales` traen `exacta` de finDe. `siguientes` ya van en el orden del plan.
 */
export function accountTimeline({ builders, actuales, siguientes, sleep, now, mascotas }) {
  const nowMs = now || Date.now();
  const ctor = (actuales || []).filter((u) => u.queue === "constructor" && !u.extra && !u.done);
  const extras = (actuales || []).filter((u) => u.queue === "constructor" && u.extra && !u.done);
  const lab = (actuales || []).find((u) => u.queue === "laboratorio" && !u.done) || null;
  const pets = (actuales || []).find((u) => u.queue === "mascotas" && !u.done) || null;
  ctor.sort((a, b) => (a.exacta ? a.fin : Infinity) - (b.exacta ? b.fin : Infinity));

  const known = !!(builders && builders.known && typeof builders.total === "number");
  const total = known ? builders.total : ctor.length;
  const lineas = [];
  for (let i = 0; i < total; i += 1) {
    lineas.push(lineFrom("constructor", `Constructor ${i + 1}`, ctor[i] || null, nowMs, sleep));
  }
  for (const cur of ctor.slice(Math.max(0, total))) {
    lineas.push(lineFrom("constructor", "Mejora sin constructor conocido", cur, nowMs, sleep));
  }
  for (const cur of extras) lineas.push(lineFrom("extra", "Constructor extra", cur, nowMs, sleep));
  lineas.push(lineFrom("laboratorio", "Laboratorio", lab, nowMs, sleep));
  if (mascotas) lineas.push(lineFrom("mascotas", "Casa de mascotas", pets, nowMs, sleep));

  const queues = {
    constructor: (siguientes || []).filter((s) => s.queue === "constructor"),
    laboratorio: (siguientes || []).filter((s) => s.queue === "laboratorio"),
    mascotas: (siguientes || []).filter((s) => s.queue === "mascotas"),
  };
  const used = { constructor: 0, laboratorio: 0, mascotas: 0 };
  for (const line of lineas) {
    const key = line.cola === "extra" ? "constructor" : line.cola;
    const next = (queues[key] || [])[used[key]++] || null;
    if (!next) continue;
    if (!line.libreExacta && !line.libreYa) {
      line.siguiente = {
        title: next.title,
        lvl: next.lvl,
        max: next.max,
        inicio: null,
        fin: null,
        sinHora: true,
        sinDuracion: segundosDe(next.id, next.lvl) == null,
        finEnSueno: false,
      };
      continue;
    }
    const plan = scheduleNext(line.libreYa ? nowMs : line.libreEn, segundosDe(next.id, next.lvl), sleep);
    line.siguiente = { title: next.title, lvl: next.lvl, max: next.max, ...plan, sinHora: false };
  }
  return {
    lineas,
    avisoHora: (actuales || []).some((u) => !u.done && !u.exacta),
    totalConocido: known,
  };
}

/** Agenda de cuándo queda libre cada cola. Sin hora exacta no entra en un día. */
export function fleetAgenda(cuentas, opts = {}) {
  const now = opts.now || Date.now();
  const n = opts.dias || 21;
  const p = parts(now);
  const dias = [];
  const index = new Map();
  for (let i = 0; i < n; i += 1) {
    const civil = new Date(Date.UTC(p.year, p.month - 1, p.day + i));
    const noon = atClock(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate(), 12 * 60);
    const key = madridDayKey(noon);
    if (index.has(key)) continue;
    const row = { key, ms: noon, eventos: [] };
    dias.push(row);
    index.set(key, row);
  }
  const sinHora = [];
  const masAdelante = [];
  const today = madridDayKey(now);
  const lastKey = dias.length ? dias[dias.length - 1].key : today;
  for (const cuenta of cuentas || []) {
    for (const line of cuenta.lineas || []) {
      const base = { tag: cuenta.tag, nombre: cuenta.nombre, chip: cuenta.chip || "", titulo: line.titulo };
      if (line.libreYa) {
        const row = index.get(today);
        if (row) row.eventos.push({ ...base, exacta: true, fin: now, ahora: true, enSueno: false });
        continue;
      }
      if (!line.libreExacta || line.libreEn == null) {
        sinHora.push({ ...base, actual: line.actual && line.actual.nombre ? line.actual.nombre : "" });
        continue;
      }
      const ev = { ...base, exacta: true, fin: line.libreEn, ahora: false, enSueno: !!line.enSueno };
      const key = madridDayKey(line.libreEn);
      const row = index.get(key);
      if (row) row.eventos.push(ev);
      else if (key > lastKey) masAdelante.push(ev);
    }
  }
  for (const row of dias) {
    row.eventos.sort((a, b) => a.fin - b.fin || String(a.nombre).localeCompare(String(b.nombre), "es"));
  }
  masAdelante.sort((a, b) => a.fin - b.fin);
  return { dias: dias.filter((row) => row.eventos.length), sinHora, masAdelante };
}
