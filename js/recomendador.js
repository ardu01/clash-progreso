import { dayHeading } from "./format.js";
import { proximaSesion, semanaPlan } from "./schedule.js";

const COLAS = new Set(["constructor", "laboratorio", "mascotas"]);

const horaFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Hora en Madrid, 24 h, sin fecha. */
export function horaMadrid(ms) {
  const parts = horaFmt.formatToParts(new Date(ms));
  const h = (parts.find((p) => p.type === "hour") || {}).value || "00";
  const m = (parts.find((p) => p.type === "minute") || {}).value || "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function ficha(step, lane) {
  return {
    laneId: lane.id,
    cola: lane.cola,
    hueco: lane.titulo || lane.id,
    id: step.id,
    title: step.title,
    fromLvl: step.fromLvl,
    toLvl: step.toLvl,
    instance: step.instance,
    queue: step.queue,
    key: step.key,
    seconds: step.seconds,
    inicio: step.inicio,
    fin: step.fin,
    categoryKey: step.categoryKey,
    noCabe: !!step.noCabe,
    motivo: step.motivo || "",
  };
}

function linea(step, hueco) {
  return {
    laneId: step.laneId,
    hueco,
    id: step.id,
    title: step.title,
    fromLvl: step.fromLvl,
    toLvl: step.toLvl,
    inicio: step.inicio,
    cola: step.queue,
  };
}

/**
 * Una mejora por hueco que queda libre antes de que acabe la próxima sesión,
 * y lo que toca iniciar en cada sesión de los próximos días.
 * No mira el oro guardado de la cuenta. Si el coste no entra en los almacenes,
 * ese paso ya viene bloqueado y no se inicia.
 */
export function recomendar(roadmap, semana, now) {
  const week = Array.isArray(semana) ? semana : semanaPlan();
  const momento = now || (roadmap && roadmap.now) || Date.now();
  const sesion = proximaSesion(momento, week);
  const orden = (roadmap && roadmap.orden) || [];
  const porLane = new Map();
  for (const step of orden) {
    if (!step || !step.laneId || step.inicio == null) continue;
    if (!porLane.has(step.laneId)) porLane.set(step.laneId, []);
    porLane.get(step.laneId).push(step);
  }
  for (const lista of porLane.values()) lista.sort((a, b) => a.inicio - b.inicio || String(a.laneId).localeCompare(String(b.laneId)));
  const ahora = [];
  for (const lane of (roadmap && roadmap.lanes) || []) {
    if (!lane || !COLAS.has(lane.cola) || lane.blocked) continue;
    const libre = lane.libreEn != null ? lane.libreEn : (lane.libreYa ? momento : Infinity);
    if (sesion) {
      if (libre >= sesion.end) continue;
    } else if (libre > momento) continue;
    const paso = (porLane.get(lane.id) || []).find((s) => !s.provisional && !s.noCabe && (sesion ? s.inicio < sesion.end : s.inicio <= momento));
    if (!paso) continue;
    ahora.push(ficha(paso, lane));
  }
  return { ahora, sesiones: proximasSesiones(orden, roadmap && roadmap.lanes, week, momento, 7), sesion };
}

function proximasSesiones(orden, lanes, week, now, dias) {
  const titulo = new Map((lanes || []).map((lane) => [lane.id, lane.titulo || lane.id]));
  const limite = now + dias * 86400000;
  const out = [];
  let cursor = now;
  for (let guard = 0; guard < 21; guard += 1) {
    const ses = proximaSesion(cursor, week);
    if (!ses || ses.start >= limite) break;
    const vistos = new Set();
    const huecos = [];
    const candidatos = [];
    for (const step of orden || []) {
      if (!step || step.provisional || step.noCabe || step.inicio == null || step.inicio < now) continue;
      if (step.inicio < ses.start || step.inicio >= ses.end) continue;
      candidatos.push(step);
    }
    candidatos.sort((a, b) => a.inicio - b.inicio || String(a.laneId).localeCompare(String(b.laneId)));
    for (const step of candidatos) {
      if (vistos.has(step.laneId)) continue;
      vistos.add(step.laneId);
      huecos.push(linea(step, titulo.get(step.laneId) || step.laneId));
    }
    if (huecos.length) {
      out.push({
        start: ses.start,
        end: ses.end,
        dia: dayHeading(ses.start, now),
        hora: `${horaMadrid(ses.start)}–${horaMadrid(ses.end)}`,
        huecos,
      });
    }
    cursor = ses.end;
  }
  return out;
}
