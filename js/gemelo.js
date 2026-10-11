import { HEROES_FUERA } from "./plan.js";
import { marcarOrigen } from "./origen.js";

const CAT = {
  defensas: "Defensas",
  laboratorio: "Laboratorio",
  ejercito_edif: "Ejército",
  mascotas: "Mascotas",
  heroes: "Héroes",
  trampas: "Trampas",
  recursos: "Recursos",
  muros: "Muros",
};

export function nombreCat(key) {
  return CAT[key] || key;
}

/** La cuenta con la media más baja y las categorías que más le faltan. C1 no señala héroes. */
export function cuentaRezagada(cuentas) {
  const conMedia = (cuentas || []).filter((cuenta) => cuenta && cuenta.media != null && !cuenta.desactualizada);
  conMedia.sort((a, b) => a.media - b.media || String(a.nombre || a.tag).localeCompare(String(b.nombre || b.tag), "es"));
  const cuenta = conMedia[0];
  if (!cuenta) return null;
  const faltas = Object.entries(cuenta.cats || {})
    .filter(([key, pct]) => pct != null && pct < 80 && !(cuenta.tag === HEROES_FUERA && key === "heroes"))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, pct]) => ({ key, pct, label: nombreCat(key) }));
  return { tag: cuenta.tag, nombre: cuenta.nombre || cuenta.tag, media: cuenta.media, th: cuenta.th, faltas };
}

export function crearGemelo({ tag, th, estrategia, constructores, sueno, ingresos, ahora }) {
  const marca = marcarOrigen(
    "simulacion",
    ingresos == null ? "Sin oro en la exportación. Si anotas un ingreso, es una hipótesis." : "Ingreso escrito a mano.",
  );
  return {
    id: "gemelo-" + tag + "-" + (ahora || 0),
    tipo: "gemelo",
    tag,
    th: th == null ? null : th,
    estrategia: estrategia || "equilibrada",
    constructores: constructores || null,
    sueno: sueno || { desde: "23:00", hasta: "07:00" },
    ingresos: ingresos == null ? null : ingresos,
    convertidoEnPlan: null,
    ...marca,
  };
}

/**
 * Pasa el gemelo al documento de plan. No crea provisionales ni toca un temporizador.
 */
export function convertirEnPlan(gemelo) {
  if (!gemelo || !gemelo.tag) return { ok: false, motivo: "Sin gemelo." };
  if (gemelo.pisaTimer) return { ok: false, motivo: "Hay una mejora con temporizador. No se toca." };
  const heroes = gemelo.tag === HEROES_FUERA ? false : gemelo.estrategia === "maxear";
  return {
    ok: true,
    tag: gemelo.tag,
    plan: {
      modo: gemelo.estrategia === "rush" ? "rushear" : "maxear",
      th: gemelo.th == null ? null : gemelo.th,
      ataque: gemelo.estrategia === "equilibrada" || gemelo.estrategia === "rush",
      defensa: gemelo.estrategia === "equilibrada",
      muros: false,
      heroes,
    },
  };
}
