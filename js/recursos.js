/**
 * Recursos escritos a mano por cuenta. La exportación no trae el oro ni las menas:
 * estas cifras son manuales y no quedan confirmadas.
 */
export const CLAVES_RECURSO = ["oro", "elixir", "oscuro", "brillante", "glowy", "starry"];

const TOPE = 1e15;

const ALIAS_COSTE = {
  oro: ["oro"],
  elixir: ["elixir"],
  oscuro: ["oscuro"],
  brillante: ["brillante"],
  glowy: ["glowy", "resplandeciente", "reluciente"],
  starry: ["starry", "estelar", "estrellada"],
};

function numeroONull(v) {
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 0) return null;
    return Math.min(TOPE, Math.round(v));
  }
  if (v == null) return null;
  let s = String(v).trim().replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(TOPE, Math.round(n));
}

function leerBolsa(raw, ingreso) {
  const out = {};
  let alguno = false;
  for (const clave of CLAVES_RECURSO) {
    const n = numeroONull(raw && raw[clave]);
    const valor = ingreso && (n == null || n <= 0) ? null : n;
    out[clave] = valor;
    if (valor != null) alguno = true;
  }
  return alguno ? out : null;
}

/** null si no hay ninguna cifra. `manual` queda siempre en true. */
export function normalizarRecursos(raw) {
  if (!raw || typeof raw !== "object") return null;
  const bolsa = leerBolsa(raw, false);
  const ingresos = leerBolsa(raw.ingresos, true);
  if (!bolsa && !ingresos) return null;
  const base = {};
  for (const clave of CLAVES_RECURSO) base[clave] = bolsa ? bolsa[clave] : null;
  const marca = Number(raw.actualizado);
  return {
    ...base,
    manual: true,
    actualizado: Number.isFinite(marca) && marca > 0 ? marca : null,
    ingresos,
  };
}

/** Recursos manuales de la cuenta, o null si no hay cifras. */
export function recursosDeCuenta(cuenta) {
  if (!cuenta || typeof cuenta !== "object") return null;
  return normalizarRecursos(cuenta.recursos);
}

function leerCoste(coste, claves) {
  if (!coste || typeof coste !== "object") return 0;
  for (const clave of claves) {
    const n = Number(coste[clave]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function diasDe(falta, ingresos) {
  if (!ingresos) return null;
  let max = 0;
  for (const clave of ["oscuro", "brillante", "glowy", "starry"]) {
    if (!(clave in falta)) continue;
    if (falta[clave] == null) return null;
    const ritmo = ingresos[clave] || 0;
    if (falta[clave] > 0 && ritmo <= 0) return null;
    if (falta[clave] > 0) max = Math.max(max, Math.ceil(falta[clave] / ritmo));
  }
  const hayPila = ["oro", "elixir", "muros"].some((clave) => clave in falta);
  if (!hayPila) return max > 0 ? max : null;
  if (falta.oro === null || falta.elixir === null || falta.muros === null) return null;
  const needOro = falta.oro || 0;
  const needElixir = falta.elixir || 0;
  const needMuros = falta.muros || 0;
  const inOro = ingresos.oro || 0;
  const inElixir = ingresos.elixir || 0;
  if (needOro > 0 && inOro <= 0) return null;
  if (needElixir > 0 && inElixir <= 0) return null;
  if (needMuros > 0 && inOro + inElixir <= 0) return null;
  let dias = 0;
  if (needOro > 0) dias = Math.max(dias, Math.ceil(needOro / inOro));
  if (needElixir > 0) dias = Math.max(dias, Math.ceil(needElixir / inElixir));
  if (needMuros > 0) {
    const cabe = (n) => Math.max(0, inOro * n - needOro) + Math.max(0, inElixir * n - needElixir) >= needMuros;
    let lo = dias;
    let hi = dias + Math.ceil(needMuros / (inOro + inElixir));
    if (!cabe(hi)) return null;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cabe(mid)) hi = mid;
      else lo = mid + 1;
    }
    dias = lo;
  }
  max = Math.max(max, dias);
  return max > 0 ? max : null;
}

/**
 * Compara las cifras manuales con un coste.
 * `falta[clave]` es lo que falta, o null si esa cifra no está escrita.
 * `muros` se paga con el oro o el elixir que sobre.
 * Sin cifras, null.
 */
export function cubrir(recursos, coste) {
  const rec = normalizarRecursos(recursos);
  if (!rec) return null;
  const need = {};
  for (const clave of CLAVES_RECURSO) need[clave] = leerCoste(coste, ALIAS_COSTE[clave]);
  const muros = leerCoste(coste, ["muros"]);
  const falta = {};
  let alcanza = true;
  for (const clave of CLAVES_RECURSO) {
    if (need[clave] <= 0) continue;
    const tengo = rec[clave];
    if (tengo == null) {
      falta[clave] = null;
      alcanza = false;
    } else if (tengo < need[clave]) {
      falta[clave] = need[clave] - tengo;
      alcanza = false;
    }
  }
  if (muros > 0) {
    if (rec.oro == null || rec.elixir == null) {
      falta.muros = null;
      alcanza = false;
    } else {
      const sobra = Math.max(0, rec.oro - need.oro) + Math.max(0, rec.elixir - need.elixir);
      if (sobra < muros) {
        falta.muros = muros - sobra;
        alcanza = false;
      }
    }
  }
  return { alcanza, falta, dias: diasDe(falta, rec.ingresos) };
}
