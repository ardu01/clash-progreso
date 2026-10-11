/** Resumen de lo visto entre importaciones. No afirma el minuto de una mejora. */

export function entradaImportacion({ tag, nombre, at, niveles, thAntes, thDespues, mejoras }) {
  const quien = nombre || tag || "la cuenta";
  const partes = [`Visto en la importación de ${quien}.`];
  if (niveles) partes.push(`${niveles} niveles vistos entre importaciones.`);
  if (thAntes != null && thDespues != null && thDespues > thAntes) {
    partes.push(`El ayuntamiento pasó de TH${thAntes} a TH${thDespues}.`);
  }
  if (mejoras) partes.push(`${mejoras} mejoras de la exportación anterior ya no tenían temporizador. No se afirma la hora.`);
  return {
    id: "diario-" + (tag || "flota") + "-" + (at || 0),
    tipo: "diario",
    tag: tag || null,
    en: at || 0,
    texto: partes.join(" "),
    origen: "importado",
  };
}

export function notaManual({ texto, tag, at }) {
  const limpio = String(texto || "").trim().slice(0, 180);
  if (!limpio) return null;
  return {
    id: "nota-" + (at || 0),
    tipo: "diario",
    tag: tag || null,
    en: at || 0,
    texto: limpio,
    origen: "manual",
  };
}

export function resumenDiario(entradas) {
  const list = entradas || [];
  return {
    total: list.length,
    importaciones: list.filter((e) => e && e.origen === "importado").length,
    notas: list.filter((e) => e && e.origen === "manual").length,
  };
}
