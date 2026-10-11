import { marcarOrigen } from "./origen.js";

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

/**
 * Copia el escenario y aplica descuento, constructores y horas de juego.
 * No escribe exportaciones, planes ni provisionales. No hay objetos mágicos.
 * El coste de subir el ayuntamiento, si no llega de otro módulo, no se inventa.
 */
export function simular(entrada) {
  const base = entrada || {};
  const recurso = clamp(base.descuentoRecurso, 0, 0.9);
  const tiempo = clamp(base.descuentoTiempo, 0, 0.9);
  const horas = clamp(base.horasJuego == null ? 90 : base.horasJuego, 60, 120);
  const constructores = Math.max(1, Math.round(Number(base.constructores) || 1));
  const seg = Math.max(0, Number(base.segConstructor) || 0) * (1 - tiempo);
  const dias = seg / constructores / 86400;
  const factor = 1 - recurso;
  const marca = marcarOrigen(
    "simulacion",
    "Sin objetos mágicos. El descuento y las horas los escribes tú. El constructor sigue fuera de la sesión; el lanzamiento cabe en las horas de juego.",
  );
  return {
    ...marca,
    objetosMagicos: false,
    constructores,
    horas,
    descuentoRecurso: recurso,
    descuentoTiempo: tiempo,
    dias: Math.round(dias * 10) / 10,
    lanzamientosDia: Math.floor((horas * 60) / 2),
    costeTh: base.costeTh || null,
    coste: {
      oro: Math.round((Number(base.oro) || 0) * factor),
      elixir: Math.round((Number(base.elixir) || 0) * factor),
      oscuro: Math.round((Number(base.oscuro) || 0) * factor),
    },
  };
}
