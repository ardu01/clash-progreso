import { levelCost } from "../costs.js";

const ORDEN = ["laboratorio", "ejercito_edif", "heroes", "defensas", "trampas", "recursos", "muros", "mascotas"];

/**
 * Tope de botín por ataque, por recurso y por TH. Hipótesis: el cap de la
 * wiki (oro/elixir y oscuro por separado), no una bolsa única de 400 000.
 * Por debajo de TH7 el oscuro no se farmea.
 */
export const BOTIN_POR_TH = {
  oro: [0, 500, 1700, 20000, 100000, 200000, 200000, 360000, 480000, 560000, 595000, 700000, 980000, 1260000, 1400000, 1540000, 1610000, 1680000, 1750000],
  elixir: [0, 500, 1700, 20000, 100000, 200000, 200000, 360000, 480000, 560000, 595000, 700000, 980000, 1260000, 1400000, 1540000, 1610000, 1680000, 1750000],
  oscuro: [0, 0, 0, 0, 0, 0, 0, 1200, 2400, 4750, 5000, 5500, 6000, 7500, 8750, 9250, 9500, 9750, 10000],
};

function cola(queue) {
  if (queue === "laboratorio") return 1;
  if (queue === "mascotas") return 2;
  return 0;
}

function botinDe(hipotesis, recurso, th) {
  const propio = hipotesis && hipotesis.botin && hipotesis.botin[recurso];
  if (typeof propio === "number" && propio > 0) return propio;
  if (Array.isArray(propio) && propio[th] > 0) return propio[th];
  if ((recurso === "oro" || recurso === "elixir") && hipotesis && hipotesis.botinPorAtaque > 0) return hipotesis.botinPorAtaque;
  const tabla = BOTIN_POR_TH[recurso];
  const n = tabla && tabla[th];
  return n > 0 ? n : 0;
}

function costesDe(step) {
  const vacio = { oro: 0, elixir: 0, oscuro: 0, muros: 0 };
  if (!step || step.id === "inferno-artillery" || step.id === "town-hall") return vacio;
  const row = levelCost(step.id, step.toLvl);
  if (!row || typeof row.n !== "number") return vacio;
  if (row.r === "oro") vacio.oro = row.n;
  else if (row.r === "elixir") vacio.elixir = row.n;
  else if (row.r === "oscuro") vacio.oscuro = row.n;
  else if (row.r === "oro_o_elixir") vacio.muros = row.n;
  return vacio;
}

/**
 * Tablas compactas para el evaluador. Se arma una vez, fuera del bucle.
 * El coste del objetivo es el número de ataques, con oro, elixir y oscuro
 * por separado. `granja` son los minutos de esa hipótesis.
 */
export function empaquetar(compilado, hipotesis) {
  const pasos = compilado.pasos || [];
  const n = pasos.length;
  const th = Number.isInteger(compilado.current) ? compilado.current : (Number.isInteger(compilado.th) ? compilado.th : 11);
  const q = new Uint8Array(n);
  const sec = new Float64Array(n);
  const cat = new Uint8Array(n);
  const coste = new Float64Array(n);
  const granja = new Float64Array(n);
  const oro = new Float64Array(n);
  const elixir = new Float64Array(n);
  const oscuro = new Float64Array(n);
  const cubo = [[], [], [], [], [], [], [], []];
  const lootOro = botinDe(hipotesis, "oro", th);
  const lootElixir = botinDe(hipotesis, "elixir", th);
  const lootOscuro = botinDe(hipotesis, "oscuro", th);
  const lootMuro = Math.max(lootOro, lootElixir);
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
    const bolsa = costesDe(step);
    oro[i] = bolsa.oro;
    elixir[i] = bolsa.elixir;
    oscuro[i] = bolsa.oscuro;
    let ataques = 0;
    if (lootOro) ataques += bolsa.oro / lootOro;
    if (lootElixir) ataques += bolsa.elixir / lootElixir;
    if (lootOscuro) ataques += bolsa.oscuro / lootOscuro;
    if (lootMuro) ataques += bolsa.muros / lootMuro;
    coste[i] = ataques;
    granja[i] = ataques * minAtaque;
    cubo[cat[i]].push(i);
  }
  return {
    tag: compilado.tag,
    th,
    n,
    q,
    sec,
    cat,
    coste,
    granja,
    oro,
    elixir,
    oscuro,
    cubo,
    builders,
    lab,
    pets,
    botin: { oro: lootOro, elixir: lootElixir, oscuro: lootOscuro },
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
