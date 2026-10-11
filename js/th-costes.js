/**
 * Coste y tiempo de mejorar el ayuntamiento (nivel al que se llega).
 * Fuente: chiefpansancolt/clash-of-clans-data v0.18.0,
 * data/home/town-hall/town-hall.json
 * https://github.com/chiefpansancolt/clash-of-clans-data/blob/v0.18.0/data/home/town-hall/town-hall.json
 * buildCost del nivel N es el oro para llegar a ese nivel. El arma (artillería infernal) va aparte y no se suma aquí.
 */
export const TH_FUENTE = "chiefpansancolt/clash-of-clans-data 0.18.0, data/home/town-hall/town-hall.json";
export const TH_URL = "https://github.com/chiefpansancolt/clash-of-clans-data/blob/v0.18.0/data/home/town-hall/town-hall.json";

const NIVELES = {
  2: { oro: 1000, segundos: 10 },
  3: { oro: 4000, segundos: 1800 },
  4: { oro: 25000, segundos: 10800 },
  5: { oro: 150000, segundos: 21600 },
  6: { oro: 500000, segundos: 43200 },
  7: { oro: 1000000, segundos: 64800 },
  8: { oro: 2000000, segundos: 86400 },
  9: { oro: 2500000, segundos: 172800 },
  10: { oro: 3500000, segundos: 259200 },
  11: { oro: 4000000, segundos: 432000 },
  12: { oro: 6000000, segundos: 518400 },
  13: { oro: 9000000, segundos: 604800 },
  14: { oro: 12000000, segundos: 648000 },
  15: { oro: 13000000, segundos: 691200 },
  16: { oro: 15000000, segundos: 777600 },
  17: { oro: 16000000, segundos: 864000 },
  18: { oro: 25000000, segundos: 1036800 },
};

function vacio() {
  return { oro: 0, elixir: 0, oscuro: 0, brillante: 0, glowy: 0, starry: 0, segundos: 0 };
}

/** Coste de llegar a `nivel` (2–18). Fuera de ese rango, null. */
export function costeTh(nivel) {
  if (!Number.isInteger(nivel)) return null;
  const row = NIVELES[nivel];
  if (!row) return null;
  return { nivel, ...vacio(), oro: row.oro, segundos: row.segundos };
}

/** Suma desde el nivel exclusivo hasta el inclusivo. Sin niveles en el tramo, ceros. */
export function costeThRango(desdeExclusivo, hastaInclusivo) {
  const desde = Number(desdeExclusivo);
  const hasta = Number(hastaInclusivo);
  if (!Number.isInteger(desde) || !Number.isInteger(hasta) || hasta < desde) return null;
  const out = vacio();
  for (let lv = desde + 1; lv <= hasta; lv += 1) {
    const row = NIVELES[lv];
    if (!row) continue;
    out.oro += row.oro;
    out.segundos += row.segundos;
  }
  return out;
}
