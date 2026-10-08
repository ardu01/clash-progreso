import {
  CATEGORIES, HERO_ORDER, ROSTER, analyze, averagePct, builderStatus, categoryItems,
  capsFichaLines, categoryUnlock, catFoot, equipmentView, helpersOf, indexCaps, initials,
  itemName, levelLine, outsidePct, overMaxLabel, rarezaEs, townHallLevel, upgradesOf,
} from "./progress.js";
import { LEGAL, dayHeading, esc, fmtBytes, fmtFin, fmtNum, fmtPct, fmtRemain, madridDayKey } from "./format.js";
import { APP_VERSION, IMAGE_CACHE } from "./caches.js";
import {
  BAD_FOOT, DUP_FOOT, DUPLICATE_HELP, EVOLUTION_FOOT, FIRST_FOOT, FOREIGN_HELP, NEW_FOOT, NO_CHANGE_FOOT,
  PASTE_DENIED, STRUCTURE_HELP, addedToast, batchSummary, classifyEntries,
  duplicateMsg, foreignMsg, mediaLine, olderHelp, olderWarning, omitReason, omitSubtitle, overMaxMsg,
  planBatch, sortBatch, statusText, successToast, trailingLabel, unknownMsg,
} from "./import.js";
import { allExports, clearExports, deleteTag, latestByTag, putExport, restoreBundled, seedBundled } from "./store.js";
import {
  addAccount, ensureTags, featuredTag, migrateRoster, orderAccounts, removeAccount, renameAccount, setPrincipal,
} from "./roster.js";
import { applyFilter, chipCounts, progressRows, rowName, sortFilterRows } from "./filters.js";
import { backupFilename, buildBackup, isShareCancel, mergeBackup } from "./backup.js";

