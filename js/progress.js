/**
 * Progreso de la aldea principal.
 * Máximos: únicamente data/caps_clashrecord.json (ClashRecord).
 * Nombres visibles: únicamente assets/manifest.json (nombre_es ?? nombre_en).
 * Los nombres en inglés del archivo de máximos solo sirven para unir cada tope
 * con el id del manifiesto; no se muestran.
 */

const ALIAS = {
  Lab: "1000007",
  "Builder Hut": "1000015",
  "Guardian-Long Shot": "107000000",
  "Guardian-Smasher": "107000001",
  "Guardian-Logger": "107000008",
  // Única tropa, hechizo y máquina sin identificar del manifiesto, y únicos
  // nombres de laboratorio del archivo de máximos que no tienen nombre_en.
  // El máximo entra en el %; la interfaz sigue diciendo «sin identificar».
  "Ruin Witch": "4000109",
  "Angry Spell": "26000123",
  "Sky Wagon": "4000188",
};

const RES_IDS = ["1000004", "1000002", "1000023", "1000005", "1000003", "1000024"];
const ARMY_IDS = ["1000000", "1000006", "1000026", "1000007", "1000020", "1000029", "1000059", "1000014", "1000071", "1000068", "1000070"];
const LAB_SECTIONS = new Set(["units", "spells", "siege_machines"]);
const HUT = "1000015";
const LAB_BUILDING = "1000007";
const PET_HOUSE = "1000068";
const WALL = "1000010";
const TH_ID = "1000001";
const CRAFT = "1000097";

export const CATEGORIES = [
  { key: "defensas", label: "Defensas", cat: "defensas" },
  { key: "laboratorio", label: "Laboratorio", cat: "laboratorio" },
  { key: "ejercito_edif", label: "Ejército (edificios)", cat: "ejercito" },
  { key: "equipamiento", label: "Equipamiento", cat: "equipamiento" },
  { key: "mascotas", label: "Mascotas", cat: "mascotas" },
  { key: "heroes", label: "Héroes", cat: "heroes" },
  { key: "trampas", label: "Trampas", cat: "trampas" },
  { key: "recursos", label: "Recursos", cat: "recursos" },
  { key: "muros", label: "Muros", cat: "muros" },
];

export const HERO_ORDER = ["28000000", "28000001", "28000002", "28000004", "28000006", "28000007"];

const SKIP_WORDS = new Set(["de", "del", "la", "el", "los", "las"]);

/** Porcentaje con 1 decimal, redondeo par (ROUND_HALF_EVEN), igual que el histórico. */
export function pct(num, den) {
  if (num == null || den == null || den === 0) return null;
  const tenthsNum = num * 1000;
  const q = Math.floor(tenthsNum / den);
  const rem = tenthsNum % den;
  let tenths;
  if (rem * 2 < den) tenths = q;
  else if (rem * 2 > den) tenths = q + 1;
  else tenths = q % 2 === 0 ? q : q + 1;
  return tenths / 10;
}

function roundDiv(num, den) {
  const q = Math.floor(num / den);
  const rem = num % den;
  if (rem * 2 < den) return q;
  if (rem * 2 > den) return q + 1;
  return q % 2 === 0 ? q : q + 1;
}

export function averagePct(values) {
  const xs = values.filter((v) => v != null);
  if (!xs.length) return null;
  // Media de los porcentajes ya redondeados a 1 decimal.
  const sumTenths = xs.reduce((s, v) => s + Math.round(v * 10), 0);
  return roundDiv(sumTenths, xs.length) / 10;
}

