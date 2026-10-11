import BOOK from "../data/costes.json" with { type: "json" };
import { capsMaxFor, categoryKeyFor } from "./progress.js";

export const COST_SOURCE = BOOK.fuente;
export const COST_URL = BOOK.url;

function emptyBag() {
  return {
    oro: 0,
    elixir: 0,
    oscuro: 0,
    muros: 0,
    brillante: 0,
    resplandeciente: 0,
    estelar: 0,
    segConstructor: 0,
    segLaboratorio: 0,
    segMascotas: 0,
    segHerreria: 0,
    sinCoste: 0,
  };
}

function addRow(bag, row, times) {
  const n = (row.n || 0) * times;
  if (row.r === "oro") bag.oro += n;
  else if (row.r === "elixir") bag.elixir += n;
  else if (row.r === "oscuro") bag.oscuro += n;
  else if (row.r === "oro_o_elixir") bag.muros += n;
  else if (row.r === "otros") {
    bag.brillante += (row.b || 0) * times;
    bag.resplandeciente += (row.g || 0) * times;
    bag.estelar += (row.e || 0) * times;
  }
  const seg = (row.s || 0) * times;
  if (row.q === "laboratorio") bag.segLaboratorio += seg;
  else if (row.q === "mascotas") bag.segMascotas += seg;
  else if (row.q === "herreria") bag.segHerreria += seg;
  else bag.segConstructor += seg;
}

export function addBags(a, b) {
  const out = emptyBag();
  for (const key of Object.keys(out)) out[key] = (a[key] || 0) + (b[key] || 0);
  return out;
}

export function levelCost(id, level) {
  const table = BOOK.items[String(id)];
  if (!table) return null;
  return table[String(level)] || null;
}

/** Recurso del siguiente nivel. `oro_o_elixir` entra en oro y en elixir. */
export function usesResource(id, nextLevel, filtro) {
  if (!filtro || filtro === "todos") return true;
  const row = levelCost(id, nextLevel);
  if (!row) return false;
  if (filtro === "oro") return row.r === "oro" || row.r === "oro_o_elixir";
  if (filtro === "elixir") return row.r === "elixir" || row.r === "oro_o_elixir";
  if (filtro === "oscuro") return row.r === "oscuro";
  if (filtro === "otros") return row.r === "otros";
  return true;
}

export function sumLevels(id, fromExclusive, toInclusive, times = 1) {
  const bag = emptyBag();
  const table = BOOK.items[String(id)];
  const steps = Math.max(0, toInclusive - fromExclusive);
  if (!table) {
    bag.sinCoste += steps * times;
    return bag;
  }
  for (let lv = fromExclusive + 1; lv <= toInclusive; lv += 1) {
    const row = table[String(lv)];
    if (!row) bag.sinCoste += times;
    else addRow(bag, row, times);
  }
  return bag;
}

function capRow(index, id, th) {
  const table = index.byId && index.byId.get(String(id));
  return table ? table.get(th) || null : null;
}

/** Piezas propias más las que faltan para el cupo del TH. Sin aldea del constructor. */
export function piecesOf(exp, index, th) {
  const owned = new Map();
  const take = (id, lvl, cnt) => {
    if (id == null || String(id) === "1000001") return;
    const key = String(id);
    if (!owned.has(key)) owned.set(key, []);
    owned.get(key).push({ lvl: lvl || 0, cnt: cnt || 1 });
  };
  for (const sec of ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets", "equipment"]) {
    for (const it of exp[sec] || []) take(it && it.data, it && it.lvl, it && (it.cnt || 1));
  }
  const pieces = [];
  const seen = new Set();
  const consider = (id, fillMissing) => {
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    const row = capRow(index, key, th);
    const max = row && row.max != null ? row.max : capsMaxFor(index, key, th);
    if (max == null) return;
    const list = owned.get(key) || [];
    let have = 0;
    for (const part of list) {
      have += part.cnt;
      pieces.push({ id: key, lvl: part.lvl, max, cnt: part.cnt });
    }
    if (fillMissing && row && row.count != null && row.count > have) {
      pieces.push({ id: key, lvl: 0, max, cnt: row.count - have });
    }
  };
  for (const it of exp.equipment || []) consider(it.data, false);
  for (const id of index.byId ? index.byId.keys() : []) {
    const item = index.items[id];
    if (!item || item.categoria === "hero_equipment") continue;
    const sec = item.seccion_exportacion || "";
    if (sec.endsWith("2") || sec.includes("builder") || String(item.categoria || "").includes("builder")) continue;
    consider(id, true);
  }
  for (const piece of pieces) {
    const item = index.items[piece.id];
    const sec = (item && item.seccion_exportacion) || "buildings";
    piece.categoryKey = categoryKeyFor(index, piece.id, sec);
  }
  return pieces;
}

export function remainingCost(pieces) {
  let total = emptyBag();
  const porCategoria = {};
  for (const piece of pieces || []) {
    if (piece.max == null || piece.lvl >= piece.max) continue;
    const part = sumLevels(piece.id, piece.lvl, piece.max, piece.cnt || 1);
    total = addBags(total, part);
    const key = piece.categoryKey || "otro";
    porCategoria[key] = addBags(porCategoria[key] || emptyBag(), part);
  }
  total.diasConstructor = Math.round((total.segConstructor / 86400) * 10) / 10;
  return { total, porCategoria };
}

export function categoryUses(pieces, filtro) {
  if (!filtro || filtro === "todos") return null;
  const keys = new Set();
  for (const piece of pieces || []) {
    if (piece.max == null || piece.lvl >= piece.max) continue;
    if (usesResource(piece.id, piece.lvl + 1, filtro)) keys.add(piece.categoryKey);
  }
  return keys;
}