const CAT_CLASS = {
  defensas: "defensas",
  laboratorio: "laboratorio",
  ejercito_edif: "ejercito",
  equipamiento: "equipamiento",
  mascotas: "mascotas",
  heroes: "heroes",
  trampas: "trampas",
  recursos: "recursos",
  muros: "muros",
};
const QUEUE_LABEL = {
  constructor: "Constructor",
  laboratorio: "Laboratorio",
  mascotas: "Mascotas",
  equipamiento: "Equipamiento",
};
const CHEV = `<svg class="chevron" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BB_HEROES = ["28000003", "28000005"];
const BB_TROOPS = ["4000031", "4000032", "4000033", "4000034", "4000035", "4000036", "4000037", "4000038", "4000041", "4000042", "4000070", "4000106"];

const state = {
  ready: false,
  manifest: null,
  caps: null,
  index: null,
  rows: [],
  latest: new Map(),
  peso: null,
  images: [],
  cacheBytes: 0,
  cacheCount: 0,
  dl: { phase: "idle", doneBytes: 0, doneCount: 0, total: 0, errors: 0, note: "" },
  seg: {},
  mejorasMode: localStorage.getItem("cp-mejoras") || "cuenta",
  evo: localStorage.getItem("cp-evo") || "roster",
  sortMode: localStorage.getItem("cp-sort") || "th",
  selected: localStorage.getItem("cp-account") || "#28PLGP0G2",
  accounts: [],
  editor: null,
  progFilter: { cat: "todas", status: "todos", q: "" },
  chartTag: localStorage.getItem("cp-chart") || "",
  ficha: null,
  focusReturn: "",
  sheetKey: "",
  sheetFocusMark: null,
  sheetView: "",
  sheetScroll: null,
  toast: null,
  alert: null,
  alertShown: false,
  alertReturn: null,
  flash: null,
  now: Date.now(),
  importUi: freshImport(),
  added: [],
  flashTags: new Set(),
  scrollAdded: false,
  dlAbort: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

function route() {
  const raw = (location.hash || "#/roster").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  let name = parts[0] || "roster";
  if (name === "cuentas") name = "roster";
  if (name === "progreso" && parts[1] && parts[2]) {
    return { name: "detalle", tag: "#" + parts[1], cat: parts[2] };
  }
  if (name === "progreso" && parts[1]) return { name: "progreso", tag: "#" + parts[1] };
  if (name === "graficos" || name === "evolucion") return { name: "graficos", tag: null, cat: null };
  return { name, tag: null, cat: null };
}

function baseTab(r) {
  if (r.name === "detalle" || r.name === "progreso") return "progreso";
  if (r.name === "mejoras") return "mejoras";
  if (r.name === "graficos" || r.name === "evolucion") return "graficos";
  if (r.name === "copia") return "copia";
  return "roster";
}

const ADDED_KEY = "cp-added";

function freshImport() {
  return {
    active: false,
    mode: "file",
    text: "",
    phase: "entry",
    items: [],
    focus: null,
    fromBatch: false,
    saveError: false,
    alias: "",
    needsFocus: false,
  };
}

function loadAdded() {
  try {
    const list = JSON.parse(localStorage.getItem(ADDED_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveAdded(list) {
  localStorage.setItem(ADDED_KEY, JSON.stringify(list));
}

function accountFromAdded(a) {
  const nombre = (a.alias || "").trim() || a.tag;
  return {
    tag: a.tag,
    nombre,
    chip: a.chip || String(a.tag).slice(-3),
    role: null,
    roleClass: "",
    objetivo: null,
    featured: false,
    added: true,
  };
}

const ROSTER_KEY = "cp-roster";

function readStoredRoster() {
  try {
    return JSON.parse(localStorage.getItem(ROSTER_KEY) || "null");
  } catch {
    return null;
  }
}

function persistRoster() {
  localStorage.setItem(ROSTER_KEY, JSON.stringify({ version: 2, accounts: state.accounts }));
}

function viewSnapshot(tag) {
  const exp = state.latest && state.latest.get(tag);
  if (!exp || !state.index) return { th: -1, media: -1 };
  const view = analyze(exp, state.index);
  return { th: view.th == null ? -1 : view.th, media: view.media == null ? -1 : view.media };
}

function viewsMap() {
  const views = {};
  for (const a of state.accounts) views[a.tag] = viewSnapshot(a.tag);
  return views;
}

function toMeta(a, featured) {
  const nombre = (a.alias || "").trim() || a.tag;
  return {
    tag: a.tag,
    nombre,
    alias: (a.alias || "").trim(),
    chip: a.chip || String(a.tag).slice(-3),
    principal: !!a.principal,
    role: a.principal ? "Principal" : "",
    roleClass: a.principal ? "chip--main" : "",
    objetivo: a.objetivo == null ? null : a.objetivo,
    featured: featured === a.tag,
    added: true,
  };
}

function allAccounts() {
  const views = viewsMap();
  const featured = featuredTag(state.accounts, views);
  return orderAccounts(state.accounts, views, state.sortMode).map((a) => toMeta(a, featured));
}

function accountByTag(tag) {
  return allAccounts().find((a) => a.tag === tag) || null;
}

function rosterIndex(tag) {
  const list = allAccounts();
  const i = list.findIndex((a) => a.tag === tag);
  return i < 0 ? 1000 : i;
}

function makeChip(tag, th) {
  const tail = String(tag || "").replace(/^#/, "");
  const taken = new Set(allAccounts().map((a) => a.chip));
  let n = 3;
  let chip = `${th}·${tail.slice(-n)}`;
  while (taken.has(chip) && n < tail.length) {
    n += 1;
    chip = `${th}·${tail.slice(-n)}`;
  }
  return chip;
}

function isFlash(tag) {
  return state.flash === tag || (state.flashTags && state.flashTags.has(tag));
}

function armFlash(tags) {
  const list = (Array.isArray(tags) ? tags : [tags]).filter(Boolean);
  state.flashTags = new Set(list);
  state.flash = list[0] || null;
  clearTimeout(armFlash._t);
  armFlash._t = setTimeout(() => {
    state.flash = null;
    state.flashTags = new Set();
    document.querySelectorAll(".is-flash").forEach((el) => el.classList.remove("is-flash"));
  }, 1200);
}

function inSafariTab() {
  return typeof navigator !== "undefined" && navigator.standalone === false;
}

function expOf(tag) { return state.latest.get(tag) || null; }

function viewOf(tag) {
  const exp = expOf(tag);
  if (!exp || !state.index) return null;
  return analyze(exp, state.index);
}

function nameOf(id) {
  const item = state.index.items[String(id)];
  return itemName(item);
}

function imageRecord(item, th) {
  if (!item) return null;
  if (String(item.id) === "1000001" && th && item.imagenes_por_nivel) {
    return item.imagenes_por_nivel[String(th)] || null;
  }
  return item.imagen || null;
}

function frameOf(im, size) {
  if (!im || im.tipo_visual === "tile_fondo_opaco" || !im.caja_visible) return null;
  const ancho = Number(im.ancho);
  const alto = Number(im.alto);
  const { x, y, w, h } = im.caja_visible;
  if (!ancho || !alto || !w || !h) return null;
  const k = 1 / Math.max(ancho, alto);
  const cx = (1 - ancho * k) / 2 + (x + w / 2) * k;
  const cy = (1 - alto * k) / 2 + (y + h / 2) * k;
  const lado = size * 0.84;
  const z = Math.min(0.92 / Math.max(w * k, h * k), Math.max(ancho, alto) / (lado * 3), 8);
  if (!(z >= 1.15)) return null;
  const n = (v) => String(Math.round(v * 1000) / 1000);
  return { cx: n(cx), cy: n(cy), z: n(z) };
}

function thumb(id, opts = {}) {
  const size = opts.size || 40;
  const known = [40, 44, 52, 72, 96].includes(size);
  const cls = known ? "thumb--" + size : "";
  const item = id == null ? null : state.index.items[String(id)];
  if (!item || item.estado === "sin_identificar") {
    const style = known ? "" : ` style="--size:${size}px"`;
    return `<span class="thumb ${cls} thumb--unknown"${style} aria-hidden="true">?</span>`;
  }
  const label = nameOf(id) || "";
  const im = imageRecord(item, opts.th);
  if (item.estado === "faltante" || !im || im.pesado === true) {
    const style = known ? "" : ` style="--size:${size}px"`;
    if (opts.ficha && im && im.pesado === true) {
      return imageThumb(cls, size, label, im, opts);
    }
    return `<span class="thumb ${cls} thumb--empty"${style} aria-hidden="true">${esc(initials(label))}</span>`;
  }
  return imageThumb(cls, size, label, im, opts);
}

function imageThumb(cls, size, label, im, opts) {
  const frame = frameOf(im, size);
  const tile = im.tipo_visual === "tile_fondo_opaco" ? " thumb--tile" : "";
  const enc = frame ? " thumb--encuadre" : "";
  const vars = [];
  if (![40, 44, 52, 72, 96].includes(size)) vars.push(`--size:${size}px`);
  if (frame) vars.push(`--cx:${frame.cx}`, `--cy:${frame.cy}`, `--z:${frame.z}`);
  const style = vars.length ? ` style="${vars.join(";")}"` : "";
  const loading = opts.eager ? "eager" : "lazy";
  const pri = opts.eager ? " fetchpriority=\"high\"" : "";
  return `<span class="thumb ${cls}${tile}${enc}"${style} data-initials="${esc(initials(label))}"><img src="./assets/${esc(im.ruta)}" alt="" width="${size}" height="${size}" loading="${loading}" decoding="async"${pri} onload="window.__imgOk(this)" onerror="window.__imgErr(this)"></span>`;
}

function emptyNamedThumb(label, size) {
  const known = [40, 44, 52, 72, 96].includes(size);
  const cls = known ? "thumb--" + size : "";
  const style = known ? "" : ` style="--size:${size}px"`;
  return `<span class="thumb ${cls} thumb--empty"${style} aria-hidden="true">${esc(initials(label))}</span>`;
}

window.__imgOk = (img) => {
  img.classList.add("is-loaded");
  const box = img.closest(".thumb");
  if (box) box.classList.remove("thumb--offline");
};
window.__imgErr = (img) => {
  const box = img.closest(".thumb");
  if (!box || box.dataset.checked === "1") return;
  box.dataset.checked = "1";
  resolveThumbFailure(img, box);
};

async function resolveThumbFailure(img, box) {
  let offline = !navigator.onLine || box.classList.contains("thumb--offline");
  if (!offline) {
    try {
      const res = await fetch(img.currentSrc || img.src);
      if (res.status === 503 || res.status === 504) offline = true;
    } catch {
      offline = true;
    }
  }
  if (!box.isConnected) return;
  if (offline) {
    box.classList.add("thumb--offline");
    return;
  }
  img.remove();
  box.classList.add("thumb--empty");
  box.textContent = box.dataset.initials || "?";
}

async function paintOfflineThumbs() {
  if (navigator.onLine) return;
  const imgs = [...document.querySelectorAll(".thumb > img:not(.is-loaded)")];
  if (!("caches" in window)) {
    for (const img of imgs) img.closest(".thumb")?.classList.add("thumb--offline");
    return;
  }
  await Promise.all(imgs.map(async (img) => {
    const box = img.closest(".thumb");
    if (!box || box.classList.contains("thumb--empty")) return;
    let hit = null;
    try { hit = await caches.match(img.src); } catch { hit = null; }
    if (!box.isConnected || img.classList.contains("is-loaded")) return;
    if (!hit) box.classList.add("thumb--offline");
  }));
}

function retryOfflineThumbs() {
  document.querySelectorAll(".thumb--offline").forEach((box) => {
    box.classList.remove("thumb--offline");
    delete box.dataset.checked;
    const img = box.querySelector("img");
    if (!img) return;
    const src = img.getAttribute("src");
    img.classList.remove("is-loaded");
    img.removeAttribute("src");
    img.src = src;
  });
}

function barHtml(catKey, pctVal, mark, opts) {
  if (!opts) opts = {};
  const cls = ["bar"];
  if (!opts.plain) cls.push("cat-" + (CAT_CLASS[catKey] || "defensas"));
  if (opts.lg) cls.push("bar--lg");
  if (opts.mini) cls.push("bar--mini");
  if (opts.maxed) cls.push("is-th-max");
  const p = pctVal == null ? 0 : Math.max(0, Math.min(100, pctVal));
  const style = [`--p:${p}`];
  if (mark != null) style.push(`--m:${Math.max(0, Math.min(100, mark))}`);
  const empty = !p ? " data-empty" : "";
  const markEl = mark != null ? `<span class="bar__mark"></span>` : "";
  const a11y = opts.decorative
    ? ` aria-hidden="true"`
    : ` role="img" aria-label="${esc(opts.label || "")}"`;
  return `<div class="${cls.join(" ")}" style="${style.join(";")}"${empty}${a11y}><span class="bar__fill"></span>${markEl}</div>`;
}

function rowTitle(name, extras) {
  return `<span class="row__title row__title--meta"><span class="row__name">${esc(name)}</span>${extras || ""}</span>`;
}

function catAria(label, pct, foot) {
  const spoken = String(foot || "")
    .replace(/TH(\d+):\s*/g, "TH$1 ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/^Faltan\b/, "faltan");
  return [label, pct, spoken].filter(Boolean).join(", ");
}

function detailAria(title, it, a, flags) {
  if (!flags) flags = {};
  const line = levelLine(it);
  const lvl = it.lvl == null || Number.isNaN(it.lvl) ? 0 : it.lvl;
  let level = line.bar && it.max != null ? `nivel ${lvl} de ${it.max}` : line.text;
  if (line.bar && it.maxNext != null && a && a.thSig) level += `, TH${a.thSig} ${it.maxNext}`;
  const bits = [title];
  if (it.cnt > 1) bits.push(`×${it.cnt}`);
  bits.push(level);
  if (flags.deduced) bits.push("ID deducido");
  if (flags.unknown && it.id) bits.push(`ID ${it.id}`);
  return bits.join(", ");
}

function heroAria(name, h, line, deduced) {
  const lvl = h.lvl == null ? 0 : h.lvl;
  const level = line.bar && h.max ? `nivel ${lvl} de ${h.max}` : line.text;
  return [name || "Héroe", level, deduced ? "ID deducido" : ""].filter(Boolean).join(", ");
}

function cssAttr(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function goalChip(th, objetivo) {
  if (th == null) return "";
  if (th >= objetivo) return `<span class="chip chip--goal-ok">Objetivo TH${objetivo}</span>`;
  return `<span class="chip">TH${th} → ${objetivo}</span>`;
}

function accountChip(meta) {
  return `<span class="chip chip--muted chip--sm">${esc(meta.chip)}</span>`;
}

function upgrades(exp) {
  return upgradesOf(exp).map((u) => ({ ...u, done: u.end <= state.now }));
}

function nextUpgrade(exp) {
  const list = upgrades(exp).filter((u) => !u.done);
  return list[0] || null;
}

function fmtWhen(ms) { return fmtFin(ms); }

function stale(exp) {
  return state.now - exp.timestamp * 1000 > 7 * 86400000;
}

function navbar(r) {
  const tab = baseTab(r);
  const titles = { roster: "Cuentas", progreso: "Progreso", mejoras: "Mejoras", graficos: "Gráficos", copia: "Copia", detalle: "Detalle" };
  let lead = "";
  let trail = "";
  let title = titles[tab] || titles[r.name] || "";
  let collapsed = "false";
  if (r.name === "roster" || r.name === "importar") {
    trail = `<button class="btn-text btn-text--bold" data-go="#/importar">Importar</button>`;
  } else if (r.name === "detalle") {
    const cat = CATEGORIES.find((c) => c.key === r.cat);
    title = cat ? cat.label : "Detalle";
    lead = `<button class="btn-text" data-go="#/progreso/${r.tag.slice(1)}"><svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Progreso</button>`;
    collapsed = "true";
  }
  return `<header class="navbar" data-collapsed="${collapsed}">
    <div class="navbar__inner">
      <div class="navbar__lead">${lead}</div>
      <h1 class="navbar__title" aria-hidden="true">${esc(title)}</h1>
      <div class="navbar__trail">${trail}</div>
    </div>
  </header>`;
}

function tabbar(r) {
  const tab = baseTab(r);
  const item = (id, href, label, svg) => `<a href="${href}" ${tab === id ? 'aria-current="page"' : ""}>${svg}<span>${label}</span></a>`;
  return `<nav class="tabbar" aria-label="Secciones">
    ${item("roster", "#/roster", "Cuentas", `<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="5" width="8" height="8" rx="2"/><rect x="16" y="5" width="8" height="8" rx="2"/><rect x="4" y="16" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/></svg>`)}
    ${item("progreso", "#/progreso", "Progreso", `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 8h18M5 14h12M5 20h15"/></svg>`)}
    ${item("mejoras", "#/mejoras", "Mejoras", `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5"/><path d="M14 8.5V14l3.5 2.5"/></svg>`)}
    ${item("graficos", "#/graficos", "Gráficos", `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 21l6-6 4 3 9-9"/><path d="M4 24h20"/></svg>`)}
    ${item("copia", "#/copia", "Copia", `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M8 6h9l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M16 6v6h6"/></svg>`)}
  </nav>`;
}

function subImported() {
  let last = 0;
  for (const r of ROSTER) {
    const e = expOf(r.tag);
    if (e && e.timestamp > last) last = e.timestamp;
  }
  if (!last) return "11 cuentas";
  return `11 cuentas · última importación ${fmtWhen(last * 1000)}`;
}

function renderRoster() {
  const list = allAccounts();
  const sortLabel = state.sortMode === "nombre" ? "nombre" : state.sortMode === "pct" ? "%" : "TH";
  const empty = list.length
    ? ""
    : `<div class="section"><div class="card empty"><p class="t-title3">Aún no hay cuentas</p><p class="t-subhead c-2">Las de prueba se pueden borrar. Añade la tuya importando su JSON.</p><button class="btn btn--primary" data-go="#/importar">Añadir cuenta</button></div></div>`;
  const rows = list.map(rowCuenta).join("");
  const seedNote = isSeedRoster(list)
    ? `<p class="section-footer">Las ${list.length} son de prueba: añade, renombra o borra cuentas. % = media de las categorías desbloqueadas.</p>`
    : `<p class="section-footer">% = media de las categorías desbloqueadas. Una cuenta sin Principal usa como destacada la de TH más alto.</p>`;
  return `<h1 class="large-title">Cuentas</h1>
    <p class="large-sub">${list.length === 1 ? "1 cuenta" : `${list.length} cuentas`} · ordenadas por ${esc(sortLabel)}</p>
    <label class="sort-label">Ordenar
      <select data-sort aria-label="Ordenar cuentas">
        <option value="th"${state.sortMode === "th" ? " selected" : ""}>TH</option>
        <option value="nombre"${state.sortMode === "nombre" ? " selected" : ""}>Nombre</option>
        <option value="pct"${state.sortMode === "pct" ? " selected" : ""}>Porcentaje</option>
      </select>
    </label>
    ${empty}
    ${list.length ? `<div class="section"><ul class="list">${rows}</ul>${seedNote}</div>` : seedNote}
    <div class="section"><button class="btn btn--primary btn--block" data-go="#/importar">Añadir cuenta</button></div>
    ${LEGAL}`;
}

function isSeedRoster(list) {
  if (list.length !== ROSTER.length) return false;
  const tags = new Set(list.map((a) => a.tag));
  return ROSTER.every((r) => tags.has(r.tag));
}

function rowCuenta(meta) {
  const exp = expOf(meta.tag);
  const flash = isFlash(meta.tag) ? " is-flash" : "";
  const mark = meta.principal
    ? `<span class="chip chip--main">Principal</span>`
    : meta.featured ? `<span class="chip chip--second">Destacada</span>` : "";
  if (!exp) {
    return `<li><div class="row row--account row--thumb44${flash}">
      <a class="row__main" href="#/progreso/${meta.tag.slice(1)}">
        <span class="row__title">${esc(meta.nombre)} ${mark}</span>
        <span class="row__sub"><span class="chip chip--muted">Sin importar</span></span>
      </a>
      <button type="button" class="btn-text" data-edit="${esc(meta.tag)}">Editar</button>
    </div></li>`;
  }
  const a = viewOf(meta.tag);
  const when = fmtWhen(exp.timestamp * 1000);
  const title = meta.nombre === meta.tag ? `<span class="tag">${esc(meta.tag)}</span>` : esc(meta.nombre);
  const aria = `${meta.nombre}, TH${a.th}, media ${fmtPct(a.media)}${meta.principal ? ", Principal" : meta.featured ? ", destacada" : ""}`;
  return `<li><div class="row row--account row--thumb44${flash}">
    ${thumb(1000001, { size: 44, th: a.th })}
    <a class="row__main" href="#/progreso/${meta.tag.slice(1)}" aria-label="${esc(aria)}">
      <span class="row__title">${title} ${mark}</span>
      <span class="row__sub">TH${a.th} · <span class="tag">${esc(meta.tag)}</span> · ${esc(when)}</span>
    </a>
    <span class="row__trail"><span class="num row__pct">${fmtPct(a.media)}</span></span>
    <button type="button" class="btn-text" data-edit="${esc(meta.tag)}">Editar</button>
  </div></li>`;
}

function featuredCard(meta) {
  const exp = expOf(meta.tag);
  const flash = isFlash(meta.tag) ? " is-flash" : "";
  if (!exp) {
    return `<a class="card card--tap account-card${flash}" href="#/progreso/${meta.tag.slice(1)}">
      <span class="thumb thumb--72 thumb--empty" aria-hidden="true">TH</span>
      <div class="account-card__title">${esc(meta.nombre)} <span class="chip ${meta.roleClass}">${esc(meta.role)}</span></div>
      <div class="account-card__chips"><span class="chip chip--muted">Sin importar</span></div>
    </a>`;
  }
  const a = viewOf(meta.tag);
  const ups = upgrades(exp);
  const active = ups.filter((u) => !u.done);
  const nxt = active[0];
  const metaLine = `${active.length} mejoras${nxt ? " · próxima " + fmtWhen(nxt.end) : ""}`;
  const fill = a.thSig ? a.sigMedia : a.media;
  return `<a class="card card--tap account-card${flash}" href="#/progreso/${meta.tag.slice(1)}" aria-label="${esc(meta.nombre)}, TH${a.th}, objetivo TH${meta.objetivo}, media ${fmtPct(a.media)}">
    ${thumb(1000001, { size: 72, th: a.th, eager: true })}
    <div class="account-card__title">${esc(meta.nombre)} <span class="chip ${meta.roleClass}">${esc(meta.role)}</span></div>
    <div class="account-card__chips"><span class="chip">TH${a.th}</span>${goalChip(a.th, meta.objetivo)}</div>
    <div class="account-card__bar">${barHtml("defensas", fill, a.thSig ? markMedia(a) : null, { plain: true, label: `Media ${fmtPct(a.media)}` })}<span class="num">${fmtPct(a.media)}</span></div>
    <div class="account-card__meta${stale(exp) ? " is-stale" : ""}">${esc(stale(exp) ? `Datos del ${fmtWhen(exp.timestamp * 1000)}` : metaLine)}</div>
  </a>`;
}

function markMedia(a) {
  // Marca: media de (den actual / den siguiente) solo donde hay ambos.
  const ratios = [];
  for (const c of CATEGORIES) {
    const row = a.cats[c.key];
    if (row.den && row.sigDen) ratios.push(row.den / row.sigDen * 100);
  }
  if (!ratios.length) return null;
  return ratios.reduce((s, v) => s + v, 0) / ratios.length;
}

function rowAccount(meta) {
  const exp = expOf(meta.tag);
  const flash = isFlash(meta.tag) ? " is-flash" : "";
  if (!exp) {
    return `<li><a class="row row--account row--thumb44${flash}" href="#/progreso/${meta.tag.slice(1)}">
      <span class="thumb thumb--44 thumb--empty" aria-hidden="true">TH</span>
      <span class="row__main"><span class="row__title tag">${esc(meta.nombre)}</span><span class="row__sub"><span class="chip chip--muted">Sin importar</span></span></span>
      ${CHEV}</a></li>`;
  }
  const a = viewOf(meta.tag);
  const n = upgrades(exp).filter((u) => !u.done).length;
  return `<li><a class="row row--account row--thumb44${flash}" href="#/progreso/${meta.tag.slice(1)}" aria-label="${esc(meta.tag)}, TH${a.th}, objetivo TH${meta.objetivo}, media ${fmtPct(a.media)}">
    ${thumb(1000001, { size: 44, th: a.th })}
    <span class="row__main"><span class="row__title tag">${esc(meta.nombre)}</span><span class="row__sub">TH${a.th} → ${meta.objetivo} · ${n} mejoras</span></span>
    <span class="row__trail">${barHtml("defensas", a.thSig ? a.sigMedia : a.media, a.thSig ? markMedia(a) : null, { mini: true, plain: true, label: fmtPct(a.media) })}<span class="num" style="font-weight:600;color:var(--label);font-size:0.882rem">${fmtPct(a.media)}</span>${CHEV}</span>
  </a></li>`;
}

function otrasCuentas() {
  const rows = state.added.map(accountFromAdded).filter((meta) => expOf(meta.tag));
  if (!rows.length) return "";
  return `<div class="section" id="otras-cuentas"><div class="section-header"><span>Otras cuentas</span><span class="num">${rows.length}</span></div><ul class="list">${rows.map(rowAdded).join("")}</ul></div>`;
}

function rowAdded(meta) {
  const exp = expOf(meta.tag);
  const a = viewOf(meta.tag);
  if (!exp || !a) return "";
  const flash = isFlash(meta.tag) ? " is-flash" : "";
  const n = upgrades(exp).filter((u) => !u.done).length;
  const title = meta.nombre === meta.tag ? `<span class="tag">${esc(meta.tag)}</span>` : esc(meta.nombre);
  const sub = `TH${a.th} · sin objetivo · ${n} mejoras`;
  return `<li><a class="row row--account row--thumb44${flash}" href="#/progreso/${meta.tag.slice(1)}" aria-label="${esc(meta.nombre)}, TH${a.th}, sin objetivo, media ${fmtPct(a.media)}">
    ${thumb(1000001, { size: 44, th: a.th })}
    <span class="row__main"><span class="row__title">${title}</span><span class="row__sub">${esc(sub)}</span></span>
    <span class="row__trail">${barHtml("defensas", a.media, null, { mini: true, plain: true, label: fmtPct(a.media) })}<span class="num" style="font-weight:600;color:var(--label);font-size:0.882rem">${fmtPct(a.media)}</span>${CHEV}</span>
  </a></li>`;
}

function renderProgreso(tag) {
  const list = allAccounts();
  const meta = accountByTag(tag) || list[0];
  if (!meta) {
    return `<h1 class="large-title">Progreso</h1><div class="section"><div class="card empty"><p class="t-title3">Aún no hay cuentas</p><button class="btn btn--primary" data-go="#/importar">Añadir cuenta</button></div></div>${LEGAL}`;
  }
  const exp = expOf(meta.tag);
  const options = list.map((r) => `<option value="${esc(r.tag)}"${r.tag === meta.tag ? " selected" : ""}>${esc(r.nombre)}</option>`).join("");
  const a = exp ? viewOf(meta.tag) : null;
  const sub = !a ? "Sin importar" : `${esc(meta.tag)} · media ${fmtPct(a.media)}`;
  const filt = state.progFilter;
  const rows = exp ? progressRows(exp, state.index) : [];
  const counts = chipCounts(rows, { status: filt.status, query: filt.q, index: state.index });
  const narrowed = filt.cat !== "todas" || filt.status !== "todos" || String(filt.q || "").trim();
  const body = !exp
    ? `<div class="section"><div class="card empty"><p class="t-title3">Esta cuenta aún no tiene datos</p><p class="t-subhead c-2">Importa su exportación JSON para ver el progreso.</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div></div>`
    : `${filterControls(counts, filt)}${narrowed ? filterList(exp, meta, a) : catsBlock(exp, meta)}`;
  return `<h1 class="large-title">Progreso</h1>
    <div class="section"><div class="list picker"><a class="row row--thumb44" href="#/progreso/${meta.tag.slice(1)}">
      ${exp ? thumb(1000001, { size: 44, th: a.th }) : `<span class="thumb thumb--44 thumb--empty">TH</span>`}
      <span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${sub}</span></span>
      <svg class="chevron" viewBox="0 0 9 14" aria-hidden="true"><path d="M2 1.5 6.5 7 2 12.5M5 1.5 9 7 5 12.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
    </a><select aria-label="Cuenta" data-account>${options}</select></div></div>
    ${exp ? summaryCard(a, meta) : ""}
    ${body}
    ${exp && !narrowed ? builderBaseSection(exp) : ""}
    ${LEGAL}`;
}

function filterControls(counts, filt) {
  const short = { ejercito_edif: "Ejército" };
  const chips = [{ key: "todas", label: "Todas" }].concat(CATEGORIES.map((c) => ({ key: c.key, label: short[c.key] || c.label })));
  const buttons = chips.map((c) => {
    const n = counts[c.key] || 0;
    const on = filt.cat === c.key;
    return `<button type="button" data-pcat="${c.key}" aria-pressed="${on}">${esc(c.label)} ${n}</button>`;
  }).join("");
  const status = (id, label) => `<button type="button" role="tab" data-pstatus="${id}" aria-selected="${filt.status === id}">${label}</button>`;
  return `<label class="filter-search"><span class="sr-only">Buscar</span><input data-psearch type="search" enterkeyhint="search" placeholder="Buscar edificio, héroe, tropa…" value="${esc(filt.q)}" aria-label="Buscar edificio, héroe, tropa"></label>
    <div class="chip-row" role="toolbar" aria-label="Categorías">${buttons}</div>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Estado">
      ${status("todos", "Todos")}${status("pendientes", "Pendientes")}${status("maximo", "Al máximo")}
    </div></div>`;
}

function filterList(exp, meta, a) {
  const filt = state.progFilter;
  const visible = sortFilterRows(applyFilter(progressRows(exp, state.index), {
    category: filt.cat,
    status: filt.status,
    query: filt.q,
    index: state.index,
  }));
  if (!visible.length) {
    return `<div class="section"><div class="card empty"><p class="t-title3">Nada con ese filtro</p><p class="t-subhead c-2">Prueba otra categoría o borra la búsqueda.</p></div></div>`;
  }
  if (filt.cat === "equipamiento") {
    const cells = visible.map((p) => eqCell(p)).join("");
    return `${categoryHead(filt.cat, visible.length, a)}<div class="section"><ul class="eq-grid">${cells}</ul></div>`;
  }
  const lis = visible.map((it) => {
    if (it.categoryKey === "muros") {
      const at = isWallMax(it);
      return `<li><div class="row"><span class="row__main"><span class="row__title">Muro</span><span class="row__sub num">Nv ${it.lvl}${it.max != null ? ` / ${it.max}` : ""} · ×${it.cnt}</span></span><span class="row__trail">${at ? "Al máximo" : "Pendiente"}</span></div></li>`;
    }
    return detailRow(it, it.categoryKey, a);
  }).join("");
  return `${categoryHead(filt.cat, visible.length, a)}<div class="section"><ul class="list">${lis}</ul></div>`;
}

/** Título de una categoría: la píldora va con el nombre y el % en su propia línea. Sin «·». */
function catHead(label, count, pctText) {
  const pct = pctText ? `<p class="cat-head__pct num">${esc(pctText)}</p>` : "";
  return `<h2 class="cat-head__title"><span class="cat-head__name">${esc(label)}</span><span class="chip num">${count}</span></h2>${pct}`;
}

function categoryHead(catKey, count, a) {
  if (!catKey || catKey === "todas" || !a) return "";
  const cat = CATEGORIES.find((c) => c.key === catKey);
  if (!cat) return "";
  const row = a.cats[catKey];
  const pctText = row && row.pct != null ? fmtPct(row.pct) : "";
  const bar = row && row.pct != null
    ? barHtml(catKey, a.thSig ? row.sigPct : row.pct, a.thSig ? row.mark : null, { label: `${cat.label} ${fmtPct(row.pct)}` })
    : "";
  const foot = row && row.pct != null ? `<p class="cat-head__foot">${esc(catFoot(a, row))}</p>` : "";
  return `<div class="section"><div class="card cat-head cat-${CAT_CLASS[catKey]}">${catHead(cat.label, count, pctText)}${bar}${foot}</div></div>`;
}

function isWallMax(it) {
  return it.max != null && it.lvl >= it.max;
}

function summaryCard(a) {
  const sig = a.thSig ? `<p class="t-footnote c-2">TH${a.thSig}: ${fmtPct(a.sigMedia)}</p>` : "";
  const sigOff = a.thSig ? `<p class="t-footnote c-2">TH${a.thSig}: ${fmtPct(a.sigOffense)}</p>` : "";
  return `<div class="section"><div class="card summary">
    <div><p class="t-footnote c-2">Media</p><p class="t-title1 num">${fmtPct(a.media)}</p><p class="t-footnote c-2">del máximo de TH${a.th}</p>${sig}</div>
    <div><p class="t-footnote c-2">Ofensiva</p><p class="t-title1 num">${fmtPct(a.offense)}</p><p class="t-footnote c-2">Media de laboratorio y héroes</p>${sigOff}</div>
  </div></div>`;
}

function catsBlock(exp, meta) {
  const a = viewOf(meta.tag);
  const legend = a.thSig
    ? `Relleno: nivel actual · Marca: máximo TH${a.th} · Final: máximo TH${a.thSig}`
    : `Relleno: nivel actual frente al máximo de TH${a.th}`;
  const rows = CATEGORIES.map((c) => catRow(exp, meta, a, c)).join("");
  return `<p class="section-footer" style="margin-bottom:8px">${esc(legend)}</p>
    <div class="section" style="margin-top:0"><ul class="list">${rows}</ul></div>
    ${wallsCard(a)}
    ${heroesCard(a)}`;
}

function catRow(exp, meta, a, c) {
  const row = a.cats[c.key];
  const cls = "cat-" + CAT_CLASS[c.key];
  if (row.pct == null) {
    const n = categoryUnlock(categoryItems(exp, state.index, c.key, a.th));
    const sub = n != null ? `Se desbloquea en TH${n}` : "";
    return `<li><a class="row ${cls}" href="#/progreso/${meta.tag.slice(1)}/${c.key}"><span class="row__main"><span class="row__title"><span class="dot"></span>${esc(c.label)}</span><span class="row__sub">${esc(sub)}</span></span>${CHEV}</a></li>`;
  }
  const maxed = row.pct != null && row.num >= row.den;
  const label = maxed ? (a.thSig ? `Máx TH${a.th}` : "Máx") : fmtPct(row.pct);
  const fill = a.thSig ? row.sigPct : row.pct;
  const mark = a.thSig ? row.mark : null;
  const foot = catFoot(a, row);
  const href = c.key === "equipamiento" ? null : `#/progreso/${meta.tag.slice(1)}/${c.key}`;
  const aria = catAria(c.label, fmtPct(row.pct), foot);
  const inner = `<span class="row__main"><div class="prog ${cls}">
      <span class="row__title"><span class="dot"></span>${esc(c.label)}</span>
      <span class="prog__pct num${maxed ? " is-max" : ""}">${esc(label)}</span>
      ${barHtml(c.key, fill, mark, { maxed, decorative: true })}
      <span class="prog__foot">${esc(foot)}</span>
    </div></span>${href ? CHEV : ""}`;
  if (!href) {
    return `<li><button class="row" data-seg="eq" style="padding-top:12px;padding-bottom:12px" aria-label="${esc(aria)}">${inner}</button></li>`;
  }
  return `<li><a class="row" style="padding-top:12px;padding-bottom:12px" href="${href}" aria-label="${esc(aria)}">${inner}</a></li>`;
}

