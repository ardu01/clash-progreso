import { madridDayKey } from "./format.js";
import { mergePlanes } from "./roadmap.js";
import { mergeProvisionals } from "./provisional.js";

export function backupFilename(now = Date.now()) {
  return `clash-progreso-copia-${madridDayKey(now)}.json`;
}

function reloj(s) {
  if (!s || typeof s !== "object") return { desde: "", hasta: "" };
  return { desde: String(s.desde || ""), hasta: String(s.hasta || "") };
}

function mergeSueno(local, incoming) {
  const a = reloj(local);
  if (a.desde || a.hasta) return a;
  return reloj(incoming);
}

function mergeDocumentos(local, incoming) {
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw || typeof raw !== "object") return;
    const id = raw.id || [raw.tipo || "", raw.tag || "", raw.creada || raw.en || ""].join("\0");
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push({ ...raw, id });
  };
  for (const raw of local || []) push(raw);
  for (const raw of incoming || []) push(raw);
  return out;
}

export function buildBackup({ accounts, exports, planes, provisionales, sueno, documentos, now = Date.now(), version = "3.0.0" }) {
  return {
    app: "clash-progreso",
    schema: 4,
    version,
    exportedAt: new Date(now).toISOString(),
    accounts: (accounts || []).map((a) => ({
      tag: a.tag,
      alias: a.alias,
      principal: !!a.principal,
      addedAt: a.addedAt || 0,
      chip: a.chip || "",
      objetivo: a.objetivo == null ? null : a.objetivo,
      grupos: Array.isArray(a.grupos) ? a.grupos : [],
      meta: a.meta && a.meta.clave ? { clave: a.meta.clave, pct: a.meta.pct } : null,
    })),
    exports: (exports || []).map((exp) => ({ ...exp })),
    planes: planes || {},
    provisionales: (provisionales || []).map((p) => ({ ...p })),
    sueno: reloj(sueno),
    documentos: mergeDocumentos(documentos, []),
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
      const acc = { tag: exp.tag, alias: exp.tag, principal: false, addedAt: 0, chip: "", objetivo: null, grupos: [] };
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
        grupos: Array.isArray(raw.grupos) ? raw.grupos : [],
        meta: raw.meta && raw.meta.clave ? { clave: raw.meta.clave, pct: raw.meta.pct } : null,
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
    if (!(cur.grupos && cur.grupos.length) && Array.isArray(raw.grupos) && raw.grupos.length) cur.grupos = raw.grupos.slice();
    if (cur.meta == null && raw.meta && raw.meta.clave) cur.meta = { clave: raw.meta.clave, pct: raw.meta.pct };
  }
  return {
    accounts,
    exports,
    addedExports,
    addedAccounts,
    planes: mergePlanes(current.planes, incoming && incoming.planes),
    provisionales: mergeProvisionals(current.provisionales, incoming && incoming.provisionales),
    sueno: mergeSueno(current.sueno, incoming && incoming.sueno),
    documentos: mergeDocumentos(current.documentos, incoming && incoming.documentos),
  };
}

/** Cancelar la hoja de compartir (AbortError) no es un error que haya que anunciar. */
export function isShareCancel(err) {
  return !!(err && err.name === "AbortError");
}