export function itemName(item) {
  if (!item || item.estado === "sin_identificar") return null;
  return item.nombre_es || item.nombre_en || null;
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter((w) => w && !SKIP_WORDS.has(w.toLowerCase()));
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function rarezaEs(rareza) {
  if (rareza === "Common") return "Común";
  if (rareza === "Epic") return "Épica";
  return rareza || null;
}

function indexManifest(manifest) {
  const items = manifest.items || manifest;
  const byEn = new Map();
  for (const [id, item] of Object.entries(items)) {
    if (!item.nombre_en) continue;
    const sec = item.seccion_exportacion || "";
    const prev = byEn.get(item.nombre_en);
    if (prev && (sec.endsWith("2") || sec.includes("builder"))) continue;
    byEn.set(item.nombre_en, id);
  }
  return { items, byEn };
}

/**
 * id del manifiesto → { [th]: { max, count } }
 * Greedy Raven no tiene ficha en el manifiesto: queda aparte, solo para el denominador.
 */
export function indexCaps(caps, manifest) {
  const { items, byEn } = indexManifest(manifest);
  const byId = new Map();
  const put = (id, th, value) => {
    if (!byId.has(id)) byId.set(id, new Map());
    byId.get(id).set(th, value);
  };
  let greedy = null;
  const craftMax = new Map();
  for (const [thKey, table] of Object.entries(caps)) {
    const th = Number(thKey);
    for (const [name, value] of Object.entries(table)) {
      if (name.startsWith("Crafted Defense")) {
        craftMax.set(th, value.max);
        continue;
      }
      if (name === "Greedy Raven") {
        if (!greedy) greedy = new Map();
        greedy.set(th, value.max);
        continue;
      }
      let id = ALIAS[name] || null;
      if (!id && byEn.has(name)) id = byEn.get(name);
      if (!id) {
        const m = /^(.*) \([^)]+\)$/.exec(name);
        if (m && byEn.has(m[1])) {
          const cand = byEn.get(m[1]);
          if (items[cand] && items[cand].categoria === "hero_equipment") id = cand;
        }
      }
      if (!id || !items[id]) continue;
      put(id, th, { max: value.max, count: value.count });
    }
  }
  const idsBy = (pred) => Object.keys(items).filter((id) => pred(items[id]));
  return {
    items,
    byId,
    greedy,
    craftMax,
    defenses: idsBy((it) => it.categoria === "defense"),
    traps: idsBy((it) => it.categoria === "trap"),
    heroes: HERO_ORDER.filter((id) => items[id]),
    pets: idsBy((it) => it.categoria === "pet"),
    labIds: idsBy((it) => LAB_SECTIONS.has(it.seccion_exportacion)),
  };
}

function capAt(index, id, th) {
  const row = index.byId.get(String(id));
  return row ? row.get(th) || null : null;
}

function placed(list) {
  const map = new Map();
  for (const it of list || []) {
    if (it.data == null) continue;
    const id = String(it.data);
    const c = it.cnt || 1;
    const cur = map.get(id) || { cnt: 0, sum: 0, rows: [] };
    cur.cnt += c;
    cur.sum += (it.lvl || 0) * c;
    cur.rows.push(it);
    map.set(id, cur);
  }
  return map;
}

function groupScore(index, th, ids, bag) {
  let num = 0;
  let den = 0;
  for (const id of ids) {
    const cap = capAt(index, id, th);
    if (!cap || cap.max == null) continue;
    let cnt = cap.count;
    if (cnt == null) cnt = 1;
    if (!cnt) continue;
    const own = bag.get(id);
    const use = Math.max(cnt, own ? own.cnt : 0);
    num += own ? own.sum : 0;
    den += use * cap.max;
  }
  return { num, den };
}

function craftedScore(exp, index, th) {
  const max = index.craftMax.get(th);
  if (max == null) return { num: 0, den: 0, types: [] };
  const types = [];
  for (const b of exp.buildings || []) {
    if (String(b.data) !== CRAFT) continue;
    for (const t of b.types || []) {
      const modules = t.modules || [];
      const sum = modules.reduce((s, m) => s + (m.lvl || 0), 0);
      types.push({ id: String(t.data), sum, modules });
    }
  }
  return { num: types.reduce((s, t) => s + t.sum, 0), den: 3 * max, types, max };
}

function defensesScore(exp, index, th) {
  const b = placed(exp.buildings);
  const g = placed(exp.guardians);
  const core = groupScore(index, th, index.defenses, b);
  const huts = groupScore(index, th, [HUT], b);
  const guards = groupScore(index, th, ["107000000", "107000001", "107000008"], g);
  const craft = craftedScore(exp, index, th);
  return {
    num: core.num + huts.num + guards.num + craft.num,
    den: core.den + huts.den + guards.den + craft.den,
  };
}

function heroesScore(exp, index, th) {
  const bag = placed(exp.heroes);
  return groupScore(index, th, index.heroes, bag);
}

function petsScore(exp, index, th) {
  const bag = placed(exp.pets);
  const base = groupScore(index, th, index.pets, bag);
  const extra = index.greedy && index.greedy.get(th);
  if (!base.den && !extra) return { num: null, den: null };
  return { num: base.num, den: base.den + (extra || 0), unlisted: extra || 0 };
}

