import { addBags, levelCost, sumLevels, usesResource } from "./costs.js";
import { HEROES_FUERA } from "./plan.js";
import { provisionalKey } from "./provisional.js";
import {
  HERO_ORDER, capsMaxFor, categoryKeyFor, itemName, townHallLevel, builderStatus, VILLAGE_KEYS, pctAt,
} from "./progress.js";
import { clasificarHueco, repartirColas } from "./colas.js";
import { finDe, scheduleNext } from "./schedule.js";

const ORDER = ["laboratorio", "ejercito_edif", "heroes", "defensas", "trampas", "recursos", "muros", "mascotas"];
const SKIP_CAT = new Set(["equipamiento", "aldea", "ayuntamiento"]);
const HOME_SECTIONS = ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets"];

export const RUSH_NOTE = "Rush esencial pide solo lo obligatorio para poder mejorar el ayuntamiento. Rush estratégico suma sugerencias editables: laboratorio, campamento, castillo, héroes, fábricas, almacenes y la caseta de animales si ese ayuntamiento la tiene. El tiempo se reparte entre los constructores de la cuenta. Los requisitos son provisionales.";
export const ESENCIAL_NOTA = "Solo el mínimo obligatorio para poder mejorar el ayuntamiento: los requisitos del juego y nada más. Provisional, porque los datos no traen esa tabla.";
export const ESTRATEGICO_NOTA = "El mínimo obligatorio más las sugerencias que sigan activas. Cada una se puede quitar. La sugerencia no es un requisito del juego.";

/** Sugerencias del rush estratégico. El id «heroes» agrupa a todos los héroes. */
export const SUGERENCIAS_RUSH = [
  { id: "1000007", razon: "Abre las tropas del ayuntamiento nuevo. Conviene llevar el edificio al máximo del anterior, no cada tropa." },
  { id: "1000000", razon: "El tamaño del ejército. Un campamento corto limita el ataque aunque el ayuntamiento ya pueda subir." },
  { id: "1000014", razon: "No hace falta para mejorar el ayuntamiento, pero el espacio de refuerzos no debería quedarse atrás." },
  { id: "heroes", razon: "El ataque depende de ellos. La sugerencia sube cada héroe al máximo del ayuntamiento anterior." },
  { id: "1000006", razon: "Fábrica de tropas. Sin el cuartel al día, el laboratorio nuevo no se aprovecha." },
  { id: "1000026", razon: "Fábrica de tropas oscuras. Mismo criterio que el cuartel." },
  { id: "1000020", razon: "Fábrica de hechizos. Conviene no dejarla en el mínimo." },
  { id: "1000029", razon: "Fábrica de hechizos oscuros. Solo entra si ese ayuntamiento ya la tiene." },
  { id: "1000059", razon: "Fábrica de máquinas de asedio. Solo entra si ese ayuntamiento ya tiene taller." },
  { id: "1000005", razon: "Sin sitio para el oro, las mejoras largas se paran aunque haya constructores libres." },
  { id: "1000003", razon: "Sin sitio para el elixir, pasa lo mismo que con el oro." },
  { id: "1000024", razon: "Héroes y tropas oscuras lo gastan. Conviene no dejar el almacén oscuro en el mínimo." },
  { id: "1000068", razon: "Caseta de animales. Solo entra si ese ayuntamiento ya la tiene; si no, no se inventa." },
];
const IDS_SUGERENCIA = new Set(SUGERENCIAS_RUSH.map((s) => s.id));
export const REQUISITOS_NOTA = "Provisional. clash-of-clans-data 0.18.0 no trae los requisitos para mejorar el ayuntamiento. Esta lista coloca cada estructura del ayuntamiento anterior, salvo las chozas, el castillo del clan y la cabaña de B.O.B, y pide el Consejo heroico a su máximo. No está comprobada en el cliente.";

