import { levelCost, sumLevels, usesResource } from "./costs.js";
import { HEROES_FUERA } from "./plan.js";
import { provisionalKey } from "./provisional.js";
import {
  capsMaxFor, categoryKeyFor, itemName, townHallLevel, builderStatus, VILLAGE_KEYS, pctAt,
} from "./progress.js";
import { clasificarHueco, repartirColas } from "./colas.js";
import { finDe, scheduleNext } from "./schedule.js";

const STORAGES = new Set(["1000005", "1000003", "1000024"]);
const ARMY = new Set(["1000000", "1000006", "1000026", "1000007", "1000020", "1000029", "1000059", "1000014", "1000071", "1000068", "1000070"]);
const ORDER = ["laboratorio", "ejercito_edif", "heroes", "defensas", "trampas", "recursos", "muros", "mascotas"];
const SKIP_CAT = new Set(["equipamiento", "aldea", "ayuntamiento"]);
const HOME_SECTIONS = ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets"];

export const RUSH_NOTE = "No hay una lista oficial de requisitos de ayuntamiento en los datos. Rushear ordena almacenes, edificios de ejército y laboratorio hasta los máximos publicados.";
export const PLAN_TIMELINE = "Línea de tiempo de la cuenta: cada paso lleva la fecha estimada del constructor, el laboratorio o la casa de mascotas que queda libre. Si el temporizador no es un número finito, no se inventa la hora. Los héroes de #28PLGP0G2 no entran. El equipamiento no entra en este plan.";

export const DURATIONS = [
  { id: "", label: "Cualquier duración", sec: null },
  { id: "1h", label: "Hasta 1 h", sec: 3600 },
  { id: "8h", label: "Hasta 8 h", sec: 8 * 3600 },
  { id: "1d", label: "Hasta 1 día", sec: 86400 },
  { id: "3d", label: "Hasta 3 días", sec: 3 * 86400 },
  { id: "7d", label: "Hasta 7 días", sec: 7 * 86400 },
  { id: "14d", label: "Hasta 14 días", sec: 14 * 86400 },
];

export function defaultPlan() {
  return {
    modo: "maxear",
    th: null,
    ataque: false,
    defensa: false,
    muros: false,
    heroes: false,
    categoria: "",
    recurso: "todos",
    duracion: "",
  };
}

export function normalizePlan(raw) {
  const base = defaultPlan();
  if (!raw || typeof raw !== "object") return base;
  const modo = raw.modo === "rushear" ? "rushear" : "maxear";
  let th = null;
  if (raw.th != null && raw.th !== "") {
    const n = Number(raw.th);
    if (Number.isInteger(n)) th = n;
  }
  const dur = DURATIONS.some((d) => d.id === raw.duracion) ? raw.duracion : "";
  const recurso = ["todos", "oro", "elixir", "oscuro"].includes(raw.recurso) ? raw.recurso : "todos";
  return {
    modo,
    th,
    ataque: !!raw.ataque,
    defensa: !!raw.defensa,
    muros: !!raw.muros,
    heroes: !!raw.heroes,
    categoria: typeof raw.categoria === "string" ? raw.categoria : "",
    recurso,
    duracion: dur,
  };
}

export function planIsConfigured(raw) {
  return !!(raw && typeof raw === "object");
}

export function effectivePlan(raw) {
  return planIsConfigured(raw) ? normalizePlan(raw) : defaultPlan();
}

export function maxTownHall(index) {
  const keys = Object.keys((index && index.raw) || {}).map(Number).filter((n) => Number.isFinite(n));
  return keys.length ? Math.max(...keys) : 18;
}

/** TH cuyo máximo hay que alcanzar. Por encima del actual, es el TH anterior al objetivo. */
export function capTownHall(currentTh, targetTh, maxTh) {
  const current = Number.isInteger(currentTh) ? currentTh : 0;
  const top = Number.isInteger(maxTh) ? maxTh : current;
  let target = targetTh == null ? current : targetTh;
  if (!Number.isInteger(target) || target < current) target = current;
  if (target > top) target = top;
  const capTh = target > current ? target - 1 : current;
  return { target, capTh, current };
}