function wallParts(a) {
  const w = a.walls;
  const present = (w && w.hist ? w.hist : []).filter((h) => h.cnt);
  const min = present.length ? Math.min(...present.map((h) => h.lvl)) : 0;
  const span = w && w.max != null ? (w.max - min) || 1 : 1;
  return present.map((h) => ({
    ...h,
    k: Math.min(1, 0.35 + 0.65 * ((h.lvl - min) / span)),
    maxed: w && w.max != null && h.lvl >= w.max,
  }));
}

function wallsCard(a) {
  const w = a.walls;
  if (!w || !w.pieces) return "";
  const present = wallParts(a);
  const segs = present.map((h) => {
    const maxed = h.maxed ? " is-max" : "";
    return `<span class="${maxed.trim()}" style="--n:${h.cnt};--k:${h.k.toFixed(3)}"></span>`;
  }).join("");
  const chips = present.map((h) => {
    const maxed = h.maxed ? " is-max" : "";
    return `<li class="${maxed.trim()}"><b>Nv ${h.lvl}</b> × ${h.cnt}</li>`;
  }).join("");
  const medio = w.pieces ? w.num / w.pieces : 0;
  const aria = present.map((h) => `${h.cnt} de nivel ${h.lvl}`).join(", ");
  return `<div class="section"><div class="card cat-muros">
    <div class="prog"><span class="t-headline">Muros</span><span class="prog__pct num">${fmtPct(a.cats.muros.pct)}</span>
      ${barHtml("muros", a.thSig ? a.cats.muros.sigPct : a.cats.muros.pct, a.thSig ? a.cats.muros.mark : null, { label: `Muros ${fmtPct(a.cats.muros.pct)}` })}
    </div>
    <div class="walls" role="img" aria-label="Muros: ${esc(aria)}" style="margin-top:12px">${segs}</div>
    <ul class="wall-chips">${chips}</ul>
    <p class="prog__foot">${w.pieces} piezas · nivel medio ${fmtNum(medio)} · máximo TH${a.th}: Nv ${w.max}</p>
  </div></div>`;
}

