/** Los héroes de esta cuenta no entran en el plan: Miguel los sube con pociones. */
export const HEROES_FUERA = "#28PLGP0G2";

export const PLAN_CRITERIO = "Línea de tiempo: laboratorio, edificios de ejército, héroes, defensas, trampas, recursos, muros y mascotas. Dentro de cada grupo va primero lo más atrasado. Cada paso lleva la fecha estimada de cuando queda libre un constructor, el laboratorio o la casa de mascotas; si no hay ninguno libre, se sigue a partir de ese momento. Si el temporizador no es un número, no se inventa la hora. Los héroes de #28PLGP0G2 no entran. El equipamiento no entra en este plan.";

const ORDER = ["laboratorio", "ejercito_edif", "heroes", "defensas", "trampas", "recursos", "muros", "mascotas"];

function rank(item) {
  const group = ORDER.indexOf(item.categoryKey);
  const ratio = item.max > 0 ? item.lvl / item.max : 1;
  return [group < 0 ? 99 : group, ratio, item.title || ""];
}

function byRank(a, b) {
  const ra = rank(a);
  const rb = rank(b);
  if (ra[0] !== rb[0]) return ra[0] - rb[0];
  if (ra[1] !== rb[1]) return ra[1] - rb[1];
  return ra[2].localeCompare(rb[2], "es");
}

/**
 * `candidatos` son piezas por debajo del máximo y que no se están mejorando.
 * queue: constructor | laboratorio | mascotas | herreria.
 */
export function planQueue(candidatos, opts = {}) {
  const heroesFuera = (opts.tag || "") === HEROES_FUERA;
  return (candidatos || []).filter((item) => {
    if (!item || item.max == null || item.lvl >= item.max) return false;
    if (item.upgrading) return false;
    if (heroesFuera && item.categoryKey === "heroes") return false;
    if (item.queue === "herreria" || item.categoryKey === "equipamiento") return false;
    return true;
  }).slice().sort(byRank);
}

export function upgradePlan(candidatos, opts = {}) {
  const heroesFuera = (opts.tag || "") === HEROES_FUERA;
  const list = planQueue(candidatos, opts);

  const free = Math.max(0, opts.constructoresLibres || 0);
  const obras = list.filter((item) => item.queue === "constructor");
  const enCurso = free > 0 ? obras.slice(0, free).map((item) => ({ ...item, espera: false })) : [];
  const espera = free === 0 && obras.length ? [{ ...obras[0], espera: true }] : [];
  const lab = opts.labLibre ? list.find((item) => item.queue === "laboratorio") || null : null;
  const mascotas = opts.mascotasLibres ? list.find((item) => item.queue === "mascotas") || null : null;
  return {
    criterio: PLAN_CRITERIO,
    heroesFuera,
    constructor: enCurso.concat(espera),
    laboratorio: lab,
    mascotas,
    equipamiento: null,
  };
}
