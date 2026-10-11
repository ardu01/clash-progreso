/** Marcas del plan. No cambian niveles ni porcentajes: solo el orden de la timeline. */

export function provisionalKey(p) {
  if (!p) return "";
  return [p.tag, p.id, p.fromLvl, p.toLvl, p.instance || ""].join("|");
}

export function normalizeProvisional(raw) {
  if (!raw || typeof raw.tag !== "string" || !raw.tag.startsWith("#")) return null;
  const id = String(raw.id || "");
  const fromLvl = Number(raw.fromLvl);
  const toLvl = Number(raw.toLvl);
  if (!id || !Number.isInteger(fromLvl) || !Number.isInteger(toLvl) || toLvl !== fromLvl + 1) return null;
  return {
    tag: raw.tag,
    id,
    fromLvl,
    toLvl,
    instance: String(raw.instance || ""),
    queue: raw.queue || "constructor",
    title: String(raw.title || "Mejora"),
    markedAt: Number(raw.markedAt) || 0,
  };
}

export function toggleProvisional(list, step, tag, now) {
  const row = normalizeProvisional({
    tag,
    id: step.id,
    fromLvl: step.fromLvl,
    toLvl: step.toLvl,
    instance: step.instance,
    queue: step.queue,
    title: step.title,
    markedAt: now,
  });
  if (!row) return (list || []).slice();
  const key = provisionalKey(row);
  const cur = (list || []).map(normalizeProvisional).filter(Boolean);
  if (cur.some((p) => provisionalKey(p) === key)) return cur.filter((p) => provisionalKey(p) !== key);
  return cur.concat(row);
}

function instancesOf(exp, id) {
  if (!exp) return [];
  const sid = String(id);
  const out = [];
  for (const sec of ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets"]) {
    for (const it of exp[sec] || []) {
      if (it && String(it.data) === sid) out.push(it);
    }
  }
  return out;
}

function confirmSlots(before, after, p) {
  const prevDone = instancesOf(before, p.id).filter((it) => (it.lvl || 0) >= p.toLvl).length;
  const nextDone = instancesOf(after, p.id).filter((it) => (it.lvl || 0) >= p.toLvl).length;
  const finished = Math.max(0, nextDone - prevDone);
  const progressing = p.toLvl === p.fromLvl + 1
    ? instancesOf(after, p.id).filter((it) => {
      if ((it.lvl || 0) !== p.fromLvl) return false;
      return typeof it.timer === "number" && Number.isFinite(it.timer);
    }).length
    : 0;
  return finished + progressing;
}

/**
 * Al importar, la exportación manda. Confirmada (en curso o terminada) se quita
 * porque el dato real ya la cubre. Si no está, se quita y se avisa.
 * No escribe niveles en la exportación.
 */
export function reconcileProvisionals(list, { tag, before, after } = {}) {
  const mine = [];
  const rest = [];
  for (const raw of list || []) {
    const p = normalizeProvisional(raw);
    if (!p) continue;
    if (p.tag === tag) mine.push(p);
    else rest.push(p);
  }
  const groups = new Map();
  for (const p of mine) {
    const g = `${p.id}|${p.fromLvl}|${p.toLvl}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(p);
  }
  const avisos = [];
  for (const items of groups.values()) {
    items.sort((a, b) => (a.markedAt || 0) - (b.markedAt || 0) || provisionalKey(a).localeCompare(provisionalKey(b)));
    let slots = confirmSlots(before, after, items[0]);
    for (const p of items) {
      const tipo = slots > 0 ? "confirmada" : "descartada";
      if (slots > 0) slots -= 1;
      avisos.push({ tipo, title: p.title, id: p.id, fromLvl: p.fromLvl, toLvl: p.toLvl });
    }
  }
  return { provisionales: rest, avisos };
}

/** No borra marcas que solo están en este iPhone. */
export function mergeProvisionals(local, incoming) {
  const out = [];
  const seen = new Set();
  for (const raw of [].concat(local || [], incoming || [])) {
    const p = normalizeProvisional(raw);
    if (!p) continue;
    const key = provisionalKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function reconcileMessage(avisos) {
  const rows = avisos || [];
  if (!rows.length) return "";
  const ok = rows.filter((a) => a.tipo === "confirmada").length;
  const no = rows.filter((a) => a.tipo === "descartada").length;
  const bits = [];
  if (ok) bits.push(ok === 1 ? "1 marca confirmada con la exportación" : `${ok} marcas confirmadas con la exportación`);
  if (no) bits.push(no === 1 ? "1 marca descartada: no está en la exportación" : `${no} marcas descartadas: no están en la exportación`);
  return bits.join(". ") + ".";
}