export function planLabel(plan, currentTh) {
  const modo = plan && plan.modo === "rushear" ? "Rushear" : "Maxear";
  if (!plan || plan.th == null || plan.th === currentTh) return `${modo} TH actual`;
  return `${modo} → TH${plan.th}`;
}

export function mergePlanes(local, incoming) {
  const out = { ...(local || {}) };
  for (const [tag, raw] of Object.entries(incoming || {})) {
    if (!tag.startsWith("#") || out[tag]) continue;
    out[tag] = normalizePlan(raw);
  }
  return out;
}

function capRow(index, id, th) {
  const table = index.byId && index.byId.get(String(id));
  return table ? table.get(th) || null : null;
}

function queueOf(categoryKey) {
  if (categoryKey === "laboratorio") return "laboratorio";
  if (categoryKey === "mascotas") return "mascotas";
  return "constructor";
}

function rushKeeps(id, categoryKey) {
  if (categoryKey === "laboratorio") return true;
  if (STORAGES.has(String(id))) return true;
  if (categoryKey === "ejercito_edif" || ARMY.has(String(id))) return true;
  return false;
}

function focusKeeps(step, plan) {
  const checks = [];
  if (plan.ataque) checks.push(step.categoryKey === "laboratorio" || step.categoryKey === "heroes" || step.categoryKey === "ejercito_edif");
  if (plan.defensa) checks.push(step.categoryKey === "defensas" || step.categoryKey === "trampas");
  if (plan.muros) checks.push(step.categoryKey === "muros");
  if (plan.heroes) checks.push(step.categoryKey === "heroes");
  if (!checks.length) return true;
  return checks.every(Boolean);
}

function titleOf(index, id, categoryKey) {
  if (categoryKey === "muros" || String(id) === "1000010") return "Muro";
  const item = index.items && index.items[String(id)];
  return itemName(item) || "Ítem";
}

function ownedInstances(exp) {
  const byId = new Map();
  const push = (id, lvl, timer, cnt) => {
    const key = String(id);
    if (!byId.has(key)) byId.set(key, []);
    const n = Math.max(1, cnt || 1);
    const timed = timer != null && n === 1;
    for (let i = 0; i < n; i += 1) {
      byId.get(key).push({ lvl: lvl || 0, timer: timed ? timer : null });
    }
  };
  for (const sec of HOME_SECTIONS) {
    for (const it of (exp && exp[sec]) || []) {
      if (!it || it.data == null) continue;
      push(it.data, it.lvl, it.timer, it.cnt);
    }
  }
  return byId;
}