const HERO_HALL = "1000071";
const BOB_HUT = "1000064";
const NO_REQUISITO = new Set(["1000015", "1000014", BOB_HUT, "1000001"]);
const ESTRUCTURA = new Set(["defensas", "trampas", "recursos", "ejercito_edif", "muros"]);
/** Artillería infernal del TH17. Niveles 2 a 5 de town-hall.json en clash-of-clans-data 0.18.0. El 1 viene con el ayuntamiento. */
const ARMA_TH17 = {
  fromTh: 17,
  title: "Artillería infernal",
  max: 5,
  levels: {
    2: { n: 10000000, s: 518400 },
    3: { n: 12000000, s: 604800 },
    4: { n: 14000000, s: 691200 },
    5: { n: 18000000, s: 864000 },
  },
};
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
    constructores: null,
    rush: "esencial",
    sugerenciasOff: [],
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
  const constructores = raw.constructores === 4 || raw.constructores === 5 || raw.constructores === 6
    ? raw.constructores
    : null;
  const rush = raw.rush === "estrategico" ? "estrategico" : "esencial";
  const sugerenciasOff = [];
  const vistas = new Set();
  for (const id of Array.isArray(raw.sugerenciasOff) ? raw.sugerenciasOff : []) {
    const key = String(id);
    if (!IDS_SUGERENCIA.has(key) || vistas.has(key)) continue;
    vistas.add(key);
    sugerenciasOff.push(key);
  }
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
    constructores,
    rush,
    sugerenciasOff,
  };
}

/** 4, 5 o 6 si el JSON no trae chozas. Si las trae, manda el JSON, y B.O.B suma uno. */
export function constructoresParaPlan(exp, ajuste) {
  const snap = builderStatus(exp || {});
  if (snap.known) {
    const bob = tieneBob(exp);
    return {
      total: snap.total + (bob ? 1 : 0),
      origen: "json",
      chozas: snap.total,
      bob,
      ajuste: null,
    };
  }
  const n = ajuste === 4 || ajuste === 5 || ajuste === 6 ? ajuste : null;
  return { total: n, origen: n == null ? null : "ajuste", chozas: null, bob: false, ajuste: n };
}

function tieneBob(exp) {
  return (exp && exp.buildings || []).some((b) => b && String(b.data) === BOB_HUT);
}

function buildersDe(exp, info) {
  if (!info || info.total == null) return null;
  const snap = builderStatus(exp || {});
  return {
    known: true,
    total: info.total,
    free: Math.max(0, info.total - snap.occupied),
    over: snap.occupied > info.total,
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
  if (plan && plan.modo === "rushear") {
    const nombre = plan.rush === "estrategico" ? "Rush estratégico" : "Rush esencial";
    if (plan.th == null || plan.th === currentTh) return `${nombre} · TH actual`;
    return `${nombre} → TH${plan.th}`;
  }
  if (!plan || plan.th == null || plan.th === currentTh) return "Maxear TH actual";
  return `Maxear → TH${plan.th}`;
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

function topeEdificio(index, id, th) {
  const cap = capRow(index, id, th);
  if (!cap || !(cap.count > 0) || cap.max == null) return null;
  return cap;
}

function catalogoSugerencias(index, capTh, tag, off) {
  return SUGERENCIAS_RUSH.map((sug) => {
    let aplica = false;
    let motivo = "Ese ayuntamiento no tiene este edificio.";
    if (sug.id === "heroes") {
      if (tag === HEROES_FUERA) motivo = `En ${HEROES_FUERA} los héroes quedan fuera del plan.`;
      else {
        aplica = HERO_ORDER.some((hid) => {
          const cap = capRow(index, hid, capTh);
          return cap && cap.max != null && cap.count !== 0;
        });
        if (aplica) motivo = "";
        else motivo = "Ese ayuntamiento no publica héroes en los datos.";
      }
    } else if (topeEdificio(index, sug.id, capTh)) {
      aplica = true;
      motivo = "";
    }
    const title = sug.id === "heroes" ? "Héroes" : (itemName(index.items && index.items[sug.id]) || "Estructura");
    return {
      id: sug.id,
      title,
      razon: sug.razon,
      aplica,
      motivo,
      activa: aplica && !off.has(sug.id),
    };
  });
}

function pasosDeObjetivo(exp, index, obj, owned) {
  const id = String(obj.id);
  const item = index.items && index.items[id];
  const sec = (item && item.seccion_exportacion) || "buildings";
  const categoryKey = categoryKeyFor(index, id, sec);
  const steps = [];
  let list = (owned.get(id) || []).slice();
  let want = obj.cantidad;
  if (want == null || want === 0) want = list.length || 1;
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
    for (let lv = from; lv < obj.nivel; lv += 1) {
      const cost = levelCost(id, lv + 1);
      const seconds = cost && typeof cost.s === "number" && Number.isFinite(cost.s) ? cost.s : null;
      const toLvl = lv + 1;
      const rushClase = obj.esencial != null && toLvl <= obj.esencial ? "requisito" : (obj.clase === "requisito" ? "requisito" : "sugerencia");
      steps.push({
        id,
        fromLvl: lv,
        toLvl,
        goal: obj.nivel,
        instance,
        categoryKey,
        queue: queueOf(categoryKey),
        title: titleOf(index, id, categoryKey),
        seconds,
        notBefore,
        blocked,
        provisional: false,
        markedAt: 0,
        rushClase,
        rushRazon: obj.razon,
      });
    }
  });
  return steps;
}

