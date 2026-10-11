import { madridDayKey } from "./format.js";
import { levelCost } from "./costs.js";
import { clasificarHueco, repartirColas } from "./colas.js";

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

let relojMadrid = null;
const partsCache = new Map();
function parts(ms) {
  const hit = partsCache.get(ms);
  if (hit) return hit;
  if (!relojMadrid) {
    relojMadrid = new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  }
  const o = {};
  for (const p of relojMadrid.formatToParts(new Date(ms))) {
    if (p.type !== "literal") o[p.type] = Number(p.value);
  }
  if (partsCache.size > 12000) partsCache.clear();
  partsCache.set(ms, o);
  return o;
}

function offset(ms) {
  const p = parts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms;
}

const clockCache = new Map();
function atClock(year, month, day, minutes) {
  const key = (year * 10000 + month * 100 + day) * 10000 + minutes;
  const hit = clockCache.get(key);
  if (hit != null) return hit;
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  let utc = Date.UTC(year, month - 1, day, h, min, 0) - offset(Date.UTC(year, month - 1, day, h, min, 0));
  utc = Date.UTC(year, month - 1, day, h, min, 0) - offset(utc);
  if (clockCache.size > 12000) clockCache.clear();
  clockCache.set(key, utc);
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

/** Una sesión 19:00–21:00 cada día. Cada día admite de 0 a 3. El índice 0 es el lunes. */
export function semanaPlan() {
  return [0, 1, 2, 3, 4, 5, 6].map(() => [{ inicio: 19 * 60, minutos: 120 }]);
}

function esSueno(v) {
  return !!(v && !Array.isArray(v) && typeof v.desde === "number" && typeof v.hasta === "number");
}

function diaCivil(ms, add) {
  const p = parts(ms);
  const civil = new Date(Date.UTC(p.year, p.month - 1, p.day + (add || 0)));
  return { year: civil.getUTCFullYear(), month: civil.getUTCMonth() + 1, day: civil.getUTCDate(), dow: civil.getUTCDay() };
}

function lunesDe(dow) {
  return dow === 0 ? 6 : dow - 1;
}

function sesionesDelDia(semana, lunes) {
  const lista = Array.isArray(semana) ? semana[lunes] : null;
  return (Array.isArray(lista) ? lista : []).slice(0, 3).map((ses) => {
    const inicio = ((Number(ses && ses.inicio) || 0) % 1440 + 1440) % 1440;
    const minutos = Math.max(0, Math.min(1440, Number(ses && ses.minutos) || 0));
    return { inicio, minutos };
  }).filter((ses) => ses.minutos > 0);
}

const tablasSesion = new WeakMap();

function tablaDe(semana) {
  let t = tablasSesion.get(semana);
  if (!t) {
    t = { dias: new Map(), hueco: null };
    tablasSesion.set(semana, t);
  }
  return t;
}

/** Hueco máximo entre el inicio de una sesión y el inicio de la siguiente, más una hora por el cambio de otoño. */
function huecoMaximoMs(semana) {
  const t = tablaDe(semana);
  if (t.hueco != null) return t.hueco;
  const ancla = Date.parse("2026-01-05T12:00:00Z");
  const lista = [];
  for (let add = 0; add < 16; add += 1) {
    const civil = diaCivil(ancla, add);
    for (const ses of sesionesDelDia(semana, lunesDe(civil.dow))) {
      const start = atClock(civil.year, civil.month, civil.day, ses.inicio);
      lista.push({ start, end: start + ses.minutos * 60000 });
    }
  }
  let max = 0;
  let pares = 0;
  for (let i = 0; i < lista.length; i += 1) {
    let siguiente = null;
    for (let j = 0; j < lista.length; j += 1) {
      if (lista[j].end > lista[i].end) { siguiente = lista[j]; break; }
    }
    if (!siguiente) continue;
    pares += 1;
    max = Math.max(max, siguiente.start - lista[i].start);
  }
  t.hueco = pares ? max + 3600000 : Infinity;
  return t.hueco;
}

function listaDesde(ms, semana) {
  const t = tablaDe(semana);
  const p = parts(ms);
  const key = p.year * 10000 + p.month * 100 + p.day;
  const hit = t.dias.get(key);
  if (hit) return hit;
  const lista = [];
  for (let add = 0; add < 21; add += 1) {
    const civil = diaCivil(ms, add);
    for (const ses of sesionesDelDia(semana, lunesDe(civil.dow))) {
      const start = atClock(civil.year, civil.month, civil.day, ses.inicio);
      lista.push({ start, end: start + ses.minutos * 60000 });
    }
  }
  t.dias.set(key, lista);
  return lista;
}

/** Próximo tramo de sesión que aún no ha terminado. null si en 21 días no hay ninguno. */
export function proximaSesion(ms, semana) {
  const lista = listaDesde(ms, semana);
  for (let i = 0; i < lista.length; i += 1) {
    if (lista[i].end > ms) return lista[i];
  }
  return null;
}

function sesionSiguiente(finSesion, semana) {
  return proximaSesion(finSesion, semana);
}

/**
 * El plan empieza dentro de una sesión. Si la mejora cabe, termina antes
 * de que abra la sesión siguiente. Si dura más que ese hueco, empieza
 * igual y `pasaSesion` lo dice.
 */
function cabeAntesDeLaSiguiente(inicio, dur, semana) {
  const ses = proximaSesion(inicio, semana);
  if (!ses || inicio < ses.start || inicio >= ses.end) return false;
  const siguiente = sesionSiguiente(ses.end, semana);
  if (!siguiente) return true;
  return inicio + dur <= siguiente.start;
}

function scheduleNextSesion(freeAt, durationSec, semana) {
  const dur = typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec >= 0
    ? durationSec * 1000
    : null;
  const ses = proximaSesion(freeAt, semana);
  if (!ses) {
    return { inicio: freeAt, fin: dur == null ? null : freeAt + dur, sinDuracion: dur == null, finEnSueno: false, pasaSesion: true, ajustado: false };
  }
  const start0 = Math.max(freeAt, ses.start);
  if (dur == null) {
    return { inicio: start0, fin: null, sinDuracion: true, finEnSueno: false, pasaSesion: false, ajustado: start0 !== freeAt };
  }
  if (dur > huecoMaximoMs(semana)) {
    return { inicio: start0, fin: start0 + dur, sinDuracion: false, finEnSueno: false, pasaSesion: true, ajustado: start0 !== freeAt };
  }
  if (cabeAntesDeLaSiguiente(start0, dur, semana)) {
    return { inicio: start0, fin: start0 + dur, sinDuracion: false, finEnSueno: false, pasaSesion: false, ajustado: start0 !== freeAt };
  }
  let cursor = ses;
  for (let i = 0; i < 21; i += 1) {
    const siguiente = sesionSiguiente(cursor.end, semana);
    if (!siguiente) break;
    if (siguiente.start >= freeAt && cabeAntesDeLaSiguiente(siguiente.start, dur, semana)) {
      return { inicio: siguiente.start, fin: siguiente.start + dur, sinDuracion: false, finEnSueno: false, pasaSesion: false, ajustado: true };
    }
    cursor = siguiente;
  }
  return { inicio: start0, fin: start0 + dur, sinDuracion: false, finEnSueno: false, pasaSesion: true, ajustado: start0 !== freeAt };
}

/**
 * La mejora en curso conserva su fin. Con un sueño, la siguiente no
 * empieza ni acaba dentro de ese tramo si cabe despierta. Con una semana
 * de sesiones, el plan usa esas sesiones y no el sueño.
 */
export function scheduleNext(freeAt, durationSec, sleep) {
  if (Array.isArray(sleep)) return scheduleNextSesion(freeAt, durationSec, sleep);
  const dur = typeof durationSec === "number" && Number.isFinite(durationSec) && durationSec >= 0
    ? durationSec * 1000
    : null;
  const start0 = nextAwake(freeAt, esSueno(sleep) ? sleep : null);
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
  const cls = clasificarHueco(cur, nowMs);
  if (!cur || (cur.done && !cur.nombre)) {
    return {
      cola, titulo, actual: null, libreYa: true, libreEn: nowMs, libreExacta: true,
      enSueno: false, siguiente: null, clase: cls.clase,
    };
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
      clase: "real",
    };
  }
  return {
    cola,
    titulo,
    actual: { nombre: cur.nombre, exacta: true, fin: cur.fin },
    libreYa: cls.libreYa,
    libreEn: cls.libreYa ? nowMs : cur.fin,
    libreExacta: true,
    enSueno: !cls.libreYa && inSleep(cur.fin, sleep),
    siguiente: null,
    clase: cls.clase,
  };
}

