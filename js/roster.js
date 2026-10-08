import { ROSTER } from "./progress.js";

/** Catálogo de las 11 aldeas de prueba que viajan con la app. No es el roster del usuario. */
export const SEED_CATALOG = ROSTER;

export const ROSTER_VERSION = 2;

function chipFromTag(tag) {
  const tail = String(tag || "").replace(/^#/, "");
  return tail.slice(-3) || tail;
}

function seedByTag(tag) {
  return SEED_CATALOG.find((r) => r.tag === tag) || null;
}

export function normalizeAccount(raw) {
  const tag = raw && typeof raw.tag === "string" ? raw.tag : "";
  if (!tag.startsWith("#")) return null;
  const alias = String(raw.alias ?? raw.nombre ?? "").trim();
  const addedAt = Number.isFinite(raw.addedAt) ? raw.addedAt : Number(raw.añadida) || 0;
  return {
    tag,
    alias: alias || tag,
    principal: raw.principal === true || raw.role === "Principal",
    addedAt,
    chip: raw.chip || (seedByTag(tag) && seedByTag(tag).chip) || chipFromTag(tag),
    objetivo: raw.objetivo == null ? (seedByTag(tag) ? seedByTag(tag).objetivo : null) : raw.objetivo,
  };
}

function fromSeed(meta) {
  return {
    tag: meta.tag,
    alias: meta.nombre,
    principal: meta.role === "Principal",
    addedAt: 0,
    chip: meta.chip,
    objetivo: meta.objetivo,
  };
}

function fromAdded(raw) {
  const tag = raw && raw.tag;
  if (!tag) return null;
  const seed = seedByTag(tag);
  return normalizeAccount({
    tag,
    alias: (raw.alias || "").trim() || (seed ? seed.nombre : tag),
    principal: seed ? seed.role === "Principal" : false,
    addedAt: raw.añadida === true ? 0 : Number(raw.añadida) || 0,
    chip: raw.chip || (seed && seed.chip),
    objetivo: seed ? seed.objetivo : null,
  });
}

/**
 * Migración 1.x → 2.0. Idempotente: si `stored` ya es versión 2, se devuelve
 * tal cual (una cuenta borrada no reaparece). No toca las exportaciones.
 * Con datos 1.x (semilla, altas o tags en IndexedDB) une el catálogo de prueba,
 * los alias de `cp-added` y cualquier tag que solo esté en las exportaciones.
 */
export function migrateRoster({ stored, added, exportTags, seeded } = {}) {
  if (stored && stored.version === ROSTER_VERSION && Array.isArray(stored.accounts)) {
    const accounts = [];
    const seen = new Set();
    for (const raw of stored.accounts) {
      const acc = normalizeAccount(raw);
      if (!acc || seen.has(acc.tag)) continue;
      seen.add(acc.tag);
      accounts.push(acc);
    }
    return { version: ROSTER_VERSION, accounts };
  }
  const accounts = [];
  const seen = new Set();
  const push = (acc) => {
    if (!acc || seen.has(acc.tag)) return;
    seen.add(acc.tag);
    accounts.push(acc);
  };
  const tags = Array.isArray(exportTags) ? exportTags : [];
  const hadV1 = seeded === "1" || seeded === true || (Array.isArray(added) && added.length > 0) || tags.length > 0 || !stored;
  if (hadV1) {
    for (const meta of SEED_CATALOG) push(fromSeed(meta));
  }
  for (const raw of added || []) {
    const acc = fromAdded(raw);
    if (!acc) continue;
    if (seen.has(acc.tag)) {
      const cur = accounts.find((a) => a.tag === acc.tag);
      const alias = (raw.alias || "").trim();
      if (cur && alias) cur.alias = alias;
      if (cur && raw.chip) cur.chip = raw.chip;
      continue;
    }
    push(acc);
  }
  for (const tag of tags) {
    if (seen.has(tag)) continue;
    push(normalizeAccount({ tag, alias: tag, principal: false, addedAt: 0 }));
  }
  return { version: ROSTER_VERSION, accounts };
}

export function orderAccounts(accounts, views, mode = "th") {
  const thOf = (a) => {
    const v = views && views[a.tag];
    return v && Number.isFinite(v.th) ? v.th : -1;
  };
  const pctOf = (a) => {
    const v = views && views[a.tag];
    return v && Number.isFinite(v.media) ? v.media : -1;
  };
  const nameOf = (a) => (a.alias || a.tag).toLocaleLowerCase("es");
  return accounts.slice().sort((a, b) => {
    if (mode === "nombre") {
      const byName = nameOf(a).localeCompare(nameOf(b), "es");
      return byName || a.tag.localeCompare(b.tag);
    }
    if (mode === "pct") {
      const d = pctOf(b) - pctOf(a);
      if (d) return d;
      const t = thOf(b) - thOf(a);
      return t || nameOf(a).localeCompare(nameOf(b), "es");
    }
    const t = thOf(b) - thOf(a);
    return t || nameOf(a).localeCompare(nameOf(b), "es") || a.tag.localeCompare(b.tag);
  });
}

/** Si nadie está marcada, la de TH más alto. Si hay empate, la primera por alias. */
export function featuredTag(accounts, views) {
  if (!accounts || !accounts.length) return null;
  if (accounts.some((a) => a.principal)) return null;
  let best = null;
  let bestTh = -1;
  const ranked = orderAccounts(accounts, views, "th");
  for (const a of ranked) {
    const th = views && views[a.tag] && Number.isFinite(views[a.tag].th) ? views[a.tag].th : -1;
    if (th > bestTh) {
      bestTh = th;
      best = a.tag;
    }
  }
  return bestTh >= 0 ? best : (ranked[0] ? ranked[0].tag : null);
}

export function addAccount(accounts, raw) {
  const acc = normalizeAccount(raw);
  if (!acc) return accounts.slice();
  if (accounts.some((a) => a.tag === acc.tag)) return accounts.slice();
  return accounts.concat(acc);
}

export function renameAccount(accounts, tag, alias) {
  const next = String(alias ?? "").trim();
  return accounts.map((a) => (a.tag === tag ? { ...a, alias: next || a.tag } : a));
}

export function setPrincipal(accounts, tag, principal) {
  return accounts.map((a) => (a.tag === tag ? { ...a, principal: !!principal } : a));
}

export function removeAccount(accounts, tag) {
  return accounts.filter((a) => a.tag !== tag);
}

/** Añade tags que faltan (restaurar datos incluidos) sin quitar ni pisar alias. */
export function ensureTags(accounts, tags) {
  let next = accounts.slice();
  for (const tag of tags || []) {
    if (next.some((a) => a.tag === tag)) continue;
    const seed = seedByTag(tag);
    next = addAccount(next, seed ? fromSeed(seed) : { tag, alias: tag, principal: false });
  }
  return next;
}