function heroesCard(a) {
  const rows = a.heroes.map((h) => {
    const item = state.index.items[h.id];
    const deduced = item.estado === "id_deducido";
    const badge = deduced ? `<span class="badge badge--soft">ID deducido</span>` : "";
    const line = levelLine(h);
    const lvl = h.lvl == null ? 0 : h.lvl;
    const name = nameOf(h.id) || "Héroe";
    const aria = heroAria(name, h, line, deduced);
    const title = rowTitle(name, badge);
    if (!line.bar) {
      return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
        ${thumb(h.id, { size: 40 })}
        <span class="row__main">${title}<span class="row__sub">${esc(line.text)}</span></span>
      </button></li>`;
    }
    const p = h.max ? (lvl / h.max) * 100 : 0;
    const maxed = lvl >= h.max;
    return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}" data-max="${h.max || ""}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
      ${thumb(h.id, { size: 40 })}
      <span class="row__main">${title}<span class="row__sub num">${esc(line.text)}</span></span>
      <span class="row__trail">${barHtml("heroes", p, null, { mini: true, maxed, decorative: true })}</span>
    </button></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Héroes</span></div><ul class="list">${rows}</ul></div>`;
}

function equipBlock(exp, meta) {
  const a = viewOf(meta.tag);
  const pieces = equipmentView(exp, state.index, a.th);
  const withImg = pieces.filter((p) => p.meta && (p.meta.estado === "ok" || p.meta.estado === "id_deducido")).length;
  const missing = pieces.filter((p) => p.meta && p.meta.estado === "faltante").length;
  const unk = pieces.filter((p) => p.unknown).length;
  const lvl1 = pieces.filter((p) => p.lvl <= 1).length;
  const row = a.cats.equipamiento;
  const groups = new Map();
  for (const id of HERO_ORDER) groups.set(state.index.items[id].nombre_en, []);
  groups.set("__unk", []);
  for (const p of pieces) {
    const key = p.heroe && groups.has(p.heroe) ? p.heroe : "__unk";
    groups.get(key).push(p);
  }
  const cards = [];
  for (const [key, list] of groups) {
    if (!list.length && key === "__unk") continue;
    if (!list.length) continue;
    list.sort((x, y) => {
      if (x.unknown !== y.unknown) return x.unknown ? 1 : -1;
      if (y.lvl !== x.lvl) return y.lvl - x.lvl;
      return x.id < y.id ? -1 : 1;
    });
    const heroId = HERO_ORDER.find((id) => state.index.items[id].nombre_en === key);
    const title = heroId ? (nameOf(heroId) || key) : "Héroe sin identificar";
    const head = heroId ? thumb(heroId, { size: 28 }) : "";
    const cells = list.map((p) => eqCell(p)).join("");
    cards.push(`<section class="card eq-group"><header class="eq-group__hdr">${head}<h3>${esc(title)}</h3><span class="num">${list.length} piezas</span></header><ul class="eq-grid">${cells}</ul></section>`);
  }
  const maxed = row.num != null && row.den && row.num >= row.den;
  return `<div class="section"><div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 class="t-headline" style="margin:0">Equipamiento</h2><span class="t-headline num">${pieces.length} piezas</span></div>
      <p class="t-footnote c-2">${withImg} con imagen · ${missing} sin imagen · ${unk} sin identificar · ${lvl1} en nivel 1</p>
      <div class="prog cat-equipamiento">
        <span>Progreso</span><span class="prog__pct num${maxed ? " is-max" : ""}">${fmtPct(row.pct)}</span>
        ${barHtml("equipamiento", a.thSig ? row.sigPct : row.pct, a.thSig ? row.mark : null, { label: `Equipamiento ${fmtPct(row.pct)}` })}
        <span class="prog__foot">El % no cuenta piezas en nivel 1 ni sin identificar</span>
      </div>
    </div></div>
    <div class="section stack">${cards.join("")}</div>`;
}

function eqCell(p) {
  const name = p.unknown ? "Sin identificar" : (nameOf(p.id) || "Pieza");
  const deduced = !!(p.meta && p.meta.estado === "id_deducido");
  const level = p.max != null && !p.overMax ? `nivel ${p.lvl} de ${p.max}` : `nivel ${p.lvl}`;
  const aria = p.unknown
    ? `Sin identificar, ID ${p.id}, nivel ${p.lvl}`
    : [name, level, p.overMax ? "máximo desactualizado" : "", deduced ? "ID deducido" : ""].filter(Boolean).join(", ");
  const cls = [p.unknown ? "is-unknown" : "", p.lvl <= 1 ? "is-lvl1" : "", p.max && p.lvl >= p.max && !p.overMax ? "is-max" : "", p.overMax ? "is-over" : ""].filter(Boolean).join(" ");
  const over = p.overMax ? `<span class="eq__cap eq__cap--warn">máx. ${p.max}</span>` : "";
  const cap = p.unknown
    ? `<span class="eq__cap">sin identificar</span>`
    : over + (deduced ? `<span class="eq__cap eq__cap--soft">ID deducido</span>` : "");
  const box = p.unknown
    ? `<span class="thumb thumb--52 thumb--unknown" aria-hidden="true">?</span>`
    : thumb(p.id, { size: 52 });
  return `<li><button class="eq ${cls}" data-ficha="${p.id}" data-lvl="${p.lvl}" data-max="${p.max || ""}"${p.unlockTh != null ? ` data-unlock="${p.unlockTh}"` : ""} aria-label="${esc(aria)}">${box}<span class="eq__lvl num">${p.lvl}</span>${cap}</button></li>`;
}

function renderDetalle(tag, catKey) {
  const meta = accountByTag(tag);
  const exp = expOf(tag);
  const cat = CATEGORIES.find((c) => c.key === catKey);
  if (!meta || !exp || !cat) return `<div class="section"><div class="card empty"><p class="t-title3">No hay datos</p></div></div>${LEGAL}`;
  const a = viewOf(tag);
  if (catKey === "muros") return renderMuros(a);
  const row = a.cats[catKey];
  const items = categoryItems(exp, state.index, catKey, a.th);
  const groups = groupDetail(items);
  const maxed = row.num != null && row.den && row.num >= row.den;
  const head = row.pct == null
    ? `<div class="section"><div class="card"><div class="prog cat-${CAT_CLASS[catKey]}">
        <span class="t-headline">${esc(cat.label)}</span>
        <span class="prog__foot">${esc(categoryUnlock(items) != null ? `Se desbloquea en TH${categoryUnlock(items)}` : "")}</span>
      </div></div></div>`
    : `<div class="section"><div class="card"><div class="prog cat-${CAT_CLASS[catKey]}">
      <span class="t-headline">${esc(cat.label)}</span>
      <span class="prog__pct num${maxed ? " is-max" : ""}">${maxed ? (a.thSig ? `Máx TH${a.th}` : "Máx") : fmtPct(row.pct)}</span>
      ${barHtml(catKey, a.thSig ? row.sigPct : row.pct, a.thSig ? row.mark : null, { lg: true, maxed, label: `${cat.label} ${fmtPct(row.pct)}` })}
      <span class="prog__foot">${esc(catFoot(a, row))}</span>
    </div></div></div>`;
  const blocks = ["Pendientes", "Sin desbloquear", "Al máximo", "Sin identificar"].map((title) => {
    const list = groups[title];
    if (!list || !list.length) return "";
    const outside = title === "Sin identificar" ? unidentifiedOutside(list, a.th) : 0;
    const note = outside
      ? `<p class="section-footer">${outside === 1 ? "1 ítem sin identificar no cuenta en el %." : `${outside} ítems sin identificar no cuentan en el %.`}</p>`
      : "";
    return `<div class="section"><div class="section-header"><span>${title}</span></div><ul class="list">${list.map((it) => detailRow(it, catKey, a)).join("")}</ul>${note}</div>`;
  }).join("");
  return head + blocks + LEGAL;
}

function unidentifiedOutside(list, th) {
  let n = 0;
  for (const it of list) {
    if (!it.id || !outsidePct(state.index, it.id, th)) continue;
    n += it.cnt > 0 ? it.cnt : 1;
  }
  return n;
}

function groupDetail(items) {
  const g = { Pendientes: [], "Sin desbloquear": [], "Al máximo": [], "Sin identificar": [] };
  for (const it of items) {
    if (it.capsOnly) {
      if (!it.lvl) g["Sin desbloquear"].push(it);
      else if (it.max != null && it.lvl >= it.max) g["Al máximo"].push(it);
      else g.Pendientes.push(it);
      continue;
    }
    const meta = state.index.items[it.id];
    if (!meta || meta.estado === "sin_identificar") { g["Sin identificar"].push(it); continue; }
    if (!it.lvl) { g["Sin desbloquear"].push(it); continue; }
    if (it.max != null && it.lvl >= it.max) g["Al máximo"].push(it);
    else g.Pendientes.push(it);
  }
  g.Pendientes.sort((a, b) => {
    const pa = a.max ? a.lvl / a.max : 1;
    const pb = b.max ? b.lvl / b.max : 1;
    return pa - pb;
  });
  return g;
}

function rowLevel(it, a, catKey) {
  const line = levelLine(it);
  const lvl = it.lvl == null || Number.isNaN(it.lvl) ? 0 : it.lvl;
  let text = line.text;
  if (line.bar && it.maxNext != null && a.thSig) text += ` · TH${a.thSig}: ${it.maxNext}`;
  const p = line.bar && it.max ? Math.min(100, (lvl / it.max) * 100) : 0;
  const bar = line.bar
    ? barHtml(catKey, p, null, { mini: true, maxed: it.max != null && lvl >= it.max, decorative: true })
    : "";
  return { text, bar, lvl };
}

function detailRow(it, catKey, a) {
  const lv = rowLevel(it, a, catKey);
  if (it.capsOnly) {
    const title = it.capsName;
    const aria = detailAria(title, it, a, {});
    return `<li><button class="row row--thumb40" data-ficha="caps" data-caps-name="${esc(title)}" data-lvl="${lv.lvl}" data-max="${it.max || ""}"${it.unlockTh != null ? ` data-unlock="${it.unlockTh}"` : ""} aria-label="${esc(aria)}">
      ${emptyNamedThumb(title, 40)}
      <span class="row__main">${rowTitle(title)}<span class="row__sub num">${esc(lv.text)}</span></span>
      ${lv.bar}
    </button></li>`;
  }
  const meta = state.index.items[it.id];
  const unknown = !meta || meta.estado === "sin_identificar";
  const deduced = !!(meta && meta.estado === "id_deducido");
  const title = unknown ? "Sin identificar" : (nameOf(it.id) || "Ítem");
  const badge = deduced ? `<span class="badge badge--soft">ID deducido</span>` : "";
  const idBadge = unknown ? `<span class="badge badge-id">${esc(it.id)}</span>` : "";
  const cnt = it.cnt > 1 ? `×${it.cnt}` : "";
  const extras = `${cnt ? `<span class="num">${cnt}</span>` : ""}${badge}${idBadge}`;
  const aria = detailAria(title, it, a, { deduced, unknown });
  return `<li><button class="row row--thumb40${unknown ? " is-unknown" : ""}" data-ficha="${it.id}" data-lvl="${lv.lvl}" data-max="${it.max || ""}"${it.unlockTh != null ? ` data-unlock="${it.unlockTh}"` : ""} aria-label="${esc(aria)}">
    ${thumb(it.id, { size: 40 })}
    <span class="row__main">${rowTitle(title, extras)}<span class="row__sub num">${esc(lv.text)}</span></span>
    ${lv.bar}
  </button></li>`;
}

function renderMuros(a) {
  const w = a.walls || { pieces: 0, num: 0, max: null, hist: [] };
  const parts = wallParts(a);
  const medio = w.pieces ? w.num / w.pieces : 0;
  const aria = parts.map((h) => `${h.cnt} de nivel ${h.lvl}`).join(", ");
  const segs = parts.map((h) => `<span class="${h.maxed ? "is-max" : ""}" style="--n:${h.cnt};--k:${h.k.toFixed(3)}"></span>`).join("");
  const chips = parts.map((h) => `<li class="${h.maxed ? "is-max" : ""}"><b>Nv ${h.lvl}</b> × ${h.cnt}</li>`).join("");
  const piezas = `${w.pieces} ${w.pieces === 1 ? "pieza" : "piezas"}`;
  const row = a.cats.muros;
  const maxed = row.num != null && row.den && row.num >= row.den;
  const rows = parts.map((h) => {
    const faltan = w.max - h.lvl;
    const niveles = faltan * h.cnt;
    const sub = h.maxed
      ? `Máx TH${a.th}`
      : `Faltan ${faltan} por pieza · ${niveles === 1 ? "1 nivel" : `${niveles} niveles`}`;
    const trail = h.cnt === 1 ? "1 pieza" : `${h.cnt} piezas`;
    return `<li class="row wall-row${h.maxed ? " is-max" : ""}">
      <span class="wall-swatch" style="--k:${h.k.toFixed(3)}" aria-hidden="true"></span>
      <span class="row__main"><span class="row__title">Nv ${h.lvl}</span><span class="row__sub">${esc(sub)}</span></span>
      <span class="row__trail num">${trail}</span>
    </li>`;
  }).join("");
  return `<div class="section"><div class="card cat-muros">
    <div class="prog">
      <span class="t-headline">Muros</span>
      <span class="prog__pct num${maxed ? " is-max" : ""}">${fmtPct(row.pct)}</span>
      ${barHtml("muros", a.thSig ? row.sigPct : row.pct, a.thSig ? row.mark : null, { lg: true, maxed, label: `Muros ${fmtPct(row.pct)}` })}
      <span class="prog__foot">${esc(catFoot(a, row))}</span>
    </div>
    <div class="walls" role="img" aria-label="Muros: ${esc(aria)}" style="margin-top:12px">${segs}</div>
    <ul class="wall-chips">${chips}</ul>
    <p class="prog__foot">${piezas} · nivel medio ${fmtNum(medio)}${w.max != null ? ` · máximo TH${a.th}: Nv ${w.max}` : ""}</p>
  </div></div>
  <div class="section"><div class="section-header"><span>Por nivel</span><span class="num">${piezas}</span></div>
    <ul class="list wall-list">${rows}</ul>
  </div>
  ${LEGAL}`;
}

function builderBaseSection(exp) {
  const byId = new Map();
  for (const it of exp.heroes2 || []) byId.set(String(it.data), it);
  for (const it of exp.units2 || []) byId.set(String(it.data), it);
  if (!byId.size) return "";
  const order = BB_HEROES.concat(BB_TROOPS);
  const ids = order.filter((id) => byId.has(id)).concat([...byId.keys()].filter((id) => !order.includes(id)));
  const lis = ids.map((id) => {
    const it = byId.get(id);
    const meta = state.index.items[id];
    const unknown = !meta || meta.estado === "sin_identificar";
    const title = unknown ? "Sin identificar" : (nameOf(id) || "Ítem");
    const badge = meta && meta.estado === "id_deducido" ? `<span class="badge badge--soft">ID deducido</span>` : "";
    const idBadge = unknown ? `<span class="badge badge-id">${esc(id)}</span>` : "";
    const lvl = it.lvl || 0;
    return `<li><button class="row row--thumb40${unknown ? " is-unknown" : ""}" data-ficha="${id}" data-lvl="${lvl}">
      ${thumb(id, { size: 40 })}
      <span class="row__main">${rowTitle(title, `${badge}${idBadge}`)}<span class="row__sub num">Nv ${lvl}</span></span>
    </button></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Aldea del constructor</span></div><ul class="list">${lis}</ul></div>`;
}

function builderLine(exp) {
  const b = builderStatus(exp);
  if (!b.known) return { text: `${b.occupied} ocupados`, warn: false, b };
  if (b.over) return { text: `${b.occupied} ocupados`, warn: true, b };
  return { text: `${b.free} libres`, warn: false, b };
}

function renderMejoras() {
  const all = [];
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    for (const u of upgrades(exp)) all.push({ ...u, meta, exp });
  }
  const active = all.filter((u) => !u.done);
  const mode = state.mejorasMode;
  const body = !all.length
    ? `<div class="card empty"><p class="t-title3">No hay datos</p><p class="t-subhead c-2">Importa la exportación JSON de cada cuenta.</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div>`
    : active.length === 0 && all.every((u) => u.done)
      ? `<div class="card empty"><p class="t-title3">No hay mejoras en curso</p><p class="t-subhead c-2">Todas las colas están libres según la última importación.</p></div>`
      : mode === "cuenta" ? mejorasPorCuenta() : mejorasPorFin(all);
  return `<h1 class="large-title">Mejoras</h1>
    <p class="large-sub">${active.length} en curso · ${allAccounts().filter((r) => expOf(r.tag)).length} cuentas</p>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Orden de mejoras">
      <button role="tab" data-mej="fin" aria-selected="${mode !== "cuenta"}">Por fin</button>
      <button role="tab" data-mej="cuenta" aria-selected="${mode === "cuenta"}">Por cuenta</button>
    </div></div>
    ${body}
    ${LEGAL}`;
}

function mejorasPorFin(all) {
  const free = [];
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    const b = builderStatus(exp);
    if (b.known && b.free > 0) free.push({ meta, exp, b });
  }
  const freeCard = free.length ? `<div class="section"><div class="card">
      <p class="t-headline" style="margin:0 0 8px">${free.length} ${free.length === 1 ? "cuenta" : "cuentas"} con constructores libres</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${free.map(({ meta, b }) => {
        const a = viewOf(meta.tag);
        return `<span class="chip chip--account">${thumb(1000001, { size: 22, th: a.th })} ${esc(meta.chip)} ${b.free} ${b.free === 1 ? "libre" : "libres"}</span>`;
      }).join("")}</div>
    </div></div>` : "";
  const done = all.filter((u) => u.done);
  const pending = all.filter((u) => !u.done).sort((a, b) => a.end - b.end || rosterIndex(a.meta.tag) - rosterIndex(b.meta.tag));
  const doneBlock = done.length ? `<div class="section"><div class="section-header"><span>Terminadas · pendiente de reimportar</span></div><ul class="list">${done.map(upRow).join("")}</ul></div>` : "";
  const byDay = new Map();
  for (const u of pending) {
    const key = madridDayKey(u.end);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(u);
  }
  for (const list of byDay.values()) list.sort((a, b) => rosterIndex(a.meta.tag) - rosterIndex(b.meta.tag) || a.end - b.end);
  const days = [...byDay.entries()].map(([key, list]) => `<div class="section"><div class="section-header"><span>${esc(dayHeading(list[0].end, state.now))}</span></div><ul class="list">${list.map(upRow).join("")}</ul></div>`).join("");
  return freeCard + doneBlock + days + helpersBlock();
}

function mejorasPorCuenta() {
  return allAccounts().map((meta) => {
    const exp = expOf(meta.tag);
    if (!exp) return "";
    const a = viewOf(meta.tag);
    const b = builderStatus(exp);
    const list = upgrades(exp);
    const labN = list.filter((u) => u.queue === "laboratorio" && !u.done).length;
    const petN = list.filter((u) => u.queue === "mascotas" && !u.done).length;
    const bob = list.filter((u) => u.extra && u.queue === "constructor").length;
    const slots = slotsHtml(b, labN, petN, a.th >= 14);
    return `<div class="section"><div class="card" style="display:flex;gap:8px;align-items:flex-start">
        ${thumb(1000001, { size: 40, th: a.th })}
        <div style="flex:1"><div class="t-headline">${esc(meta.nombre)}</div>
          ${builderHead(b, bob)}
          ${slots}
          <p class="t-footnote c-2" style="margin:8px 0 0">Tiempos estimados desde la exportación de ${esc(fmtWhen(exp.timestamp * 1000))}</p>
        </div>
      </div><ul class="list" style="margin-top:8px">${list.map((u) => upRow({ ...u, meta, exp })).join("") || ""}</ul></div>`;
  }).join("");
}

/** Chozas y mejoras salen de builderStatus. La extra de constructor no se suma a ese exceso. */
function builderCaption(status, bob) {
  return {
    chozas: status && status.known ? status.total : null,
    occupied: status ? status.occupied : 0,
    over: !!(status && status.over),
    bob: bob || 0,
  };
}

function builderHead(status, bob) {
  const c = builderCaption(status, bob);
  const bits = [];
  if (c.chozas != null) bits.push(`<span class="num">${c.chozas === 1 ? "1 choza" : `${c.chozas} chozas`}</span>`);
  bits.push(`<span class="num">${c.occupied === 1 ? "1 mejora de constructor" : `${c.occupied} mejoras de constructor`}</span>`);
  if (c.over) bits.push(`<span class="chip chip--warn">Revisar constructores</span>`);
  const bobLine = c.bob ? `<p class="builder-head__bob">${c.bob === 1 ? "1 de B.O.B" : `${c.bob} de B.O.B`}</p>` : "";
  return `<p class="builder-head">${bits.join(" ")}</p>${bobLine}`;
}

function slotsHtml(_status, labN, petN, pets) {
  const dots = (n, on) => Array.from({ length: Math.max(n, on) }, (_, i) => `<i class="${i < on ? "on" : "free"}"></i>`).join("");
  const lab = `<div class="slots" role="img" aria-label="Laboratorio: ${labN}"><span class="slots__lbl">Laboratorio</span>${dots(labN, labN)}<span class="num">${labN}</span></div>`;
  const pet = pets ? `<div class="slots"><span class="slots__lbl">Mascotas</span>${petN ? `<i class="on"></i>` : `<i class="free"></i>`}<span class="num">${petN}</span></div>` : "";
  return lab + pet;
}

function upRow(u) {
  const meta = u.meta;
  const item = state.index.items[u.id];
  const title = nameOf(u.id) || (item ? "Sin identificar" : "Ítem");
  const unknown = !item || item.estado === "sin_identificar";
  const badge = item && item.estado === "id_deducido" ? `<span class="badge badge--soft">ID deducido</span>` : "";
  const level = u.nuevo ? "Nuevo" : `Nv ${u.lvl} → ${u.lvl + 1}`;
  const remain = u.done ? "Terminada" : (fmtRemain(u.end, state.now) || "en < 1 min");
  const soon = !u.done && u.end - state.now < 3600000;
  const queue = u.extra && u.queue === "constructor" ? "B.O.B" : (QUEUE_LABEL[u.queue] || u.queue);
  return `<li><div class="row row--upgrade row--thumb40${unknown ? " is-unknown" : ""}">
    ${thumb(u.id, { size: 40 })}
    <span class="row__main">${rowTitle(title, badge)}
      <span class="row__sub">${esc(level)} · ${accountChip(meta)} · ${esc(queue)}${u.done ? " · pendiente de reimportar" : ""}</span></span>
    <span class="row__trail row__trail--stack"><span class="t-subhead num${u.done ? " done-label" : soon ? " soon" : ""}">${esc(remain)}</span><span class="t-footnote c-2 num">${esc(fmtWhen(u.end))}</span></span>
  </div></li>`;
}

function helpersBlock() {
  const rows = [];
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    for (const h of helpersOf(exp)) {
      if (!h.cooldown) continue;
      rows.push({ ...h, meta, end: h.end });
    }
  }
  if (!rows.length) return "";
  rows.sort((a, b) => a.end - b.end);
  const lis = rows.map((h) => {
    const title = nameOf(h.id) || "Sin identificar";
    const done = h.end <= state.now;
    const soon = !done && h.end - state.now < 3600000;
    const remain = done ? "Disponible" : (fmtRemain(h.end, state.now) || "en < 1 min");
    return `<li><div class="row row--upgrade row--thumb40">
      ${thumb(h.id, { size: 40 })}
      <span class="row__main"><span class="row__title">${esc(title)}</span><span class="row__sub">Ayudante · ${accountChip(h.meta)} · no suma constructor</span></span>
      <span class="row__trail row__trail--stack"><span class="t-subhead num${soon ? " soon" : ""}">${esc(remain)}</span><span class="t-footnote c-2 num">${esc(fmtWhen(h.end))}</span></span>
    </div></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Ayudantes</span></div><ul class="list">${lis}</ul><p class="section-footer">El tiempo es el enfriamiento desde la exportación. No dan constructores extra.</p></div>`;
}

function renderEvolucion() {
  const stats = evoStats();
  const pctDone = stats.possible ? (stats.done / stats.possible) * 100 : 0;
  const pctLabel = fmtPct(Math.round(pctDone * 10) / 10);
  // 20/49 = 40.816 → show with half-even via integer
  const shown = stats.possible ? (function () {
    const tenths = stats.done * 1000;
    const den = stats.possible;
    const q = Math.floor(tenths / den);
    const rem = tenths % den;
    const t = rem * 2 < den ? q : rem * 2 > den ? q + 1 : (q % 2 === 0 ? q : q + 1);
    return t / 10;
  })() : 0;
  return `<h1 class="large-title">Evolución</h1>
    <div class="section"><div class="card">
      <p class="t-footnote c-2">Objetivo: TH18 + TH17 + 9×TH15</p>
      <p class="t-title1 num" style="margin:4px 0">${stats.pending} subidas de TH pendientes</p>
      ${barHtml("defensas", shown, null, { lg: true, plain: true, label: `${stats.done} de ${stats.possible} subidas desde TH11` })}
      <p class="t-footnote c-2" style="margin-top:8px">${stats.done} de ${stats.possible} subidas desde TH11</p>
      <p style="margin:8px 0 0"><span class="chip chip--goal-ok">${stats.atGoal} de ${ROSTER.length} en objetivo</span></p>
    </div></div>
    <div class="section"><div class="card">
      <p class="t-headline" style="margin:0 0 12px">Escalera de TH</p>
      ${ladderHtml()}
    </div></div>
    <div class="section"><div class="card chart-wrap">
      <div class="card__top card__top--chart">
        <p class="t-headline" style="margin:0">Progreso medio</p>
        <select class="chart-select" data-evo aria-label="Serie">${evoOptions()}</select>
      </div>
      ${chartHtml()}
      ${seriesPoints().length < 2 ? `<p class="section-footer">Hace falta una segunda importación para ver la tendencia</p>` : ""}
    </div></div>
    <div class="section"><div class="card">
      <p class="t-headline" style="margin:0 0 8px">Subidas pendientes</p>
      ${chartPending(stats.pending)}
      ${seriesPoints().length < 2 ? `<p class="section-footer">Hace falta una segunda importación para ver la tendencia</p>` : ""}
    </div></div>
    ${LEGAL}`;
}

function evoStats() {
  let pending = 0, done = 0, possible = 0, atGoal = 0;
  for (const meta of ROSTER) {
    const exp = expOf(meta.tag);
    possible += meta.objetivo - 11;
    if (!exp) continue;
    const th = townHallLevel(exp);
    const reached = Math.min(th, meta.objetivo);
    done += Math.max(0, reached - 11);
    pending += Math.max(0, meta.objetivo - th);
    if (th >= meta.objetivo) atGoal += 1;
  }
  return { pending, done, possible, atGoal };
}

function ladderHtml() {
  const heads = [12, 13, 14, 15, 16, 17, 18].map((n) => `<span class="ladder__hdr">${n}</span>`).join("");
  const rows = ROSTER.map((meta) => {
    const exp = expOf(meta.tag);
    const th = exp ? townHallLevel(exp) : 11;
    const cells = [12, 13, 14, 15, 16, 17, 18].map((lvl) => {
      if (lvl > meta.objetivo) return `<i class="none"></i>`;
      const goal = lvl === meta.objetivo ? " goal" : "";
      if (th >= lvl) return `<i class="done${goal}"></i>`;
      return `<i class="todo${goal}"></i>`;
    }).join("");
    const label = `${meta.chip}: TH${th}, objetivo TH${meta.objetivo}, ${th >= meta.objetivo ? "en objetivo" : "falta " + (meta.objetivo - th)}`;
    return `<div class="ladder" role="img" aria-label="${esc(label)}"><span class="ladder__name">${esc(meta.chip)}</span>${cells}<span class="ladder__val">${th}/${meta.objetivo}</span></div>`;
  }).join("");
  return `<div class="ladder" aria-hidden="true"><span></span>${heads}<span></span></div>${rows}`;
}

function seriesPoints() {
  const byDay = new Map();
  for (const row of state.rows) {
    const key = madridDayKey(row.timestamp * 1000);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(row);
  }
  const days = [...byDay.keys()].sort();
  return days.map((day) => {
    const list = byDay.get(day);
    if (state.evo === "roster") {
      const vals = [];
      const rosterTags = new Set(ROSTER.map((r) => r.tag));
      for (const exp of list) {
        if (!rosterTags.has(exp.tag)) continue;
        const a = analyze(exp, state.index);
        if (a.media != null) vals.push(a.media);
      }
      const v = averagePct(vals);
      return { day, v, label: `${day.slice(8)}/${day.slice(5, 7)} · ${fmtPct(v)}` };
    }
    const exp = list.find((e) => e.tag === state.evo) || null;
    if (!exp) return null;
    const a = analyze(exp, state.index);
    return { day, v: a.media, label: `${day.slice(8)}/${day.slice(5, 7)} · ${fmtPct(a.media)}` };
  }).filter(Boolean);
}

function evoOptions() {
  const cur = state.evo;
  const opts = [`<option value="roster"${cur === "roster" ? " selected" : ""}>Media del roster</option>`];
  for (const meta of ROSTER) {
    opts.push(`<option value="${esc(meta.tag)}"${cur === meta.tag ? " selected" : ""}>${esc(meta.nombre)}</option>`);
  }
  return opts.join("");
}

function chartDay(day) {
  return `${String(day).slice(8)}/${String(day).slice(5, 7)}`;
}

function chartHtml() {
  const pts = seriesPoints();
  if (!pts.length) return `<p class="t-footnote c-2">Sin datos</p>`;
  const last = pts[pts.length - 1];
  const x0 = 40, x1 = 300;
  const yOf = (v) => 156 - (v / 100) * (156 - 12);
  const xs = pts.map((p, i) => pts.length === 1 ? 200 : x0 + (x1 - x0) * (i / (pts.length - 1)));
  const coords = pts.map((p, i) => `${xs[i]},${yOf(p.v || 0)}`);
  const area = `M${coords[0]} L${coords.join(" L")} L${xs[xs.length - 1]},156 L${xs[0]},156 Z`;
  const circles = pts.map((p, i) => `<circle class="chart__pt" cx="${xs[i]}" cy="${yOf(p.v || 0)}" r="4"><title>${esc(p.label)}</title></circle>`).join("");
  return `<svg class="chart" viewBox="0 0 343 180" role="img" aria-label="Progreso medio: ${esc(last.label)}">
    <g class="chart__grid"><line x1="32" x2="335" y1="12" y2="12"/><line x1="32" x2="335" y1="48" y2="48"/><line x1="32" x2="335" y1="84" y2="84"/><line x1="32" x2="335" y1="120" y2="120"/><line x1="32" x2="335" y1="156" y2="156"/></g>
    <g class="chart__y"><text x="26" y="16">100</text><text x="26" y="88">50</text><text x="26" y="160">0</text></g>
    <path class="chart__area" d="${area}"/>
    <polyline class="chart__line" points="${coords.join(" ")}"/>
    ${circles}
    <g class="chart__x"><text x="${xs[0]}" y="174">${esc(chartDay(pts[0].day))}</text>${pts.length > 1 ? `<text x="${xs[xs.length - 1]}" y="174">${esc(chartDay(last.day))}</text>` : ""}</g>
  </svg>
  <table class="sr-only"><caption>Progreso medio</caption><tbody>${pts.map((p) => `<tr><td>${esc(chartDay(p.day))}</td><td>${esc(fmtPct(p.v))}</td></tr>`).join("")}</tbody></table>`;
}

function chartPending(pending) {
  return `<svg class="chart" viewBox="0 0 343 180" role="img" aria-label="Subidas pendientes: ${pending}">
    <g class="chart__grid"><line x1="32" x2="335" y1="12" y2="12"/><line x1="32" x2="335" y1="84" y2="84"/><line x1="32" x2="335" y1="156" y2="156"/></g>
    <g class="chart__y"><text x="26" y="16">${pending}</text><text x="26" y="160">0</text></g>
    <line class="chart__goal" x1="32" x2="335" y1="156" y2="156"/>
    <circle class="chart__pt" cx="200" cy="${156 - (pending ? 144 : 0)}" r="4"/>
    <g class="chart__x"><text x="200" y="174">hoy</text></g>
  </svg>`;
}

function imageTotalBytes() {
  if (state.peso && state.peso.total_bytes != null) return state.peso.total_bytes;
  return state.images.reduce((s, im) => s + (im.bytes || 0), 0);
}

function offlineDlModel() {
  const total = imageTotalBytes();
  const totalN = state.peso && state.peso.total_archivos != null ? state.peso.total_archivos : state.images.length;
  const bytes = state.dl.phase === "downloading" ? state.dl.doneBytes : state.cacheBytes;
  const count = state.dl.phase === "downloading" ? state.dl.doneCount : state.cacheCount;
  const remain = Math.max(0, total - (state.dl.phase === "downloading" ? state.dl.doneBytes : state.cacheBytes));
  const p = total ? (bytes / total) * 100 : 0;
  const done = state.images.length > 0 && count >= state.images.length && state.dl.phase !== "downloading";
  const remainLabel = fmtBytes(remain);
  let status = `${fmtBytes(bytes)} de ${fmtBytes(total)} guardados`;
  let btn = `<button class="btn btn--primary btn--block" data-dl="start" ${!navigator.onLine ? "disabled" : ""}>Descargar todas (${remainLabel})</button>`;
  let note = "Los ayuntamientos y los héroes ya están guardados. El resto de imágenes se guarda al verlas por primera vez. Recomendado con wifi.";
  if (state.dl.phase === "offline" || (!navigator.onLine && state.dl.phase !== "downloading")) {
    status = "Sin conexión. Conéctate para descargar.";
    btn = `<button class="btn btn--primary btn--block" disabled>Descargar todas (${remainLabel})</button>`;
  } else if (state.dl.phase === "downloading") {
    status = `Descargando ${count} de ${totalN} · ${fmtBytes(bytes)} de ${fmtBytes(total)}`;
    btn = `<button class="btn btn--secondary btn--block" data-dl="stop">Detener</button>`;
  } else if (state.dl.phase === "error") {
    status = `No se pudieron descargar ${state.dl.errors} imágenes`;
    btn = `<button class="btn btn--secondary btn--block" data-dl="start">Reintentar</button>`;
  } else if (state.dl.phase === "space") {
    status = "No hay espacio suficiente en el iPhone";
    btn = `<button class="btn btn--secondary btn--block" data-dl="start">Reintentar</button>`;
  } else if (done) {
    status = `Las ${totalN} imágenes están disponibles sin conexión`;
    btn = `<button class="btn btn--destructive btn--block" data-dl="purge">Borrar imágenes guardadas</button>`;
  }
  return { total, totalN, bytes, count, p, done, status, btn, note };
}

/* 1.1.5: durante «Descargar todas» solo cambian el recuento, la barra y el estado. No se redibuja el sheet,
   así que no se repite la animación, no se pierde el scroll y el foco sigue en «Detener». */
function patchOfflineDl() {
  const card = document.querySelector(".offline-dl");
  if (!card) return;
  const m = offlineDlModel();
  const num = card.querySelector(".offline-dl__top .num");
  if (num) num.textContent = `${m.count}\u00a0de\u00a0${m.totalN}`;
  const bar = card.querySelector(".bar");
  if (bar) { bar.style.setProperty("--p", String(Math.min(100, m.p))); bar.setAttribute("aria-label", m.status); }
  const st = card.querySelector(".offline-dl__status");
  if (st) st.textContent = m.status;
  if (card.contains(document.activeElement)) keepVisible(document.activeElement);
}

/* Región viva fuera de #app: render() no la sustituye y VoiceOver la anuncia de forma fiable. */
function announce(text) {
  let el = document.getElementById("announcer");
  if (!el) {
    el = document.createElement("p");
    el.id = "announcer";
    el.className = "sr-only";
    el.setAttribute("aria-live", "polite");
    document.body.append(el);
  }
  el.textContent = "";
  setTimeout(() => { el.textContent = text; }, 60);
}

function dlQuarter(bytes) {
  const total = imageTotalBytes();
  return total ? Math.floor((bytes / total) * 4) : 0;
}

function renderAjustes() {
  const imported = ROSTER.filter((r) => expOf(r.tag)).length;
  const { totalN, count, p, done, status, btn, note } = offlineDlModel();
  return `<div class="sheet-backdrop" data-close="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="aj-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><span></span><h2 id="aj-title" tabindex="-1">Ajustes</h2><button class="btn-text btn-text--bold" data-go="#/roster">OK</button></div>
      <div class="sheet__body">
        <div class="section-header"><span>Datos</span></div>
        <div class="section" style="margin-top:0"><ul class="list">
          <li><button class="row" data-go="#/importar"><span class="row__main"><span class="row__title">Importar JSON</span></span>${CHEV}</button></li>
          <li><div class="row"><span class="row__main"><span class="row__title">Cuentas importadas</span></span><span class="row__trail num">${imported} de 11</span></div></li>
          ${state.added.map((a) => {
            const label = (a.alias || "").trim() || a.tag;
            return `<li><button class="row row--destructive" data-quitar="${esc(a.tag)}"><span class="row__main"><span class="row__title">Quitar ${esc(label)}</span></span></button></li>`;
          }).join("")}
          <li><button class="row row--destructive" data-wipe><span class="row__main"><span class="row__title">Borrar todos los datos</span></span></button></li>
          <li><button class="row" data-restore><span class="row__main"><span class="row__title">Restaurar datos incluidos</span></span></button></li>
        </ul></div>
        <div class="section"><div class="card offline-dl${done ? " is-done" : ""}">
          <div class="offline-dl__top"><h3>Imágenes sin conexión</h3><span class="num">${count}\u00a0de\u00a0${totalN}</span></div>
          <div class="bar" style="--p:${Math.min(100, p)};--cat:var(--tint)" role="img" aria-label="${esc(status)}"><span class="bar__fill"></span></div>
          <p class="offline-dl__meta offline-dl__status">${esc(status)}</p>
          ${btn}
          <p class="t-footnote c-2" style="margin:8px 0 0">${esc(note)}</p>
        </div></div>
        <div class="section-header"><span>Acerca de</span></div>
        <div class="section" style="margin-top:0"><ul class="list"><li><div class="row"><span class="row__main"><span class="row__title">Versión</span></span><span class="row__trail">${esc(APP_VERSION)}</span></div></li></ul></div>
        <div class="section"><div class="card t-footnote">
          <p lang="en">This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: www.supercell.com/fan-content-policy.</p>
          <p>Material no oficial, no respaldado por Supercell. Las imágenes son del Supercell Fan Kit y se muestran sin modificar. Esta app es gratuita, privada y sin fines comerciales.</p>
          <p><a class="btn btn--plain" href="https://supercell.com/en/fan-content-policy/" rel="noopener">Leer la Fan Content Policy</a></p>
          <p class="t-footnote c-2">Política consultada el 07/10/2026 (versión del 27/09/2023). Máximos por ayuntamiento: caps_clashrecord.json (ClashRecord), incluido en el repositorio. Los nombres salen solo del manifiesto.</p>
        </div></div>
        ${LEGAL}
      </div>
    </div>`;
}

function renderImport() {
  const ui = state.importUi;
  const sub = ui.phase === "confirm";
  const back = sub || ui.fromBatch;
  const title = sub ? "Cuenta nueva" : "Importar";
  const lead = back
    ? `<button class="btn-text" data-im-back type="button"><svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Importar</button>`
    : `<button class="btn-text" data-go="#/roster" type="button">Cancelar</button>`;
  return `<div class="sheet-backdrop" data-close="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="im-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar">${lead}<h2 id="im-title" tabindex="-1">${title}</h2><span></span></div>
      <div class="sheet__body">${importBody()}${LEGAL}</div>
      <input class="file-input" data-files type="file" accept=".json,application/json,text/json,text/plain" multiple tabindex="-1" aria-hidden="true">
      <div class="sheet__actions">${importActions()}</div>
    </div>`;
}

function importBody() {
  const ui = state.importUi;
  if (ui.phase === "validating") return validatingCard();
  if (ui.phase === "confirm") return confirmNew(currentImportItem());
  if (ui.phase === "batch" && ui.focus == null) return batchBody();
  if (ui.phase === "single" || ui.focus != null) return singleBody(currentImportItem());
  return entryBody();
}

function currentImportItem() {
  const ui = state.importUi;
  if (ui.focus != null && ui.items[ui.focus]) return ui.items[ui.focus];
  return ui.items.length === 1 ? ui.items[0] : null;
}

function segControl(paste) {
  return `<div class="seg-wrap"><div class="seg" role="tablist" aria-label="Origen de la exportación">
      <button type="button" role="tab" data-im="paste" aria-selected="${paste}">Pegar</button>
      <button type="button" role="tab" data-im="file" aria-selected="${!paste}">Archivos</button>
    </div></div>`;
}

function safariCard() {
  if (!inSafariTab()) return "";
  return `<div class="section"><div class="card">
      <p class="t-headline" style="margin:0">Estás en Safari</p>
      <p class="t-subhead c-2">Lo que importes aquí se queda en Safari. La app de la pantalla de inicio guarda sus datos aparte: si la tienes instalada, ábrela desde su icono e importa allí.</p>
    </div></div>`;
}

function entryBody() {
  const paste = state.importUi.mode !== "file";
  return `${safariCard()}${segControl(paste)}${paste ? pasteEntry() : fileEntry()}`;
}

function pasteEntry() {
  return `<div class="section"><div class="section-header"><span>Cómo copiar la exportación</span></div>
      <div class="list">
        <div class="row"><span class="row__main"><span class="row__title">1. En Clash of Clans</span><span class="row__sub">Entra en la cuenta que quieras importar.</span></span></div>
        <div class="row"><span class="row__main"><span class="row__title">2. Ajustes → Más ajustes</span><span class="row__sub">En Exportar datos, toca Copiar.</span></span></div>
        <div class="row"><span class="row__main"><span class="row__title">3. Vuelve aquí y toca Pegar</span><span class="row__sub">Verás la cuenta antes de guardar nada.</span></span></div>
      </div></div>
    <div class="section"><div class="section-header"><span>O pega el texto a mano</span></div>
      <div class="list"><div class="row"><textarea class="json-input json-input--short" data-paste aria-label="Texto de la exportación" placeholder="Mantén pulsado aquí y elige Pegar" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(state.importUi.text)}</textarea></div></div>
    </div>
    <p class="section-footer">Los datos se guardan solo en este iPhone.</p>`;
}

function fileEntry() {
  return `<div class="section"><div class="section-header"><span>Desde Archivos</span></div>
      <div class="card"><p class="t-body" style="margin:0">Elige uno o varios archivos .json, por ejemplo desde iCloud Drive. Puedes elegir todas tus cuentas a la vez.</p></div>
    </div>
    <p class="section-footer">Las exportaciones que ya están guardadas se omiten solas.</p>`;
}

function validatingCard() {
  return `<div class="section"><div class="card validating-card" aria-busy="true">
      <div class="sk sk--thumb" style="--size:96px"></div>
      <div class="sk sk--line"></div>
      <div class="sk sk--line" style="width:80%"></div>
      <div class="sk sk--line" style="width:45%"></div>
    </div></div>
    <p class="sr-only" role="status">Validando la exportación</p>`;
}

function importActions() {
  const ui = state.importUi;
  const err = ui.saveError ? msgLine("msg-err", "alert", "No se pudo guardar en este iPhone. Vuelve a intentarlo.") : "";
  if (ui.phase === "validating") return `<button type="button" class="btn btn--primary btn--block" disabled>Validando…</button>`;
  if (ui.phase === "confirm") return `${err}<button type="button" class="btn btn--primary btn--block" data-act="add-account">Añadir cuenta</button>`;
  if (ui.phase === "batch" && ui.focus == null) {
    const n = planBatch(ui.items).count;
    if (!n) return `<button type="button" class="btn btn--primary btn--block" data-act="pick">Elegir otros archivos</button>`;
    const label = n === 1 ? "Importar 1 cuenta" : `Importar ${n} cuentas`;
    return `${err}<button type="button" class="btn btn--primary btn--block" data-act="commit">${label}</button>`;
  }
  if (ui.phase === "batch" && ui.focus != null) {
    const n = planBatch(ui.items).count;
    const label = n === 1 ? "Importar 1 cuenta" : `Importar ${n} cuentas`;
    return n
      ? `${err}<button type="button" class="btn btn--primary btn--block" data-act="commit">${label}</button>`
      : `<button type="button" class="btn btn--primary btn--block" data-im-back>Volver</button>`;
  }
  if (ui.phase === "single") {
    const it = currentImportItem();
    if (!it) return "";
    if (it.kind === "invalid") {
      const file = ui.mode === "file";
      return `<button type="button" class="btn btn--primary btn--block" data-act="${file ? "pick" : "paste"}">${file ? "Elegir otros archivos" : "Pegar de nuevo"}</button>`;
    }
    if (it.kind === "duplicate") {
      return `<button type="button" class="btn btn--primary btn--block" data-act="paste-again">Pegar otra</button>`;
    }
    if (it.kind === "new") {
      return `<button type="button" class="btn btn--primary btn--block" data-act="confirm-new">Añadir como cuenta nueva…</button>
        <button type="button" class="btn btn--plain btn--block" data-act="paste-again">Pegar otra</button>`;
    }
    if (it.kind === "older") {
      return `${err}<button type="button" class="btn btn--primary btn--block" data-act="commit">Añadir al histórico</button>
        <button type="button" class="btn btn--plain btn--block" data-act="paste-again">Pegar otra</button>`;
    }
    return `${err}<button type="button" class="btn btn--primary btn--block" data-act="commit">Importar</button>
      <button type="button" class="btn btn--plain btn--block" data-act="paste-again">Pegar otra</button>`;
  }
  if (ui.mode === "file") return `<button type="button" class="btn btn--primary btn--block" data-act="pick">Elegir archivos…</button>`;
  const has = ui.text.trim().length > 0;
  return `<button type="button" class="btn btn--primary btn--block" data-act="${has ? "review" : "paste"}" data-primary>${has ? "Revisar" : "Pegar"}</button>`;
}

function accountTitleHtml(meta, exp) {
  if (!meta || !meta.nombre || meta.nombre === meta.tag || meta.nombre === exp.tag) {
    return `<span class="tag">${esc((meta && meta.tag) || exp.tag)}</span>`;
  }
  return esc(meta.nombre);
}

function roleChip(meta) {
  if (!meta || !meta.role) return "";
  return ` <span class="chip ${meta.roleClass}">${esc(meta.role)}</span>`;
}

function previewSub(meta, exp, th) {
  if (!meta) return `TH${th} · sin objetivo`;
  if (!meta.objetivo) return `<span class="tag">${esc(exp.tag)}</span> · TH${th} · sin objetivo`;
  const arrow = th < meta.objetivo ? ` → objetivo TH${meta.objetivo}` : "";
  return `<span class="tag">${esc(exp.tag)}</span> · TH${th}${arrow}`;
}

function msgLine(cls, role, html) {
  return `<p class="msg ${cls}" role="${role}"><span>${html}</span></p>`;
}

function previewMsgHtml(msg, preview) {
  const chars = Array.from(preview);
  const last = chars.pop() || "";
  const head = chars.join("");
  const needle = `«${preview}».`;
  const at = msg.indexOf(needle);
  const headHtml = head ? `<span class="tag">${esc(head)}</span>` : "";
  const wrapped = `«${headHtml}<span class="nowrap"><span class="tag">${esc(last)}</span>».</span>`;
  if (at < 0) return esc(msg).replace(esc(preview), `<span class="tag">${esc(preview)}</span>`);
  return esc(msg.slice(0, at)) + wrapped + esc(msg.slice(at + needle.length));
}

function errorCard(it) {
  if (it.parseError) {
    const p = it.parseError;
    const msg = p.preview ? previewMsgHtml(p.msg, p.preview) : esc(p.msg);
    return `<div class="card" data-import-focus tabindex="-1">
      <p class="t-headline">${esc(p.title)}</p>
      ${msgLine("msg-err", "alert", msg)}
      <p class="t-footnote c-2">${esc(p.help || "")}</p>
    </div>`;
  }
  const lines = (it.issues || []).map((m) => msgLine("msg-err", "alert", esc(m))).join("");
  return `<div class="card" data-import-focus tabindex="-1">
    <p class="t-headline">No es una exportación de Clash of Clans</p>
    ${lines}
    <p class="t-footnote c-2">${esc(STRUCTURE_HELP)}</p>
  </div>`;
}

function singleBody(it) {
  if (!it) return entryBody();
  if (it.kind === "invalid") return `${segControl(state.importUi.mode !== "file")}<div class="section">${errorCard(it)}</div>`;
  return `<div class="section">${previewBlock(it)}</div>${changesBlock(it)}`;
}

function previewBlock(it) {
  const exp = it.value;
  const view = (it.changes && it.changes.view) || analyze(exp, state.index);
  const meta = it.known;
  const th = view.th;
  const when = fmtWhen(exp.timestamp * 1000);
  const st = statusText(it);
  const ch = it.changes;
  let extra = "";
  if (it.kind === "new") {
    extra = `${msgLine("msg-warn", "alert", esc(foreignMsg(exp.tag)))}<p class="t-footnote c-2">${esc(FOREIGN_HELP)}</p>`;
  } else if (it.kind === "duplicate") {
    extra = `${msgLine("msg-info", "status", esc(duplicateMsg(it.duplicateAt || exp.timestamp)))}<p class="t-footnote c-2">${esc(DUPLICATE_HELP)}</p>`;
  } else if (it.kind === "older") {
    extra = `${msgLine("msg-warn", "alert", esc(olderWarning(it.refTimestamp)))}<p class="t-footnote c-2">${esc(olderHelp(it.refTimestamp))}</p>`;
  }
  const kv = it.kind === "new" || it.kind === "duplicate" ? "" : kvHtml(it, ch);
  const notes = ch && it.kind !== "duplicate"
    ? `${ch.unknownCount ? msgLine("msg-info", "status", esc(unknownMsg(ch.unknownCount))) : ""}${ch.overMaxCount ? msgLine("msg-info", "status", esc(overMaxMsg(ch.overMaxCount))) : ""}`
    : "";
  const foot = ch && ch.thUp && ch.mediaDown ? `<p class="t-footnote c-2">La media se compara ahora con los máximos de TH${ch.thTo}.</p>` : "";
  const card = `<div class="card" data-import-focus tabindex="-1">
      <div class="preview">
        ${thumb(1000001, { size: 96, th })}
        <div class="preview__main">
          <div class="account-card__title">${accountTitleHtml(meta, exp)}${roleChip(meta)}</div>
          <div class="t-footnote c-2">${previewSub(meta, exp, th)}</div>
          <div class="t-footnote c-2">Datos del ${esc(when)}</div>
        </div>
      </div>
      ${kv}${notes}${foot}${extra}
    </div>${st ? `<p class="sr-only" role="status">${esc(st)}</p>` : ""}`;
  return card;
}

function kvHtml(it, ch) {
  if (!ch) return "";
  const rows = [];
  if (ch.thUp) rows.push(["Ayuntamiento", `TH${ch.thFrom} → TH${ch.thTo}`]);
  if (!ch.first && it.prevTimestamp) rows.push(["Último punto", fmtWhen(it.prevTimestamp * 1000)]);
  if (ch.mediaTo != null && (ch.first || ch.mediaFrom == null)) rows.push(["Media", fmtPct(ch.mediaTo)]);
  else if (ch.mediaFrom != null) {
    if (ch.delta && ch.delta.dir === "flat") {
      rows.push(["Media", `${fmtPct(ch.mediaTo)} · <span class="delta">sin cambio</span>`]);
    } else {
      let media = mediaLine(ch);
      if (ch.delta && ch.delta.dir === "up") media += ` <span class="delta delta--up">${esc(ch.delta.text)}</span>`;
      else if (ch.delta && ch.delta.dir === "down") media += ` <span class="delta delta--down">${esc(ch.delta.text)}</span>`;
      else if (ch.delta) media += ` <span class="delta">${esc(ch.delta.text)}</span>`;
      rows.push(["Media", media]);
    }
  }
  rows.push(["Mejoras en curso", ch.first ? String(ch.upsTo) : `${ch.upsFrom} → ${ch.upsTo}`]);
  if (ch.nextAt) rows.push(["Próxima", fmtWhen(ch.nextAt)]);
  rows.push(["Equipamiento", `${ch.eqCount} piezas`]);
  return `<dl class="kv">${rows.map(([dt, dd]) => `<dt>${esc(dt)}</dt><dd>${dd}</dd>`).join("")}</dl>`;
}

function changesBlock(it) {
  const ch = it.changes;
  if (!ch || it.kind !== "ready") return "";
  if (ch.first) return `<p class="section-footer">${FIRST_FOOT}</p>`;
  if (!ch.itemChanges) {
    return `<p class="section-footer">${ch.noChanges ? NO_CHANGE_FOOT : EVOLUTION_FOOT}</p>`;
  }
  const rows = ch.rows.map((row) => {
    const badge = row.unknown ? `&nbsp;<span class="badge badge-id">${esc(row.id)}</span>` : "";
    const title = row.unknown ? "Sin identificar" : esc(row.title);
    return `<li><div class="row row--thumb40${row.unknown ? " is-unknown" : ""}">
      ${thumb(row.id, { size: 40 })}
      <span class="row__main"><span class="row__title">${title}${badge}</span><span class="row__sub">${esc(row.change)} · ${esc(row.category)}</span></span>
    </div></li>`;
  }).join("");
  const more = ch.more ? `<p class="section-footer">Y ${ch.more} ${ch.more === 1 ? "cambio" : "cambios"} más.</p>` : "";
  return `<div class="section"><div class="section-header"><span>Cambios</span><span class="num">${ch.totalChanges}</span></div>
    <ul class="list">${rows}</ul>${more}<p class="section-footer">${EVOLUTION_FOOT}</p></div>`;
}

function batchBody() {
  const indexed = state.importUi.items.map((it, i) => Object.assign({}, it, { _i: i }));
  const items = sortBatch(indexed, allAccounts());
  const plan = planBatch(state.importUi.items);
  const ready = items.filter((i) => i.kind === "ready" || i.kind === "older");
  const neu = items.filter((i) => i.kind === "new");
  const omit = items.filter((i) => i.kind === "duplicate" || i.kind === "invalid");
  const head = `<div class="section"><div class="card">
      <p class="t-title3">${state.importUi.items.length} archivos .json</p>
      <p class="t-footnote c-2">Detectadas ${plan.count} cuentas, ${plan.errors.length} errores. Puedes elegir varios a la vez.</p>
    </div></div>
    <p class="section-footer">${esc(batchSummary(state.importUi.items))}</p>`;
  return head
    + batchGroup("Listos para importar", ready, "")
    + batchGroup(neu.length > 1 ? "Cuentas nuevas" : "Cuenta nueva", neu, `<p class="section-footer">${NEW_FOOT}</p>`)
    + batchGroup("Se omiten", omit, omitFoot(omit));
}

function batchGroup(title, rows, foot) {
  if (!rows.length) return "";
  return `<div class="section"><div class="section-header"><span>${title}</span><span class="num">${rows.length}</span></div>
    <ul class="list">${rows.map(batchRow).join("")}</ul>${foot}</div>`;
}

function omitFoot(items) {
  const bits = [];
  if (items.some((i) => i.kind === "duplicate")) bits.push(DUP_FOOT);
  if (items.some((i) => i.kind === "invalid" && !omitReason(i))) bits.push(BAD_FOOT);
  return bits.map((t) => `<p class="section-footer">${t}</p>`).join("");
}

function spokenTrail(label) {
  if (label.startsWith("+")) return "más " + label.slice(1);
  if (label.startsWith("−")) return "menos " + label.slice(1);
  return label;
}

function batchRow(it) {
  const trail = trailingLabel(it);
  const color = it.kind === "older" ? " trail-warn" : it.kind === "invalid" ? " trail-bad" : "";
  if (it.kind === "invalid" || !it.value) {
    return `<li><div class="row row--account"><span class="row__main"><span class="row__title">No válido</span><span class="row__sub">${esc(omitSubtitle(it))}</span></span></div></li>`;
  }
  const exp = it.value;
  const th = townHallLevel(exp);
  const title = it.known ? accountTitleHtml(it.known, exp) : `<span class="tag">${esc(exp.tag)}</span>`;
  const status = it.kind === "new" ? "Nueva" : it.kind === "older" ? "Más antigua" : it.kind === "duplicate" ? "Duplicada" : it.first ? "Nueva" : "Actualización";
  const sub = `TH${th} · ${exp.tag} · ${fmtWhen(exp.timestamp * 1000)} · ${status}`;
  const aria = `${it.known ? it.known.nombre : exp.tag}, TH${th}, datos del ${fmtWhen(exp.timestamp * 1000)}, ${spokenTrail(trail)}`;
  const chev = it.kind === "new" ? CHEV : "";
  return `<li><button type="button" class="row row--account row--thumb44" data-im-row="${it._i}" aria-label="${esc(aria)}">
      ${thumb(1000001, { size: 44, th })}
      <span class="row__main"><span class="row__title">${title}</span><span class="row__sub">${esc(sub)}</span></span>
      <span class="row__trail${color}">${esc(trail)}</span>${chev}
    </button></li>`;
}

function confirmNew(it) {
  if (!it || !it.value) return "";
  const exp = it.value;
  const th = townHallLevel(exp);
  const when = fmtWhen(exp.timestamp * 1000);
  return `<div class="section"><div class="card preview" data-import-focus tabindex="-1">
      ${thumb(1000001, { size: 96, th })}
      <div class="preview__main">
        <div class="account-card__title"><span class="tag">${esc(exp.tag)}</span></div>
        <div class="t-footnote c-2">TH${th} · datos del ${esc(when)}</div>
      </div>
    </div></div>
    <div class="section"><div class="section-header"><span>Datos de la exportación</span></div>
      <div class="list">
        <div class="row"><span class="row__main"><span class="row__title">Tag</span></span><span class="row__trail tag">${esc(exp.tag)}</span></div>
        <div class="row"><span class="row__main"><span class="row__title">Ayuntamiento</span></span><span class="row__trail">TH${th}</span></div>
        <div class="row"><span class="row__main"><span class="row__title">Datos del</span></span><span class="row__trail">${esc(when)}</span></div>
      </div>
      <p class="section-footer">La exportación no incluye el nombre del jugador.</p>
    </div>
    <div class="section"><div class="section-header"><span>En esta app</span></div>
      <div class="list">
        <label class="row"><span class="row__main"><span class="row__title">Alias</span></span><input class="row__input tag" data-alias maxlength="24" autocapitalize="words" autocorrect="off" enterkeyhint="done" autocomplete="off" placeholder="${esc(exp.tag)}" aria-label="Alias" value="${esc(state.importUi.alias)}"></label>
        <div class="row"><span class="row__main"><span class="row__title">Objetivo</span></span><span class="row__trail">Sin objetivo</span></div>
      </div>
      <p class="section-footer">Opcional. Si lo dejas vacío se muestra el tag, como en las demás cuentas.</p>
      <p class="section-footer">Aparecerá en Roster después de tus 11 cuentas, en «Otras cuentas». El objetivo TH18 + TH17 + 9×TH15 no cambia.</p>
    </div>`;
}

function classifyCtx() {
  return { rows: state.rows, accounts: allAccounts(), index: state.index, now: state.now };
}

const VALIDATING_MS = 150;

function armValidating() {
  clearTimeout(armValidating._t);
  armValidating._t = setTimeout(() => {
    state.importUi.phase = "validating";
    render();
  }, VALIDATING_MS);
}

function disarmValidating() {
  clearTimeout(armValidating._t);
  armValidating._t = 0;
}

function yieldTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function validateTexts(entries, opts = {}) {
  if (!opts.armed) armValidating();
  state.importUi.saveError = false;
  for (let i = 0; i < entries.length; i += 1) await yieldTurn();
  const items = classifyEntries(entries, classifyCtx());
  disarmValidating();
  state.importUi.items = items;
  state.importUi.focus = null;
  state.importUi.fromBatch = false;
  state.importUi.saveError = false;
  state.importUi.needsFocus = true;
  state.importUi.phase = opts.fromFiles || items.length > 1 ? "batch" : "single";
  render();
}

async function doPaste() {
  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch {
    state.importUi.items = [{ name: "Pegado", kind: "invalid", parseError: PASTE_DENIED, value: null, skip: true }];
    state.importUi.phase = "single";
    state.importUi.focus = null;
    state.importUi.fromBatch = false;
    state.importUi.needsFocus = true;
    render();
    return;
  }
  state.importUi.text = text || "";
  await validateTexts([{ name: "Pegado", text: state.importUi.text, source: "clipboard" }]);
}

function resetImport(mode) {
  const next = mode || "paste";
  state.importUi = freshImport();
  state.importUi.active = true;
  state.importUi.mode = next;
  render();
}

function goBackImport() {
  const ui = state.importUi;
  ui.saveError = false;
  if (ui.phase === "confirm" && ui.fromBatch) {
    ui.phase = "batch";
    ui.focus = null;
    ui.fromBatch = false;
    render();
    return;
  }
  if (ui.phase === "confirm") {
    ui.phase = "single";
    render();
    return;
  }
  if (ui.fromBatch) {
    ui.phase = "batch";
    ui.focus = null;
    ui.fromBatch = false;
    render();
    return;
  }
  resetImport(ui.mode);
}

async function commitImport() {
  const plan = planBatch(state.importUi.items);
  if (!plan.save.length) return;
  try {
    for (const it of plan.save) await putExport(it.value);
  } catch {
    state.importUi.saveError = true;
    render();
    return;
  }
  for (const it of plan.save) {
    if (it.kind !== "new") continue;
    const th = townHallLevel(it.value);
    state.accounts = addAccount(state.accounts, {
      tag: it.value.tag,
      alias: it.value.tag,
      principal: false,
      addedAt: Date.now(),
      chip: makeChip(it.value.tag, th),
    });
  }
  persistRoster();
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  armFlash(plan.tags);
  const known = plan.save.filter((it) => it.kind !== "new");
  showToast("ok", known.length ? successToast(known) : (plan.count === 1 ? "1 cuenta importada" : `${plan.count} cuentas importadas`));
  state.importUi = freshImport();
  location.hash = "#/roster";
}

async function addNewAccount() {
  const it = currentImportItem();
  if (!it || !it.value) return;
  const alias = state.importUi.alias.trim().slice(0, 24);
  const exp = it.value;
  try {
    await putExport(exp);
  } catch {
    state.importUi.saveError = true;
    render();
    return;
  }
  const chip = makeChip(exp.tag, townHallLevel(exp));
  state.added.push({ tag: exp.tag, alias, añadida: true, chip });
  saveAdded(state.added);
  state.accounts = addAccount(state.accounts, {
    tag: exp.tag,
    alias: alias || exp.tag,
    principal: false,
    addedAt: Date.now(),
    chip,
  });
  persistRoster();
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  armFlash(exp.tag);
  state.scrollAdded = true;
  showToast("ok", addedToast(alias || exp.tag));
  state.importUi = freshImport();
  location.hash = "#/roster";
}

async function removeAdded(tag) {
  state.added = state.added.filter((a) => a.tag !== tag);
  saveAdded(state.added);
  state.accounts = removeAccount(state.accounts, tag);
  persistRoster();
  await deleteTag(tag);
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  if (state.selected === tag) {
    state.selected = (state.accounts[0] && state.accounts[0].tag) || "";
    localStorage.setItem("cp-account", state.selected);
  }
  showToast("ok", "Cuenta borrada");
}

async function exportBackup() {
  const now = Date.now();
  const payload = buildBackup({ accounts: state.accounts, exports: state.rows, now, version: APP_VERSION });
  const name = backupFilename(now);
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  if (typeof navigator !== "undefined" && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: name });
      showToast("ok", "Copia guardada");
      render();
      return;
    } catch (err) {
      if (isShareCancel(err)) return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast("ok", "Copia guardada");
  render();
}

async function restoreBackupText(text) {
  let data = null;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!data || (typeof data !== "object")) {
    showToast("err", "Esa copia no se puede leer");
    return;
  }
  const merged = mergeBackup({ accounts: state.accounts, exports: state.rows }, data);
  try {
    for (const exp of merged.exports) {
      if (state.rows.some((r) => r.tag === exp.tag && r.timestamp === exp.timestamp)) continue;
      await putExport(exp);
    }
  } catch {
    showToast("err", "No se pudo guardar la copia");
    return;
  }
  state.accounts = merged.accounts;
  persistRoster();
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  showToast("ok", "Copia restaurada");
  render();
}


function fichaFrame(inner) {
  return `<div class="sheet-backdrop" data-close-ficha="1"></div>
    <div class="sheet sheet--half" role="dialog" aria-modal="true" aria-labelledby="ficha-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><span></span><h2 id="ficha-title" tabindex="-1">Ficha</h2><button class="btn-text btn-text--bold" data-close-ficha="1">OK</button></div>
      <div class="sheet__body"><div class="ficha">${inner}</div>${LEGAL}</div>
    </div>`;
}

function fichaSheet() {
  const f = state.ficha;
  if (!f) return "";
  if (f.capsOnly) {
    const lines = capsFichaLines(f);
    return fichaFrame(`
        <div style="display:flex;justify-content:center">${emptyNamedThumb(f.name, 96)}</div>
        <p class="t-title3">${esc(f.name)}</p>
        <p class="t-title2 num">${esc(lines[0])}</p>
        ${lines.slice(1).map((note) => `<p class="t-footnote c-2">${esc(note)}</p>`).join("")}`);
  }
  const item = state.index.items[f.id];
  const unknown = !item || item.estado === "sin_identificar";
  const title = unknown ? "Sin identificar" : (nameOf(f.id) || "Ítem");
  const badges = [];
  if (item && item.estado === "id_deducido") badges.push(`<span class="badge badge--soft">ID deducido</span>`);
  if (unknown) badges.push(`<span class="badge">sin identificar</span>`);
  const notes = [];
  if (item && item.estado === "faltante") notes.push(`<p class="t-footnote c-2">Sin imagen oficial en el Fan Kit</p>`);
  if (item && item.nombre_pendiente) notes.push(`<p class="t-footnote c-2">Nombre en español sin confirmar</p>`);
  if (item && (item.rareza || item.heroe)) {
    const parts = [];
    if (item.rareza) parts.push(rarezaEs(item.rareza));
    if (item.heroe) parts.push(heroLabel(item.heroe));
    notes.push(`<p class="t-footnote c-2">${esc(parts.join(" · "))}</p>`);
  }
  if (item && item.estado === "id_deducido") notes.push(`<p class="t-footnote c-2">ID deducido por descarte</p>`);
  const line = levelLine(f);
  const over = overMaxLabel(f.lvl, f.max);
  const overChip = over ? ` <span class="chip chip--warn">${esc(over)}</span>` : "";
  return fichaFrame(`
        <div style="display:flex;justify-content:center">${thumb(f.id, { size: 96, ficha: true })}</div>
        <p class="t-title3">${esc(title)} ${badges.join(" ")}</p>
        <p class="t-title2 num">${esc(line.text)}${overChip}</p>
        <p class="badge badge-id">${esc(f.id)}</p>
        ${notes.join("")}`);
}

function heroLabel(en) {
  const id = HERO_ORDER.find((hid) => state.index.items[hid] && state.index.items[hid].nombre_en === en);
  return id ? (nameOf(id) || en) : en;
}

function renderAlert() {
  const a = state.alert;
  if (!a) return "";
  const buttons = a.buttons.map((b, i) => `<button class="${b.cls || ""}" data-alert="${i}"${b.act ? "" : " data-alert-cancel"}>${esc(b.label)}</button>`).join("");
  return `<div class="alert-backdrop"><div class="alert material-float" role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-msg">
    <div class="alert__body"><p class="alert__title" id="alert-title">${esc(a.title)}</p><p class="alert__msg" id="alert-msg">${esc(a.msg)}</p></div>
    <div class="alert__actions">${buttons}</div>
  </div></div>`;
}

function renderToast() {
  if (!state.toast) return "";
  return `<div class="toast toast--${state.toast.kind} material-float" role="status">${esc(state.toast.text)}</div>`;
}

function screenFor(r) {
  if (!state.ready) {
    return `<h1 class="large-title">Clash Progreso</h1><div class="section"><div class="card"><div class="sk sk--line"></div></div></div>`;
  }
  if (r.name === "roster" || r.name === "ajustes" || r.name === "importar") return renderRoster();
  if (r.name === "progreso") return renderProgreso(r.tag || state.selected);
  if (r.name === "detalle") return renderDetalle(r.tag, r.cat);
  if (r.name === "mejoras") return renderMejoras();
  if (r.name === "graficos" || r.name === "evolucion") return renderGraficos();
  if (r.name === "copia") return renderCopia();
  return renderRoster();
}

function renderGraficos() {
  const list = allAccounts().filter((m) => expOf(m.tag));
  if (!list.length) {
    return `<h1 class="large-title">Gráficos</h1><div class="section"><div class="card empty"><p class="t-title3">Aún no hay datos</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div></div>${LEGAL}`;
  }
  const tag = list.some((m) => m.tag === state.chartTag) ? state.chartTag : list[0].tag;
  const meta = accountByTag(tag);
  const view = viewOf(tag);
  const opts = list.map((m) => `<option value="${esc(m.tag)}"${m.tag === tag ? " selected" : ""}>${esc(m.nombre)}</option>`).join("");
  const cats = CATEGORIES.filter((c) => view.cats[c.key] && view.cats[c.key].pct != null);
  const bars = cats.map((c) => {
    const row = view.cats[c.key];
    return `<div class="bar-row"><span>${esc(c.label)}</span>${barHtml(c.key, row.pct, null, { mini: true, label: `${c.label} ${fmtPct(row.pct)}` })}<span class="num">${fmtPct(row.pct)}</span></div>`;
  }).join("");
  const compare = list.map((m) => {
    const v = viewOf(m.tag);
    return `<div class="bar-row"><span>${esc(m.chip || m.nombre)}</span>${barHtml("defensas", v.media, null, { mini: true, plain: true, label: `${m.nombre} ${fmtPct(v.media)}` })}<span class="num">${fmtPct(v.media)}</span></div>`;
  }).join("");
  return `<h1 class="large-title">Gráficos</h1>
    <p class="large-sub">% del máximo del TH de cada cuenta. La media no incluye categorías bloqueadas.</p>
    <label class="sort-label">Cuenta
      <select data-chart aria-label="Cuenta del gráfico">${opts}</select>
    </label>
    <div class="section"><div class="card">
      <h2 class="t-headline">${esc(meta.nombre)} · por categoría</h2>
      <div class="chart-bars">${bars}</div>
    </div></div>
    <div class="section"><div class="card">
      <h2 class="t-headline">Comparativa de cuentas</h2>
      <p class="t-footnote c-2">Media de las categorías desbloqueadas</p>
      <div class="chart-bars">${compare}</div>
    </div></div>
    <div class="section"><div class="card">
      <h2 class="t-headline">Evolución ${esc(meta.nombre)}</h2>
      ${evolutionChart(tag)}
    </div></div>
    ${LEGAL}`;
}

function evolutionPoints(tag) {
  const rows = state.rows.filter((r) => r.tag === tag).slice().sort((a, b) => a.timestamp - b.timestamp);
  return rows.map((exp) => {
    const view = analyze(exp, state.index);
    const day = madridDayKey(exp.timestamp * 1000);
    return { day, v: view.media, label: `${chartDay(day)} · ${fmtPct(view.media)}`, when: fmtWhen(exp.timestamp * 1000) };
  }).filter((p) => p.v != null);
}

function evolutionChart(tag) {
  const pts = evolutionPoints(tag);
  if (!pts.length) return `<p class="t-footnote c-2">Sin datos</p>`;
  const last = pts[pts.length - 1];
  const x0 = 40;
  const x1 = 300;
  const yOf = (v) => 156 - ((v || 0) / 100) * (156 - 12);
  const xs = pts.map((p, i) => (pts.length === 1 ? 170 : x0 + ((x1 - x0) * i) / (pts.length - 1)));
  const coords = pts.map((p, i) => `${xs[i]},${yOf(p.v)}`);
  const circles = pts.map((p, i) => `<circle class="chart__pt" cx="${xs[i]}" cy="${yOf(p.v || 0)}" r="5"><title>${esc(p.label)}</title></circle>`).join("");
  const line = pts.length > 1 ? `<polyline class="chart__line" points="${coords.join(" ")}"/>` : "";
  const note = pts.length === 1
    ? `<p class="t-footnote c-2">Un solo punto, el ${esc(pts[0].when)}. No hay más historial importado.</p>`
    : `<p class="t-footnote c-2">${pts.length} importaciones. Cada punto es una exportación real.</p>`;
  return `<svg class="chart" viewBox="0 0 343 180" role="img" aria-label="Evolución: ${esc(last.label)}">
    <g class="chart__grid"><line x1="32" x2="335" y1="12" y2="12"/><line x1="32" x2="335" y1="84" y2="84"/><line x1="32" x2="335" y1="156" y2="156"/></g>
    <g class="chart__y"><text x="26" y="16">100</text><text x="26" y="88">50</text><text x="26" y="160">0</text></g>
    ${line}
    ${circles}
    <g class="chart__x"><text x="${xs[0]}" y="174">${esc(chartDay(pts[0].day))}</text>${pts.length > 1 ? `<text x="${xs[xs.length - 1]}" y="174">${esc(chartDay(last.day))}</text>` : ""}</g>
  </svg>
  ${note}
  <table class="sr-only"><caption>Evolución</caption><tbody>${pts.map((p) => `<tr><td>${esc(chartDay(p.day))}</td><td>${esc(fmtPct(p.v))}</td></tr>`).join("")}</tbody></table>`;
}

function renderCopia() {
  const accounts = state.accounts;
  const n = accounts.length;
  const hist = state.rows.length;
  const byTh = new Map();
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    const th = exp ? townHallLevel(exp) : null;
    const key = th == null ? "sin datos" : `TH${th}`;
    byTh.set(key, (byTh.get(key) || 0) + 1);
  }
  const thLine = [...byTh.entries()].map(([k, c]) => `${c} × ${k}`).join(" · ") || "Sin cuentas";
  const { totalN, count, p, done, status, btn, note } = offlineDlModel();
  return `<h1 class="large-title">Copia</h1>
    <p class="large-sub">Todo se queda en este iPhone.</p>
    <div class="section"><div class="card">
      <h2 class="t-headline">Copia de seguridad</h2>
      <p class="t-body">Un JSON con las ${n} cuentas y las ${hist} exportaciones del historial.</p>
      <p class="t-footnote c-2">${esc(thLine)}</p>
      <p class="t-footnote c-2">Última importación: ${esc(lastImportLabel())}</p>
      <p class="t-footnote c-2">Versión ${esc(APP_VERSION)}</p>
      <button type="button" class="btn btn--primary btn--block" data-backup>Exportar JSON · ${n} cuentas</button>
      <button type="button" class="btn btn--secondary btn--block" data-backup-pick>Restaurar desde una copia</button>
      <p class="t-footnote c-2">Restaurar fusiona por tag y fecha de exportación: no borra nada y conserva todo el historial. Nada sale del iPhone salvo el archivo que guardes tú.</p>
    </div></div>
    <div class="section"><div class="card offline-dl${done ? " is-done" : ""}">
      <div class="offline-dl__top"><h3>Imágenes sin conexión</h3><span class="num">${count}\u00a0de\u00a0${totalN}</span></div>
      <div class="bar" style="--p:${Math.min(100, p)};--cat:var(--tint)" role="img" aria-label="${esc(status)}"><span class="bar__fill"></span></div>
      <p class="offline-dl__status">${esc(status)}</p>
      ${btn}
      <p class="t-footnote c-2">${esc(note)}</p>
    </div></div>
    <div class="section"><ul class="list">
      <li><div class="row"><span class="row__main"><span class="row__title">Versión</span></span><span class="row__trail">${esc(APP_VERSION)}</span></div></li>
      <li><button class="row" data-restore><span class="row__main"><span class="row__title">Restaurar datos de prueba</span></span></button></li>
      <li><button class="row row--destructive" data-wipe><span class="row__main"><span class="row__title">Borrar todos los datos</span></span></button></li>
    </ul></div>
    <input class="file-input" data-backup-file type="file" accept=".json,application/json,text/json,text/plain" tabindex="-1" aria-hidden="true">
    ${LEGAL}`;
}

function lastImportLabel() {
  if (!state.rows.length) return "aún no hay";
  const max = state.rows.reduce((m, r) => Math.max(m, r.timestamp || 0), 0);
  return fmtWhen(max * 1000);
}

function renderEditor() {
  const meta = accountByTag(state.editor);
  if (!meta) return "";
  return `<div class="sheet-backdrop" data-close-editor="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ed-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><button type="button" class="btn-text" data-close-editor="1">Cerrar</button><h2 id="ed-title" tabindex="-1">Cuenta</h2><span></span></div>
      <div class="sheet__body">
        <label class="alias-field">Alias
          <input data-alias-edit maxlength="24" autocapitalize="words" autocomplete="off" aria-label="Alias" value="${esc(meta.alias || meta.tag)}">
        </label>
        <div class="section"><button type="button" class="btn btn--secondary btn--block" data-principal="${esc(meta.tag)}">${meta.principal ? "Quitar Principal" : "Marcar como Principal"}</button></div>
        <div class="section"><button type="button" class="btn btn--destructive btn--block" data-delete="${esc(meta.tag)}">Borrar cuenta</button></div>
        <p class="section-footer">Puede haber varias cuentas Principal. Si no marcas ninguna, destaca la de TH más alto.</p>
        ${LEGAL}
      </div>
    </div>`;
}

function markFocus(el) {
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const ds = node.dataset;
    if (ds && ds.alert != null) return { alert: ds.alert };
    if (ds && ds.dl) return { dl: ds.dl };
    if (ds && ds.act) return { act: ds.act };
    if (node.id) return { id: node.id };
    node = node.parentElement;
  }
  return null;
}