/**
 * Una línea por constructor conocido, más laboratorio y casa de mascotas.
 * `actuales` traen `exacta` de finDe. `siguientes` ya van en el orden del plan.
 */
export function accountTimeline({ builders, actuales, siguientes, sleep, now, mascotas }) {
  const nowMs = now || Date.now();
  const extras = (actuales || []).filter((u) => u.queue === "constructor" && u.extra && !u.done);
  const partes = repartirColas(actuales, { builders, now: nowMs, mascotas: !!mascotas });
  const lineas = [];
  for (const slot of partes.constructores) {
    lineas.push(lineFrom(slot.cola, slot.titulo, slot.cur, nowMs, sleep));
  }
  for (const cur of extras) lineas.push(lineFrom("extra", "Constructor extra", cur, nowMs, sleep));
  lineas.push(lineFrom(partes.laboratorio.cola, partes.laboratorio.titulo, partes.laboratorio.cur, nowMs, sleep));
  if (partes.mascotas) {
    lineas.push(lineFrom(partes.mascotas.cola, partes.mascotas.titulo, partes.mascotas.cur, nowMs, sleep));
  }

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
    avisoHora: partes.avisoHora,
    totalConocido: partes.known,
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
      const base = {
        tag: cuenta.tag,
        nombre: cuenta.nombre,
        chip: cuenta.chip || "",
        titulo: line.titulo,
        clase: line.clase || "real",
        desactualizada: !!cuenta.desactualizada,
      };
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

function horaFranja(ms) {
  const p = parts(ms);
  const h = String(p.hour).padStart(2, "0");
  const next = String((p.hour + 1) % 24).padStart(2, "0");
  return { hour: p.hour, desde: `${h}:00`, hasta: `${next}:00`, day: madridDayKey(ms) };
}

/**
 * Finalizaciones con hora real, todavía en curso.
 * Una cuenta desactualizada o un temporizador ya vencido no entra: no es una hora confirmada.
 */
export function finalesEn(cuentas, opts = {}) {
  const now = opts.now || Date.now();
  const modo = opts.modo || "24h";
  const limite = modo === "24h" ? now + 86400000 : now + 7 * 86400000;
  const eventos = [];
  for (const cuenta of cuentas || []) {
    if (cuenta.desactualizada) continue;
    for (const line of cuenta.lineas || []) {
      if (line.clase === "estimado" || line.libreYa || !line.libreExacta || line.libreEn == null) continue;
      if (line.libreEn <= now || line.libreEn > limite) continue;
      eventos.push({
        tag: cuenta.tag,
        nombre: cuenta.nombre,
        chip: cuenta.chip || "",
        titulo: line.titulo,
        fin: line.libreEn,
        clase: "real",
      });
    }
  }
  eventos.sort((a, b) => a.fin - b.fin || String(a.nombre).localeCompare(String(b.nombre), "es"));
  return eventos;
}

export function franjasDe(eventos) {
  const map = new Map();
  for (const ev of eventos || []) {
    const f = horaFranja(ev.fin);
    const key = `${f.day}-${f.hour}`;
    if (!map.has(key)) map.set(key, { key, day: f.day, desde: f.desde, hasta: f.hasta, ms: ev.fin, eventos: [], tags: new Set() });
    const g = map.get(key);
    g.eventos.push(ev);
    g.tags.add(ev.tag);
  }
  return [...map.values()].map((g) => ({
    key: g.key,
    day: g.day,
    desde: g.desde,
    hasta: g.hasta,
    ms: g.ms,
    eventos: g.eventos,
    cuentas: g.tags.size,
  }));
}

export function fraseFranja(g) {
  const n = g.cuentas;
  const cuentas = n === 1 ? "1 cuenta" : `${n} cuentas`;
  return `${cuentas} entre ${g.desde} y ${g.hasta}: una sesión`;
}
