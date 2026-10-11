import { marcarOrigen } from "./origen.js";

function clamp(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(0.9, Math.max(0, x));
}

/** El descuento lo escribe Miguel. No se supone el de Supercell. */
export function crearEvento({ nombre, descuentoRecurso, descuentoTiempo, ahora }) {
  return {
    id: "evento-" + (ahora || 0),
    tipo: "evento",
    nombre: String(nombre || "Evento").slice(0, 40),
    descuentoRecurso: clamp(descuentoRecurso),
    descuentoTiempo: clamp(descuentoTiempo),
    ...marcarOrigen("simulacion", "Descuento escrito por ti. No es un dato de Supercell."),
  };
}

export function compararEvento(coste, evento) {
  const base = coste || { oro: 0, elixir: 0, oscuro: 0 };
  const factor = 1 - ((evento && evento.descuentoRecurso) || 0);
  return {
    sin: { oro: base.oro || 0, elixir: base.elixir || 0, oscuro: base.oscuro || 0 },
    con: {
      oro: Math.round((base.oro || 0) * factor),
      elixir: Math.round((base.elixir || 0) * factor),
      oscuro: Math.round((base.oscuro || 0) * factor),
    },
    ...marcarOrigen("simulacion", "El ahorro es el coste de tabla por el descuento que escribes."),
  };
}