function focusFromMark(mark) {
  if (!mark) return null;
  if (mark.alert != null) return document.querySelector(`.alert [data-alert="${cssAttr(mark.alert)}"]`);
  if (mark.dl) return document.querySelector(`[data-dl="${cssAttr(mark.dl)}"]`) || document.querySelector(".offline-dl [data-dl]");
  if (mark.act) return document.querySelector(`[data-act="${cssAttr(mark.act)}"]`);
  if (mark.id) return document.querySelector("#" + mark.id);
  return null;
}

function sheetViewOf(key) {
  if (key !== "importar") return key;
  const u = state.importUi;
  return `importar:${u.mode}:${u.phase}:${u.fromBatch ? u.focus : ""}`;
}

function rememberSheetFocus() {
  const key = state.ficha ? "ficha" : route().name;
  const same = key === state.sheetKey;
  state.sheetFocusMark = same ? markFocus(document.activeElement) : null;
  const body = document.querySelector(".sheet .sheet__body");
  state.sheetScroll = same && body && sheetViewOf(key) === state.sheetView ? body.scrollTop : null;
  return same;
}

/* Si el control con foco queda tapado por el borde del cuerpo del sheet, se desplaza lo justo (anillo incluido). */
function keepVisible(el) {
  const body = el && el.closest && el.closest(".sheet__body");
  if (!body) return;
  const r = el.getBoundingClientRect();
  const b = body.getBoundingClientRect();
  const ring = 6;
  if (r.bottom + ring > b.bottom) body.scrollTop += r.bottom + ring - b.bottom;
  else if (r.top - ring < b.top) body.scrollTop -= b.top - (r.top - ring);
}

