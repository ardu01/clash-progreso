import { HEROES_FUERA } from "./plan.js";

function media(valores) {
  const xs = valores.filter((n) => n != null && Number.isFinite(n));
  if (!xs.length) return null;
  return Math.round((xs.reduce((s, n) => s + n, 0) / xs.length) * 10) / 10;
}

export function textoNumero(n) {
  return n == null || n === "" ? "Sin anotar" : String(n);
}

export function crearGuerra({ tipo, ahora, participantes }) {
  const cwl = tipo === "cwl";
  return {
    id: (cwl ? "cwl-" : "guerra-") + (ahora || 0),
    tipo: cwl ? "cwl" : "guerra",
    nombre: cwl ? "CWL" : "Guerra",
    clan: null,
    rival: null,
    tamano: null,
    inicio: null,
    fin: null,
    cerrada: false,
    origen: "manual",
    participantes: (participantes || []).map((p) => ({
      tag: p.tag,
      nombre: p.nombre || p.tag,
      ataquesPrevistos: null,
      ataquesHechos: null,
      estrellas: null,
      pct: p.pct == null ? null : p.pct,
      objetivo: null,
      nota: null,
    })),
  };
}

/** Ordena por laboratorio, héroes y ejército. C1 no recibe un aviso de héroes. */
export function alinear(cuentas) {
  return (cuentas || []).map((cuenta) => {
    const cats = (cuenta && cuenta.cats) || {};
    const heroes = cuenta && cuenta.tag === HEROES_FUERA ? null : cats.heroes;
    const ofensiva = media([cats.laboratorio, heroes, cats.ejercito_edif]);
    const avisoHeroe = !cuenta || cuenta.tag === HEROES_FUERA
      ? ""
      : (cuenta.heroesConTimer ? "Héroe con temporizador." : "");
    return {
      tag: cuenta.tag,
      nombre: cuenta.nombre || cuenta.tag,
      ofensiva,
      avisoHeroe,
    };
  }).sort((a, b) => (b.ofensiva ?? -1) - (a.ofensiva ?? -1) || String(a.nombre).localeCompare(String(b.nombre), "es"));
}
