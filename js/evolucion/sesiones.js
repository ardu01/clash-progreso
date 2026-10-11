import { mulberry32 } from "./prng.js";

const DIA = 86400000;
let reloj = null;

function partes(ms) {
  if (!reloj) {
    reloj = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }
  const o = {};
  for (const p of reloj.formatToParts(new Date(ms))) {
    if (p.type !== "literal") o[p.type] = Number(p.value);
  }
  return o;
}

/** Milisegundos UTC de una hora civil en Madrid. */
export function instanteMadrid(year, month, day, minutos) {
  const h = Math.floor(minutos / 60) % 24;
  const min = ((minutos % 60) + 60) % 60;
  let utc = Date.UTC(year, month - 1, day, h, min, 0);
  for (let i = 0; i < 3; i += 1) {
    const p = partes(utc);
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const want = Date.UTC(year, month - 1, day, h, min, 0);
    const delta = want - got;
    if (delta === 0) return utc;
    utc += delta;
  }
  return utc;
}

/** Una sesión 19:00–21:00 cada día. Cada día admite de 0 a 3 sesiones. */
export function semanaDefecto() {
  return [0, 1, 2, 3, 4, 5, 6].map(() => [{ inicio: 19 * 60, minutos: 120 }]);
}

export function materializar(semana, ahora, dias, rng, ruido) {
  const base = partes(ahora);
  const starts = [];
  const ends = [];
  for (let d = 0; d < dias; d += 1) {
    const civil = new Date(Date.UTC(base.year, base.month - 1, base.day + d));
    const y = civil.getUTCFullYear();
    const m = civil.getUTCMonth() + 1;
    const day = civil.getUTCDate();
    const dow = civil.getUTCDay();
    const lunes = dow === 0 ? 6 : dow - 1;
    if (ruido && rng && rng() < ruido.offline) continue;
    const lista = ((semana && semana[lunes]) || []).slice(0, 3);
    for (const ses of lista) {
      let inicioMin = Number(ses.inicio) || 0;
      let dur = Math.max(0, Number(ses.minutos) || 0);
      if (ruido && rng) {
        inicioMin += Math.round(rng() * ruido.retrasoMin);
        dur = Math.max(15, Math.round(dur * (1 - rng() * ruido.acortar)));
      }
      const start = instanteMadrid(y, m, day, ((inicioMin % 1440) + 1440) % 1440);
      const end = start + dur * 60000;
      if (end <= ahora) continue;
      starts.push(Math.max(start, ahora));
      ends.push(end);
    }
  }
  return { starts: Float64Array.from(starts), ends: Float64Array.from(ends) };
}

/** El primero es el horario escrito. El resto mete días apagados, sesiones cortas y retrasos. */
export function escenariosDe(semana, ahora, dias, semilla, cuantos) {
  const n = Math.max(1, cuantos || 1);
  const out = [materializar(semana, ahora, dias, null, null)];
  for (let i = 1; i < n; i += 1) {
    out.push(materializar(semana, ahora, dias, mulberry32((semilla >>> 0) + i * 9973), {
      offline: 0.08,
      acortar: 0.35,
      retrasoMin: 40,
    }));
  }
  return out;
}

export { DIA };
