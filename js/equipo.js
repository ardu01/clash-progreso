import { levelCost } from "./costs.js";
import { capsMaxFor, itemName } from "./progress.js";

/** Nombres del apartado. Reluciente y estrellada son la mena g y la e del libro. */
export const ORE = {
  brillante: "Brillante",
  reluciente: "Reluciente",
  estrellada: "Estrellada",
};

function emptyOre() {
  return { brillante: 0, reluciente: 0, estrellada: 0, sinCoste: 0, piezas: 0 };
}

function unlockThOf(index, id) {
  const map = index.byId && index.byId.get(String(id));
  if (!map) return null;
  const ths = [...map.keys()].filter((th) => {
    const cap = map.get(th);
    return cap && cap.max != null;
  }).sort((a, b) => a - b);
  return ths.length ? ths[0] : null;
}

function menaDe(id, nivel) {
  const row = levelCost(id, nivel);
  if (!row || row.r !== "otros") return null;
  return {
    brillante: row.b || 0,
    reluciente: row.g || 0,
    estrellada: row.e || 0,
  };
}

function pendientesDe(id, lvl, max) {
  const out = [];
  if (max == null || lvl == null || lvl >= max) return out;
  for (let nivel = lvl + 1; nivel <= max; nivel += 1) {
    out.push({ nivel, mena: menaDe(id, nivel) });
  }
  return out;
}

/**
 * Catálogo del equipamiento de la aldea principal, cruzado con la exportación.
 * Bloqueada: no está en el JSON, o este TH no le da tope. No se inventa el nivel.
 */
export function equipmentRows(exp, index, th) {
  const owned = new Map();
  for (const it of (exp && exp.equipment) || []) {
    if (!it || it.data == null) continue;
    owned.set(String(it.data), it.lvl || 0);
  }
  const rows = [];
  for (const [id, item] of Object.entries((index && index.items) || {})) {
    if (!item || item.categoria !== "hero_equipment") continue;
    const sec = item.seccion_exportacion || "";
    if (sec.endsWith("2") || sec.includes("builder")) continue;
    const inExport = owned.has(id);
    const identified = item.estado !== "sin_identificar";
    const max = identified ? capsMaxFor(index, id, th) : null;
    const lvl = inExport ? owned.get(id) : null;
    const bloqueado = !inExport || max == null;
    rows.push({
      id,
      nombre: itemName(item) || item.nombre_en || "Pieza",
      nombreEn: item.nombre_en || "",
      heroe: item.heroe || "",
      rareza: item.rareza || "",
      lvl,
      max,
      unlockTh: max == null ? unlockThOf(index, id) : null,
      bloqueado,
      inExport,
      overMax: max != null && lvl != null && lvl > max,
      pendientes: bloqueado ? [] : pendientesDe(id, lvl, max),
    });
  }
  rows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || (a.id < b.id ? -1 : 1));
  return rows;
}

export function applyEqFilter(rows, filtro = {}, elegidos = []) {
  const set = new Set(elegidos || []);
  const rareza = filtro.rareza && filtro.rareza !== "todos" ? filtro.rareza : "";
  const heroe = filtro.heroe && filtro.heroe !== "todos" ? filtro.heroe : "";
  return (rows || []).filter((row) => {
    if (rareza && row.rareza !== rareza) return false;
    if (heroe && row.heroe !== heroe) return false;
    if (row.bloqueado && !filtro.bloqueados) return false;
    if (filtro.ocultar && set.has(row.id)) return false;
    return true;
  });
}

export function groupByHero(rows, heroes) {
  const groups = (heroes || []).map((hero) => ({
    nombreEn: hero.nombreEn,
    nombre: hero.nombre,
    id: hero.id,
    piezas: [],
  }));
  const by = new Map(groups.map((g) => [g.nombreEn, g]));
  const other = { nombreEn: "", nombre: "Héroe sin identificar", id: "", piezas: [] };
  for (const row of rows || []) {
    const group = by.get(row.heroe) || other;
    group.piezas.push(row);
  }
  return groups.concat(other).filter((g) => g.piezas.length);
}

/** Suma para maxear. Las bloqueadas no entran. Un nivel sin fila no cuenta como cero. */
export function oreTotal(rows) {
  const bag = emptyOre();
  for (const row of rows || []) {
    if (row.bloqueado || row.max == null || row.lvl == null) continue;
    bag.piezas += 1;
    for (const step of row.pendientes || []) {
      if (!step.mena) {
        bag.sinCoste += 1;
        continue;
      }
      bag.brillante += step.mena.brillante;
      bag.reluciente += step.mena.reluciente;
      bag.estrellada += step.mena.estrellada;
    }
  }
  return bag;
}

export function addOre(a, b) {
  const left = a || emptyOre();
  const right = b || emptyOre();
  return {
    brillante: left.brillante + right.brillante,
    reluciente: left.reluciente + right.reluciente,
    estrellada: left.estrellada + right.estrellada,
    sinCoste: left.sinCoste + right.sinCoste,
    piezas: left.piezas + right.piezas,
  };
}

export function fleetOre(accounts) {
  let total = emptyOre();
  const filas = [];
  for (const account of accounts || []) {
    const bag = oreTotal(account.piezas);
    total = addOre(total, bag);
    filas.push({ tag: account.tag, nombre: account.nombre, th: account.th, bag });
  }
  return { total, filas };
}