function collectSteps(exp, index, plan, tag) {
  const current = townHallLevel(exp);
  const goal = capTownHall(current, plan.th, maxTownHall(index));
  const owned = ownedInstances(exp);
  const steps = [];
  const seen = new Set();
  const ids = index.byId ? [...index.byId.keys()] : [];
  for (const id of ids) {
    const item = index.items[id];
    if (!item) continue;
    const sec = item.seccion_exportacion || "";
    if (sec.endsWith("2") || sec.includes("builder") || String(item.categoria || "").includes("builder")) continue;
    if (item.categoria === "hero_equipment") continue;
    const categoryKey = categoryKeyFor(index, id, sec || "buildings");
    if (SKIP_CAT.has(categoryKey) || !VILLAGE_KEYS.includes(categoryKey)) continue;
    if (tag === HEROES_FUERA && categoryKey === "heroes") continue;
    if (plan.modo === "rushear" && !rushKeeps(id, categoryKey)) continue;
    const row = capRow(index, id, goal.capTh);
    const max = row && row.max != null ? row.max : capsMaxFor(index, id, goal.capTh);
    if (max == null) continue;
    seen.add(String(id));
    let list = (owned.get(String(id)) || []).slice();
    let want = list.length;
    if (row && row.count != null) want = row.count === 0 ? list.length : row.count;
    else if (!list.length) want = 1;
    while (list.length < want) list.push({ lvl: 0, timer: null });
    list.forEach((inst, i) => {
      let from = inst.lvl || 0;
      let notBefore = null;
      let blocked = false;
      if (inst.timer != null) {
        const hora = finDe(exp.timestamp, inst.timer);
        from += 1;
        if (hora.exacta) notBefore = hora.fin;
        else blocked = true;
      }
      const instance = `${id}#${i}`;
      for (let lv = from; lv < max; lv += 1) {
        const seconds = (() => {
          const cost = levelCost(id, lv + 1);
          if (!cost || typeof cost.s !== "number" || !Number.isFinite(cost.s)) return null;
          return cost.s;
        })();
        steps.push({
          id: String(id),
          fromLvl: lv,
          toLvl: lv + 1,
          goal: max,
          instance,
          categoryKey,
          queue: queueOf(categoryKey),
          title: titleOf(index, id, categoryKey),
          seconds,
          notBefore,
          blocked,
          provisional: false,
          markedAt: 0,
        });
      }
    });
  }
  return { steps, goal, current };
}

function applyFilters(steps, plan) {
  const dur = DURATIONS.find((d) => d.id === plan.duracion);
  const limit = dur && dur.sec != null ? dur.sec : null;
  const kept = [];
  const sinTiempo = [];
  for (const step of steps) {
    if (plan.categoria && step.categoryKey !== plan.categoria) continue;
    if (!focusKeeps(step, plan)) continue;
    if (plan.recurso && plan.recurso !== "todos" && !usesResource(step.id, step.toLvl, plan.recurso)) continue;
    if (limit != null) {
      if (step.seconds == null) {
        sinTiempo.push(step);
        continue;
      }
      if (step.seconds > limit) continue;
    }
    kept.push(step);
  }
  return { kept, sinTiempo };
}

function rankOf(step) {
  const group = ORDER.indexOf(step.categoryKey);
  const ratio = step.goal > 0 ? step.fromLvl / step.goal : 1;
  return [
    step.provisional ? 0 : 1,
    step.provisional ? step.markedAt || 0 : 0,
    group < 0 ? 99 : group,
    ratio,
    step.title,
    step.fromLvl,
    step.instance,
  ];
}

function byRank(a, b) {
  const ra = rankOf(a);
  const rb = rankOf(b);
  for (let i = 0; i < ra.length; i += 1) {
    if (ra[i] < rb[i]) return -1;
    if (ra[i] > rb[i]) return 1;
  }
  return 0;
}

function actualesFrom(exp, now) {
  const out = [];
  const push = (it, queue) => {
    if (!it || it.timer == null) return;
    const hora = finDe(exp.timestamp, it.timer);
    out.push({
      queue,
      extra: !!it.extra,
      id: String(it.data),
      done: hora.exacta && hora.fin <= now,
      exacta: hora.exacta,
      fin: hora.fin,
    });
  };
  for (const it of exp.buildings || []) push(it, "constructor");
  for (const it of exp.traps || []) push(it, "constructor");
  for (const it of exp.heroes || []) push(it, "constructor");
  for (const it of exp.guardians || []) push(it, "constructor");
  for (const it of exp.units || []) push(it, "laboratorio");
  for (const it of exp.spells || []) push(it, "laboratorio");
  for (const it of exp.siege_machines || []) push(it, "laboratorio");
  for (const it of exp.pets || []) push(it, "mascotas");
  return out;
}

function laneFrom(id, cola, titulo, cur, now) {
  return { id, cola, titulo, ...clasificarHueco(cur, now) };
}

