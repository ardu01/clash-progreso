import { evaluarFlota } from "./evaluar.js";
import { mulberry32 } from "./prng.js";
import { escenariosDe, semanaDefecto } from "./sesiones.js";

const CATS = 8;

function genesDe(n) {
  return n + n + n * CATS;
}

function decodificar(genes, n, presupuesto) {
  const orden = [];
  for (let i = 0; i < n; i += 1) orden.push(i);
  orden.sort((a, b) => genes[a] - genes[b] || a - b);
  let suma = 0;
  for (let i = 0; i < n; i += 1) suma += genes[n + i];
  const minutos = new Array(n);
  for (let i = 0; i < n; i += 1) minutos[i] = suma > 0 ? (genes[n + i] / suma) * presupuesto : presupuesto / n;
  const pesos = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const fila = new Array(CATS);
    for (let c = 0; c < CATS; c += 1) fila[c] = genes[2 * n + i * CATS + c];
    pesos[i] = fila;
  }
  return { orden, minutos, pesos };
}

function objetivo(fila) {
  return [fila.resto, fila.coste, fila.esfuerzo, fila.desvio];
}

function domina(a, b) {
  let mejor = false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] > b[i]) return false;
    if (a[i] < b[i]) mejor = true;
  }
  return mejor;
}

function frentes(poblacion) {
  const n = poblacion.length;
  const dominaA = Array.from({ length: n }, () => []);
  const cuenta = new Array(n).fill(0);
  const fr = [[]];
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (domina(poblacion[i].obj, poblacion[j].obj)) dominaA[i].push(j);
      else if (domina(poblacion[j].obj, poblacion[i].obj)) cuenta[i] += 1;
    }
    if (cuenta[i] === 0) fr[0].push(i);
  }
  let k = 0;
  while (fr[k].length) {
    const siguiente = [];
    for (const i of fr[k]) {
      for (const j of dominaA[i]) {
        cuenta[j] -= 1;
        if (cuenta[j] === 0) siguiente.push(j);
      }
    }
    k += 1;
    fr.push(siguiente);
  }
  fr.pop();
  return fr;
}

function crowding(poblacion, frente) {
  const dist = new Map(frente.map((i) => [i, 0]));
  if (frente.length < 3) {
    for (const i of frente) dist.set(i, Infinity);
    return dist;
  }
  for (let m = 0; m < 4; m += 1) {
    const ord = frente.slice().sort((a, b) => poblacion[a].obj[m] - poblacion[b].obj[m]);
    dist.set(ord[0], Infinity);
    dist.set(ord[ord.length - 1], Infinity);
    const span = poblacion[ord[ord.length - 1]].obj[m] - poblacion[ord[0]].obj[m];
    if (span === 0) continue;
    for (let i = 1; i < ord.length - 1; i += 1) {
      const extra = (poblacion[ord[i + 1]].obj[m] - poblacion[ord[i - 1]].obj[m]) / span;
      dist.set(ord[i], dist.get(ord[i]) + extra);
    }
  }
  return dist;
}

function buffersDe(packs) {
  return {
    orden: packs.map((p) => new Uint32Array(p.n)),
    libre: packs.map((p) => new Float64Array(p.builders + 2)),
    pesos: packs.map(() => new Array(CATS).fill(1)),
  };
}

function medir(packs, genes, presupuesto, escenarios, ahora, fin, buffers) {
  const dec = decodificar(genes, packs.length, presupuesto);
  buffers.pesos = dec.pesos;
  const muestras = escenarios.map((ses) => evaluarFlota(packs, dec.minutos, dec.orden, ses, ahora, fin, buffers));
  muestras.sort((a, b) => a.resto - b.resto || a.fin - b.fin);
  const media = muestras[Math.floor((muestras.length - 1) / 2)];
  const peor = muestras[muestras.length - 1];
  const mejor = muestras[0];
  return {
    genes,
    dec,
    obj: [media.resto, media.coste, media.esfuerzo, media.desvio],
    media,
    peor,
    mejor,
  };
}

