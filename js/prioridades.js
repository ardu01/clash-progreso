import { HEROES_FUERA } from "./plan.js";

/** C1 es la cuenta principal. Su etiqueta es la misma que deja los héroes fuera del plan. */
export const C1 = HEROES_FUERA;
export const C2 = "#R00C8CPQC";

export const SUEÑO_DEFECTO = { desde: "23:00", hasta: "07:00" };
export const MINUTOS_SESION = [10, 20, 30, 45, 60, 90, 120];
export const JUEGO_DIA = { min: 60, max: 120 };

const ETIQUETA = {
  maxear: "Maxear",
  equilibrada: "Equilibrada",
  rush: "Rush",
  principal: "Principal",
  mantenimiento: "Mantenimiento",
};

export function etiquetaEstrategia(id) {
  return ETIQUETA[id] || "Equilibrada";
}

/**
 * C1 y C2 maxean. TH11 y TH13 van en Equilibrada.
 * No escribe el plan de la cuenta: es el lente de la sesión.
 */
export function estrategiaPorDefecto(cuenta) {
  if (!cuenta) return "equilibrada";
  if (cuenta.tag === C1 || cuenta.tag === C2) return "maxear";
  if (cuenta.th === 11 || cuenta.th === 13) return "equilibrada";
  if (cuenta.planModo === "rushear") return "rush";
  return "equilibrada";
}

function claveOrden(cuenta) {
  return [
    cuenta && cuenta.tag === C1 ? 0 : 1,
    cuenta && cuenta.principal ? 0 : 1,
    cuenta && cuenta.libreAccion > 0 ? 0 : 1,
    cuenta && cuenta.labLibre ? 0 : 1,
    cuenta && cuenta.desactualizada ? 1 : 0,
    cuenta && cuenta.media == null ? 101 : cuenta.media,
    String((cuenta && (cuenta.nombre || cuenta.tag)) || ""),
  ];
}

/** C1 primero, luego la principal, luego quien tiene un constructor libre. Sin duplicados. */
export function ordenarCuentas(cuentas) {
  const vistos = new Set();
  const list = [];
  for (const cuenta of cuentas || []) {
    if (!cuenta || !cuenta.tag || vistos.has(cuenta.tag)) continue;
    vistos.add(cuenta.tag);
    list.push(cuenta);
  }
  list.sort((a, b) => {
    const ka = claveOrden(a);
    const kb = claveOrden(b);
    for (let i = 0; i < ka.length; i += 1) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
  return list;
}

function tarea(cuenta, cola, titulo, minutos, obligatoria) {
  return {
    id: `${cuenta.tag}:${cola}`,
    tag: cuenta.tag,
    nombre: cuenta.nombre || cuenta.tag,
    cola,
    titulo,
    minutos,
    obligatoria,
    estado: "pendiente",
  };
}

/**
 * Lo justo para que un constructor o el laboratorio no se queden parados.
 * Una cuenta desactualizada no cuenta: un temporizador viejo no es un hueco libre.
 */
export function tareasDe(cuenta) {
  if (!cuenta || cuenta.desactualizada) return [];
  const out = [];
  const libres = Math.max(0, Number(cuenta.libreAccion) || 0);
  if (libres > 0) out.push(tarea(cuenta, "constructor", "Constructor libre", 3, true));
  if (cuenta.labLibre) out.push(tarea(cuenta, "laboratorio", "Laboratorio libre", 2, true));
  return out;
}

export function planMantenimiento(cuentas, opts = {}) {
  const minutos = Number(opts.minutos) > 0 ? Number(opts.minutos) : 20;
  const orden = ordenarCuentas(cuentas);
  const obligatorias = [];
  for (const cuenta of orden) {
    for (const paso of tareasDe(cuenta)) {
      if (paso.obligatoria) obligatorias.push(paso);
    }
  }
  const necesario = obligatorias.reduce((sum, paso) => sum + paso.minutos, 0);
  return {
    minutos,
    dias: opts.dias || "todos",
    obligatorias,
    necesario,
    cabe: necesario <= minutos,
    aviso: necesario > minutos ? `Hacen falta ${necesario} min y el presupuesto es ${minutos}.` : "",
    frase: "Estimación. No cambia la aldea.",
  };
}