function wallsScore(exp, index, th) {
  const cap = capAt(index, WALL, th);
  if (!cap) return { num: 0, den: 0, pieces: 0, hist: [] };
  let num = 0;
  let pieces = 0;
  const hist = new Map();
  for (const b of exp.buildings || []) {
    if (String(b.data) !== WALL) continue;
    const c = b.cnt || 1;
    pieces += c;
    num += (b.lvl || 0) * c;
    hist.set(b.lvl || 0, (hist.get(b.lvl || 0) || 0) + c);
  }
  const rows = [...hist.entries()].sort((a, b) => a[0] - b[0]).map(([lvl, cnt]) => ({ lvl, cnt }));
  return { num, den: cap.count * cap.max, pieces, max: cap.max, count: cap.count, hist: rows };
}

function labScore(exp, index, th) {
  const bag = new Map();
  for (const sec of LAB_SECTIONS) {
    for (const it of exp[sec] || []) {
      bag.set(String(it.data), { cnt: 1, sum: it.lvl || 0, rows: [it] });
    }
  }
  return groupScore(index, th, index.labIds, bag);
}

function eqScore(exp, index, th) {
  let num = 0;
  let den = 0;
  for (const it of exp.equipment || []) {
    const id = String(it.data);
    const meta = index.items[id];
    if (!meta || meta.estado === "sin_identificar") continue;
    if ((it.lvl || 0) <= 1) continue;
    const cap = capAt(index, id, th);
    if (!cap) continue;
    num += it.lvl;
    den += cap.max;
  }
  return { num, den };
}

function scoreAll(exp, index, th) {
  if (!th) return null;
  return {
    defensas: defensesScore(exp, index, th),
    laboratorio: labScore(exp, index, th),
    ejercito_edif: groupScore(index, th, ARMY_IDS, placed(exp.buildings)),
    equipamiento: eqScore(exp, index, th),
    mascotas: petsScore(exp, index, th),
    heroes: heroesScore(exp, index, th),
    trampas: groupScore(index, th, index.traps, placed(exp.traps)),
    recursos: groupScore(index, th, RES_IDS, placed(exp.buildings)),
    muros: wallsScore(exp, index, th),
  };
}

export function townHallLevel(exp) {
  for (const b of exp.buildings || []) {
    if (String(b.data) === TH_ID) return b.lvl;
  }
  return null;
}

export function analyze(exp, index) {
  const th = townHallLevel(exp);
  const cur = scoreAll(exp, index, th);
  const sig = th && th < 18 ? scoreAll(exp, index, th + 1) : null;
  const cats = {};
  for (const { key } of CATEGORIES) {
    const c = cur[key];
    const s = sig ? sig[key] : null;
    const has = c && c.num != null && c.den;
    const hasSig = s && s.num != null && s.den;
    cats[key] = {
      num: has ? c.num : null,
      den: has ? c.den : null,
      pct: has ? pct(c.num, c.den) : null,
      sigNum: hasSig ? s.num : null,
      sigDen: hasSig ? s.den : null,
      sigPct: hasSig ? pct(s.num, s.den) : null,
      mark: has && hasSig ? (c.den / s.den) * 100 : null,
      pend: has && hasSig ? Math.max(0, c.den - c.num) : has ? Math.max(0, c.den - c.num) : null,
    };
  }
  const mediaVals = CATEGORIES.map(({ key }) => cats[key].pct);
  const sigVals = CATEGORIES.map(({ key }) => cats[key].sigPct);
  const walls = cur.muros;
  return {
    th,
    thSig: th && th < 18 ? th + 1 : null,
    cats,
    media: averagePct(mediaVals),
    sigMedia: sig ? averagePct(sigVals) : null,
    walls,
    heroes: heroRows(exp, index, th),
    pets: petRows(exp, index, th),
    equipment: equipmentView(exp, index, th),
  };
}

function heroRows(exp, index, th) {
  const lv = new Map((exp.heroes || []).map((h) => [String(h.data), h.lvl]));
  return index.heroes.map((id) => {
    const cap = capAt(index, id, th);
    const unlock = [...(index.byId.get(id)?.keys() || [])].sort((a, b) => a - b)[0] || null;
    return {
      id,
      lvl: lv.has(id) ? lv.get(id) : cap ? 0 : null,
      max: cap ? cap.max : null,
      unlocked: !!cap,
      unlockTh: unlock,
    };
  });
}

