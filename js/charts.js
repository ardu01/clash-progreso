/** Series ya filtradas por día. Cada punto es una exportación real. */
export function lineSeries(named) {
  return (named || []).map((row) => ({
    name: row.name,
    points: (row.points || []).filter((p) => p && p.v != null),
  })).filter((row) => row.points.length);
}

/** Cuentas × categorías. El valor es el % o null si la categoría no está desbloqueada. */
export function heatmap(rows, categories) {
  const cols = categories || [];
  return (rows || []).map((row) => ({
    tag: row.tag,
    nombre: row.nombre,
    cells: cols.map((cat) => {
      const value = row.cats && row.cats[cat.key];
      return { key: cat.key, label: cat.label, value: value == null ? null : value };
    }),
  }));
}

export function radarPoints(cats) {
  const list = (cats || []).filter((c) => c && c.value != null);
  const n = list.length;
  if (!n) return [];
  return list.map((c, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const k = Math.max(0, Math.min(100, c.value)) / 100;
    return {
      key: c.key,
      label: c.label,
      value: c.value,
      x: Math.round((160 + Math.cos(angle) * 100 * k) * 10) / 10,
      y: Math.round((120 + Math.sin(angle) * 100 * k) * 10) / 10,
    };
  });
}

/** Doce colores distintos. El índice es el del roster guardado, no el del orden en pantalla. */
export const ACCOUNT_PALETTE = [
  "#007AFF", "#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA",
  "#FFCC00", "#5856D6", "#FF6482", "#30B0C7", "#A2845E", "#64D2FF",
];

export function accountColor(index) {
  const i = index < 0 ? 0 : index;
  return ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length];
}

/** Una categoría, una barra por cuenta. */
export function groupedByCategory(rows, categories) {
  return (categories || []).map((cat) => ({
    key: cat.key,
    label: cat.label,
    bars: (rows || []).map((row) => ({
      tag: row.tag,
      nombre: row.nombre,
      chip: row.chip || "",
      color: row.color || "",
      label: row.chip || row.nombre,
      value: row.cats && row.cats[cat.key] != null ? row.cats[cat.key] : null,
    })),
  }));
}

/** Barras agrupadas: una cuenta, una barra por categoría. */
export function groupedBars(rows, categories) {
  return (rows || []).map((row) => ({
    tag: row.tag,
    nombre: row.nombre,
    bars: (categories || []).map((cat) => ({
      key: cat.key,
      label: cat.label,
      value: row.cats && row.cats[cat.key] != null ? row.cats[cat.key] : null,
    })),
  }));
}