function semillaActual(n, rng) {
  const g = new Float64Array(genesDe(n));
  for (let i = 0; i < n; i += 1) g[i] = i / Math.max(1, n);
  for (let i = n; i < g.length; i += 1) g[i] = 0.5 + (rng ? (rng() - 0.5) * 0.02 : 0);
  return g;
}

function mutar(genes, rng, tasa) {
  const out = genes.slice();
  for (let i = 0; i < out.length; i += 1) {
    if (rng() < tasa) out[i] = Math.min(1, Math.max(0, out[i] + (rng() - 0.5) * 0.3));
  }
  return out;
}

function cruzar(a, b, rng) {
  const out = new Float64Array(a.length);
  const corte = 1 + Math.floor(rng() * (a.length - 1));
  for (let i = 0; i < a.length; i += 1) out[i] = i < corte ? a[i] : b[i];
  return out;
}

/**
 * NSGA-II. Todas las cuentas van en el mismo genoma.
 * Para al llegar a `topeEval` o a `maxMs`.
 */
export function buscar(opts, hooks) {
  const packs = opts.packs || [];
  const n = packs.length;
  if (!n) {
    return {
      evaluaciones: 0, generacion: 0, ms: 0, semilla: opts.semilla || 1,
      horizonte: opts.horizonte || 90, presupuesto: opts.presupuesto || 90,
      fechas: (opts.horizonte || 90) < 180, base: null, estrategias: [],
    };
  }
  const ahora = opts.ahora;
  const dias = opts.horizonte || 90;
  const fin = ahora + dias * 86400000;
  const presupuesto = Math.min(120, Math.max(60, Number(opts.presupuesto) || 90));
  const semana = opts.semana || semanaDefecto();
  const semilla = (opts.semilla >>> 0) || 1;
  const rng = mulberry32(semilla);
  const tope = Math.min(20000, Math.max(1, opts.topeEval || 20000));
  const maxMs = opts.maxMs == null ? 120000 : opts.maxMs;
  const popN = Math.max(4, Math.min(80, opts.poblacion || 20));
  const escenarios = escenariosDe(semana, ahora, dias, semilla, 3);
  const buffers = buffersDe(packs);
  const t0 = Date.now();
  let evaluaciones = 0;
  const poblacion = [];
  const previa = Array.isArray(opts.reanudar) ? opts.reanudar : [];
  const base = semillaActual(n, null);
  poblacion.push(medir(packs, base, presupuesto, escenarios, ahora, fin, buffers));
  evaluaciones += 1;
  for (const genes of previa) {
    if (poblacion.length >= popN || evaluaciones >= tope) break;
    if (!genes || genes.length !== genesDe(n)) continue;
    poblacion.push(medir(packs, Float64Array.from(genes), presupuesto, escenarios, ahora, fin, buffers));
    evaluaciones += 1;
  }
  while (poblacion.length < popN && evaluaciones < tope) {
    const g = new Float64Array(genesDe(n));
    for (let i = 0; i < g.length; i += 1) g[i] = rng();
    if (poblacion.length < 4) {
      for (let i = 0; i < n; i += 1) g[i] = i / Math.max(1, n);
    }
    poblacion.push(medir(packs, g, presupuesto, escenarios, ahora, fin, buffers));
    evaluaciones += 1;
  }
  let generacion = 0;
  const seguir = () => !hooks || !hooks.seguir || hooks.seguir();
  while (evaluaciones < tope && Date.now() - t0 < maxMs && seguir()) {
    const fr = frentes(poblacion);
    const hijos = [];
    while (hijos.length < popN && evaluaciones < tope && Date.now() - t0 < maxMs) {
      const ia = Math.floor(rng() * poblacion.length);
      const ib = Math.floor(rng() * poblacion.length);
      const hijo = mutar(cruzar(poblacion[ia].genes, poblacion[ib].genes, rng), rng, 0.08);
      hijos.push(medir(packs, hijo, presupuesto, escenarios, ahora, fin, buffers));
      evaluaciones += 1;
    }
    const mezcla = poblacion.concat(hijos);
    const fr2 = frentes(mezcla);
    const siguiente = [];
    for (const frente of fr2) {
      if (siguiente.length + frente.length <= popN) {
        for (const i of frente) siguiente.push(mezcla[i]);
        continue;
      }
      const dist = crowding(mezcla, frente);
      const ord = frente.slice().sort((a, b) => (dist.get(b) || 0) - (dist.get(a) || 0));
      for (const i of ord) {
        if (siguiente.length >= popN) break;
        siguiente.push(mezcla[i]);
      }
      break;
    }
    poblacion.length = 0;
    for (const ind of siguiente) poblacion.push(ind);
    generacion += 1;
    if (hooks && hooks.progreso) {
      hooks.progreso({
        generacion,
        evaluaciones,
        frente: fr[0] ? fr[0].length : 0,
        genes: poblacion.map((ind) => Array.from(ind.genes)),
      });
    }
    if (generacion > 500) break;
  }
  const finalistas = frentes(poblacion)[0].map((i) => poblacion[i]);
  const ricos = escenariosDe(semana, ahora, dias, semilla + 17, 5);
  const detallados = finalistas.slice(0, 5).map((ind) => {
    const otra = medir(packs, ind.genes, presupuesto, ricos, ahora, fin, buffers);
    evaluaciones += 1;
    return otra;
  });
  const baseMedida = medir(packs, base, presupuesto, ricos, ahora, fin, buffers);
  return {
    evaluaciones,
    generacion,
    ms: Date.now() - t0,
    semilla,
    horizonte: dias,
    presupuesto,
    fechas: dias < 180,
    base: resumir(baseMedida, dias),
    estrategias: detallados.map((ind, i) => resumir(ind, dias, i)),
  };
}

