import { madridDayKey } from "./format.js";
import { diffExports } from "./import.js";

function weekKey(ms) {
  const day = madridDayKey(ms);
  const [y, m, d] = day.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const date = new Date(utc);
  const weekDay = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekDay + 3);
  const first = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstWeek = (first.getUTCDay() + 6) % 7;
  first.setUTCDate(first.getUTCDate() - firstWeek + 3);
  const week = 1 + Math.round((date - first) / 604800000);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Pares de importaciones consecutivas de una cuenta, de la más antigua a la más nueva. */
export function historyPairs(exports, index) {
  const rows = (exports || []).slice().sort((a, b) => a.timestamp - b.timestamp);
  const out = [];
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const next = rows[i];
    const diff = diffExports(prev, next, index, next.timestamp * 1000);
    out.push({
      at: next.timestamp * 1000,
      day: madridDayKey(next.timestamp * 1000),
      week: weekKey(next.timestamp * 1000),
      levels: diff.levelDelta > 0 ? diff.levelDelta : 0,
      rows: diff.rows,
      thFrom: diff.thFrom,
      thTo: diff.thTo,
    });
  }
  return out;
}

/** Niveles subidos por semana de Madrid y la media del tramo. */
export function weeklyPace(pairs) {
  const byWeek = new Map();
  for (const pair of pairs || []) {
    if (!pair.levels) continue;
    byWeek.set(pair.week, (byWeek.get(pair.week) || 0) + pair.levels);
  }
  const weeks = [...byWeek.entries()].map(([week, levels]) => ({ week, levels }));
  const total = weeks.reduce((s, w) => s + w.levels, 0);
  const span = pairs && pairs.length ? new Set(pairs.map((p) => p.week)).size : 0;
  return {
    weeks,
    total,
    ritmo: span > 0 ? Math.round((total / span) * 10) / 10 : null,
  };
}

/** Semanas de Madrid seguidas, hasta la última importación, con alguna subida. */
export function streakWeeks(pairs) {
  const weeks = [];
  const seen = new Set();
  for (const pair of pairs || []) {
    if (seen.has(pair.week)) continue;
    seen.add(pair.week);
    weeks.push({ week: pair.week, levels: 0 });
  }
  for (const pair of pairs || []) {
    const row = weeks.find((w) => w.week === pair.week);
    if (row) row.levels += pair.levels;
  }
  let n = 0;
  for (let i = weeks.length - 1; i >= 0; i -= 1) {
    if (weeks[i].levels <= 0) break;
    n += 1;
  }
  return n;
}

export function achievements(view, pairs) {
  const alMaximo = [];
  if (view && view.cats) {
    for (const [key, row] of Object.entries(view.cats)) {
      if (row && row.pct != null && row.num != null && row.den && row.num >= row.den) alMaximo.push(key);
    }
  }
  const thCompletado = !!(view && view.media != null && alMaximo.length && view.cats
    && Object.values(view.cats).filter((row) => row && row.pct != null).every((row) => row.num >= row.den));
  return {
    alMaximo,
    thCompletado,
    racha: streakWeeks(pairs),
  };
}
