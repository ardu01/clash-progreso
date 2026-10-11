/** Etiqueta de dónde sale un dato. No calcula niveles ni porcentajes. */

export const ORIGENES = ["importado", "manual", "provisional", "plan", "simulacion", "prediccion"];

const FRASES = {
  importado: "Importado",
  manual: "Escrito a mano",
  provisional: "Marcado por ti. La exportación aún no lo confirma.",
  plan: "Plan",
  simulacion: "Simulación. No cambia la aldea.",
  prediccion: "Predicción",
};

export function marcarOrigen(origen, hipotesis = "") {
  if (!ORIGENES.includes(origen)) return null;
  const hip = String(hipotesis || "").trim();
  return hip ? { origen, hipotesis: hip } : { origen };
}

export function fraseOrigen(marca) {
  if (!marca || !ORIGENES.includes(marca.origen)) return "";
  const base = FRASES[marca.origen];
  return marca.hipotesis ? `${base}. ${marca.hipotesis}` : base;
}

/** null si el número mezcla fuentes. No se pueden sumar sin decirlo. */
export function mismoOrigen(partes) {
  const list = partes || [];
  if (!list.length) return null;
  const origen = list[0] && list[0].origen;
  if (!ORIGENES.includes(origen)) return null;
  for (const p of list) {
    if (!p || p.origen !== origen) return null;
  }
  return origen;
}
