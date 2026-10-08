import { parseLoose } from "./parse.js";
import {
  analyze, capsMaxFor, categoryKeyFor, categoryOrder, outsidePct, presentItem, upgradesOf,
} from "./progress.js";
import { fmtFin, fmtNum, fmtPct } from "./format.js";

const SECTIONS = ["buildings", "traps", "units", "spells", "siege_machines", "heroes", "pets", "equipment", "guardians", "heroes2", "units2"];
const WALL = "1000010";
const TH = "1000001";
const CRAFT = "1000097";

const CAT_LABEL = {
  defensas: "Defensas",
  laboratorio: "Laboratorio",
  ejercito_edif: "Ejército",
  equipamiento: "Equipamiento",
  mascotas: "Mascotas",
  heroes: "Héroes",
  trampas: "Trampas",
  recursos: "Recursos",
  muros: "Muros",
  aldea: "Aldea del constructor",
  ayuntamiento: "Ayuntamiento",
};

export const PASTE_DENIED = {
  ok: false,
  title: "No se ha pegado nada",
  msg: "iOS necesita que confirmes el pegado.",
  help: "Al tocar Pegar aparece un globo «Pegar» encima del botón: tócalo. También puedes mantener pulsado el cuadro de texto.",
};

export const FOREIGN_HELP = "Si es una cuenta tuya nueva, añádela. Si copiaste desde otra cuenta por error, cambia de cuenta en el juego y vuelve a copiar.";
export const DUPLICATE_HELP = "Si has cambiado algo en el juego, vuelve a copiar: cada copia lleva su propia hora.";
export const STRUCTURE_HELP = "Vuelve a Clash of Clans y toca Copiar otra vez en Exportar datos.";
export const FIRST_FOOT = "Primera exportación de esta cuenta en este iPhone.";
export const NO_CHANGE_FOOT = "Sin cambios desde el último punto. Se añadirá igualmente un punto a Evolución.";
export const EVOLUTION_FOOT = "Al importar se añade un punto a Evolución.";
export const NEW_FOOT = "No es una de tus cuentas. Tócala si quieres añadirla; si no, no se importa.";
export const DUP_FOOT = "Misma cuenta y misma hora que una ya guardada.";
export const BAD_FOOT = "No es una exportación válida.";

export function foreignMsg(tag) {
  return `${tag} no es una de tus cuentas.`;
}

export function duplicateMsg(ts) {
  return `Duplicada: ya hay una exportación de esta cuenta con la misma hora (${fmtFin(ts * 1000)}). Se descarta.`;
}

export function olderWarning(ts) {
  return `Es más antigua que la última guardada (${fmtFin(ts * 1000)}).`;
}

export function olderHelp(ts) {
  return `Se añadirá solo al histórico. Roster, Progreso y Mejoras seguirán con la del ${fmtFin(ts * 1000)}.`;
}

export function unknownMsg(n) {
  if (n === 1) return "1 ítem sin identificar: se guarda igual.";
  return `${n} ítems sin identificar: se guardan igual.`;
}

export function overMaxMsg(n) {
  if (n === 1) return "1 nivel supera el máximo conocido: cuenta como máximo.";
  return `${n} niveles superan el máximo conocido: cuenta como máximo.`;
}

export function structureIssues(value) {
  const issues = [];
  const obj = value && typeof value === "object" && !Array.isArray(value) ? value : null;
  if (!obj || typeof obj.tag !== "string" || !obj.tag.startsWith("#")) issues.push("Falta el tag de la cuenta.");
  if (!obj || !Number.isInteger(obj.timestamp)) issues.push("Falta la fecha de exportación.");
  const th = obj && (obj.buildings || []).find((b) => b && b.data === 1000001);
  if (!th || th.lvl == null) issues.push("No se encuentra el ayuntamiento.");
  return issues;
}

function addLevel(map, section, id, lvl, cnt) {
  const key = section + ":" + id;
  const cur = map.get(key) || { section, id: String(id), cnt: 0, sum: 0, parts: [] };
  const c = cnt || 1;
  const lv = lvl || 0;
  cur.cnt += c;
  cur.sum += lv * c;
  cur.parts.push({ lvl: lv, cnt: c });
  map.set(key, cur);
}