function rememberAlertOpener(el, sel) {
  const rows = [...document.querySelectorAll(".sheet__body button")];
  state.alertReturn = { sel, idx: [...document.querySelectorAll(sel)].indexOf(el), pos: rows.indexOf(el), dl: !!el.dataset.dl };
}

/* Alerta (role="alertdialog"): al abrir, foco en Cancelar; el resto de #app queda inert; Tab no sale;
   Esc = Cancelar; al cerrar, el foco vuelve al control que la abrió (o al que ocupa su sitio, o al h2). */
function settleAlert() {
  const box = document.querySelector(".alert");
  const app = document.getElementById("app");
  if (box) {
    for (const el of app.children) {
      if (!el.classList.contains("alert-backdrop") && !el.classList.contains("toast")) el.setAttribute("inert", "");
    }
    const safe = box.querySelector("[data-alert-cancel]") || box.querySelector("[data-alert]");
    if (!state.alertShown || !box.contains(document.activeElement)) safe?.focus({ preventScroll: true });
  } else if (state.alertShown) {
    const ret = state.alertReturn;
    state.alertReturn = null;
    let back = null;
    if (ret) {
      back = document.querySelectorAll(ret.sel)[ret.idx]
        || (ret.dl ? document.querySelector(".offline-dl [data-dl]") : null)
        || document.querySelectorAll(".sheet__body button")[ret.pos];
    }
    back = back || document.querySelector(".sheet h2");
    if (back) { back.focus({ preventScroll: true }); keepVisible(back); }
  }
  state.alertShown = !!box;
}