function pasosArma(exp, obj) {
  const hall = armaTh(exp);
  const actual = hall && typeof hall.weapon === "number" && Number.isFinite(hall.weapon) ? hall.weapon : null;
  if (actual == null || actual >= ARMA_TH17.max) return [];
  const steps = [];
  for (let lv = actual; lv < ARMA_TH17.max; lv += 1) {
    const row = ARMA_TH17.levels[lv + 1];
    steps.push({
      id: "inferno-artillery",
      fromLvl: lv,
      toLvl: lv + 1,
      goal: ARMA_TH17.max,
      instance: "inferno-artillery#0",
      categoryKey: "defensas",
      queue: "constructor",
      title: ARMA_TH17.title,
      seconds: row ? row.s : null,
      notBefore: null,
      blocked: false,
      provisional: false,
      markedAt: 0,
      rushClase: "requisito",
      rushRazon: obj.razon,
    });
  }
  return steps;
}

function bolsaVisible(bag) {
  return {
    oro: bag.oro,
    elixir: bag.elixir,
    oscuro: bag.oscuro,
    muros: bag.muros,
    segundos: bag.segConstructor + bag.segLaboratorio + bag.segMascotas,
    sinCoste: bag.sinCoste > 0,
  };
}

function costePorId(steps) {
  const map = new Map();
  for (const step of steps) {
    const part = partePaso(step);
    map.set(step.id, map.has(step.id) ? addBags(map.get(step.id), part) : part);
  }
  return map;
}

function filasDeObjetivos(exp, index, objetivos, steps) {
  const costes = costePorId(steps);
  const filas = [];
  for (const obj of objetivos.values()) {
    let fila;
    if (obj.id === "inferno-artillery") fila = filaArma(exp);
    else fila = filaEstructura(exp, index, obj.id, { count: obj.cantidad, max: obj.nivel }, obj.nivel);
    if (!fila.sinDato) {
      const bag = costes.get(String(fila.id));
      fila = { ...fila, coste: bag ? bolsaVisible(bag) : bolsaVacia() };
    }
    filas.push({
      ...fila,
      clase: obj.clase,
      razon: obj.razon,
      sugerenciaId: obj.sugerenciaId,
    });
  }
  filas.sort((a, b) => Number(a.hecho) - Number(b.hecho) || a.title.localeCompare(b.title, "es"));
  return filas;
}

const RAZON_REQUISITO = "Requisito para poder mejorar el ayuntamiento. Provisional: los datos no traen esta tabla.";