function levelsOf(exp) {
  const map = new Map();
  const walls = { cnt: 0, sum: 0, parts: [] };
  for (const sec of SECTIONS) {
    for (const it of exp[sec] || []) {
      if (!it || it.data == null) continue;
      const id = String(it.data);
      if (sec === "buildings" && id === WALL) {
        const c = it.cnt || 1;
        walls.cnt += c;
        walls.sum += (it.lvl || 0) * c;
        walls.parts.push({ lvl: it.lvl || 0, cnt: c });
        continue;
      }
      if (sec === "buildings" && id === TH) continue;
      if (sec === "buildings" && id === CRAFT) {
        for (const t of it.types || []) {
          for (const m of t.modules || []) addLevel(map, "crafting_modules", m.data, m.lvl, 1);
        }
        continue;
      }
      addLevel(map, sec, it.data, it.lvl, it.cnt || 1);
    }
  }
  return { map, walls };
}

function expand(bag) {
  const out = [];
  for (const p of bag.parts) {
    for (let i = 0; i < p.cnt; i += 1) out.push(p.lvl);
  }
  out.sort((a, b) => a - b);
  return out;
}

function containsMultiset(prev, next) {
  const rest = expand(next);
  for (const lv of expand(prev)) {
    const i = rest.indexOf(lv);
    if (i < 0) return false;
    rest.splice(i, 1);
  }
  return true;
}

function singleShift(prev, next) {
  const a = expand(prev);
  const b = expand(next);
  if (!a.length || a.length !== b.length) return null;
  let diff = -1;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    if (diff >= 0) return null;
    diff = i;
  }
  if (diff < 0) return null;
  return { from: a[diff], to: b[diff] };
}

function changeText(prev, next) {
  if (!next) return null;
  if (!prev) return "Nuevo";
  if (prev.sum === next.sum && prev.cnt === next.cnt) return null;
  if (next.cnt > prev.cnt && containsMultiset(prev, next)) return "Nuevo";
  if (prev.cnt === next.cnt) {
    const one = singleShift(prev, next);
    if (one) return `Nv ${one.from} → ${one.to}`;
  }
  const d = next.sum - prev.sum;
  if (!d) return null;
  const n = Math.abs(d);
  const word = n === 1 ? "nivel" : "niveles";
  return d > 0 ? `+${n} ${word}` : `−${n} ${word}`;
}

function wallChange(prev, next) {
  const d = next.sum - prev.sum;
  if (!d) return null;
  const n = Math.abs(d);
  const word = n === 1 ? "nivel" : "niveles";
  return d > 0 ? `+${n} ${word}` : `−${n} ${word}`;
}

function activeUps(exp, now) {
  return upgradesOf(exp).filter((u) => u.end > now);
}

function mediaDelta(from, to) {
  if (from == null || to == null) return null;
  const diff = to - from;
  if (Math.abs(diff) < 0.05) return { text: "sin cambio", dir: "flat" };
  const rounded = Math.round(diff * 10) / 10;
  if (rounded > 0) return { text: "+" + fmtNum(rounded), dir: "up" };
  if (rounded < 0) return { text: "−" + fmtNum(Math.abs(rounded)), dir: "down" };
  return { text: "sin cambio", dir: "flat" };
}

function countUnknown(exp, index, th) {
  let n = 0;
  const { map } = levelsOf(exp);
  for (const bag of map.values()) {
    if (outsidePct(index, bag.id, th)) n += bag.cnt;
  }
  return n;
}

function countOverMax(exp, index, th) {
  let n = 0;
  const { map, walls } = levelsOf(exp);
  const add = (id, parts) => {
    const max = capsMaxFor(index, id, th);
    if (max == null) return;
    for (const p of parts) if (p.lvl > max) n += p.cnt;
  };
  for (const bag of map.values()) add(bag.id, bag.parts);
  add(WALL, walls.parts);
  return n;
}

