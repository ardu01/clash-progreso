import { HEROES_FUERA } from "./plan.js";

const ATAQUE = ["laboratorio", "ejercito_edif", "heroes"];
const DEFENSA = ["defensas", "trampas"];

function media(valores) {
  const xs = (valores || []).filter((n) => n != null && Number.isFinite(n));
  if (!xs.length) return null;
  return Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;
}

/**
 * Ataque frente a defensa, y las categorías por debajo del 50 %.
 * En C1 los héroes no entran y no se listan como lo que frena la cuenta.
 */
export function indiceEquilibrio({ tag, cats, estrategia }) {
  const mapa = cats || {};
  const heroesFuera = tag === HEROES_FUERA;
  const ataqueKeys = heroesFuera ? ATAQUE.filter((key) => key !== "heroes") : ATAQUE;
  const ataque = media(ataqueKeys.map((key) => mapa[key]));
  const defensa = media(DEFENSA.map((key) => mapa[key]));
  const gap = ataque == null || defensa == null ? null : Math.abs(ataque - defensa);
  let indice = gap == null ? null : Math.max(0, Math.round(100 - gap));
  if (estrategia === "maxear") {
    const vals = Object.entries(mapa)
      .filter(([key, value]) => value != null && !(heroesFuera && key === "heroes"))
      .map(([, value]) => value);
    indice = media(vals);
    if (indice != null) indice = Math.round(indice);
  }
  const bajos = [];
  for (const [key, value] of Object.entries(mapa)) {
    if (value == null || value >= 50) continue;
    if (heroesFuera && key === "heroes") continue;
    bajos.push({ key, pct: value });
  }
  bajos.sort((a, b) => a.pct - b.pct);
  return {
    indice,
    ataque,
    defensa,
    bajos,
    heroesFuera,
    frase: heroesFuera ? "En C1 los héroes no entran en este índice." : "Ataque frente a defensa.",
  };
}