function pasosRush(exp, index, plan, tag, goal, current) {
  const vacio = { steps: [], objetivos: new Map(), sugerencias: [], filas: [] };
  if (!Number.isInteger(current) || goal.target <= current) return vacio;
  const objetivos = new Map();
  for (let th = current; th < goal.target; th += 1) {
    const paso = requisitosDe(exp, index, th);
    if (paso.sinTopes) continue;
    for (const fila of paso.filas) {
      const prev = objetivos.get(fila.id);
      objetivos.set(fila.id, {
        id: fila.id,
        nivel: Math.max(prev ? prev.nivel : 0, fila.requerido),
        cantidad: Math.max(prev ? prev.cantidad : 0, fila.cantidad || 0),
        esencial: Math.max(prev ? prev.esencial : 0, fila.requerido),
        clase: "requisito",
        razon: RAZON_REQUISITO,
        sugerenciaId: null,
        sinDato: !!(fila.sinDato || (prev && prev.sinDato)),
      });
    }
  }
  const off = new Set(plan.sugerenciasOff || []);
  const sugerencias = plan.rush === "estrategico" ? catalogoSugerencias(index, goal.capTh, tag, off) : [];
  if (plan.rush === "estrategico") {
    for (const sug of sugerencias) {
      if (!sug.activa) continue;
      if (sug.id === "heroes") {
        for (const hid of HERO_ORDER) {
          const cap = capRow(index, hid, goal.capTh);
          if (!cap || cap.max == null || cap.count === 0) continue;
          const prev = objetivos.get(hid);
          const ownedCount = instanciasDe(exp, hid).length;
          const cantidad = cap.count == null ? Math.max(1, ownedCount) : cap.count;
          objetivos.set(hid, {
            id: hid,
            nivel: Math.max(prev ? prev.nivel : 0, cap.max),
            cantidad: Math.max(prev ? prev.cantidad : 0, cantidad),
            esencial: prev ? prev.esencial : null,
            clase: "sugerencia",
            razon: sug.razon,
            sugerenciaId: "heroes",
            sinDato: false,
          });
        }
        continue;
      }
      const cap = topeEdificio(index, sug.id, goal.capTh);
      if (!cap) continue;
      const prev = objetivos.get(sug.id);
      const nivel = Math.max(prev ? prev.nivel : 0, cap.max);
      const esencial = prev ? prev.esencial : null;
      const sube = esencial == null || nivel > esencial;
      objetivos.set(sug.id, {
        id: sug.id,
        nivel,
        cantidad: Math.max(prev ? prev.cantidad : 0, cap.count),
        esencial,
        clase: sube ? "sugerencia" : "requisito",
        razon: sube && esencial != null
          ? `${sug.razon} El requisito del juego queda en el nivel ${esencial}; el resto es sugerencia.`
          : sug.razon,
        sugerenciaId: sug.id,
        sinDato: false,
      });
    }
  }
  const owned = ownedInstances(exp);
  const steps = [];
  for (const obj of objetivos.values()) {
    if (obj.sinDato) continue;
    if (obj.id === "inferno-artillery") steps.push(...pasosArma(exp, obj));
    else steps.push(...pasosDeObjetivo(exp, index, obj, owned));
  }
  return { steps, objetivos, sugerencias, filas: filasDeObjetivos(exp, index, objetivos, steps) };
}

function collectSteps(exp, index, plan, tag) {
  const current = townHallLevel(exp);
  const goal = capTownHall(current, plan.th, maxTownHall(index));
  if (plan.modo === "rushear") {
    const packed = pasosRush(exp, index, plan, tag, goal, current);
    return { steps: packed.steps, goal, current, filas: packed.filas, sugerencias: packed.sugerencias };
  }
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
  return { steps, goal, current, filas: null, sugerencias: null };
}

