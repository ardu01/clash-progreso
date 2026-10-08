import { CATEGORIES, analyze, categoryItems, itemName } from "./progress.js";

/**
 * Filas que pinta Progreso. Salen de categoryItems (la misma función que el
 * detalle) y, para Muros, de los niveles que ya pinta la lista «Por nivel».
 */
export function progressRows(exp, index) {
  const view = analyze(exp, index);
  const th = view.th;
  const rows = [];
  for (const cat of CATEGORIES) {
    if (cat.key === "muros") {
      const hist = (view.walls && view.walls.hist) || [];
      const max = view.walls ? view.walls.max : null;
      for (const h of hist) {
        if (!h.cnt) continue;
        rows.push({
          categoryKey: "muros",
          id: "1000010",
          lvl: h.lvl,
          cnt: h.cnt,
          max,
          name: "Muro",
          overMax: max != null && h.lvl > max,
        });
      }
      continue;
    }
    for (const it of categoryItems(exp, index, cat.key, th)) {
      rows.push({ ...it, categoryKey: cat.key });
    }
  }
  return rows;
}

export function rowName(row, index) {
  if (!row) return "";
  if (row.name) return row.name;
  if (row.capsOnly) return row.capsName || "Ítem";
  if (row.unknown) return "Sin identificar";
  const meta = index && index.items ? index.items[String(row.id)] : null;
  if (!meta || meta.estado === "sin_identificar") return "Sin identificar";
  return itemName(meta) || "Ítem";
}

/** Al máximo: nivel ≥ máximo conocido. Un overMax cuenta como máximo. */
export function isAtMax(row) {
  if (!row || row.max == null) return false;
  const lvl = row.lvl == null || Number.isNaN(row.lvl) ? 0 : row.lvl;
  return lvl >= row.max;
}

/** Pendiente: todavía no está al máximo (incluye nivel 0 y huecos). */
export function isPending(row) {
  return !isAtMax(row);
}

function nameMatches(row, query, index) {
  const q = String(query || "").trim().toLocaleLowerCase("es");
  if (!q) return true;
  const name = rowName(row, index).toLocaleLowerCase("es");
  const id = String(row.id || "");
  return name.includes(q) || id.includes(q);
}

function statusMatches(row, status) {
  if (status === "pendientes") return isPending(row);
  if (status === "maximo") return isAtMax(row);
  return true;
}

/** Mismas filas que la lista. El contador de un chip es este filtro con esa categoría. */
export function applyFilter(rows, { category = "todas", status = "todos", query = "", index } = {}) {
  return rows.filter((row) => {
    if (category && category !== "todas" && row.categoryKey !== category) return false;
    if (!statusMatches(row, status)) return false;
    if (!nameMatches(row, query, index)) return false;
    return true;
  });
}

export function chipCounts(rows, opts = {}) {
  const counts = { todas: 0 };
  for (const cat of CATEGORIES) counts[cat.key] = 0;
  const visible = applyFilter(rows, { ...opts, category: "todas" });
  counts.todas = visible.length;
  for (const row of visible) {
    if (counts[row.categoryKey] != null) counts[row.categoryKey] += 1;
  }
  return counts;
}

/** Menor % primero entre pendientes. El orden de categorías no se reordena por «peor». */
export function sortFilterRows(rows) {
  return rows.slice().sort((a, b) => {
    const pa = a.max ? (a.lvl || 0) / a.max : 1;
    const pb = b.max ? (b.lvl || 0) / b.max : 1;
    if (pa !== pb) return pa - pb;
    return String(a.categoryKey).localeCompare(String(b.categoryKey));
  });
}