function makeLanes(exp, now, th) {
  const actuales = actualesFrom(exp, now);
  const partes = repartirColas(actuales, {
    builders: builderStatus(exp),
    now,
    mascotas: th >= 14,
  });
  const slots = partes.mascotas
    ? [...partes.constructores, partes.laboratorio, partes.mascotas]
    : [...partes.constructores, partes.laboratorio];
  return {
    lanes: slots.map((s) => laneFrom(s.id, s.cola, s.titulo, s.cur, now)),
    avisoHora: partes.avisoHora,
    conocidos: partes.known,
  };
}

function placeStep(step, lanes, sleep, now, cursor) {
  const chain = cursor.get(step.instance) || null;
  const pool = lanes.filter((lane) => lane.cola === step.queue);
  const base = {
    ...step,
    key: `${step.id}:${step.fromLvl}:${step.toLvl}:${step.instance}`,
    laneId: null,
    inicio: null,
    fin: null,
    sinHora: false,
    sinDuracion: step.seconds == null,
    finEnSueno: false,
  };
  if (!pool.length || step.blocked || (chain && chain.blocked)) {
    cursor.set(step.instance, { blocked: true, at: null });
    return { ...base, sinHora: true };
  }
  const open = pool.slice().sort((a, b) => Number(a.blocked) - Number(b.blocked) || a.freeAt - b.freeAt);
  const lane = open[0];
  if (lane.blocked) {
    cursor.set(step.instance, { blocked: true, at: null });
    return { ...base, sinHora: true, laneId: lane.id };
  }
  const earliest = Math.max(lane.freeAt, step.notBefore || 0, chain && chain.at ? chain.at : 0, now);
  const plan = scheduleNext(earliest, step.seconds, sleep);
  if (plan.fin == null) {
    lane.blocked = true;
    cursor.set(step.instance, { blocked: true, at: null });
    return { ...base, ...plan, sinHora: false, laneId: lane.id };
  }
  lane.freeAt = plan.fin;
  cursor.set(step.instance, { blocked: false, at: plan.fin });
  return { ...base, ...plan, sinHora: false, laneId: lane.id };
}

function bagOf(steps) {
  let total = null;
  for (const step of steps) {
    const part = sumLevels(step.id, step.fromLvl, step.toLvl, 1);
    total = total ? {
      oro: total.oro + part.oro,
      elixir: total.elixir + part.elixir,
      oscuro: total.oscuro + part.oscuro,
      muros: total.muros + part.muros,
      segConstructor: total.segConstructor + part.segConstructor,
      segLaboratorio: total.segLaboratorio + part.segLaboratorio,
      segMascotas: total.segMascotas + part.segMascotas,
      sinCoste: total.sinCoste + part.sinCoste,
      brillante: 0,
      resplandeciente: 0,
      estelar: 0,
      segHerreria: 0,
    } : part;
  }
  if (!total) {
    return {
      oro: 0, elixir: 0, oscuro: 0, muros: 0, brillante: 0, resplandeciente: 0, estelar: 0,
      segConstructor: 0, segLaboratorio: 0, segMascotas: 0, segHerreria: 0, sinCoste: 0,
    };
  }
  total.diasConstructor = Math.round((total.segConstructor / 86400) * 10) / 10;
  return total;
}