function applyFilters(steps, plan) {
  const dur = DURATIONS.find((d) => d.id === plan.duracion);
  const limit = dur && dur.sec != null ? dur.sec : null;
  const kept = [];
  const sinTiempo = [];
  for (const step of steps) {
    if (plan.categoria && step.categoryKey !== plan.categoria) continue;
    if (!focusKeeps(step, plan)) continue;
    if (plan.recurso && plan.recurso !== "todos") {
      if (step.id === "inferno-artillery") {
        if (plan.recurso !== "oro") continue;
      } else if (!usesResource(step.id, step.toLvl, plan.recurso)) continue;
    }
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

function makeLanes(exp, now, th, builders) {
  const actuales = actualesFrom(exp, now);
  const partes = repartirColas(actuales, {
    builders: builders || builderStatus(exp),
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
  const open = pool.filter((lane) => !lane.blocked);
  if (!open.length) {
    const lane = pool[0];
    cursor.set(step.instance, { blocked: true, at: null });
    return { ...base, sinHora: true, laneId: lane ? lane.id : null };
  }
  let elegido = null;
  for (const lane of open) {
    const candidato = Math.max(lane.freeAt, step.notBefore || 0, chain && chain.at ? chain.at : 0, now);
    const mejorHueco = elegido && candidato === elegido.inicio && lane.freeAt > elegido.lane.freeAt;
    if (!elegido || candidato < elegido.inicio || mejorHueco) elegido = { lane, inicio: candidato };
  }
  const lane = elegido.lane;
  const earliest = elegido.inicio;
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

function partePaso(step) {
  if (step.id !== "inferno-artillery") return sumLevels(step.id, step.fromLvl, step.toLvl, 1);
  const row = ARMA_TH17.levels[step.toLvl];
  const bag = {
    oro: 0, elixir: 0, oscuro: 0, muros: 0, brillante: 0, resplandeciente: 0, estelar: 0,
    segConstructor: 0, segLaboratorio: 0, segMascotas: 0, segHerreria: 0, sinCoste: 0,
  };
  if (!row) bag.sinCoste = 1;
  else {
    bag.oro = row.n;
    bag.segConstructor = row.s;
  }
  return bag;
}

function bagOf(steps) {
  let total = null;
  for (const step of steps) {
    const part = partePaso(step);
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
  const { steps, goal, current, filas, sugerencias } = collectSteps(exp, index, chosen, tag);
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
  const info = chosen.modo === "rushear" ? constructoresParaPlan(exp, chosen.constructores) : null;
  const { lanes, avisoHora, conocidos } = makeLanes(exp, nowMs, current || 0, buildersDe(exp, info));
  if (info && info.origen === "ajuste") {
    for (const lane of lanes) {
      if (lane.cola === "constructor" && lane.libreYa && lane.clase === "real") lane.clase = "ajuste";
    }
  }
  let rush = null;
  if (chosen.modo === "rushear") {
    const resumen = programar(steps.slice().sort(byRank), lanes.map((lane) => ({ ...lane })), sleep, nowMs);
    rush = {
      modo: chosen.rush,
      filas: filas || [],
      sugerencias: sugerencias || [],
      coste: resumen.coste,
      trabajoSeg: resumen.trabajoSeg,
      calendarioSeg: resumen.calendarioSeg,
      fin: resumen.fin,
      nota: chosen.rush === "estrategico" ? ESTRATEGICO_NOTA : ESENCIAL_NOTA,
    };
  }
  const cursor = new Map();
  const orden = filtered.kept.map((step) => placeStep(step, lanes, sleep, nowMs, cursor));
  const lastFin = orden.reduce((m, s) => (s.fin != null && s.fin > m ? s.fin : m), 0);
  const tiempos = tiemposConstructor(orden);
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
    conocidos: info ? info.origen === "json" : conocidos,
    constructores: info,
    trabajoSeg: tiempos.trabajoSeg,
    calendarioSeg: tiempos.calendarioSeg,
    heroesFuera: tag === HEROES_FUERA,
    fin: lastFin || null,
    now: nowMs,
    rush,
  };
}

function programar(steps, lanes, sleep, now) {
  const cursor = new Map();
  const orden = steps.map((step) => placeStep(step, lanes, sleep, now, cursor));
  const lastFin = orden.reduce((m, s) => (s.fin != null && s.fin > m ? s.fin : m), 0);
  const tiempos = tiemposConstructor(orden);
  return {
    orden,
    coste: bagOf(orden),
    fin: lastFin || null,
    trabajoSeg: tiempos.trabajoSeg,
    calendarioSeg: tiempos.calendarioSeg,
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
      origen: step.origen || (step.provisional ? "provisional" : "recomendado"),
      clase: lane.clase || "real",
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

function tiemposConstructor(orden) {
  let trabajoSeg = 0;
  let minI = null;
  let maxF = null;
  for (const step of orden || []) {
    if (step.queue !== "constructor") continue;
    if (typeof step.seconds === "number" && Number.isFinite(step.seconds)) trabajoSeg += step.seconds;
    if (step.inicio == null || step.fin == null) continue;
    if (minI == null || step.inicio < minI) minI = step.inicio;
    if (maxF == null || step.fin > maxF) maxF = step.fin;
  }
  return { trabajoSeg, calendarioSeg: minI == null ? null : Math.max(0, (maxF - minI) / 1000) };
}

function instanciasDe(exp, id) {
  const out = [];
  for (const sec of HOME_SECTIONS) {
    for (const it of (exp && exp[sec]) || []) {
      if (!it || String(it.data) !== String(id)) continue;
      const n = Math.max(1, it.cnt || 1);
      const timed = it.timer != null && n === 1;
      for (let i = 0; i < n; i += 1) out.push({ lvl: it.lvl || 0, timer: timed ? it.timer : null });
    }
  }
  return out;
}

function bolsaVacia() {
  return { oro: 0, elixir: 0, oscuro: 0, muros: 0, segundos: 0, sinCoste: false };
}

function sumarBolsa(id, from, to, times) {
  const part = sumLevels(id, from, to, times);
  return {
    oro: part.oro,
    elixir: part.elixir,
    oscuro: part.oscuro,
    muros: part.muros,
    segundos: part.segConstructor + part.segLaboratorio + part.segMascotas,
    sinCoste: part.sinCoste > 0,
  };
}

function filaEstructura(exp, index, id, cap, nivel) {
  const list = instanciasDe(exp, id);
  const tienen = list.filter((it) => it.lvl >= nivel).length;
  const faltan = Math.max(0, cap.count - tienen);
  const hecho = faltan === 0;
  const actual = !list.length ? 0 : Math.min(...list.map((it) => it.lvl));
  const enCurso = list.some((it) => it.timer != null && it.lvl < nivel);
  let coste = bolsaVacia();
  if (!hecho) {
    if (String(id) === HERO_HALL) {
      const cur = list.length ? Math.max(...list.map((it) => it.lvl)) : 0;
      coste = sumarBolsa(id, cur, nivel, 1);
    } else {
      coste = sumarBolsa(id, 0, nivel, faltan);
    }
  }
  const item = index.items[String(id)];
  return {
    id: String(id),
    title: itemName(item) || "Estructura",
    actual: String(id) === HERO_HALL && list.length ? Math.max(...list.map((it) => it.lvl)) : actual,
    requerido: nivel,
    cantidad: cap.count,
    tienen,
    hecho,
    enCurso,
    sinDato: false,
    provisional: true,
    coste,
  };
}

function armaTh(exp) {
  for (const b of (exp && exp.buildings) || []) {
    if (b && (b.data === 1000001 || String(b.data) === "1000001")) return b;
  }
  return null;
}

function filaArma(exp) {
  const hall = armaTh(exp);
  const actual = hall && typeof hall.weapon === "number" && Number.isFinite(hall.weapon) ? hall.weapon : null;
  const coste = bolsaVacia();
  if (actual == null) {
    return {
      id: "inferno-artillery",
      title: ARMA_TH17.title,
      actual: null,
      requerido: ARMA_TH17.max,
      cantidad: 1,
      tienen: 0,
      hecho: false,
      enCurso: false,
      sinDato: true,
      provisional: true,
      coste: null,
    };
  }
  const hecho = actual >= ARMA_TH17.max;
  if (!hecho) {
    for (let lv = actual + 1; lv <= ARMA_TH17.max; lv += 1) {
      const row = ARMA_TH17.levels[lv];
      if (!row) coste.sinCoste = true;
      else {
        coste.oro += row.n;
        coste.segundos += row.s;
      }
    }
  }
  return {
    id: "inferno-artillery",
    title: ARMA_TH17.title,
    actual,
    requerido: ARMA_TH17.max,
    cantidad: 1,
    tienen: hecho ? 1 : 0,
    hecho,
    enCurso: false,
    sinDato: false,
    provisional: true,
    coste: hecho ? bolsaVacia() : coste,
  };
}

function requisitosDe(exp, index, fromTh) {
  const table = index && index.raw && index.raw[String(fromTh)];
  if (!table) return { desde: fromTh, hacia: fromTh + 1, sinTopes: true, filas: [] };
  const filas = [];
  for (const [id, caps] of index.byId || []) {
    const cap = caps.get(fromTh);
    if (!cap || !cap.count || cap.max == null) continue;
    if (NO_REQUISITO.has(String(id))) continue;
    const item = index.items[String(id)];
    const sec = (item && item.seccion_exportacion) || "";
    if (sec.endsWith("2") || sec.includes("builder")) continue;
    const categoryKey = categoryKeyFor(index, id, sec || "buildings");
    if (!ESTRUCTURA.has(categoryKey)) continue;
    const nivel = String(id) === HERO_HALL ? cap.max : 1;
    filas.push(filaEstructura(exp, index, id, cap, nivel));
  }
  const inferno = index.inferno && index.inferno.get(fromTh);
  if (fromTh === ARMA_TH17.fromTh && inferno && inferno.count) filas.push(filaArma(exp));
  filas.sort((a, b) => Number(a.hecho) - Number(b.hecho) || a.title.localeCompare(b.title, "es"));
  return { desde: fromTh, hacia: fromTh + 1, sinTopes: false, filas };
}

/** Requisitos para poder mejorar el ayuntamiento hasta `targetTh`. Provisionales. */
export function requisitosAyuntamiento(exp, index, targetTh) {
  const current = townHallLevel(exp);
  const top = maxTownHall(index);
  const goal = capTownHall(current, targetTh, top);
  const pasos = [];
  if (Number.isInteger(current) && goal.target > current) {
    for (let th = current; th < goal.target; th += 1) pasos.push(requisitosDe(exp, index, th));
  }
  return {
    currentTh: current,
    targetTh: goal.target,
    provisional: true,
    nota: REQUISITOS_NOTA,
    pasos,
  };
}

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
