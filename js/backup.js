import { madridDayKey } from "./format.js";

export function backupFilename(now = Date.now()) {
  return `clash-progreso-copia-${madridDayKey(now)}.json`;
}

export function buildBackup({ accounts, exports, now = Date.now(), version = "2.1.2" }) {
  return {
    app: "clash-progreso",
    version,
    exportedAt: new Date(now).toISOString(),
    accounts: (accounts || []).map((a) => ({
      tag: a.tag,
      alias: a.alias,
      principal: !!a.principal,
      addedAt: a.addedAt || 0,
      chip: a.chip || "",
      objetivo: a.objetivo == null ? null : a.objetivo,
    })),
    exports: (exports || []).map((exp) => ({ ...exp })),
  };
}

function keyOf(exp) {
  return `${exp.tag}\0${exp.timestamp}`;
}

/**
 * Fusiona por tag y fecha de exportación. No borra cuentas ni puntos
 * que solo estén en el iPhone, ni un alias o un Principal ya guardados.
 */
export function mergeBackup(current, incoming) {
  const accounts = (current.accounts || []).map((a) => ({ ...a }));
  const byTag = new Map(accounts.map((a) => [a.tag, a]));
  const exports = (current.exports || []).slice();
  const seen = new Set(exports.filter((e) => e && e.tag != null && e.timestamp != null).map(keyOf));
  let addedExports = 0;
  let addedAccounts = 0;
  for (const exp of (incoming && incoming.exports) || []) {
    if (!exp || typeof exp.tag !== "string" || !Number.isInteger(exp.timestamp)) continue;
    const key = keyOf(exp);
    if (seen.has(key)) continue;
    seen.add(key);
    exports.push(exp);
    addedExports += 1;
    if (!byTag.has(exp.tag)) {
      const acc = { tag: exp.tag, alias: exp.tag, principal: false, addedAt: 0, chip: "", objetivo: null };
      accounts.push(acc);
      byTag.set(exp.tag, acc);
      addedAccounts += 1;
    }
  }
  for (const raw of (incoming && incoming.accounts) || []) {
    if (!raw || typeof raw.tag !== "string" || !raw.tag.startsWith("#")) continue;
    const cur = byTag.get(raw.tag);
    if (!cur) {
      const acc = {
        tag: raw.tag,
        alias: String(raw.alias || "").trim() || raw.tag,
        principal: raw.principal === true,
        addedAt: Number(raw.addedAt) || 0,
        chip: raw.chip || "",
        objetivo: raw.objetivo == null ? null : raw.objetivo,
      };
      accounts.push(acc);
      byTag.set(raw.tag, acc);
      addedAccounts += 1;
      continue;
    }
    if ((!(cur.alias || "").trim() || cur.alias === cur.tag) && String(raw.alias || "").trim()) {
      cur.alias = String(raw.alias).trim();
    }
    if (raw.principal === true) cur.principal = true;
    if (!cur.chip && raw.chip) cur.chip = raw.chip;
    if (cur.objetivo == null && raw.objetivo != null) cur.objetivo = raw.objetivo;
  }
  return { accounts, exports, addedExports, addedAccounts };
}

/** Cancelar la hoja de compartir (AbortError) no es un error que haya que anunciar. */
export function isShareCancel(err) {
  return !!(err && err.name === "AbortError");
}