function petRows(exp, index, th) {
  const lv = new Map((exp.pets || []).map((h) => [String(h.data), h.lvl]));
  const rows = index.pets.map((id) => {
    const cap = capAt(index, id, th);
    const unlock = [...(index.byId.get(id)?.keys() || [])].sort((a, b) => a - b)[0] || null;
    return { id, lvl: lv.has(id) ? lv.get(id) : cap ? 0 : null, max: cap ? cap.max : null, unlocked: !!cap, unlockTh: unlock };
  }).filter((r) => r.unlocked || (r.unlockTh && r.unlockTh <= 18));
  return rows;
}

export function equipmentView(exp, index, th) {
  const pieces = (exp.equipment || []).map((it, i) => {
    const id = String(it.data);
    const meta = index.items[id] || null;
    const cap = meta && meta.estado !== "sin_identificar" ? capAt(index, id, th) : null;
    return {
      i,
      id,
      lvl: it.lvl || 0,
      max: cap ? cap.max : null,
      meta,
      heroe: meta && meta.heroe ? meta.heroe : null,
      unknown: !meta || meta.estado === "sin_identificar",
    };
  });
  return pieces;
}

const QUEUE_SKIP_BUILDINGS = new Set([LAB_BUILDING, PET_HOUSE]);

export function builderStatus(exp) {
  let total = 0;
  let known = false;
  for (const b of exp.buildings || []) {
    if (String(b.data) === HUT) {
      known = true;
      total += b.cnt || 1;
    }
  }
  let occupied = 0;
  for (const b of exp.buildings || []) {
    if (b.timer == null) continue;
    if (QUEUE_SKIP_BUILDINGS.has(String(b.data))) continue;
    occupied += 1;
  }
  for (const sec of ["traps", "heroes"]) {
    for (const it of exp[sec] || []) if (it.timer != null) occupied += 1;
  }
  const over = known && occupied > total;
  const free = known && !over ? total - occupied : null;
  return { known, total: known ? total : null, occupied, free, over };
}

export function upgradesOf(exp) {
  const out = [];
  const push = (sec, it, queue) => {
    if (it.timer == null) return;
    out.push({
      section: sec,
      id: String(it.data),
      lvl: it.lvl || 0,
      timer: it.timer,
      end: (exp.timestamp + it.timer) * 1000,
      queue,
      nuevo: (it.lvl || 0) === 0,
    });
  };
  for (const b of exp.buildings || []) {
    const id = String(b.data);
    if (b.timer == null) continue;
    if (id === LAB_BUILDING) push("buildings", b, "laboratorio");
    else if (id === PET_HOUSE) push("buildings", b, "mascotas");
    else push("buildings", b, "constructor");
  }
  for (const it of exp.traps || []) push("traps", it, "constructor");
  for (const it of exp.heroes || []) push("heroes", it, "constructor");
  for (const it of exp.units || []) push("units", it, "laboratorio");
  for (const it of exp.spells || []) push("spells", it, "laboratorio");
  for (const it of exp.siege_machines || []) push("siege_machines", it, "laboratorio");
  for (const it of exp.pets || []) push("pets", it, "mascotas");
  for (const it of exp.equipment || []) push("equipment", it, "equipamiento");
  out.sort((a, b) => a.end - b.end);
  return out;
}

export function helpersOf(exp) {
  return (exp.helpers || []).map((h) => ({
    id: String(h.data),
    lvl: h.lvl || 0,
    cooldown: h.helper_cooldown || 0,
    end: h.helper_cooldown ? (exp.timestamp + h.helper_cooldown) * 1000 : null,
  }));
}

