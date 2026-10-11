/**
 * Recursos manuales y coste de subir el ayuntamiento.
 * Esos módulos llegan con la 3.1.17. Hasta entonces la respuesta es null
 * y la pantalla lo dice, sin inventar oro ni el precio del ayuntamiento.
 */

let recursos = undefined;
let thCostes = undefined;
let carga = null;

function tomar(mod, nombres) {
  if (!mod) return null;
  for (const nombre of nombres) {
    if (typeof mod[nombre] === "function") return mod[nombre];
  }
  return null;
}

export function cargarFuentes() {
  if (!carga) {
    carga = Promise.all([
      import("./recursos.js").then((mod) => { recursos = mod; }).catch(() => { recursos = null; }),
      import("./th-costes.js").then((mod) => { thCostes = mod; }).catch(() => { thCostes = null; }),
    ]);
  }
  return carga;
}

export function recursosDe(tag) {
  const fn = tomar(recursos, ["recursosDe", "deCuenta", "leerRecursos"]);
  if (!fn) return null;
  try { return fn(tag); } catch { return null; }
}

export function costeSubirTh(th) {
  const fn = tomar(thCostes, ["costeTh", "costeDe", "para"]);
  if (!fn) return null;
  try { return fn(th); } catch { return null; }
}

export function hayRecursosManuales() {
  return recursos != null && tomar(recursos, ["recursosDe", "deCuenta", "leerRecursos"]) != null;
}

export function hayCosteTh() {
  return thCostes != null && tomar(thCostes, ["costeTh", "costeDe", "para"]) != null;
}