function onAlertKey(ev) {
  if (!state.alert || !ev) return false;
  if (ev.key === "Escape") {
    ev.preventDefault();
    state.alert = null;
    render();
    return true;
  }
  if (ev.key !== "Tab") return false;
  const btns = [...document.querySelectorAll(".alert [data-alert]")];
  if (!btns.length) return false;
  const i = btns.indexOf(document.activeElement);
  const next = ev.shiftKey ? (i <= 0 ? btns.length - 1 : i - 1) : (i === btns.length - 1 ? 0 : i + 1);
  ev.preventDefault();
  btns[next].focus();
  return true;
}

function rememberOpener(el, sel) {
  state.focusReturn = { sel, idx: [...document.querySelectorAll(sel)].indexOf(el) };
}

function settleSheetFocus() {
  const sheet = document.querySelector(".sheet");
  for (const sel of [".navbar", "#screen", ".tabbar"]) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (sheet) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }
  const key = state.ficha ? "ficha" : route().name;
  const opened = !!sheet && key !== state.sheetKey;
  if (sheet) {
    const h2 = sheet.querySelector("h2");
    if (h2) h2.tabIndex = -1;
    const body = sheet.querySelector(".sheet__body");
    if (!opened && body && state.sheetScroll != null) body.scrollTop = state.sheetScroll;
    if (opened && h2 && !state.importUi.needsFocus) h2.focus({ preventScroll: true });
    else if (!opened && !state.importUi.needsFocus) {
      if (state.sheetFocusMark) {
        const back = focusFromMark(state.sheetFocusMark);
        if (back) { back.focus({ preventScroll: true }); keepVisible(back); }
      }
      const cur = document.activeElement;
      const inside = cur && cur !== document.body && cur !== document.documentElement && (sheet.contains(cur) || !!cur.closest(".alert"));
      if (h2 && !inside) h2.focus({ preventScroll: true });
    }
  } else if (state.focusReturn) {
    const ret = state.focusReturn;
    state.focusReturn = "";
    let back = null;
    if (typeof ret === "string") back = document.querySelector(ret);
    else {
      const list = document.querySelectorAll(ret.sel);
      back = list[ret.idx] || document.querySelector(ret.sel);
    }
    if (back) back.focus({ preventScroll: true });
  }
  state.sheetKey = key;
  state.sheetView = sheetViewOf(key);
  state.sheetFocusMark = null;
  state.sheetScroll = null;
}

function focusImportTarget() {
  if (!state.importUi.needsFocus) return;
  state.importUi.needsFocus = false;
  const card = document.querySelector("[data-import-focus]");
  if (card) card.focus();
  else {
    const h2 = document.querySelector(".sheet h2");
    if (h2) h2.focus({ preventScroll: true });
  }
}

function onSheetEscape(ev) {
  if (!ev || ev.key !== "Escape" || state.alert) return false;
  if (state.editor) {
    state.editor = null;
    render();
    return true;
  }
  if (state.ficha) {
    state.ficha = null;
    render();
    return true;
  }
  const name = route().name;
  if (name === "ajustes" || name === "importar") {
    if (name === "importar" && (state.importUi.phase === "confirm" || state.importUi.fromBatch)) {
      goBackImport();
      return true;
    }
    location.hash = "#/roster";
    return true;
  }
  return false;
}