function resumir(ind, dias, i) {
  const fechas = dias < 180;
  return {
    id: i == null ? "base" : "p" + i,
    nombre: i == null ? "Plan actual" : "Estrategia " + (i + 1),
    obj: ind.obj,
    hechos: ind.media.hechos,
    total: ind.media.total,
    esfuerzo: ind.media.esfuerzo,
    desvio: ind.media.desvio,
    coste: ind.media.coste,
    ocioso: ind.media.ocioso,
    probable: fechas ? ind.media.fin : null,
    mejor: fechas ? ind.mejor.fin : null,
    peor: fechas ? ind.peor.fin : null,
    comparar: dias >= 180,
    minutos: ind.dec.minutos,
    orden: ind.dec.orden,
    pesos: ind.dec.pesos,
    pros: [],
    contras: [],
  };
}

export function compararConBase(resultado) {
  const base = resultado.base;
  for (const est of resultado.estrategias) {
    est.pros = [];
    est.contras = [];
    if (est.hechos > base.hechos) est.pros.push("Más pasos dentro del horizonte");
    else if (est.hechos < base.hechos) est.contras.push("Menos pasos dentro del horizonte");
    if (est.esfuerzo < base.esfuerzo) est.pros.push("Menos minutos al día");
    else if (est.esfuerzo > base.esfuerzo) est.contras.push("Más minutos al día");
    if (est.desvio < base.desvio) est.pros.push("Más equilibrio entre categorías");
    else if (est.desvio > base.desvio) est.contras.push("Más desnivel entre categorías");
    if (est.coste < base.coste) est.pros.push("Menos recursos en lo que empieza");
    else if (est.coste > base.coste) est.contras.push("Más recursos en lo que empieza");
    if (!est.pros.length) est.pros.push("Parecida al plan actual");
  }
  return resultado;
}