export function diffExports(prev, next, index, now = Date.now()) {
  const aPrev = prev ? analyze(prev, index) : null;
  const aNext = analyze(next, index);
  const rows = [];
  let levelDelta = 0;
  if (prev) {
    const A = levelsOf(prev);
    const B = levelsOf(next);
    const keys = new Set([...A.map.keys(), ...B.map.keys()]);
    for (const key of keys) {
      const pb = A.map.get(key) || null;
      const nb = B.map.get(key) || null;
      const text = changeText(pb, nb);
      if (!text) continue;
      const src = nb || pb;
      levelDelta += (nb ? nb.sum : 0) - (pb ? pb.sum : 0);
      const cat = categoryKeyFor(index, src.id, src.section);
      const pres = presentItem(index, src.id);
      rows.push({
        id: src.id,
        title: pres.title,
        unknown: pres.unknown,
        mark: pres.mark,
        change: text,
        category: CAT_LABEL[cat] || cat,
        categoryKey: cat,
        section: src.section,
      });
    }
    const wtext = wallChange(A.walls, B.walls);
    if (wtext) {
      levelDelta += B.walls.sum - A.walls.sum;
      rows.push({
        id: WALL,
        title: "Muro",
        unknown: false,
        mark: null,
        change: wtext,
        category: "Muros",
        categoryKey: "muros",
        section: "buildings",
      });
    }
  }
  rows.sort((x, y) => {
    const d = categoryOrder(x.categoryKey) - categoryOrder(y.categoryKey);
    if (d) return d;
    return x.title.localeCompare(y.title, "es");
  });
  const upsPrev = prev ? activeUps(prev, now) : [];
  const upsNext = activeUps(next, now);
  const thFrom = aPrev ? aPrev.th : null;
  const thTo = aNext.th;
  const thUp = thFrom != null && thTo != null && thTo > thFrom;
  return {
    first: !prev,
    noChanges: !!prev && rows.length === 0 && !thUp,
    itemChanges: rows.length > 0,
    thFrom,
    thTo,
    thUp,
    mediaFrom: aPrev ? aPrev.media : null,
    mediaTo: aNext.media,
    delta: mediaDelta(aPrev ? aPrev.media : null, aNext.media),
    mediaDown: aPrev && aPrev.media != null && aNext.media != null && aNext.media < aPrev.media,
    upsFrom: upsPrev.length,
    upsTo: upsNext.length,
    nextAt: upsNext.length ? upsNext[0].end : null,
    eqCount: (next.equipment || []).length,
    rows: rows.slice(0, 8),
    more: Math.max(0, rows.length - 8),
    totalChanges: rows.length,
    levelDelta,
    unknownCount: countUnknown(next, index, aNext.th),
    overMaxCount: countOverMax(next, index, aNext.th),
    view: aNext,
  };
}

function newestOf(rows) {
  return rows.slice().sort((a, b) => b.timestamp - a.timestamp)[0] || null;
}

/**
 * Clasifica un lote. El orden de cada archivo es el de §8.5:
 * leer → estructura → tag conocido → duplicado [tag, timestamp] → más antigua → lista.
 * Un duplicado no calcula cambios: no llega a mostrar un nivel por encima del máximo.
 */
