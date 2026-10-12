import ARMAS from "../data/armas-th.json" with { type: "json" };
import SUPER from "../data/supercargas.json" with { type: "json" };

export const ARMAS_FUENTE = ARMAS.fuente;
export const ARMAS_URL = ARMAS.url;
export const SUPER_FUENTE = SUPER.fuente;
export const SUPER_URL = SUPER.url;
export const SUPER_NOTA = SUPER.nota;

/** Arma del ayuntamiento en ese TH. null si el archivo no trae esa fila. */
export function armaDe(th) {
  const n = Number(th);
  return (ARMAS.armas || []).find((row) => row.th === n) || null;
}

/** Niveles de supercarga de TH18 de ese edificio. Vacío si no tiene. */
export function supercargasDe(id) {
  const row = SUPER.items && SUPER.items[String(id)];
  return row && Array.isArray(row.niveles) ? row.niveles : [];
}

export function textoArma(th) {
  const row = armaDe(th);
  return row ? row.nota : "";
}
