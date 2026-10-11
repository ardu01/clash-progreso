import { normalizeProvisional } from "./provisional.js";
import { normalizePlan } from "./roadmap.js";
import { migrateRoster } from "./roster.js";

/** Claves que pasan a IndexedDB. El resto del teléfono se vuelca igual, sin reinterpretarlo. */
export const CLAVES_USUARIO = ["cp-roster", "cp-planes", "cp-provisional", "cp-sueno"];

export function volcadoLiteral(storage) {
  const claves = {};
  if (!storage || typeof storage.key !== "function") return { ok: false, claves };
  const n = Number(storage.length) || 0;
  for (let i = 0; i < n; i += 1) {
    const key = storage.key(i);
    if (key == null) continue;
    claves[key] = storage.getItem(key);
  }
  return { ok: true, claves };
}

function leerJson(claves, key) {
  if (claves[key] == null || claves[key] === "") return { ok: true, vacio: true, value: null };
  try {
    return { ok: true, vacio: false, value: JSON.parse(claves[key]) };
  } catch {
    return { ok: false, vacio: false, value: null };
  }
}

/**
 * Prepara la migración. No escribe.
 * Si el esquema ya está migrado, no se repite.
 * Si una clave de usuario está rota, no se marca migrado y no se sustituye el teléfono.
 */
export function prepararMigracion({ schema, claves, added, exportTags, seeded } = {}) {
  const mapa = claves || {};
  if (schema && schema.version === 3 && schema.migrado === true) return { repetir: false };
  const rotos = [];
  const roster = leerJson(mapa, "cp-roster");
  const planesRaw = leerJson(mapa, "cp-planes");
  const provRaw = leerJson(mapa, "cp-provisional");
  const suenoRaw = leerJson(mapa, "cp-sueno");
  for (const [key, parsed] of [["cp-roster", roster], ["cp-planes", planesRaw], ["cp-provisional", provRaw], ["cp-sueno", suenoRaw]]) {
    if (!parsed.ok) rotos.push(key);
  }
  const recuperacion = { claves: mapa };
  if (rotos.length) return { repetir: true, migrado: false, rotos, recuperacion };
  const migrated = migrateRoster({
    stored: roster.vacio ? null : roster.value,
    added,
    exportTags,
    seeded,
  });
  const planes = {};
  const rawPlanes = planesRaw.vacio ? {} : planesRaw.value;
  if (rawPlanes && typeof rawPlanes === "object" && !Array.isArray(rawPlanes)) {
    for (const [tag, raw] of Object.entries(rawPlanes)) {
      if (!tag.startsWith("#")) continue;
      planes[tag] = normalizePlan(raw);
    }
  } else if (!planesRaw.vacio) {
    return { repetir: true, migrado: false, rotos: ["cp-planes"], recuperacion };
  }
  const lista = provRaw.vacio ? [] : provRaw.value;
  if (!provRaw.vacio && !Array.isArray(lista)) {
    return { repetir: true, migrado: false, rotos: ["cp-provisional"], recuperacion };
  }
  const marcas = (Array.isArray(lista) ? lista : []).map(normalizeProvisional).filter(Boolean);
  const suenoValor = suenoRaw.vacio || !suenoRaw.value || typeof suenoRaw.value !== "object"
    ? { desde: "", hasta: "" }
    : { desde: String(suenoRaw.value.desde || ""), hasta: String(suenoRaw.value.hasta || "") };
  const documentos = [
    { id: "roster", tipo: "roster", version: 2, accounts: migrated.accounts },
    { id: "planes", tipo: "planes", planes },
    { id: "provisionales", tipo: "provisionales", marcas },
    { id: "sueno", tipo: "sueno", desde: suenoValor.desde, hasta: suenoValor.hasta },
  ];
  return {
    repetir: true,
    migrado: true,
    recuperacion,
    documentos,
    cuentas: migrated.accounts.length,
    planes: Object.keys(planes).length,
    marcas: marcas.length,
  };
}

export function verificarDocumentos(escritos, esperado) {
  if (!esperado) return false;
  const roster = (escritos || []).find((d) => d && d.id === "roster");
  const planes = (escritos || []).find((d) => d && d.id === "planes");
  const prov = (escritos || []).find((d) => d && d.id === "provisionales");
  if (!roster || !Array.isArray(roster.accounts)) return false;
  if (!planes || !planes.planes || typeof planes.planes !== "object") return false;
  if (!prov || !Array.isArray(prov.marcas)) return false;
  return roster.accounts.length === esperado.cuentas
    && Object.keys(planes.planes).length === esperado.planes
    && prov.marcas.length === esperado.marcas;
}
