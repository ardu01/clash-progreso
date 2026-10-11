import { ordenar } from "./empaquetar.js";

/**
 * Una pasada. Las colas pueden terminar fuera de la sesión.
 * El siguiente paso de una cola solo empieza dentro de una sesión.
 * Devuelve el trabajo hecho dentro del horizonte.
 */
export function simular(pack, pesos, sesiones, ahora, horizonteFin, ordenBuf, libre) {
  const n = ordenar(pack, pesos, ordenBuf);
  const builders = pack.builders;
  const labAt = builders;
  const petsAt = builders + 1;
  for (let i = 0; i < petsAt + 1; i += 1) libre[i] = ahora;
  let cursor = 0;
  let hechos = 0;
  let coste = 0;
  let granjaMin = 0;
  let ocioso = 0;
  const porCat = [0, 0, 0, 0, 0, 0, 0, 0];
  const totalCat = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < pack.n; i += 1) totalCat[pack.cat[i]] += 1;
  const starts = sesiones.starts;
  const ends = sesiones.ends;
  let finHecho = ahora;
  for (let s = 0; s < starts.length; s += 1) {
    let t = starts[s];
    const limite = ends[s];
    if (t >= horizonteFin) break;
    while (cursor < n && t < limite) {
      const id = ordenBuf[cursor];
      const q = pack.q[id];
      let lane = 0;
      let ready = libre[0];
      if (q === 1) {
        lane = labAt;
        ready = libre[labAt];
      } else if (q === 2) {
        lane = petsAt;
        ready = libre[petsAt];
      } else {
        for (let b = 1; b < builders; b += 1) {
          if (libre[b] < ready) {
            ready = libre[b];
            lane = b;
          }
        }
      }
      const start = ready > t ? ready : t;
      if (start >= limite || start >= horizonteFin) break;
      if (start > t) ocioso += start - t;
      const fin = start + pack.sec[id] * 1000;
      libre[lane] = fin;
      if (fin > finHecho) finHecho = fin;
      coste += pack.coste[id];
      granjaMin += pack.granja[id];
      porCat[pack.cat[id]] += 1;
      hechos += 1;
      cursor += 1;
      t = start;
    }
  }
  let equilibrio = 0;
  let cats = 0;
  for (let c = 0; c < 8; c += 1) {
    if (!totalCat[c]) continue;
    const frac = porCat[c] / totalCat[c];
    equilibrio += frac;
    cats += 1;
  }
  const media = cats ? equilibrio / cats : 0;
  let desvio = 0;
  for (let c = 0; c < 8; c += 1) {
    if (!totalCat[c]) continue;
    const d = porCat[c] / totalCat[c] - media;
    desvio += d * d;
  }
  return {
    hechos,
    total: pack.n,
    coste,
    granjaMin,
    ocioso,
    fin: hechos ? finHecho : null,
    resto: pack.n ? 1 - hechos / pack.n : 0,
    desvio: cats ? desvio / cats : 0,
  };
}

export function evaluarFlota(packs, minutos, ordenCuentas, sesiones, ahora, horizonteFin, buffers) {
  let resto = 0;
  let coste = 0;
  let granja = 0;
  let ocioso = 0;
  let fin = ahora;
  let hechos = 0;
  let total = 0;
  let desvio = 0;
  const n = packs.length;
  for (let k = 0; k < n; k += 1) {
    const i = ordenCuentas[k];
    const pack = packs[i];
    const r = simular(pack, buffers.pesos[i], sesiones, ahora, horizonteFin, buffers.orden[i], buffers.libre[i]);
    resto += r.resto;
    coste += r.coste;
    granja += r.granjaMin;
    ocioso += r.ocioso;
    hechos += r.hechos;
    total += r.total;
    desvio += r.desvio;
    if (r.fin != null && r.fin > fin) fin = r.fin;
  }
  const esfuerzo = (minutos.reduce((s, m) => s + m, 0) + granja) / Math.max(1, sesiones.starts.length);
  return {
    resto: n ? resto / n : 0,
    coste,
    esfuerzo,
    desvio: n ? desvio / n : 0,
    fin: hechos ? fin : null,
    hechos,
    total,
    ocioso,
  };
}