export function classifyEntries(entries, ctx) {
  const accounts = ctx.accounts || [];
  const known = new Map(accounts.map((a) => [a.tag, a]));
  const storedByTag = new Map();
  for (const row of ctx.rows || []) {
    if (!storedByTag.has(row.tag)) storedByTag.set(row.tag, []);
    storedByTag.get(row.tag).push(row);
  }
  const items = entries.map((entry) => {
    const parsed = parseLoose(entry.text, entry.source || "clipboard");
    if (!parsed.ok) {
      return { name: entry.name || "Pegado", kind: "invalid", parseError: parsed, value: null, skip: true };
    }
    const issues = structureIssues(parsed.value);
    if (issues.length) {
      return {
        name: entry.name || "Pegado",
        kind: "invalid",
        value: parsed.value,
        issues,
        structural: true,
        skip: true,
      };
    }
    return { name: entry.name || "Pegado", kind: "pending", value: parsed.value };
  });

  const groups = new Map();
  for (const it of items) {
    if (it.kind !== "pending") continue;
    const tag = it.value.tag;
    if (!known.has(tag)) {
      it.kind = "new";
      it.skip = true;
      it.known = null;
      it.changes = diffExports(null, it.value, ctx.index, ctx.now);
      it.first = true;
      it.prevTimestamp = null;
      continue;
    }
    it.known = known.get(tag);
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag).push(it);
  }

  for (const [tag, list] of groups) {
    const stored = storedByTag.get(tag) || [];
    const storedTs = new Set(stored.map((r) => r.timestamp));
    const seen = new Set();
    const keep = [];
    for (const it of list) {
      const ts = it.value.timestamp;
      if (storedTs.has(ts) || seen.has(ts)) {
        it.kind = "duplicate";
        it.skip = true;
        it.changes = null;
        it.duplicateAt = ts;
        it.prevTimestamp = ts;
        continue;
      }
      seen.add(ts);
      keep.push(it);
    }
    if (!keep.length) continue;
    keep.sort((a, b) => b.value.timestamp - a.value.timestamp);
    const batchMax = keep[0].value.timestamp;
    const newest = newestOf(stored);
    for (const it of keep) {
      const ts = it.value.timestamp;
      const updates = !newest || batchMax > newest.timestamp;
      const isWinner = updates && ts === batchMax;
      if (isWinner && !newest) {
        it.kind = "ready";
        it.first = true;
        it.prevTimestamp = null;
        it.changes = diffExports(null, it.value, ctx.index, ctx.now);
      } else if (isWinner) {
        it.kind = "ready";
        it.prevTimestamp = newest.timestamp;
        it.changes = diffExports(newest, it.value, ctx.index, ctx.now);
      } else {
        it.kind = "older";
        it.historical = true;
        it.skip = false;
        const ref = newest && newest.timestamp > batchMax ? newest : keep[0].value;
        it.refTimestamp = ref.timestamp;
        it.prevTimestamp = newest ? newest.timestamp : null;
        if (ref && ref.timestamp > it.value.timestamp) {
          it.changes = diffExports(it.value, ref, ctx.index, ctx.now);
          it.changes.view = analyze(it.value, ctx.index);
          it.changes.eqCount = (it.value.equipment || []).length;
        } else {
          it.changes = diffExports(null, it.value, ctx.index, ctx.now);
        }
      }
    }
  }
  return items;
}

/** Puntos que sí se guardan. Un duplicado o una cuenta nueva no añaden fila. */
export function acceptedExports(existing, items) {
  const out = existing.slice();
  const keys = new Set(existing.map((r) => r.tag + "\0" + r.timestamp));
  for (const it of items) {
    if (!it.value || (it.kind !== "ready" && it.kind !== "older")) continue;
    const key = it.value.tag + "\0" + it.value.timestamp;
    if (keys.has(key)) continue;
    out.push(it.value);
    keys.add(key);
  }
  return out;
}

export function trailingLabel(item) {
  if (item.kind === "duplicate") return "Duplicada";
  if (item.kind === "invalid") return "No válido";
  if (item.kind === "new") return "Añadir…";
  if (item.kind === "older") return "Más antigua";
  if (item.first) return "Primera";
  const d = item.changes ? item.changes.levelDelta : 0;
  const changes = item.changes ? item.changes.totalChanges : 0;
  if (!changes || !d) return "Sin cambios";
  const n = Math.abs(d);
  const word = n === 1 ? "nivel" : "niveles";
  return d > 0 ? `+${n} ${word}` : `−${n} ${word}`;
}

