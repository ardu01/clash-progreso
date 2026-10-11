import { builderStatus, helpersOf, townHallLevel } from "./progress.js";

const HUT_ID = "1000015";
const BOB_ID = "1000064";
const HELPER_RANK = ["93000000", "93000001", "93000002", "93000003"];

/** Campos numéricos que sí nombran la Casa del constructor. El enfriamiento de la torre del reloj no es uno. */
const CASA_KEYS = ["builderHallLevel", "builder_hall_level", "bhLevel"];

const CLAN_LABELS = {
  name: "Nombre",
  nombre: "Nombre",
  tag: "Etiqueta",
  etiqueta: "Etiqueta",
  level: "Nivel",
  nivel: "Nivel",
  clanLevel: "Nivel",
  members: "Miembros",
  memberCount: "Miembros",
  miembros: "Miembros",
  warLeague: "Liga de guerra",
  war_league: "Liga de guerra",
  ligaGuerra: "Liga de guerra",
  warWins: "Victorias",
  war_wins: "Victorias",
  victorias: "Victorias",
  warWinStreak: "Racha",
  winStreak: "Racha",
  racha: "Racha",
  capitalHallLevel: "Ayuntamiento capital",
  clanCapitalHallLevel: "Ayuntamiento capital",
  ayuntamientoCapital: "Ayuntamiento capital",
};

function primitivo(value) {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function filaClan(clave, valor) {
  const v = primitivo(valor);
  if (v == null) return null;
  return { clave, etiqueta: CLAN_LABELS[clave] || clave, valor: v };
}

/** Filas del clan solo si el JSON trae alguna. Un objeto vacío no abre la sección. */
export function clanOf(exp) {
  if (!exp || typeof exp !== "object") return null;
  const rows = [];
  const push = (clave, valor) => {
    const row = filaClan(clave, valor);
    if (row) rows.push(row);
  };
  const clan = exp.clan;
  if (typeof clan === "string") push("nombre", clan);
  else if (clan && typeof clan === "object" && !Array.isArray(clan)) {
    for (const [clave, valor] of Object.entries(clan)) {
      if (valor && typeof valor === "object" && !Array.isArray(valor)) {
        push(clave, valor.name ?? valor.nombre);
        continue;
      }
      push(clave, valor);
    }
  }
  for (const clave of ["clanName", "clanTag", "clanLevel", "clan_name", "clan_tag"]) {
    if (rows.some((row) => row.clave === clave)) continue;
    push(clave, exp[clave]);
  }
  return rows.length ? rows : null;
}

export function casaConstructorOf(exp) {
  if (!exp || typeof exp !== "object") return null;
  for (const clave of CASA_KEYS) {
    const n = exp[clave];
    if (Number.isInteger(n) && n >= 0) return n;
  }
  return null;
}

function gruposChoza(exp) {
  const grupos = [];
  for (const b of exp.buildings || []) {
    if (String(b.data) !== HUT_ID) continue;
    grupos.push({ lvl: b.lvl || 0, cnt: b.cnt || 1 });
  }
  grupos.sort((a, b) => a.lvl - b.lvl);
  return grupos;
}

function bobOf(exp) {
  let bob = null;
  for (const b of exp.buildings || []) {
    if (String(b.data) !== BOB_ID) continue;
    if (!bob) bob = { id: BOB_ID, lvl: b.lvl || 0, cnt: 0 };
    bob.cnt += b.cnt || 1;
    bob.lvl = b.lvl || bob.lvl;
  }
  return bob;
}

function helpersOrdenados(exp) {
  return helpersOf(exp).slice().sort((a, b) => {
    const ia = HELPER_RANK.indexOf(a.id);
    const ib = HELPER_RANK.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a.id).localeCompare(String(b.id));
  }).map((h) => ({ id: h.id, lvl: h.lvl }));
}

/**
 * Lo que el perfil puede mostrar. No rellena trofeos, liga, estrellas ni clan:
 * si el JSON no los trae, esas claves no salen.
 */
export function exportFacts(exp) {
  const vacio = {
    tag: null,
    timestamp: null,
    th: null,
    casaConstructor: null,
    constructores: { known: false, total: null, grupos: [] },
    bob: null,
    helpers: [],
    clan: null,
  };
  if (!exp || typeof exp !== "object") return vacio;
  const status = builderStatus(exp);
  return {
    tag: typeof exp.tag === "string" ? exp.tag : null,
    timestamp: Number.isInteger(exp.timestamp) ? exp.timestamp : null,
    th: townHallLevel(exp),
    casaConstructor: casaConstructorOf(exp),
    constructores: {
      known: status.known,
      total: status.known ? status.total : null,
      grupos: gruposChoza(exp),
    },
    bob: bobOf(exp),
    helpers: helpersOrdenados(exp),
    clan: clanOf(exp),
  };
}
