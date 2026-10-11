/** Sesión «Actualizar todas»: orden congelado, progreso y pegado por etiqueta. */

export const SESSION_KEY = "cp-actualizar";

const KINDS = { ready: 3, older: 2, duplicate: 1 };

export function compareOrden(a, b) {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.sortWhen !== b.sortWhen) return a.sortWhen - b.sortWhen;
  if (!!a.principal !== !!b.principal) return a.principal ? -1 : 1;
  return String(a.nombre).localeCompare(String(b.nombre), "es");
}

/** El mismo criterio que «Abrir hoy», aplicado a todas las cuentas. */
export function ordenDeSesion(entries) {
  return entries.slice().sort(compareOrden).map((e) => e.tag);
}

export function blankSession(order, now = Date.now()) {
  return {
    v: 1,
    status: "open",
    startedAt: now,
    order: order.slice(),
    done: {},
    pending: "",
  };
}

export function parseSession(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.v !== 1) return null;
  if (raw.status !== "open" && raw.status !== "done") return null;
  if (!Array.isArray(raw.order)) return null;
  const order = raw.order.map(String).filter((tag) => tag.startsWith("#"));
  const src = raw.done && typeof raw.done === "object" ? raw.done : {};
  const done = {};
  for (const tag of order) {
    const row = src[tag];
    if (!row || typeof row !== "object") continue;
    if (row.kind !== "ready" && row.kind !== "duplicate" && row.kind !== "older") continue;
    done[tag] = {
      at: Number(row.at) || 0,
      kind: row.kind,
      changed: row.kind === "ready",
      timestamp: row.timestamp == null ? null : Number(row.timestamp),
    };
  }
  return {
    v: 1,
    status: raw.status,
    startedAt: Number(raw.startedAt) || 0,
    order,
    done,
    pending: typeof raw.pending === "string" ? raw.pending : "",
  };
}

export function readSession(storage) {
  try {
    return parseSession(JSON.parse(storage.getItem(SESSION_KEY) || "null"));
  } catch {
    return null;
  }
}

export function writeSession(storage, session) {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage) {
  storage.removeItem(SESSION_KEY);
}

export function withPending(session, text) {
  return {
    v: 1,
    status: session.status,
    startedAt: session.startedAt,
    order: session.order.slice(),
    done: { ...session.done },
    pending: String(text ?? ""),
  };
}

export function progressOf(session) {
  const total = session.order.length;
  const done = session.order.filter((tag) => session.done[tag]).length;
  return { done, total, label: `${done}/${total}` };
}

export function nextOf(session) {
  return session.order.find((tag) => !session.done[tag]) || null;
}

/**
 * Marca las cuentas de esta lista cuyo JSON trae su etiqueta.
 * Una etiqueta de fuera no se añade. Un texto inválido no cuenta como hecha.
 * `pending` no se borra: quien guarda en IndexedDB lo quita solo si el guardado terminó.
 */
export function recordPaste(session, items, now = Date.now()) {
  const allowed = new Set(session.order);
  const done = { ...session.done };
  const save = [];
  const seen = new Set();
  const notes = [];
  for (const it of items || []) {
    if (!it || it.kind === "invalid" || !it.value) {
      notes.push({ tag: null, kind: "invalid" });
      continue;
    }
    const tag = it.value.tag;
    if (!allowed.has(tag) || it.kind === "new" || !KINDS[it.kind]) {
      notes.push({ tag: tag || null, kind: "refused" });
      continue;
    }
    const prev = done[tag];
    if (!prev || KINDS[it.kind] >= KINDS[prev.kind]) {
      done[tag] = {
        at: now,
        kind: it.kind,
        changed: it.kind === "ready",
        timestamp: it.value.timestamp,
      };
    }
    notes.push({ tag, kind: it.kind });
    if (it.kind === "ready" || it.kind === "older") {
      const key = tag + "\0" + it.value.timestamp;
      if (!seen.has(key)) {
        seen.add(key);
        save.push(it);
      }
    }
  }
  const next = {
    v: 1,
    status: session.status,
    startedAt: session.startedAt,
    order: session.order.slice(),
    done,
    pending: session.pending,
  };
  if (next.order.length && next.order.every((tag) => next.done[tag])) next.status = "done";
  return { session: next, save, notes };
}

export function summaryOf(session) {
  const changed = [];
  const same = [];
  const history = [];
  const missing = [];
  for (const tag of session.order) {
    const row = session.done[tag];
    if (!row) missing.push(tag);
    else if (row.kind === "ready") changed.push(tag);
    else if (row.kind === "older") history.push(tag);
    else same.push(tag);
  }
  return { changed, same, history, missing };
}

export function mensajePegado(notes, nameOf) {
  const list = notes || [];
  const ok = list.filter((n) => n.kind === "ready" || n.kind === "duplicate" || n.kind === "older");
  const name = (tag) => {
    try {
      return (nameOf && nameOf(tag)) || tag;
    } catch {
      return tag;
    }
  };
  if (!ok.length) {
    if (list.some((n) => n.kind === "refused")) return "Esa etiqueta no está en esta lista. No se añade una cuenta nueva.";
    return "Ese texto no es una exportación de una cuenta.";
  }
  let msg;
  if (ok.length === 1) {
    const n = ok[0];
    const quien = name(n.tag);
    if (n.kind === "ready") msg = `${quien} actualizada`;
    else if (n.kind === "older") msg = `${quien} al histórico`;
    else msg = `${quien} sin cambios`;
  } else {
    const ready = ok.filter((n) => n.kind === "ready").length;
    const older = ok.filter((n) => n.kind === "older").length;
    const dup = ok.filter((n) => n.kind === "duplicate").length;
    const parts = [];
    if (ready) parts.push(ready === 1 ? "1 cambió" : `${ready} cambiaron`);
    if (dup) parts.push(dup === 1 ? "1 sin cambios" : `${dup} sin cambios`);
    if (older) parts.push(older === 1 ? "1 al histórico" : `${older} al histórico`);
    msg = parts.join(" · ");
  }
  if (list.some((n) => n.kind === "refused")) msg += " Una etiqueta de fuera de la lista no se añade.";
  return msg;
}

export function isStandalone(nav, match) {
  const box = nav || {};
  if (box.standalone === true) return true;
  try {
    const ask = match || (typeof window !== "undefined" && window.matchMedia && window.matchMedia.bind(window));
    return !!(ask && ask("(display-mode: standalone)").matches);
  } catch {
    return false;
  }
}
