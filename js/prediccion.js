import { marcarOrigen } from "./origen.js";

export const FACTORES = { peor: 0.7, probable: 1, mejor: 1.25 };
export const HORIZONTES = [30, 90, 180, 365];

const DIA = 86400000;

/**
 * Tres fechas a partir del ritmo ya medido.
 * Con menos de dos importaciones no hay fecha.
 */
export function predecirNiveles({ ritmo, muestra, restante, ahora }) {
  const marca = marcarOrigen("prediccion");
  if (!(muestra >= 2) || !(ritmo > 0) || restante == null || !(restante >= 0)) {
    return {
      ...marca,
      pocosDatos: true,
      frase: "Pocos datos. Hace falta más de una importación por cuenta.",
      probable: null,
      mejor: null,
      peor: null,
      muestra: muestra || 0,
    };
  }
  const fechas = {};
  for (const [clave, factor] of Object.entries(FACTORES)) {
    const semanas = restante / (ritmo * factor);
    fechas[clave] = (ahora || 0) + semanas * 7 * DIA;
  }
  return {
    ...marca,
    pocosDatos: false,
    frase: "Predicción. El ritmo sale de las importaciones.",
    muestra,
    ritmo,
    ...fechas,
  };
}

export function metaFlota(cuentas, meta) {
  const n = Math.max(1, Number(meta && meta.n) || 5);
  const th = Math.max(1, Number(meta && meta.th) || 15);
  const ya = (cuentas || []).filter((cuenta) => cuenta && cuenta.th != null && cuenta.th >= th).length;
  const faltan = Math.max(0, n - ya);
  return {
    n,
    th,
    ya,
    faltan,
    frase: faltan ? `${ya} de ${n} en TH${th}.` : `${n} cuentas ya están en TH${th}.`,
  };
}

/** A 180 y 365 días solo dice si cae dentro, sin tratar la fecha como un día seguro. */
export function enHorizonte(fecha, ahora, dias) {
  if (fecha == null) return "sin fecha";
  const dentro = fecha <= (ahora || 0) + dias * DIA;
  if (dias >= 180) return dentro ? "dentro, solo para comparar" : "más allá, solo para comparar";
  return dentro ? "dentro" : "más allá";
}