/** Filas de una categoría para el detalle. */
export function categoryItems(exp, index, key, th) {
  const next = th < 18 ? th + 1 : null;
  if (key === "muros") return [];
  if (key === "heroes") return heroRows(exp, index, th).filter((r) => r.unlocked || r.unlockTh);
  if (key === "mascotas") return petRows(exp, index, th);
  if (key === "equipamiento") return equipmentView(exp, index, th);

  const rows = [];
  const addBuilding = (id, bag, section) => {
    const cap = capAt(index, id, th);
    const capN = next ? capAt(index, id, next) : null;
    if (!cap && !(bag && bag.cnt)) return;
    const own = bag && bag.get(id);
    const max = cap && cap.max != null ? cap.max : null;
    const cntCap = cap ? (cap.count == null ? 1 : cap.count) : 0;
    if (own) {
      const byLvl = new Map();
      for (const r of own.rows) {
        const c = r.cnt || 1;
        byLvl.set(r.lvl || 0, (byLvl.get(r.lvl || 0) || 0) + c);
      }
      for (const [lvl, cnt] of byLvl) {
        rows.push({
          id, lvl, cnt, max,
          maxNext: capN && capN.max != null ? capN.max : null,
          section,
        });
      }
    }
    const ownedCnt = own ? own.cnt : 0;
    const missing = Math.max(0, cntCap - ownedCnt);
    if (missing && max != null) {
      rows.push({ id, lvl: 0, cnt: missing, max, maxNext: capN ? capN.max : null, section, missing: true });
    }
  };

  if (key === "defensas") {
    const bag = placed(exp.buildings);
    for (const id of index.defenses) addBuilding(id, bag, "buildings");
    addBuilding(HUT, bag, "buildings");
    const g = placed(exp.guardians);
    for (const id of ["107000000", "107000001", "107000008"]) addBuilding(id, g, "guardians");
    const craft = craftedScore(exp, index, th);
    for (const t of craft.types || []) {
      for (const m of t.modules) {
        rows.push({
          id: String(m.data),
          lvl: m.lvl || 0,
          cnt: 1,
          max: null,
          maxNext: null,
          section: "crafting_modules",
          crafted: true,
        });
      }
    }
    return rows;
  }
  if (key === "recursos" || key === "ejercito_edif") {
    const ids = key === "recursos" ? RES_IDS : ARMY_IDS;
    const bag = placed(exp.buildings);
    for (const id of ids) addBuilding(id, bag, "buildings");
    return rows;
  }
  if (key === "trampas") {
    const bag = placed(exp.traps);
    for (const id of index.traps) addBuilding(id, bag, "traps");
    return rows;
  }
  if (key === "laboratorio") {
    const have = new Map();
    for (const sec of LAB_SECTIONS) {
      for (const it of exp[sec] || []) have.set(String(it.data), { it, sec });
    }
    const seen = new Set();
    for (const id of index.labIds) {
      const cap = capAt(index, id, th);
      const capN = next ? capAt(index, id, next) : null;
      const own = have.get(id);
      if (!cap && !own) continue;
      if (!cap && own && index.items[id] && index.items[id].estado === "sin_identificar") {
        // sigue visible
      }
      seen.add(id);
      rows.push({
        id,
        lvl: own ? own.it.lvl || 0 : 0,
        cnt: 1,
        max: cap ? cap.max : null,
        maxNext: capN ? capN.max : null,
        section: own ? own.sec : index.items[id].seccion_exportacion,
        missing: !own,
      });
    }
    for (const [id, own] of have) {
      if (seen.has(id)) continue;
      rows.push({
        id, lvl: own.it.lvl || 0, cnt: 1, max: null, maxNext: null, section: own.sec, missing: false,
      });
    }
    return rows;
  }
  return rows;
}

export const ROSTER = [
  { tag: "#28PLGP0G2", nombre: "C1 Principal", chip: "C1", role: "Principal", roleClass: "chip--main", objetivo: 18, featured: true },
  { tag: "#R00C8CPQC", nombre: "C2 Secundaria", chip: "C2", role: "Secundaria", roleClass: "chip--second", objetivo: 17, featured: true },
  { tag: "#GUQUV98JG", nombre: "#GUQUV98JG", chip: "13·8JG", objetivo: 15 },
  { tag: "#GVG9GCYUV", nombre: "#GVG9GCYUV", chip: "13·YUV", objetivo: 15 },
  { tag: "#R02YVYLJ8", nombre: "#R02YVYLJ8", chip: "13·LJ8", objetivo: 15 },
  { tag: "#GJPJP9JP0", nombre: "#GJPJP9JP0", chip: "13·JP0", objetivo: 15 },
  { tag: "#GVPU80R80", nombre: "#GVPU80R80", chip: "11·R80", objetivo: 15 },
  { tag: "#GVUQ2C2VC", nombre: "#GVUQ2C2VC", chip: "11·2VC", objetivo: 15 },
  { tag: "#GVVYVU802", nombre: "#GVVYVU802", chip: "11·802", objetivo: 15 },
  { tag: "#GVPU2CJR8", nombre: "#GVPU2CJR8", chip: "11·JR8", objetivo: 15 },
  { tag: "#R02YUVC0J", nombre: "#R02YUVC0J", chip: "11·C0J", objetivo: 15 },
];

export function rosterByTag(tag) {
  return ROSTER.find((r) => r.tag === tag) || null;
}
