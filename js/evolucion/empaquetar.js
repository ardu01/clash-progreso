import { levelCost } from "../costs.js";

const ORDEN = ["laboratorio", "ejercito_edif", "heroes", "defensas", "trampas", "recursos", "muros", "mascotas"];

function cola(queue) {
  if (queue === "laboratorio") return 1;
  if (queue === "mascotas") return 2;
  return 0;
}

function costeDe(step) {
  if (step.id === "inferno-artillery") return 0;
  const row = levelCost(step.id, step.toLvl);
  if (!row || typeof row.n !== "number") return 0;
  if (row.r === "oro" || row.r === "elixir" || row.r === "oscuro" || row.r === "oro_o_elixir") return row.n;
  return 0;
}

/**
 * Tablas compactas para el evaluador. Se arma una vez, fuera del bucle.
 * `granjaMin` es hipótesis: minutos de farmeo por el coste del paso.
 */
export function empaquetar(compilado, hipotesis) {
  const pasos = compilado.pasos || [];
  const n = pasos.length;
  const q = new Uint8Array(n);
  const sec = new Float64Array(n);
  const cat = new Uint8Array(n);
  const coste = new Float64Array(n);
  const granja = new Float64Array(n);
  const cubo = [[], [], [], [], [], [], [], []];
  const loot = hipotesis && hipotesis.botinPorAtaque > 0 ? hipotesis.botinPorAtaque : 400000;
  const minAtaque = hipotesis && hipotesis.minutosPorAtaque > 0 ? hipotesis.minutosPorAtaque : 3;
  let builders = 0;
  let lab = 0;
  let pets = 0;
  for (const lane of compilado.lanes || []) {
    if (lane.cola === "constructor") builders += 1;
    else if (lane.cola === "laboratorio") lab = 1;
    else if (lane.cola === "mascotas") pets = 1;
  }
  if (!builders) builders = 1;
  for (let i = 0; i < n; i += 1) {
    const step = pasos[i];
    q[i] = cola(step.queue);
    sec[i] = step.seconds == null ? 0 : step.seconds;
    const c = ORDEN.indexOf(step.categoryKey);
    cat[i] = c < 0 ? 0 : c;
    const costePaso = costeDe(step);
    coste[i] = costePaso;
    granja[i] = (costePaso / loot) * minAtaque;
    cubo[cat[i]].push(i);
  }
  return {
    tag: compilado.tag,
    n,
    q,
    sec,
    cat,
    coste,
    granja,
    cubo,
    builders,
    lab,
    pets,
  };
}

export function ordenar(pack, pesos, destino) {
  const ordenCats = [0, 1, 2, 3, 4, 5, 6, 7];
  ordenCats.sort((a, b) => (pesos[b] || 0) - (pesos[a] || 0) || a - b);
  let k = 0;
  for (let c = 0; c < 8; c += 1) {
    const lista = pack.cubo[ordenCats[c]];
    for (let i = 0; i < lista.length; i += 1) destino[k++] = lista[i];
  }
  return k;
}

export { ORDEN };