export function buildRoadmap({ exp, index, tag, plan, provisionals, sleep, now }) {
  const chosen = effectivePlan(plan);
  const nowMs = now || Date.now();
  const { steps, goal, current } = collectSteps(exp, index, chosen, tag);
  const marks = new Map();
  for (const raw of provisionals || []) {
    if (!raw || raw.tag !== tag) continue;
    marks.set(provisionalKey(raw), raw);
  }
  for (const step of steps) {
    const key = provisionalKey({
      tag, id: step.id, fromLvl: step.fromLvl, toLvl: step.toLvl, instance: step.instance,
    });
    const mark = marks.get(key);
    if (!mark) continue;
    step.provisional = true;
    step.markedAt = mark.markedAt || 0;
  }
  const origenBase = planIsConfigured(plan) ? "planificado" : "recomendado";
  for (const step of steps) step.origen = step.provisional ? "provisional" : origenBase;
  const filtered = applyFilters(steps, chosen);
  filtered.kept.sort(byRank);
  const { lanes, avisoHora, conocidos } = makeLanes(exp, nowMs, current || 0);
  const cursor = new Map();
  const orden = filtered.kept.map((step) => placeStep(step, lanes, sleep, nowMs, cursor));
  const lastFin = orden.reduce((m, s) => (s.fin != null && s.fin > m ? s.fin : m), 0);
  return {
    tag,
    plan: chosen,
    configured: planIsConfigured(plan),
    currentTh: current,
    targetTh: goal.target,
    capTh: goal.capTh,
    lanes,
    orden,
    sinTiempo: filtered.sinTiempo,
    coste: bagOf(orden),
    avisoHora,
    conocidos,
    heroesFuera: tag === HEROES_FUERA,
    fin: lastFin || null,
    now: nowMs,
  };
}

/** Siguiente paso de cada cola que está libre ahora. */
export function ahoraDe(roadmap) {
  const out = [];
  for (const lane of roadmap.lanes || []) {
    if (!lane.libreYa) continue;
    if (lane.cola !== "constructor" && lane.cola !== "laboratorio" && lane.cola !== "mascotas") continue;
    const step = (roadmap.orden || []).find((s) => s.laneId === lane.id);
    if (!step) continue;
    out.push({
      cola: lane.cola,
      titulo: lane.titulo,
      title: step.title,
      fromLvl: step.fromLvl,
      toLvl: step.toLvl,
      fin: step.fin,
      inicio: step.inicio,
      sinDuracion: !!step.sinDuracion,
      sinHora: !!step.sinHora,
      provisional: !!step.provisional,
      id: step.id,
      key: step.key,
    });
  }
  return out;
}

export function timelineRows(orden, limit = 40) {
  const rows = [];
  for (const step of orden || []) {
    const last = rows[rows.length - 1];
    const same = last
      && last.id === step.id
      && last.fromLvl === step.fromLvl
      && last.toLvl === step.toLvl
      && last.provisional === step.provisional
      && last.categoryKey === "muros";
    if (same) {
      last.cnt += 1;
      last.fin = step.fin != null ? step.fin : last.fin;
      last.keys.push(step.key);
      continue;
    }
    rows.push({ ...step, cnt: 1, keys: [step.key] });
  }
  return {
    rows: rows.slice(0, limit),
    ocultas: Math.max(0, rows.length - limit),
    grupos: rows.length,
    pasos: (orden || []).length,
  };
}

const CAT_LABEL = {
  defensas: "Defensas",
  laboratorio: "Laboratorio",
  ejercito_edif: "Ejército",
  mascotas: "Mascotas",
  heroes: "Héroes",
  trampas: "Trampas",
  recursos: "Recursos",
  muros: "Muros",
};

/** Aviso al subir de TH: categorías por debajo del 50 % del máximo del TH anterior. */
export function rushGaps(rows, index, tag) {
  const list = (rows || []).filter((e) => e && e.tag === tag).slice().sort((a, b) => a.timestamp - b.timestamp);
  if (list.length < 2) return [];
  const prev = list[list.length - 2];
  const next = list[list.length - 1];
  const thPrev = townHallLevel(prev);
  const thNext = townHallLevel(next);
  if (thPrev == null || thNext == null || thNext <= thPrev) return [];
  const scores = pctAt(next, index, thPrev);
  const out = [];
  for (const key of VILLAGE_KEYS) {
    if (key === "heroes" && tag === HEROES_FUERA) continue;
    const value = scores[key];
    if (value == null || value >= 50) continue;
    out.push({ key, label: CAT_LABEL[key] || key, pct: value, th: thPrev });
  }
  return out;
}