function render() {
  const r = route();
  if (r.name === "importar") {
    if (!state.importUi.active) {
      state.importUi = freshImport();
      state.importUi.active = true;
    }
  } else if (state.importUi.active) {
    state.importUi.active = false;
  }
  if (r.name === "progreso" && r.tag) {
    state.selected = r.tag;
    localStorage.setItem("cp-account", r.tag);
  }
  const keep = rememberSheetFocus();
  const root = document.getElementById("app");
  root.dataset.sheetKeep = String(keep);
  root.innerHTML = `${navbar(r)}<main class="screen" id="screen">${screenFor(r)}</main>${tabbar(r)}${r.name === "ajustes" ? renderAjustes() : ""}${state.editor ? renderEditor() : ""}${r.name === "importar" ? renderImport() : ""}${fichaSheet()}${renderAlert()}${renderToast()}`;
  bind(r);
  const title = document.querySelector(".large-title");
  const nav = document.querySelector(".navbar");
  if (title && nav && nav.dataset.collapsed !== "true") {
    const io = new IntersectionObserver(([e]) => { nav.dataset.collapsed = String(!e.isIntersecting); }, {
      rootMargin: `-${nav.offsetHeight}px 0px 0px 0px`, threshold: 0,
    });
    io.observe(title);
  }
  paintOfflineThumbs();
  settleSheetFocus();
  focusImportTarget();
  settleAlert();
  if (state.scrollAdded && r.name === "roster") {
    state.scrollAdded = false;
    document.getElementById("otras-cuentas")?.scrollIntoView({ block: "start" });
  }
}

function bind(r) {
  document.getElementById("app").onclick = async (ev) => {
    const go = ev.target.closest("[data-go]");
    if (go) {
      const dest = go.dataset.go;
      if (dest === "#/ajustes" || dest === "#/importar") rememberOpener(go, `[data-go="${dest}"]`);
      if (location.hash === dest) {
        if (dest === "#/ajustes") measureCache();
        return;
      }
      location.hash = dest;
      return;
    }
    const seg = ev.target.closest("[data-seg]");
    if (seg) {
      const tag = (route().tag) || state.selected;
      state.seg[tag] = seg.dataset.seg;
      localStorage.setItem("cp-seg-" + tag, seg.dataset.seg);
      render();
      return;
    }
    const mej = ev.target.closest("[data-mej]");
    if (mej) {
      state.mejorasMode = mej.dataset.mej;
      localStorage.setItem("cp-mejoras", state.mejorasMode);
      render();
      return;
    }
    const pcat = ev.target.closest("[data-pcat]");
    if (pcat) {
      state.progFilter = { ...state.progFilter, cat: pcat.dataset.pcat };
      render();
      return;
    }
    const pstatus = ev.target.closest("[data-pstatus]");
    if (pstatus) {
      state.progFilter = { ...state.progFilter, status: pstatus.dataset.pstatus };
      render();
      return;
    }
    const edit = ev.target.closest("[data-edit]");
    if (edit) {
      rememberOpener(edit, `[data-edit="${cssAttr(edit.dataset.edit)}"]`);
      state.editor = edit.dataset.edit;
      state.sheetKey = "";
      render();
      return;
    }
    if (ev.target.closest("[data-close-editor]")) { state.editor = null; render(); return; }
    const principal = ev.target.closest("[data-principal]");
    if (principal) {
      const tag = principal.dataset.principal;
      const cur = state.accounts.find((a) => a.tag === tag);
      state.accounts = setPrincipal(state.accounts, tag, !(cur && cur.principal));
      persistRoster();
      render();
      return;
    }
    const del = ev.target.closest("[data-delete]");
    if (del) {
      const tag = del.dataset.delete;
      const meta = accountByTag(tag);
      rememberAlertOpener(del, `[data-delete="${cssAttr(tag)}"]`);
      state.alert = {
        title: `¿Borrar ${meta ? meta.nombre : tag}?`,
        msg: "Se borrarán la cuenta y sus importaciones de este iPhone. Una copia ya guardada no se toca.",
        buttons: [
          { label: "Cancelar" },
          { label: "Borrar", cls: "is-destructive", act: "quitar", payload: tag },
        ],
      };
      render();
      return;
    }
    if (ev.target.closest("[data-backup]")) { await exportBackup(); return; }
    if (ev.target.closest("[data-backup-pick]")) { document.querySelector("[data-backup-file]")?.click(); return; }
    const ficha = ev.target.closest("[data-ficha]");
    if (ficha) {
      const lvl = Number(ficha.dataset.lvl);
      const max = ficha.dataset.max ? Number(ficha.dataset.max) : null;
      const unlockTh = ficha.dataset.unlock ? Number(ficha.dataset.unlock) : null;
      rememberOpener(ficha, ficha.dataset.capsName
        ? `[data-ficha="caps"][data-caps-name="${cssAttr(ficha.dataset.capsName)}"]`
        : `[data-ficha="${cssAttr(ficha.dataset.ficha)}"]`);
      state.ficha = ficha.dataset.capsName
        ? { capsOnly: true, name: ficha.dataset.capsName, lvl, max, unlockTh }
        : { id: ficha.dataset.ficha, lvl, max, unlockTh };
      render();
      return;
    }
    if (ev.target.closest("[data-close-ficha]")) { state.ficha = null; render(); return; }
    if (ev.target.closest("[data-close]")) { location.hash = "#/roster"; return; }
    if (ev.target.closest("[data-restore]")) {
      rememberAlertOpener(ev.target.closest("[data-restore]"), "[data-restore]");
      state.alert = {
        title: "¿Restaurar datos incluidos?",
        msg: "Se volverán a cargar las 11 exportaciones del 7 oct 2026. Las importaciones más nuevas se conservan.",
        buttons: [
          { label: "Cancelar", cls: "" },
          { label: "Restaurar", cls: "", act: "restore" },
        ],
      };
      render();
      return;
    }
    if (ev.target.closest("[data-wipe]")) {
      rememberAlertOpener(ev.target.closest("[data-wipe]"), "[data-wipe]");
      state.alert = {
        title: "¿Borrar todos los datos?",
        msg: "Se eliminarán las importaciones y el histórico de este iPhone.",
        buttons: [
          { label: "Cancelar", cls: "" },
          { label: "Borrar", cls: "is-destructive", act: "wipe" },
        ],
      };
      render();
      return;
    }
    const alertBtn = ev.target.closest("[data-alert]");
    if (alertBtn) {
      const b = state.alert.buttons[Number(alertBtn.dataset.alert)];
      const act = b && b.act;
      const payload = b && b.payload;
      state.alert = null;
      if (act === "wipe") {
        await clearExports();
        state.rows = [];
        state.latest = new Map();
        state.added = [];
        saveAdded([]);
        state.accounts = [];
        persistRoster();
        showToast("ok", "Datos borrados");
      }
      if (act === "restore") {
        state.rows = await restoreBundled(state.bundlePaths || []);
        state.latest = latestByTag(state.rows);
        state.accounts = ensureTags(state.accounts, [...new Set(state.rows.map((r) => r.tag))]);
        persistRoster();
        showToast("ok", "Datos incluidos restaurados");
      }
      if (act === "quitar") await removeAdded(payload);
      if (act === "purge") await purgeImages();
      render();
      return;
    }
    const dl = ev.target.closest("[data-dl]");
    if (dl) {
      if (dl.dataset.dl === "start") downloadAll();
      if (dl.dataset.dl === "stop" && state.dlAbort) state.dlAbort.abort();
      if (dl.dataset.dl === "purge") {
        rememberAlertOpener(dl, '[data-dl="purge"]');
        state.alert = {
          title: "¿Borrar imágenes guardadas?",
          msg: "Se quitarán las imágenes descargadas. Los ayuntamientos y los héroes se pueden volver a guardar.",
          buttons: [{ label: "Cancelar" }, { label: "Borrar", cls: "is-destructive", act: "purge" }],
        };
        render();
      }
      return;
    }
    const quitar = ev.target.closest("[data-quitar]");
    if (quitar) {
      const tag = quitar.dataset.quitar;
      const meta = accountByTag(tag);
      const label = meta ? meta.nombre : tag;
      rememberAlertOpener(quitar, "[data-quitar]");
      state.alert = {
        title: `¿Quitar ${label}?`,
        msg: "Se borrarán su alias y sus importaciones de este iPhone.",
        buttons: [
          { label: "Cancelar" },
          { label: "Quitar", cls: "is-destructive", act: "quitar", payload: tag },
        ],
      };
      render();
      return;
    }
    const im = ev.target.closest("[data-im]");
    if (im) {
      state.importUi.mode = im.dataset.im;
      state.importUi.phase = "entry";
      state.importUi.items = [];
      state.importUi.focus = null;
      state.importUi.fromBatch = false;
      state.importUi.saveError = false;
      render();
      return;
    }
    if (ev.target.closest("[data-im-back]")) { goBackImport(); return; }
    const rowBtn = ev.target.closest("[data-im-row]");
    if (rowBtn) {
      const idx = Number(rowBtn.dataset.imRow);
      const item = state.importUi.items[idx];
      if (!item) return;
      state.importUi.focus = idx;
      state.importUi.fromBatch = true;
      state.importUi.needsFocus = true;
      if (item.kind === "new") {
        state.importUi.phase = "confirm";
        state.importUi.alias = "";
      }
      render();
      return;
    }
    const actBtn = ev.target.closest("[data-act]");
    if (actBtn) {
      const name = actBtn.dataset.act;
      if (name === "paste") { await doPaste(); return; }
      if (name === "review") {
        await validateTexts([{ name: "Pegado", text: state.importUi.text, source: "clipboard" }]);
        return;
      }
      if (name === "pick") { document.querySelector("[data-files]")?.click(); return; }
      if (name === "paste-again") { resetImport("paste"); return; }
      if (name === "commit") { await commitImport(); return; }
      if (name === "confirm-new") {
        state.importUi.phase = "confirm";
        state.importUi.alias = "";
        state.importUi.saveError = false;
        state.importUi.needsFocus = true;
        render();
        return;
      }
      if (name === "add-account") { await addNewAccount(); return; }
    }
    const tab = ev.target.closest(".tabbar a[aria-current='page']");
    if (tab) { ev.preventDefault(); document.getElementById("screen")?.scrollTo?.({ top: 0 }); window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  };
  const sel = document.querySelector("[data-account]");
  if (sel) sel.onchange = () => { location.hash = "#/progreso/" + sel.value.slice(1); };
  const sort = document.querySelector("[data-sort]");
  if (sort) sort.onchange = () => { state.sortMode = sort.value; localStorage.setItem("cp-sort", state.sortMode); render(); };
  const chart = document.querySelector("[data-chart]");
  if (chart) chart.onchange = () => { state.chartTag = chart.value; localStorage.setItem("cp-chart", state.chartTag); render(); };
  const search = document.querySelector("[data-psearch]");
  if (search) search.oninput = () => {
    const pos = search.selectionStart;
    state.progFilter = { ...state.progFilter, q: search.value };
    render();
    const again = document.querySelector("[data-psearch]");
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* tipo search */ } }
  };
  const aliasEdit = document.querySelector("[data-alias-edit]");
  if (aliasEdit) aliasEdit.oninput = () => {
    state.accounts = renameAccount(state.accounts, state.editor, aliasEdit.value);
    persistRoster();
  };
  const evo = document.querySelector("[data-evo]");
  if (evo) evo.onchange = () => { state.evo = evo.value; localStorage.setItem("cp-evo", state.evo); render(); };
  const paste = document.querySelector("[data-paste]");
  if (paste) {
    paste.oninput = () => {
      state.importUi.text = paste.value;
      const btn = document.querySelector("[data-primary]");
      if (!btn) return;
      const has = paste.value.trim().length > 0;
      btn.textContent = has ? "Revisar" : "Pegar";
      btn.dataset.act = has ? "review" : "paste";
    };
    paste.addEventListener("paste", () => {
      setTimeout(() => {
        state.importUi.text = paste.value;
        paste.blur();
        validateTexts([{ name: "Pegado", text: paste.value, source: "clipboard" }]);
      }, 0);
    });
  }
  const alias = document.querySelector("[data-alias]");
  if (alias) alias.oninput = () => { state.importUi.alias = alias.value; };
  const backupFile = document.querySelector("[data-backup-file]");
  if (backupFile) backupFile.onchange = async () => {
    const file = backupFile.files && backupFile.files[0];
    backupFile.value = "";
    if (!file) return;
    await restoreBackupText(await file.text());
  };
  const files = document.querySelector("[data-files]");
  if (files) files.onchange = async () => {
    const list = [...files.files];
    if (!list.length) return;
    state.importUi.mode = "file";
    state.importUi.saveError = false;
    armValidating();
    const entries = [];
    for (const file of list) {
      entries.push({ name: file.name, text: await file.text(), source: "file" });
      await yieldTurn();
    }
    await validateTexts(entries, { fromFiles: true, armed: true });
  };
}

function showToast(kind, text) {
  state.toast = { kind, text };
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { state.toast = null; const el = document.querySelector(".toast"); if (el) el.remove(); }, 3000);
}

async function measureCache() {
  if (!("caches" in window)) return;
  let bytes = 0;
  let count = 0;
  for (const img of state.images) {
    const hit = await caches.match(img.url);
    if (hit) { bytes += img.bytes; count += 1; }
  }
  state.cacheBytes = bytes;
  state.cacheCount = count;
  if ((route().name === "ajustes" || route().name === "copia") && state.dl.phase !== "downloading") render();
}

async function downloadAll() {
  if (!navigator.onLine) { state.dl.phase = "offline"; render(); return; }
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
  const ctrl = new AbortController();
  state.dlAbort = ctrl;
  state.dl = { phase: "downloading", doneBytes: state.cacheBytes, doneCount: state.cacheCount, errors: 0, note: "" };
  render();
  const cache = await caches.open(IMAGE_CACHE);
  let errors = 0;
  let bytes = 0;
  let count = 0;
  for (const img of state.images) {
    const hit = await caches.match(img.url);
    if (hit) { bytes += img.bytes; count += 1; continue; }
  }
  state.dl.doneBytes = bytes;
  state.dl.doneCount = count;
  state.dl.quarter = dlQuarter(bytes);
  for (const img of state.images) {
    if (ctrl.signal.aborted) break;
    if (await caches.match(img.url)) continue;
    try {
      const res = await fetch(img.url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("bad");
      await cache.put(img.url, res.clone());
      bytes += img.bytes;
      count += 1;
      state.dl.doneBytes = bytes;
      state.dl.doneCount = count;
      if (count % 4 === 0) {
        if (route().name === "ajustes" || route().name === "copia") patchOfflineDl();
        const q = dlQuarter(bytes);
        if (q > state.dl.quarter && q < 4) { state.dl.quarter = q; announce(`Imágenes sin conexión: ${q * 25} %`); }
      }
    } catch (err) {
      if (ctrl.signal.aborted) break;
      if (err && (err.name === "QuotaExceededError" || err.code === 22)) {
        state.dl.phase = "space";
        state.cacheBytes = bytes;
        state.cacheCount = count;
        render();
        announce(offlineDlModel().status);
        return;
      }
      errors += 1;
    }
  }
  state.cacheBytes = bytes;
  state.cacheCount = count;
  state.dl.phase = errors ? "error" : "idle";
  state.dl.errors = errors;
  state.dlAbort = null;
  render();
  const end = offlineDlModel().status;
  announce(ctrl.signal.aborted ? `Descarga detenida. ${end}` : end);
}

async function purgeImages() {
  const keys = await caches.keys();
  for (const key of keys) {
    const cache = await caches.open(key);
    const reqs = await cache.keys();
    for (const req of reqs) {
      if (req.url.includes("/assets/images/")) await cache.delete(req);
    }
  }
  state.dl.phase = "idle";
  await measureCache();
  render();
}

function catalog(manifest) {
  const list = [];
  for (const item of Object.values(manifest.items)) {
    const push = (im) => {
      if (!im || !im.ruta) return;
      if (im.pesado === true || item.pesado === true) return;
      list.push({ url: "./assets/" + im.ruta, bytes: im.bytes || 0, precache: item.categoria === "townhall" || item.categoria === "hero" });
    };
    push(item.imagen);
    for (const im of Object.values(item.imagenes_por_nivel || {})) push(im);
  }
  return list;
}

async function boot() {
  state.added = loadAdded();
  announce("");
  render();
  const [manifest, caps, bundle] = await Promise.all([
    fetch("./assets/manifest.json").then((r) => r.json()),
    fetch("./data/caps_clashrecord.json").then((r) => r.json()),
    fetch("./data/bundle.json").then((r) => r.json()),
  ]);
  state.manifest = manifest;
  state.caps = caps;
  state.peso = manifest.peso_imagenes;
  state.index = indexCaps(caps, manifest);
  state.images = catalog(manifest);
  state.bundlePaths = bundle.exportaciones.map((p) => "./" + p);
  state.rows = await seedBundled(state.bundlePaths);
  state.latest = latestByTag(state.rows);
  const migrated = migrateRoster({
    stored: readStoredRoster(),
    added: state.added,
    exportTags: [...new Set(state.rows.map((r) => r.tag))],
    seeded: localStorage.getItem("cp-seeded"),
  });
  state.accounts = migrated.accounts;
  persistRoster();
  state.ready = true;
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { type: "module" })
      .then(() => navigator.serviceWorker.ready)
      .then(() => measureCache())
      .catch(() => measureCache());
  } else {
    measureCache();
  }
}

window.addEventListener("hashchange", () => {
  render();
  if (route().name === "ajustes" || route().name === "copia") measureCache();
});
document.addEventListener("keydown", (ev) => { if (!onAlertKey(ev)) onSheetEscape(ev); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { state.now = Date.now(); if (route().name === "mejoras") render(); }
});
setInterval(() => {
  state.now = Date.now();
  if (route().name === "mejoras") render();
}, 60000);
window.addEventListener("online", () => {
  retryOfflineThumbs();
  if (route().name === "ajustes" || route().name === "copia") render();
});
window.addEventListener("offline", () => {
  if (route().name === "ajustes" || route().name === "copia") render();
  else paintOfflineThumbs();
});

boot();