export function batchSummary(items) {
  const n = items.length;
  const parts = [n === 1 ? "1 archivo" : `${n} archivos`];
  const ready = items.filter((i) => i.kind === "ready" || i.kind === "older").length;
  parts.push(ready === 1 ? "1 listo" : `${ready} listos`);
  const neu = items.filter((i) => i.kind === "new").length;
  if (neu === 1) parts.push("1 cuenta nueva");
  else if (neu > 1) parts.push(`${neu} cuentas nuevas`);
  const dup = items.filter((i) => i.kind === "duplicate").length;
  if (dup === 1) parts.push("1 duplicada");
  else if (dup > 1) parts.push(`${dup} duplicadas`);
  const bad = items.filter((i) => i.kind === "invalid").length;
  if (bad === 1) parts.push("1 no válido");
  else if (bad > 1) parts.push(`${bad} no válidos`);
  return parts.join(" · ");
}

export function importCount(items) {
  return items.filter((i) => i.kind === "ready" || i.kind === "older").length;
}

export function successToast(items) {
  const updates = items.filter((i) => i.kind === "ready");
  const older = items.filter((i) => i.kind === "older");
  const name = (it) => (it.known && (it.known.nombre || it.known.alias)) || it.value.tag;
  if (updates.length === 1 && !older.length) return `${name(updates[0])} actualizada`;
  if (!updates.length && older.length === 1) return `Añadida al histórico de ${name(older[0])}`;
  if (updates.length && older.length) {
    const u = updates.length === 1 ? "1 cuenta actualizada" : `${updates.length} cuentas actualizadas`;
    return `${u} · ${older.length} al histórico`;
  }
  if (updates.length > 1) return `${updates.length} cuentas actualizadas`;
  if (older.length > 1) return `${older.length} al histórico`;
  return "Importación guardada";
}

export function addedToast(label) {
  return `Cuenta añadida: ${label}`;
}

export function sortBatch(items, accounts) {
  const order = new Map((accounts || []).map((a, i) => [a.tag, i]));
  return items.slice().sort((a, b) => {
    const ta = a.value && a.value.tag;
    const tb = b.value && b.value.tag;
    const ia = ta != null && order.has(ta) ? order.get(ta) : 1000 + (a.kind === "invalid" ? 1 : 0);
    const ib = tb != null && order.has(tb) ? order.get(tb) : 1000 + (b.kind === "invalid" ? 1 : 0);
    if (ia !== ib) return ia - ib;
    if (ta !== tb) return String(ta || a.name || "").localeCompare(String(tb || b.name || ""));
    const tsa = a.value ? a.value.timestamp : 0;
    const tsb = b.value ? b.value.timestamp : 0;
    return tsb - tsa;
  });
}

export function statusText(item) {
  if (!item || !item.value || !item.known) return "";
  if (item.kind === "ready" || item.kind === "older") {
    const name = item.known.nombre || item.value.tag;
    return `Exportación de ${name} lista para importar`;
  }
  return "";
}

export function mediaLine(changes) {
  if (!changes || changes.mediaTo == null) return "";
  if (changes.mediaFrom == null) return fmtPct(changes.mediaTo);
  if (changes.delta && changes.delta.dir === "flat") return `${fmtPct(changes.mediaTo)} · sin cambio`;
  return `${fmtPct(changes.mediaFrom)} → ${fmtPct(changes.mediaTo)}`;
}

/**
 * Motivo corto de un archivo no válido, sin el punto final: solo el primero.
 * Texto que no empieza por «{»: «Empieza por «muestra»» (la muestra de clipPreview).
 */
export function omitReason(item) {
  const pe = item && item.parseError;
  let reason = "";
  if (pe && pe.preview) reason = `Empieza por «${pe.preview}»`;
  else if (pe && pe.msg) reason = pe.msg;
  else if (item && item.issues && item.issues.length) reason = item.issues[0];
  return reason.replace(/\.$/, "");
}

/** Subtítulo de la fila «No válido»: archivo y primer motivo; « ·» va pegado al nombre. */
export function omitSubtitle(item) {
  const name = item && item.name ? item.name : "";
  const reason = omitReason(item);
  if (name && reason) return `${name}\u00a0· ${reason}`;
  return name || reason;
}
