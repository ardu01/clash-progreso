import {
  CATEGORIES, HERO_ORDER, ROSTER, VILLAGE_KEYS, analyze, averagePct, builderStatus, categoryItems,
  capsFichaLines, categoryUnlock, catFoot, helpersOf, indexCaps, initials,
  itemName, levelLine, outsidePct, overMaxLabel, rarezaEs, townHallLevel, upgradesOf,
} from "./progress.js";
import { dayHeading, esc, fmtBytes, fmtFin, fmtNum, fmtPct, fmtRemain, madridDayKey } from "./format.js";
import { APP_VERSION, IMAGE_CACHE } from "./caches.js";
import { ajusteOf, catalog, imageChoice, isHeavy } from "./images.js";
import {
  BAD_FOOT, DUP_FOOT, DUPLICATE_HELP, EVOLUTION_FOOT, FIRST_FOOT, FOREIGN_HELP, NEW_FOOT, NO_CHANGE_FOOT,
  PASTE_DENIED, STRUCTURE_HELP, addedToast, batchSummary, classifyEntries,
  duplicateMsg, foreignMsg, mediaLine, olderHelp, olderWarning, omitReason, omitSubtitle, overMaxMsg,
  diffExports, planBatch, sortBatch, statusText, successToast, trailingLabel, unknownMsg,
} from "./import.js";
import { allExports, clearExports, deleteTag, guardarDocumentos, guardarRecuperacion, guardarSchema, latestByTag, latestCopyAt, leerDocumentos, leerSchema, putCopy, putExport, restoreBundled, seedBundled } from "./store.js";
import {
  addAccount, cleanGrupos, cleanMeta, ensureTags, featuredTag, migrateRoster, orderAccounts, removeAccount, renameAccount, setGrupos, setMeta, setPrincipal, setRecursos,
} from "./roster.js";
import { clipboardImportPlan, loteTextFromUrl } from "./paste.js";
import { accountVisible, dayInRange } from "./range.js";
import { compareAccounts, fleetSnapshot, rankAccounts } from "./fleet.js";
import { estadoColas } from "./colas.js";
import { HEROES_FUERA, PLAN_CRITERIO, planQueue, upgradePlan } from "./plan.js";
import { achievements, historyPairs, weeklyPace } from "./history.js";
import { COST_SOURCE, COST_URL, categoryUses, piecesOf, remainingCost, usesResource } from "./costs.js";
import { cubrir, recursosDeCuenta } from "./recursos.js";
import { TH_FUENTE, TH_URL, costeTh, costeThRango } from "./th-costes.js";
import { accountColor, groupedBars, groupedByCategory, heatmap, lineSeries, radarPoints } from "./charts.js";
import { accountTimeline, finalesEn, finDe, fraseFranja, franjasDe, sleepFromClocks } from "./schedule.js";
import { applyFilter, chipCounts, progressRows, rowName, sortFilterRows } from "./filters.js";
import { backupFilename, buildBackup, isShareCancel, mergeBackup } from "./backup.js";
import { textoIcs } from "./calendario.js";
import {
  DURATIONS, PLAN_TIMELINE, RUSH_NOTE, ahoraDe, buildRoadmap, constructoresParaPlan, costeDePaso, defaultPlan, effectivePlan,
  maxTownHall, planIsConfigured, planLabel, rushGaps, timelineRows,
} from "./roadmap.js";
import { normalizeProvisional, reconcileMessage, reconcileProvisionals, toggleProvisional } from "./provisional.js";
import { applyEqFilter, equipmentRows, fleetOre, groupByHero, oreTotal } from "./equipo.js";
import { exportFacts } from "./perfil.js";
import { accionTab } from "./nav.js";
import { claveRoadmap, trasImportar } from "./gancho.js";
import { prepararMigracion, verificarDocumentos, volcadoLiteral } from "./migracion.js";
import { docDe, docVacio, entradaDeImportacion, reducir, sumarDiario } from "./operaciones.js";
import { avisoTrasImportar } from "./replan.js";
import { SUEÑO_DEFECTO } from "./prioridades.js";
import { htmlOperaciones } from "./ui-operaciones.js";
import { htmlAtencion, htmlMotor } from "./ui-atencion.js";
import { htmlEstrategias } from "./ui-evolucion.js";
import { empaquetarCuentas, empezarExploracion, pararExploracion } from "./evolucion/control.js";
import { cargarFuentes, costeSubirTh } from "./fuentes.js";
import {
  anotarResultado, blankSession, clearSession, compareOrden, fraseResumen, isStandalone, mensajePegado, nextOf, ordenDeSesion,
  progressOf, readSession, recordPaste, summaryOf, withPending, writeSession,
} from "./actualizar.js";

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
  mejorasMode: ["plan", "costes", "equipo"].includes(localStorage.getItem("cp-mejoras")) ? localStorage.getItem("cp-mejoras") : "plan",
  evo: localStorage.getItem("cp-evo") || "roster",
  estrategiasCfg: { horizonte: 90, presupuesto: 90 },
  estrategiasEstado: "Sin buscar. Simulación.",
  estrategiasResultado: null,
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
  agendaVista: ["24h", "7d", "cuenta", "curso"].includes(localStorage.getItem("cp-agenda")) ? localStorage.getItem("cp-agenda") : "24h",
  cursoVista: localStorage.getItem("cp-curso") === "cuenta" ? "cuenta" : "fin",
  actualizarManual: false,
  actualizarFocus: false,
  actualizarBorrador: "",
  filters: loadFilters(),
  chartKind: localStorage.getItem("cp-chart-kind") || "lineas",
  compareTags: loadCompare(),
  rankKey: localStorage.getItem("cp-rank") || "media",
  notifyOn: localStorage.getItem("cp-notify") === "1",
  sleep: loadSleep(),
  planes: loadPlanes(),
  provisionales: loadProvisionals(),
  theme: loadTheme(),
  staleDays: loadStaleDays(),
  rosterQ: "",
  levelKind: localStorage.getItem("cp-level-kind") || "th",
  eqVista: localStorage.getItem("cp-eq-vista") === "flota" ? "flota" : "cuenta",
  eqFiltro: loadEqFiltro(),
  eqElegidos: loadEqElegidos(),
  copyAt: null,
  datosFallo: false,
  fuenteIdb: false,
  documentos: [],
  added: [],
  flashTags: new Set(),
  scrollAdded: false,
  dlAbort: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

function loadFilters() {
  const base = { tiempo: "todo", recurso: "todos", th: "", grupo: "", desde: "", hasta: "" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem("cp-filters") || "{}") };
  } catch {
    return base;
  }
}

function loadPlanes() {
  try {
    const raw = JSON.parse(localStorage.getItem("cp-planes") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function loadProvisionals() {
  try {
    const list = JSON.parse(localStorage.getItem("cp-provisional") || "[]");
    return Array.isArray(list) ? list.map(normalizeProvisional).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadTheme() {
  const t = localStorage.getItem("cp-theme");
  return t === "light" || t === "dark" || t === "sistema" ? t : "sistema";
}

function loadStaleDays() {
  const n = Number(localStorage.getItem("cp-stale-days"));
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : 7;
}

function loadSleep() {
  const raw = localStorage.getItem("cp-sueno");
  if (raw == null) return { desde: SUEÑO_DEFECTO.desde, hasta: SUEÑO_DEFECTO.hasta };
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return { desde: SUEÑO_DEFECTO.desde, hasta: SUEÑO_DEFECTO.hasta };
    return { desde: String(saved.desde || ""), hasta: String(saved.hasta || "") };
  } catch {
    return { desde: "", hasta: "" };
  }
}

function loadEqFiltro() {
  const base = { rareza: "todos", heroe: "todos", bloqueados: false, ocultar: true };
  try {
    const raw = JSON.parse(localStorage.getItem("cp-eq-filtro") || "{}");
    const rareza = ["todos", "Common", "Epic"].includes(raw.rareza) ? raw.rareza : "todos";
    const heroe = typeof raw.heroe === "string" && raw.heroe ? raw.heroe : "todos";
    return { rareza, heroe, bloqueados: raw.bloqueados === true, ocultar: raw.ocultar !== false };
  } catch {
    return base;
  }
}

function loadEqElegidos() {
  try {
    const raw = JSON.parse(localStorage.getItem("cp-eq-elegidos") || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out = {};
    for (const [tag, list] of Object.entries(raw)) {
      if (!tag.startsWith("#") || !Array.isArray(list)) continue;
      out[tag] = list.map(String);
    }
    return out;
  } catch {
    return {};
  }
}

function loadCompare() {
  try {
    const list = JSON.parse(localStorage.getItem("cp-compare") || "[]");
    return Array.isArray(list) ? list.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function route() {
  const raw = (location.hash || "#/inicio").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  let name = parts[0] || "inicio";
  if (name === "cuentas") name = "roster";
  if (name === "progreso" && parts[1] && parts[2] === "equipamiento") {
    return { name: "equipo", tag: "#" + parts[1], cat: null };
  }
  if (name === "progreso" && parts[1] && (parts[2] === "plan" || parts[2] === "historial")) {
    return { name: parts[2], tag: "#" + parts[1], cat: null };
  }
  if (name === "progreso" && parts[1] && parts[2]) {
    return { name: "detalle", tag: "#" + parts[1], cat: parts[2] };
  }
  if (name === "progreso" && parts[1]) return { name: "progreso", tag: "#" + parts[1] };
  if (name === "graficos" || name === "evolucion") return { name: "graficos", tag: null, cat: null };
  if (name === "perfil") return { name: "perfil", tag: parts[1] ? "#" + parts[1] : null, cat: null };
  if (name === "operaciones") return { name: "operaciones", tag: null, cat: null, sub: parts[1] || "hub" };
  if ((name === "inicio" && (parts[1] === "bandeja" || parts[1] === "excepciones"))
    || (name === "agenda" && (parts[1] === "presupuesto" || parts[1] === "ventanas"))
    || (name === "roster" && (parts[1] === "hibernar" || parts[1] === "detector" || parts[1] === "rescate"))) {
    return { name, tag: null, cat: null, sub: parts[1] };
  }
  if (name === "ahora" || name === "ranking" || name === "agenda" || name === "equipo") return { name, tag: parts[1] ? "#" + parts[1] : null, cat: null };
  return { name, tag: null, cat: null };
}

function baseTab(r) {
  if (r.name === "inicio" || r.name === "ahora" || r.name === "copia" || r.name === "actualizar") return "inicio";
  if (r.name === "detalle" || r.name === "progreso" || r.name === "historial" || r.name === "perfil" || r.name === "roster" || r.name === "importar" || r.name === "ajustes") return "roster";
  if (r.name === "mejoras" || r.name === "plan" || r.name === "equipo") return "mejoras";
  if (r.name === "ranking" || r.name === "graficos" || r.name === "evolucion") return "analisis";
  if (r.name === "agenda" || r.name === "operaciones") return "agenda";
  return "inicio";
}

function infoBtn(texto) {
  if (!texto) return "";
  return `<button type="button" class="info" data-info aria-expanded="false" aria-pressed="false" aria-label="Más información">ⓘ</button><p class="info-pop" hidden>${esc(texto)}</p>`;
}

function sectionHead(titulo, info) {
  return `<div class="section-head"><div class="section-header"><span>${titulo}</span></div>${infoBtn(info)}</div>`;
}

const ICON = {
  inicio: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 13 14 5l10 8"/><path d="M7 11v12h14V11"/><path d="M12 23v-6h4v6"/></svg>`,
  cuentas: `<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="5" width="8" height="8" rx="2"/><rect x="16" y="5" width="8" height="8" rx="2"/><rect x="4" y="16" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/></svg>`,
  mejoras: `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5"/><path d="M14 8.5V14l3.5 2.5"/></svg>`,
  analisis: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 21l6-6 4 3 9-9"/><path d="M4 24h20"/></svg>`,
  agenda: `<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="6" width="20" height="18" rx="3"/><path d="M4 11h20M9 3v5M19 3v5"/></svg>`,
  operaciones: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M6 4h16v20H6z"/><path d="M10 10h8M10 14h8M10 18h5"/></svg>`,
  ajustes: `<svg viewBox="0 0 28 28" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="14" cy="14" r="4"/><path d="M14 3v4M14 21v4M3 14h4M21 14h4M6.2 6.2l2.8 2.8M19 19l2.8 2.8M6.2 21.8 9 19M19 9l2.8-2.8"/></svg>`,
  choza: `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3 14 14 5l11 9"/><path d="M6 12v11h16V12"/><path d="M11 23v-5h6v5"/></svg>`,
  objetivo: `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10"/><circle cx="14" cy="14" r="5.5"/><circle cx="14" cy="14" r="1.5"/></svg>`,
};
const BACK = `<svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
  espejarUsuario();
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
    grupos: a.grupos || [],
    meta: a.meta || null,
    recursos: a.recursos || null,
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

function thumbLevel(opts) {
  if (opts.levelKey != null && opts.levelKey !== "") return opts.levelKey;
  if (opts.lvl != null && opts.lvl !== "") return opts.lvl;
  if (opts.th != null && opts.th !== "") return opts.th;
  return null;
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
  const choice = imageChoice(item, thumbLevel(opts));
  const im = choice.im;
  if (!im || (isHeavy(im, item) && !opts.ficha)) {
    const style = known ? "" : ` style="--size:${size}px"`;
    if (opts.ficha && im && isHeavy(im, item)) {
      return imageThumb(cls, size, label, im, opts, choice);
    }
    return `<span class="thumb ${cls} thumb--empty"${style} aria-hidden="true">${esc(initials(label))}</span>`;
  }
  return imageThumb(cls, size, label, im, opts, choice);
}

function cssNum(v) {
  return String(Math.round(Number(v) * 1000) / 1000);
}

function ajusteStyle(im, size, pad) {
  const aj = ajusteOf(im, size, pad == null ? {} : { pad });
  if (!aj) return "";
  return `--dw:${cssNum(aj.dw)};--dh:${cssNum(aj.dh)};--x:${cssNum(aj.left)};--y:${cssNum(aj.top)}`;
}

function imageThumb(cls, size, label, im, opts, choice) {
  const tile = im.tipo_visual === "tile_fondo_opaco" ? " thumb--tile" : "";
  const vars = [];
  if (![40, 44, 52, 72, 96].includes(size)) vars.push(`--size:${size}px`);
  const fit = ajusteStyle(im, size, opts.pad);
  if (fit) vars.push(fit);
  const style = vars.length ? ` style="${vars.join(";")}"` : "";
  const loading = opts.eager ? "eager" : "lazy";
  const pri = opts.eager ? " fetchpriority=\"high\"" : "";
  let extra = "";
  const fb = choice && choice.fallback;
  if (fb && fb.ruta && fb.ruta !== im.ruta) {
    extra += ` data-fallback="./assets/${esc(fb.ruta)}" data-fb-ajuste="${ajusteStyle(fb, size, opts.pad)}"`;
  }
  const w = Number(im.ancho) > 0 ? im.ancho : size;
  const h = Number(im.alto) > 0 ? im.alto : size;
  const fitted = fit ? " is-ajuste" : "";
  return `<span class="thumb ${cls}${tile}${fitted}"${style}${extra} data-initials="${esc(initials(label))}"><img src="./assets/${esc(im.ruta)}" alt="" width="${w}" height="${h}" loading="${loading}" decoding="async"${pri} onload="window.__imgOk(this)" onerror="window.__imgErr(this)"></span>`;
}

function emptyNamedThumb(label, size) {
  const known = [40, 44, 52, 72, 96].includes(size);
  const cls = known ? "thumb--" + size : "";
  const style = known ? "" : ` style="--size:${size}px"`;
  return `<span class="thumb ${cls} thumb--empty"${style} aria-hidden="true">${esc(initials(label))}</span>`;
}

function absUrl(url) {
  try { return new URL(url, location.href).href; } catch { return url; }
}

function clearLevelNote(box) {
  const note = box.closest(".ficha")?.querySelector("[data-level-note]");
  if (note) note.remove();
}

/** Sin la imagen del nivel: el PNG del edificio, sin la marca de nivel inferior. */
function applyFallback(img, box) {
  const fb = box && box.dataset.fallback;
  if (!fb || box.dataset.usedFallback === "1") return false;
  if (img.getAttribute("src") === fb) return false;
  box.dataset.usedFallback = "1";
  if ("fbAjuste" in box.dataset) {
    for (const key of ["--dw", "--dh", "--x", "--y"]) box.style.removeProperty(key);
    if (box.dataset.fbAjuste) {
      box.classList.add("is-ajuste");
      for (const part of box.dataset.fbAjuste.split(";")) {
        const i = part.indexOf(":");
        if (i > 0) box.style.setProperty(part.slice(0, i), part.slice(i + 1));
      }
    } else {
      box.classList.remove("is-ajuste");
    }
  }
  clearLevelNote(box);
  box.classList.remove("thumb--offline");
  delete box.dataset.checked;
  img.classList.remove("is-loaded");
  img.src = fb;
  return true;
}

window.__imgOk = (img) => {
  img.classList.add("is-loaded");
  const box = img.closest(".thumb");
  if (box) box.classList.remove("thumb--offline");
};
window.__imgErr = (img) => {
  const box = img.closest(".thumb");
  if (!box) return;
  if (applyFallback(img, box)) return;
  if (box.dataset.checked === "1") return;
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
    if (hit) return;
    const fb = box.dataset.fallback;
    if (fb && box.dataset.usedFallback !== "1") {
      let fbHit = null;
      try { fbHit = await caches.match(absUrl(fb)); } catch { fbHit = null; }
      if (!box.isConnected || img.classList.contains("is-loaded")) return;
      if (fbHit) {
        applyFallback(img, box);
        return;
      }
    }
    box.classList.add("thumb--offline");
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

function meterHtml(pct, label) {
  if (pct == null) return "";
  return `<span class="meter">${barHtml("defensas", pct, null, { plain: true, label })}<b class="meter__val num" aria-hidden="true">${fmtPct(pct)}</b></span>`;
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
  if (flags.unknown && it.id) bits.push(`ID ${it.id}`);
  return bits.join(", ");
}

function heroAria(name, h, line) {
  const lvl = h.lvl == null ? 0 : h.lvl;
  const level = line.bar && h.max ? `nivel ${lvl} de ${h.max}` : line.text;
  return [name || "Héroe", level].filter(Boolean).join(", ");
}

function cssAttr(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function goalChip(th, objetivo) {
  if (th == null) return "";
  if (th >= objetivo) return `<span class="chip chip--goal-ok">Objetivo TH${objetivo}</span>`;
  return `<span class="chip">TH${th} → ${objetivo}</span>`;
}

function goalBar(meta, view) {
  const g = meta && meta.meta;
  if (!g || !view || !g.pct) return "";
  const cur = g.clave === "media" ? view.media : (view.cats[g.clave] && view.cats[g.clave].pct);
  if (cur == null) return "";
  const p = Math.max(0, Math.min(100, (cur / g.pct) * 100));
  const label = g.clave === "media" ? "Media" : (CATEGORIES.find((c) => c.key === g.clave) || {}).label || g.clave;
  return `<span class="goal" role="img" aria-label="Meta ${esc(label)} ${fmtPct(cur)} de ${g.pct} %"><span class="goal__fill" style="--p:${p.toFixed(1)}"></span></span>`;
}

function accountChip(meta) {
  return `<span class="chip chip--muted chip--sm">${esc(meta.chip)}</span>`;
}

function upgrades(exp) {
  return upgradesOf(exp).filter((u) => u.queue !== "equipamiento").map((u) => ({ ...u, done: u.end <= state.now }));
}

function nextUpgrade(exp) {
  const list = upgrades(exp).filter((u) => !u.done);
  return list[0] || null;
}

function fmtWhen(ms) { return fmtFin(ms); }

function staleLimit() {
  const n = Number(state.staleDays);
  return (Number.isFinite(n) && n >= 1 ? n : 7) * 86400000;
}

function stale(exp) {
  return !!exp && state.now - exp.timestamp * 1000 > staleLimit();
}

function villageCats() {
  return CATEGORIES.filter((c) => c.key !== "equipamiento");
}

function applyTheme(theme) {
  const t = theme || state.theme || "sistema";
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
}

function savePlanes() {
  localStorage.setItem("cp-planes", JSON.stringify(state.planes));
  espejarUsuario();
}

function saveProvisionals() {
  localStorage.setItem("cp-provisional", JSON.stringify(state.provisionales));
  espejarUsuario();
}

const roadCache = new Map();

function cachedRoad(key, make) {
  if (roadCache.has(key)) return roadCache.get(key);
  const road = make();
  roadCache.set(key, road);
  const minuto = String(Math.floor(state.now / 60000));
  if (roadCache.size > 80) {
    for (const k of [...roadCache.keys()]) {
      if (!String(k).endsWith("\0" + minuto)) roadCache.delete(k);
    }
  }
  return road;
}

function accountRoadmap(meta) {
  const exp = expOf(meta.tag);
  if (!exp || !state.index) return null;
  const raw = state.planes[meta.tag];
  const key = claveRoadmap({
    tag: meta.tag,
    timestamp: exp.timestamp,
    plan: raw || null,
    sueno: state.sleep,
    now: state.now,
  });
  return cachedRoad(key, () => buildRoadmap({
    exp,
    index: state.index,
    tag: meta.tag,
    plan: raw,
    provisionals: state.provisionales,
    sleep: activeSleep(),
    now: state.now,
  }));
}

const CAT_COLOR = {
  defensas: "#5856D6",
  laboratorio: "#AF52DE",
  ejercito_edif: "#30B0C7",
  equipamiento: "#FF2D55",
  mascotas: "#00C7BE",
  heroes: "#32ADE6",
  trampas: "#A2845E",
  recursos: "#FFCC00",
  muros: "#6E7A8A",
};

function setFilter(patch) {
  state.filters = { ...state.filters, ...patch };
  localStorage.setItem("cp-filters", JSON.stringify(state.filters));
}

function accountFilterMeta(meta) {
  const exp = expOf(meta.tag);
  const th = exp ? townHallLevel(exp) : "";
  return { th: th == null ? "" : th, principal: !!meta.principal, grupos: meta.grupos || [] };
}

function fleetRow(meta) {
  const exp = expOf(meta.tag);
  const view = exp ? viewOf(meta.tag) : null;
  if (!exp || !view) return null;
  const ups = upgrades(exp);
  const active = ups.filter((u) => !u.done && !u.extra);
  const cats = {};
  for (const c of CATEGORIES) cats[c.key] = view.cats[c.key] ? view.cats[c.key].pct : null;
  const colas = estadoColas(exp, state.now, { staleMs: staleLimit(), th: view.th });
  const b = colas.builders;
  return {
    tag: meta.tag,
    nombre: meta.nombre,
    chip: meta.chip,
    th: view.th,
    media: view.media,
    colas,
    builders: {
      known: b.known,
      total: b.total,
      occupied: b.ocupadosReales,
      free: b.libresReales,
      over: b.over,
      vencidos: b.vencidos,
      libresEstimados: b.libresEstimados,
      confianza: b.confianza,
    },
    labLibre: colas.laboratorio.libreAccion,
    mascotasLibres: colas.mascotas.libreAccion,
    proxima: active.length ? active[0].end : null,
    mejoras: ups,
    cats,
    principal: !!meta.principal,
    grupos: meta.grupos || [],
  };
}

function fleetRows(list) {
  return (list || allAccounts()).map(fleetRow).filter(Boolean);
}

function latestInRange(tag) {
  const rows = state.rows.filter((r) => r.tag === tag).slice().sort((a, b) => b.timestamp - a.timestamp);
  for (const exp of rows) {
    if (dayInRange(madridDayKey(exp.timestamp * 1000), state.filters, state.now)) return exp;
  }
  return null;
}

function pairsOf(tag) {
  return historyPairs(state.rows.filter((r) => r.tag === tag), state.index);
}

function fmtRes(n) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n || 0);
}

function bagDays(seg) {
  return Math.round(((seg || 0) / 86400) * 10) / 10;
}

function costBits(bag) {
  if (!bag) return "";
  const bits = [];
  if (bag.oro) bits.push(`${fmtRes(bag.oro)} oro`);
  if (bag.elixir) bits.push(`${fmtRes(bag.elixir)} elixir`);
  if (bag.oscuro) bits.push(`${fmtRes(bag.oscuro)} oscuro`);
  if (bag.muros) bits.push(`${fmtRes(bag.muros)} oro o elixir`);
  if (bag.brillante) bits.push(`${fmtRes(bag.brillante)} brillante`);
  if (bag.resplandeciente) bits.push(`${fmtRes(bag.resplandeciente)} resplandeciente`);
  if (bag.estelar) bits.push(`${fmtRes(bag.estelar)} estelar`);
  const times = [];
  const dias = bag.diasConstructor != null ? bag.diasConstructor : bagDays(bag.segConstructor);
  if (dias) times.push(`${fmtNum(dias)} d constructor`);
  const lab = bagDays(bag.segLaboratorio);
  const pets = bagDays(bag.segMascotas);
  if (lab) times.push(`${fmtNum(lab)} d laboratorio`);
  if (pets) times.push(`${fmtNum(pets)} d mascotas`);
  return bits.concat(times).join(" · ");
}

function costOf(exp, th) {
  return remainingCost(piecesOf(exp, state.index, th));
}

function ayuntamientoLine(exp) {
  const th = townHallLevel(exp);
  if (!Number.isInteger(th)) return "";
  const siguiente = costeTh(th + 1);
  if (!siguiente) return "";
  const plan = exp.tag && state.planes ? state.planes[exp.tag] : null;
  const meta = exp.tag ? accountByTag(exp.tag) : null;
  let hasta = th + 1;
  const pedido = plan && Number.isInteger(plan.th) ? plan.th : (meta && Number.isInteger(meta.objetivo) ? meta.objetivo : null);
  if (pedido != null && pedido > th) hasta = Math.min(18, pedido);
  let text = `TH${th} → ${th + 1} · ${fmtRes(siguiente.oro)} oro · ${textoSegundos(siguiente.segundos)}`;
  if (hasta > th + 1) {
    const rango = costeThRango(th, hasta);
    if (rango && rango.oro) text += ` · hasta TH${hasta}: ${fmtRes(rango.oro)} oro · ${textoSegundos(rango.segundos)}`;
  }
  return `<p class="t-body">Ayuntamiento ${esc(text)}</p>`;
}

function resourceAllowsItem(it) {
  const filtro = state.filters.recurso;
  if (!filtro || filtro === "todos") return true;
  const key = it.categoryKey || "";
  if (key === "muros" || String(it.id) === "1000010") return filtro === "oro" || filtro === "elixir";
  if (filtro === "oscuro" || filtro === "otros") {
    if (key === "muros") return false;
  }
  if (it.capsOnly || it.id == null) return false;
  if (it.max != null && (it.lvl || 0) >= it.max) return false;
  return usesResource(String(it.id), (it.lvl || 0) + 1, filtro);
}

function allowedCats(exp, th) {
  const filtro = state.filters.recurso;
  if (!filtro || filtro === "todos") return null;
  const set = categoryUses(piecesOf(exp, state.index, th), filtro) || new Set();
  if (filtro === "oscuro" || filtro === "otros") set.delete("muros");
  return set;
}

function filterChip(attr, value, label, on) {
  return `<button type="button" ${attr}="${esc(value)}" aria-pressed="${on ? "true" : "false"}">${esc(label)}</button>`;
}

function filterBar(opts = {}) {
  const f = state.filters;
  const parts = [];
  if (opts.tiempo !== false) {
    const tiempos = [["7", "7 días"], ["30", "30 días"], ["90", "3 meses"], ["todo", "Todo"], ["rango", "Rango"]];
    parts.push(`<div class="chip-row" role="toolbar" aria-label="Periodo">${tiempos.map(([v, l]) => filterChip("data-tiempo", v, l, f.tiempo === v)).join("")}</div>`);
    if (f.tiempo === "rango") {
      parts.push(`<div class="date-row">
        <label>Desde<input type="date" data-desde value="${esc(f.desde)}" aria-label="Desde"></label>
        <label>Hasta<input type="date" data-hasta value="${esc(f.hasta)}" aria-label="Hasta"></label>
      </div>`);
    }
  }
  if (opts.recurso !== false) {
    const recursos = [["todos", "Todos"], ["oro", "Oro"], ["elixir", "Elixir"], ["oscuro", "Oscuro"], ["otros", "Otros"]];
    parts.push(`<div class="chip-row" role="toolbar" aria-label="Recurso">${recursos.map(([v, l]) => filterChip("data-recurso", v, l, f.recurso === v)).join("")}</div>`);
  }
  if (opts.th) {
    const ths = new Set();
    for (const meta of allAccounts()) {
      const exp = expOf(meta.tag);
      const th = exp ? townHallLevel(exp) : null;
      if (th != null) ths.add(th);
    }
    const list = [...ths].sort((a, b) => a - b);
    if (list.length) {
      const buttons = [filterChip("data-th", "", "Todos", !f.th)].concat(list.map((th) => filterChip("data-th", String(th), `TH${th}`, String(f.th) === String(th))));
      parts.push(`<div class="chip-row" role="toolbar" aria-label="Ayuntamiento">${buttons.join("")}</div>`);
    }
  }
  if (opts.grupo) {
    const grupos = new Set();
    for (const meta of allAccounts()) for (const g of meta.grupos || []) grupos.add(g);
    const buttons = [filterChip("data-grupo", "", "Todas", !f.grupo), filterChip("data-grupo", "principal", "Principal", f.grupo === "principal")]
      .concat([...grupos].sort((a, b) => a.localeCompare(b, "es")).map((g) => filterChip("data-grupo", g, g, f.grupo === g)));
    parts.push(`<div class="chip-row" role="toolbar" aria-label="Grupo">${buttons.join("")}</div>`);
  }
  return parts.join("");
}

function rosterTools(shown) {
  const snap = fleetSnapshot(fleetRows(shown));
  const prox = snap.proxima
    ? `${snap.proxima.nombre} · ${fmtFin(snap.proxima.fin)}`
    : "Ninguna en curso";
  const media = snap.media == null ? "—" : fmtPct(snap.media);
  const info = `Constructores: ${snap.frase}. Laboratorios: ${snap.laboratoriosLibres} libres en la exportación${snap.laboratoriosEstimados ? ` · ${snap.laboratoriosEstimados} estimados` : ""}. Casas de mascotas: ${snap.mascotasLibres} libres en la exportación${snap.mascotasEstimadas ? ` · ${snap.mascotasEstimadas} estimadas` : ""}. Próxima mejora: ${prox}.`;
  return `<div class="section">${sectionHead("Pegar", "Lee el portapapeles, detecta una o varias aldeas por la etiqueta y las añade o actualiza.")}<button type="button" class="btn btn--primary btn--block" data-paste-now>Pegar exportación</button></div>
    ${filterBar({ tiempo: false, recurso: false, th: true, grupo: true })}
    <div class="section"><div class="card fleet-card">
      <div class="section-head"><h2 class="t-headline">Todas las cuentas</h2>${infoBtn(info)}</div>
      <p class="t-title2 num">${media}</p>
    </div></div>`;
}

function queueOfCategory(key) {
  if (key === "laboratorio") return "laboratorio";
  if (key === "mascotas") return "mascotas";
  if (key === "equipamiento") return "herreria";
  return "constructor";
}

function planCandidates(exp, view) {
  const busy = new Set(upgrades(exp).filter((u) => !u.done).map((u) => String(u.id)));
  const out = [];
  for (const cat of CATEGORIES) {
    if (cat.key === "muros") {
      const w = view.walls;
      if (!w || w.max == null) continue;
      const present = (w.hist || []).filter((h) => h.cnt && h.lvl < w.max).slice().sort((a, b) => a.lvl - b.lvl);
      if (!present.length) continue;
      out.push({
        categoryKey: "muros",
        queue: "constructor",
        title: "Muro",
        lvl: present[0].lvl,
        max: w.max,
        upgrading: false,
        id: "1000010",
      });
      continue;
    }
    for (const it of categoryItems(exp, state.index, cat.key, view.th)) {
      if (it.capsOnly || it.id == null || it.max == null || (it.lvl || 0) >= it.max) continue;
      const title = nameOf(it.id) || "Ítem";
      out.push({
        categoryKey: cat.key,
        queue: queueOfCategory(cat.key),
        title: it.cnt > 1 ? `${title} ×${it.cnt}` : title,
        lvl: it.lvl || 0,
        max: it.max,
        upgrading: busy.has(String(it.id)),
        id: String(it.id),
      });
    }
  }
  return out;
}

function planList(title, items) {
  const list = (Array.isArray(items) ? items : items ? [items] : []).filter(Boolean);
  if (!list.length) return "";
  return `<div class="section"><div class="section-header"><span>${esc(title)}</span></div><ul class="list">${list.map((item) => {
    const wait = item.espera ? " · en espera de un constructor" : "";
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(item.title)}</span><span class="row__sub num">Nv ${item.lvl} / ${item.max}${esc(wait)}</span></span></div></li>`;
  }).join("")}</ul></div>`;
}

function costCard(exp, th, full) {
  const cost = costOf(exp, th);
  const bag = cost.total;
  const line = costBits(bag) || "Nada pendiente con coste conocido";
  const miss = bag.sinCoste ? `<p class="t-footnote c-2">${bag.sinCoste === 1 ? "1 paso" : `${bag.sinCoste} pasos`} sin coste en la fuente: no se ha sumado.</p>` : "";
  const cite = `<p class="t-footnote c-2">Hasta el máximo de TH${th}, sin subir el ayuntamiento. Fuente: <a href="${esc(COST_URL)}" target="_blank" rel="noopener noreferrer">${esc(COST_SOURCE)}</a>. Los muros de «oro o elixir» se pagan con uno de los dos. <a href="${esc(TH_URL)}" target="_blank" rel="noopener noreferrer" title="${esc(TH_FUENTE)}">Ayuntamiento</a>.</p>`;
  const hall = ayuntamientoLine(exp);
  if (!full) {
    return `<div class="section"><div class="card">
      <h2 class="t-headline">Hasta el máximo</h2>
      <p class="t-body">${esc(line)}</p>
      ${hall}
      ${miss}${cite}
    </div></div>`;
  }
  const rows = villageCats().map((c) => {
    const part = cost.porCategoria[c.key];
    const text = costBits(part);
    if (!text) return "";
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(c.label)}</span><span class="row__sub">${esc(text)}</span></span></div></li>`;
  }).join("");
  return `<div class="section"><div class="card">
      <h2 class="t-headline">Hasta el máximo de TH${th}</h2>
      <p class="t-body">${esc(line)}</p>
      ${hall}
      ${miss}${cite}
    </div></div>
    ${rows ? `<div class="section"><ul class="list">${rows}</ul></div>` : ""}`;
}

function etiquetaPaso(paso) {
  if (!paso) return "recomendado";
  if (paso.provisional || paso.origen === "provisional") return "provisional";
  if (paso.origen === "planificado") return "planificado";
  return "recomendado";
}

function pasoAhora(paso) {
  const nv = `Nv ${paso.fromLvl} → ${paso.toLvl}`;
  const hueco = paso.clase === "estimado" ? "estimado" : paso.clase === "ajuste" ? "ajuste" : "en la exportación";
  let when = "";
  if (paso.sinDuracion) when = " · sin tiempo en la fuente";
  else if (paso.sinHora || paso.fin == null) when = " · sin hora exacta";
  else when = ` · acaba ${fmtFin(paso.fin)}`;
  return `${paso.titulo} ${hueco} · ${paso.title} ${nv} · ${etiquetaPaso(paso)}${when}`;
}

function prioridadDe(meta) {
  const road = accountRoadmap(meta);
  const exp = expOf(meta.tag);
  const colas = exp ? estadoColas(exp, state.now, { staleMs: staleLimit() }) : null;
  const vacio = { meta, road, when: null, exact: false, lane: null, step: null, tier: 3, sortWhen: Infinity, libreYa: false, desactualizada: !!(colas && colas.desactualizada), clase: "real" };
  if (!road) return vacio;
  let best = null;
  for (const lane of road.lanes || []) {
    if (lane.cola !== "constructor" && lane.cola !== "laboratorio" && lane.cola !== "mascotas") continue;
    const step = (road.orden || []).find((s) => s.laneId === lane.id);
    if (!step) continue;
    const sinHora = !!lane.blocked || !!step.sinHora;
    const when = lane.libreYa ? road.now : (sinHora ? null : lane.freeAt);
    let tier = when == null ? 1 : 0;
    if (colas && colas.desactualizada && lane.libreYa) tier = 2;
    const cand = { meta, road, when, exact: when != null, lane, step, tier, sortWhen: when == null ? Infinity : when, libreYa: !!lane.libreYa, desactualizada: !!(colas && colas.desactualizada), clase: lane.clase || "real" };
    if (!best || cand.tier < best.tier || (cand.tier === best.tier && cand.sortWhen < best.sortWhen)) best = cand;
  }
  return best || vacio;
}

function comparePrioridad(a, b) {
  return compareOrden(
    { tier: a.tier, sortWhen: a.sortWhen, principal: !!a.meta.principal, nombre: a.meta.nombre },
    { tier: b.tier, sortWhen: b.sortWhen, principal: !!b.meta.principal, nombre: b.meta.nombre },
  );
}

function textoCola(item) {
  const lane = item.lane;
  const step = item.step;
  if (item.desactualizada) return "Necesita actualización. Se conserva el último plan.";
  let cuando = `${lane.titulo} sin hora exacta`;
  if (item.clase === "estimado" && item.libreYa) cuando = `${lane.titulo} estimado`;
  else if (item.clase === "ajuste" && item.libreYa) cuando = `${lane.titulo} (ajuste de la cuenta)`;
  else if (item.libreYa) cuando = `${lane.titulo} en la exportación`;
  else if (item.exact && item.when != null) cuando = `${lane.titulo} libre ${fmtFin(item.when)}`;
  let paso = `${step.title} Nv ${step.fromLvl} → ${step.toLvl} · ${etiquetaPaso(step)}`;
  if (step.sinHora || step.sinDuracion || step.fin == null) paso += " · sin hora de fin";
  else paso += ` · acaba ${fmtFin(step.fin)}`;
  return `${cuando} · ${paso}`;
}

function roadmapHacia(meta, objetivo) {
  const exp = expOf(meta.tag);
  if (!exp || !state.index || objetivo == null) return null;
  const stored = state.planes[meta.tag];
  const cur = stored ? effectivePlan(stored) : null;
  const guardado = !!(cur && cur.th != null && cur.th >= objetivo);
  const plan = guardado ? cur : { ...defaultPlan(), th: objetivo };
  const key = claveRoadmap({
    tag: meta.tag + "\0" + objetivo,
    timestamp: exp.timestamp,
    plan,
    sueno: state.sleep,
    now: state.now,
  });
  return cachedRoad(key, () => buildRoadmap({
    exp,
    index: state.index,
    tag: meta.tag,
    plan,
    provisionals: state.provisionales,
    sleep: activeSleep(),
    now: state.now,
  }));
}

function objetivosFlota(list) {
  const groups = new Map();
  for (const meta of list) {
    if (meta.objetivo == null) continue;
    if (!groups.has(meta.objetivo)) groups.set(meta.objetivo, []);
    groups.get(meta.objetivo).push(meta);
  }
  const cards = [];
  for (const [obj, cuentas] of [...groups.entries()].sort((a, b) => b[0] - a[0])) {
    let ya = 0;
    const thCount = new Map();
    const fins = [];
    let sinFecha = 0;
    let pendientes = 0;
    let estimado = false;
    for (const meta of cuentas) {
      const exp = expOf(meta.tag);
      const th = exp ? viewOf(meta.tag).th : null;
      if (th == null) continue;
      if (th >= obj) {
        ya += 1;
        continue;
      }
      pendientes += 1;
      thCount.set(th, (thCount.get(th) || 0) + 1);
      const stored = state.planes[meta.tag];
      const cur = stored ? effectivePlan(stored) : null;
      if (!(cur && cur.th != null && cur.th >= obj)) estimado = true;
      const road = roadmapHacia(meta, obj);
      if (road && road.fin) fins.push(road.fin);
      else sinFecha += 1;
    }
    const froms = [...thCount.keys()].sort((a, b) => b - a);
    let titulo = `Hacia TH${obj}`;
    if (pendientes && froms.length === 1) {
      const n = thCount.get(froms[0]);
      titulo = n > 1 ? `Todas las TH${froms[0]} a TH${obj}` : `TH${froms[0]} a TH${obj}`;
    } else if (pendientes && froms.length > 1) {
      titulo = `${froms.map((th) => `TH${th}`).join(" y ")} a TH${obj}`;
    }
    const comp = [...thCount.entries()].sort((a, b) => b[0] - a[0]).map(([th, n]) => (n === 1 ? `1 en TH${th}` : `${n} en TH${th}`)).join(" · ");
    const cap = obj > 1 ? obj - 1 : obj;
    let fecha = "Sin fecha: el plan no tiene una hora exacta.";
    if (!pendientes) fecha = "Objetivo cumplido.";
    else if (fins.length) {
      fecha = `Fin estimado ${fechaFlota(Math.max(...fins))}. Es el plan hasta el máximo de TH${cap}, no el día de subir el ayuntamiento.`;
      if (sinFecha) fecha += " Falta la hora en alguna cuenta, así que la fecha no está completa.";
      if (estimado) fecha += " Donde no hay un plan guardado con este TH, el criterio es Maxear.";
    }
    const pct = cuentas.length ? (ya / cuentas.length) * 100 : 0;
    cards.push({ titulo, ya, total: cuentas.length, pct, comp, fecha });
  }
  return cards;
}

function fechaFlota(ms) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

function analisisNav(activo) {
  const a = (id, href, label) => `<a href="${href}" role="tab" aria-selected="${activo === id}">${label}</a>`;
  return `<div class="seg-wrap"><nav class="seg seg--nav" role="tablist" aria-label="Análisis">${a("ranking", "#/ranking", "Ranking")}${a("graficos", "#/graficos", "Gráficos")}</nav></div>`;
}

function renderInicio() {
  const list = allAccounts();
  const withData = list.filter((m) => expOf(m.tag));
  const rows = fleetRows(list);
  const snap = fleetSnapshot(rows);
  const nCuentas = list.length;
  const cabecera = `Centro de mando · ${nCuentas === 1 ? "1 cuenta" : `${nCuentas} cuentas`}`;
  const hayDatos = withData.length > 0;
  const thOf = (m) => (expOf(m.tag) ? viewOf(m.tag).th : null);
  const enObjetivo = list.filter((m) => m.objetivo != null && thOf(m) != null && thOf(m) >= m.objetivo).length;
  const conObj = list.filter((m) => m.objetivo != null).length;
  const hoyKey = madridDayKey(state.now);
  const terminanHoy = rows.reduce((n, r) => n + (r.mejoras || []).filter((u) => !u.done && !u.extra && u.end > state.now && madridDayKey(u.end) === hoyKey).length, 0);
  const tiles = `<div class="section"><div class="stat-tiles">
      <div><b class="num">${nCuentas ? nCuentas : "—"}</b><span>Cuentas</span></div>
      <div><b class="num">${hayDatos ? snap.constructoresLibres : "—"}</b><span>Constructores libres</span></div>
      <div><b class="num">${hayDatos ? terminanHoy : "—"}</b><span>Terminan hoy</span></div>
    </div></div>`;
  const pend = list.filter((m) => m.objetivo != null && thOf(m) != null && thOf(m) < m.objetivo);
  const objMas = [...pend.reduce((acc, m) => acc.set(m.objetivo, (acc.get(m.objetivo) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1])[0];
  const ordenadas = list.map(prioridadDe).sort(comparePrioridad);
  const deHoy = ordenadas.filter((p) => p.tier === 0 && p.when != null && madridDayKey(p.when) === hoyKey);
  const accion = (href, icon, cls, title, sub) => `<li><a class="row row--tile row--accion" href="${href}"><span class="accion__ico ${cls}" aria-hidden="true">${icon}</span><span class="row__main"><span class="row__title">${esc(title)}</span><span class="row__sub">${esc(sub)}</span></span>${CHEV}</a></li>`;
  const acciones = [
    accion("#/ahora", ICON.choza, "is-go", "Revisar constructores disponibles", hayDatos ? snap.frase : "—"),
    objMas
      ? accion("#/roster", ICON.objetivo, "is-gold", `Preparar objetivos de TH${objMas[0]}`, `${objMas[1]} ${objMas[1] === 1 ? "cuenta" : "cuentas"} por debajo de TH${objMas[0]}`)
      : accion("#/roster", ICON.objetivo, "is-gold", "Preparar objetivos de TH", conObj ? `${enObjetivo} de ${conObj} en su objetivo` : "—"),
  ].join("");
  const proximas = [];
  for (const row of rows) {
    for (const u of row.mejoras || []) {
      if (u.extra || u.done || !(u.end > state.now)) continue;
      proximas.push({ nombre: row.nombre, tag: row.tag, end: u.end, title: nameOf(u.id) || "Mejora" });
    }
  }
  proximas.sort((a, b) => a.end - b.end || String(a.nombre).localeCompare(String(b.nombre), "es"));
  const tres = proximas.slice(0, 3);
  const proxBlock = tres.length
    ? `<ul class="list list--tiles">${tres.map((u) => `<li><a class="row row--tile" href="#/progreso/${u.tag.slice(1)}"><span class="row__main"><span class="row__title">${esc(u.title)}</span><span class="row__sub">${esc(u.nombre)} · ${esc(fmtFin(u.end))}</span></span>${CHEV}</a></li>`).join("")}</ul>`
    : `<div class="card empty"><p class="t-title3">—</p></div>`;
  const sinHora = ordenadas.filter((p) => p.tier === 1);
  const hoyRows = deHoy.map((p, i) => `<li><a class="row row--tile" href="#/progreso/${p.meta.tag.slice(1)}/plan"><span class="orden-n num" aria-hidden="true">${i + 1}</span><span class="row__main"><span class="row__title"><span class="sr-only">${i + 1}. </span>${esc(p.meta.nombre)}</span><span class="row__sub">${esc(textoCola(p))}</span></span>${CHEV}</a></li>`).join("");
  const hoyBlock = deHoy.length
    ? `<ul class="list list--tiles orden-list">${hoyRows}</ul>`
    : `<div class="card empty"><p class="t-title3">—</p></div>`;
  const abrirInfo = [
    "Orden según el plan de cada cuenta y la cola que queda libre antes. Si el temporizador no es un número, no se inventa la hora.",
    sinHora.length === 1 ? "1 cuenta tiene una cola del plan sin hora exacta. No entra en este orden." : sinHora.length ? `${sinHora.length} cuentas tienen una cola del plan sin hora exacta. No entra en este orden.` : "",
  ].filter(Boolean).join(" ");
  const flota = objetivosFlota(list).map((g) => `<li><div class="row row--tile"><span class="row__main"><span class="row__title">${esc(g.titulo)}</span><span class="row__sub">${g.ya} de ${g.total} ya${g.comp ? ` · ${esc(g.comp)}` : ""}</span>${meterHtml(g.pct, `${g.ya} de ${g.total}`)}<span class="row__sub">${esc(g.fecha)}</span></span></div></li>`).join("");
  const fila = (p) => {
    const m = p.meta;
    const v = expOf(m.tag) ? viewOf(m.tag) : null;
    const sub = p.lane ? textoCola(p) : (v ? "Sin paso pendiente en el plan" : "Sin importar");
    return `<li><a class="row row--tile row--inicio" href="#/progreso/${m.tag.slice(1)}" aria-label="${esc(m.nombre)}, TH${v ? v.th : "—"}${m.objetivo != null ? `, objetivo TH${m.objetivo}` : ""}${v ? `, media ${fmtPct(v.media)}` : ""}">
      <span class="th-tile">${v ? thumb(1000001, { size: 44, th: v.th }) : `<span class="thumb thumb--44 thumb--empty" aria-hidden="true">TH</span>`}<span class="th-tile__n num">TH${v ? v.th : "—"}</span></span>
      <span class="row__main"><span class="row__title">${esc(m.nombre)}</span>
        <span class="row__sub">${!v ? `<span class="chip chip--muted">Sin importar</span>` : m.objetivo == null ? `<span class="chip">TH${v.th}</span>` : goalChip(v.th, m.objetivo)}</span>
        <span class="row__sub">${esc(sub)}</span>
        ${v ? meterHtml(v.media, `Media ${fmtPct(v.media)}`) : ""}</span>${CHEV}</a></li>`;
  };
  const siguiente = ordenadas[0];
  return `<h1 class="large-title">Inicio</h1>
    <p class="large-sub">${esc(cabecera)}</p>
    <div class="section">${sectionHead("Actualizar", "Copia cada aldea en el juego y pégala al volver. Sin la app Atajos.")}${botonActualizar()}</div>
    ${tiles}
    ${htmlMotor()}
    <div class="section">${sectionHead("Qué hacer ahora")}<ul class="list list--tiles">${acciones}</ul></div>
    <div class="section">${sectionHead("Próximas finalizaciones")}${proxBlock}</div>
    <div class="section">${sectionHead("Abrir hoy", abrirInfo)}${hoyBlock}</div>
    <div class="section">${sectionHead("Objetivos de flota", "Cuentas que comparten objetivo. La fecha es el fin del plan hasta el máximo del ayuntamiento anterior.")}<ul class="list list--tiles">${flota || `<li><div class="card empty"><p class="t-title3">Sin objetivos</p></div></li>`}</ul></div>
    <div class="section">${sectionHead("Siguiente", "La primera del orden. La lista completa está en Cuentas.")}${siguiente ? `<ul class="list list--tiles">${fila(siguiente)}</ul>` : ""}<p class="section-footer"><a href="#/roster">Todas las cuentas</a></p></div>`;
}

function renderAhora() {
  const accounts = allAccounts().filter((meta) => accountVisible(accountFilterMeta(meta), state.filters));
  const items = [];
  for (const meta of accounts) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    const road = accountRoadmap(meta);
    if (!road) continue;
    const colas = estadoColas(exp, state.now, { staleMs: staleLimit(), th: townHallLevel(exp) });
    if (colas.desactualizada) {
      items.push({ meta, road, pasos: [], terminadas: [], desactualizada: true });
      continue;
    }
    const pasos = ahoraDe(road);
    const terminadas = upgrades(exp).filter((u) => u.done && !u.extra);
    if (!pasos.length && !terminadas.length) continue;
    items.push({ meta, road, pasos, terminadas, desactualizada: false });
  }
  const list = items.length
    ? `<ul class="list list--tiles">${items.map((row) => {
      const lines = row.desactualizada
        ? ["Necesita actualización. Se conserva el último plan."]
        : row.pasos.map((p) => pasoAhora(p));
      if (!row.desactualizada && row.terminadas.length) {
        lines.push(row.terminadas.length === 1 ? "1 mejora de la exportación ya ha terminado" : `${row.terminadas.length} mejoras de la exportación ya han terminado`);
      }
      const label = planLabel(row.road.plan, row.road.currentTh);
      const th = row.road.currentTh;
      const media = viewOf(row.meta.tag).media;
      return `<li><a class="row row--tile" href="#/progreso/${row.meta.tag.slice(1)}/plan">${th == null ? "" : thumb(1000001, { size: 44, th }) }<span class="row__main"><span class="row__title">${esc(row.meta.nombre)}</span><span class="row__sub">${esc(label)} · TH${th == null ? "—" : th}</span><span class="row__sub">${esc(lines.join(" · "))}</span>${meterHtml(media, `Media ${fmtPct(media)}`)}</span>${CHEV}</a></li>`;
    }).join("")}</ul>`
    : `<div class="card empty"><p class="t-title3">—</p></div>`;
  const on = state.notifyOn;
  return `<h1 class="large-title">Ahora</h1>
    <div class="title-line"><p class="large-sub">Siguiente paso</p>${infoBtn("El siguiente paso del plan de cada cuenta, cuando una cola está libre. Sin plan guardado, el criterio es Maxear TH actual.")}</div>
    ${filterBar({ tiempo: false, recurso: false, th: true, grupo: true })}
    <div class="section">${list}</div>
    <div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">Aviso al terminar</h2>${infoBtn("Si la app está abierta, puede avisar cuando llegue el fin real de una mejora de la exportación. Las marcas provisionales del plan no avisan. Con la app cerrada no hay aviso: Web Push en el iPhone necesita un servidor que envíe el mensaje, y esta app no tiene servidor. En Agenda se puede guardar un calendario con esos fines. No se guarda solo.")}</div>
      <button type="button" class="btn ${on ? "btn--secondary" : "btn--primary"} btn--block" data-notify aria-pressed="${on ? "true" : "false"}">${on ? "Avisos activados" : "Activar avisos"}</button>
    </div></div>`;
}

function renderRanking() {
  const rows = fleetRows(allAccounts().filter((meta) => accountVisible(accountFilterMeta(meta), state.filters)));
  const ranked = rankAccounts(rows, state.rankKey);
  const keys = [["media", "Media"], ["th", "TH"], ["libres", "Libres"]];
  const chips = keys.map(([id, label]) => filterChip("data-rank", id, label, state.rankKey === id)).join("");
  const list = ranked.map((row) => {
    const on = state.compareTags.includes(row.tag);
    const libres = row.builders && row.builders.free != null
      ? `${row.builders.free} libres${row.builders.vencidos ? ` · ${row.builders.vencidos} estimados` : ""}`
      : "constructores ?";
    return `<li><div class="row row--tile"><span class="hex hex--sm${row.puesto <= 3 ? " hex--gold" : ""}" aria-hidden="true"><b>${row.puesto}</b></span>${row.th == null ? "" : thumb(1000001, { size: 44, th: row.th })}<span class="row__main"><span class="row__title"><span class="sr-only">${row.puesto}. </span>${esc(row.nombre)}</span><span class="row__sub">TH${row.th == null ? "—" : row.th} · ${esc(libres)}</span>${meterHtml(row.media, `Media ${fmtPct(row.media)}`)}</span><button type="button" class="btn-text" data-compare="${esc(row.tag)}" aria-pressed="${on ? "true" : "false"}">${on ? "Quitar" : "Comparar"}</button></div></li>`;
  }).join("");
  const picked = compareAccounts(rows, state.compareTags);
  const cols = picked.map((row) => {
    const cats = villageCats().filter((c) => row.cats[c.key] != null).map((c) => `<div class="bar-row"><span>${esc(c.label)}</span>${barHtml(c.key, row.cats[c.key], null, { mini: true, label: `${c.label} ${fmtPct(row.cats[c.key])}` })}<span class="num">${fmtPct(row.cats[c.key])}</span></div>`).join("");
    return `<div class="card compare-col"><h3 class="t-headline">${esc(row.nombre)}</h3><p class="t-title2 num">${fmtPct(row.media)}</p><p class="t-footnote c-2">TH${row.th == null ? "—" : row.th}</p><div class="chart-bars">${cats}</div></div>`;
  }).join("");
  const compare = picked.length >= 2
    ? `<div class="section">${sectionHead("Comparación", "Cada barra es el % de esa categoría. No suma recursos.")}<div class="compare-grid">${cols}</div></div>`
    : `<p class="section-footer">Elige de 2 a 3 cuentas.</p>`;
  return `<h1 class="large-title">Ranking</h1>${analisisNav("ranking")}
    <p class="large-sub">${ranked.length === 1 ? "1 cuenta" : `${ranked.length} cuentas`}</p>
    ${filterBar({ tiempo: false, recurso: false, th: true, grupo: true })}
    <div class="chip-row" role="toolbar" aria-label="Orden del ranking">${chips}</div>
    <div class="section"><ul class="list list--tiles">${list || `<li><div class="card empty"><p class="t-title3">Sin cuentas en este filtro</p></div></li>`}</ul></div>
    ${compare}`;
}

function setAccountPlan(tag, patch) {
  const cur = state.planes[tag] ? normalizePlanStored(state.planes[tag]) : defaultPlan();
  state.planes = { ...state.planes, [tag]: { ...cur, ...patch } };
  roadCache.clear();
  savePlanes();
}

function normalizePlanStored(raw) {
  const plan = effectivePlan(raw);
  return plan;
}

function planControls(meta, road) {
  const plan = road.plan;
  const maxTh = maxTownHall(state.index);
  const current = road.currentTh || 1;
  const thOpts = [`<option value=""${!plan.th || plan.th === current ? " selected" : ""}>TH actual (${current})</option>`];
  for (let th = current + 1; th <= maxTh; th += 1) {
    thOpts.push(`<option value="${th}"${plan.th === th ? " selected" : ""}>TH${th}</option>`);
  }
  const flag = (id, label) => `<button type="button" data-plan-flag="${id}" aria-pressed="${plan[id] ? "true" : "false"}">${label}</button>`;
  const cats = [`<option value="">Todas</option>`].concat(villageCats().map((c) => `<option value="${c.key}"${plan.categoria === c.key ? " selected" : ""}>${esc(c.label)}</option>`));
  const rec = ["todos", "oro", "elixir", "oscuro"].map((id) => `<option value="${id}"${plan.recurso === id ? " selected" : ""}>${id === "todos" ? "Cualquier recurso" : id}</option>`);
  const durs = DURATIONS.map((d) => `<option value="${d.id}"${plan.duracion === d.id ? " selected" : ""}>${esc(d.label)}</option>`);
  const modo = (id, label) => `<button type="button" role="tab" data-plan-modo="${id}" aria-selected="${plan.modo === id}">${label}</button>`;
  const rushId = plan.rush === "estrategico" ? "estrategico" : "esencial";
  const rushBtn = (id, label) => `<button type="button" role="tab" data-rush="${id}" aria-selected="${rushId === id}" aria-pressed="${rushId === id}">${label}</button>`;
  const rushTabs = plan.modo === "rushear"
    ? `<div class="seg-wrap"><div class="seg" role="tablist" aria-label="Modo de rushear">${rushBtn("esencial", "Rush esencial")}${rushBtn("estrategico", "Rush estratégico")}</div></div>`
    : "";
  return `<div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">${esc(planLabel(plan, current))}</h2>${infoBtn(road.configured ? "Planificado: el plan guardado en esta cuenta." : "Recomendado: no hay plan guardado, se usa Maxear TH actual.")}</div>
      <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Objetivo">${modo("maxear", "Maxear")}${modo("rushear", "Rushear")}</div></div>
      <label class="sort-label">TH objetivo
        <select data-plan-th="${esc(meta.tag)}" aria-label="TH objetivo">${thOpts.join("")}</select>
      </label>
      ${rushTabs}
      <div class="chip-row" role="toolbar" aria-label="Filtros del plan">${flag("ataque", "Ataque")}${flag("defensa", "Defensa")}${flag("muros", "Muros")}${flag("heroes", "Héroes")}</div>
      <label class="sort-label">Categoría
        <select data-plan-cat="${esc(meta.tag)}" aria-label="Categoría del plan">${cats.join("")}</select>
      </label>
      <label class="sort-label">Recurso
        <select data-plan-recurso="${esc(meta.tag)}" aria-label="Recurso del plan">${rec.join("")}</select>
      </label>
      <label class="sort-label">Duración
        <select data-plan-dur="${esc(meta.tag)}" aria-label="Duración del plan">${durs.join("")}</select>
      </label>
      ${constructorControl(meta, expOf(meta.tag))}
    </div></div>`;
}

function constructorControl(meta, exp) {
  const ajuste = state.planes[meta.tag] ? effectivePlan(state.planes[meta.tag]).constructores : null;
  const info = constructoresParaPlan(exp, ajuste);
  if (info.origen === "json") {
    const bob = info.bob ? " y B.O.B" : "";
    return `<p class="t-footnote c-2">Constructores del plan: ${info.total} en la exportación (${info.chozas} ${info.chozas === 1 ? "choza" : "chozas"}${bob}). Rushear los usa a la vez.</p>`;
  }
  const btn = (n) => `<button type="button" role="tab" data-ctor="${n}" data-ctor-tag="${esc(meta.tag)}" aria-selected="${ajuste === n}" aria-pressed="${ajuste === n}">${n}</button>`;
  return `<p class="t-body">Constructores del plan</p>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Constructores si la exportación no los trae">${btn(4)}${btn(5)}${btn(6)}</div></div>
    <p class="t-footnote c-2">${ajuste ? `${ajuste} constructores, ajuste de la cuenta. ` : ""}La exportación no trae el número. Rushear reparte el tiempo entre 4, 5 o 6, no lo suma en serie.</p>`;
}

function textoCosteReq(coste) {
  if (!coste) return "Sin coste: el nivel no viene en la exportación";
  if (coste.sinCoste && !coste.oro && !coste.elixir && !coste.oscuro && !coste.muros && !coste.segundos) return "Sin coste en la fuente";
  const bits = [];
  if (coste.oro) bits.push(`${fmtRes(coste.oro)} oro`);
  if (coste.elixir) bits.push(`${fmtRes(coste.elixir)} elixir`);
  if (coste.oscuro) bits.push(`${fmtRes(coste.oscuro)} oscuro`);
  if (coste.muros) bits.push(`${fmtRes(coste.muros)} oro o elixir`);
  if (coste.segundos) bits.push(textoSegundos(coste.segundos));
  if (coste.sinCoste) bits.push("falta algún coste en la fuente");
  return bits.join(" · ") || "Ya está";
}

function textoSegundos(seg) {
  const s = Math.round(seg);
  if (s <= 0) return "sin espera";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d && h) return `${d} d ${h} h`;
  if (d) return d === 1 ? "1 día" : `${d} días`;
  if (h && m) return `${h} h ${m} min`;
  if (h) return h === 1 ? "1 h" : `${h} h`;
  if (m) return m === 1 ? "1 min" : `${m} min`;
  return `${s} s`;
}

function rushCifras(road) {
  const rush = road.rush;
  const n = road.constructores && road.constructores.total;
  const coste = costBits(rush.coste);
  const costeTxt = coste ? `Coste total: ${coste}` : "Coste total: nada pendiente";
  const enCurso = (rush.filas || []).some((f) => !f.hecho && f.enCurso);
  let tiempo;
  let fecha;
  if (road.targetTh <= road.currentTh) {
    tiempo = "Tiempo: elige un ayuntamiento superior";
    fecha = "Fecha estimada: elige un ayuntamiento superior";
  } else if (n == null) {
    tiempo = "Tiempo: elige 4, 5 o 6 constructores para estimarlo";
    fecha = "Fecha estimada: faltan los constructores de la cuenta";
  } else if (rush.calendarioSeg != null) {
    tiempo = `Tiempo con ${n} constructores: ${textoSegundos(rush.calendarioSeg)}`;
    fecha = rush.fin ? `Fecha estimada: ${fmtFin(rush.fin)}` : "Fecha estimada: sin hora exacta";
  } else if (enCurso) {
    tiempo = `Tiempo con ${n} constructores: lo que falta ya está en curso`;
    fecha = "Fecha estimada: lo que falta ya está en curso";
  } else {
    tiempo = `Tiempo con ${n} constructores: nada pendiente`;
    fecha = "Fecha estimada: nada pendiente";
  }
  return { costeTxt, tiempo, fecha };
}

function sugerenciasHtml(road) {
  if (!road.rush || road.rush.modo !== "estrategico" || !road.rush.sugerencias.length) return "";
  const lis = road.rush.sugerencias.map((sug) => {
    const btn = sug.aplica
      ? `<button type="button" class="btn-text" data-sugerencia="${esc(sug.id)}" aria-pressed="${sug.activa ? "true" : "false"}" aria-label="${sug.activa ? "Quitar" : "Incluir"} ${esc(sug.title)}">${sug.activa ? "Quitar" : "Incluir"}</button>`
      : `<button type="button" class="btn-text" disabled aria-pressed="false">No aplica</button>`;
    const sub = sug.aplica ? sug.razon : `${sug.razon} ${sug.motivo}`.trim();
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(sug.title)} <span class="chip">Sugerencia</span></span><span class="row__sub">${esc(sub)}</span></span>${btn}</div></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Sugerencias</span></div><ul class="list">${lis}</ul><p class="section-footer">Lista editable. Quitar una sugerencia deja el requisito del juego, si lo había.</p></div>`;
}

function filasRushHtml(filas) {
  return (filas || []).map((fila) => {
    const nivel = fila.sinDato
      ? "sin nivel en la exportación"
      : (fila.actual < fila.requerido ? `Nv ${fila.actual} → ${fila.requerido}` : `Nv ${fila.actual} · pedido ${fila.requerido}`);
    const cuenta = fila.cantidad > 1 ? ` · ${fila.tienen}/${fila.cantidad}` : "";
    const estado = fila.hecho ? "Ya está" : fila.enCurso ? "En curso" : "Falta";
    const aviso = fila.clase === "sugerencia" ? "Sugerencia" : (fila.provisional === false ? "" : "provisional");
    const chip = fila.clase === "sugerencia" && !fila.hecho ? "Sugerencia" : estado;
    let extra = "";
    if (fila.sinDato) extra = " · Sin coste: el nivel no viene en la exportación";
    else if (!fila.hecho && fila.coste && (fila.coste.oro || fila.coste.elixir || fila.coste.oscuro || fila.coste.muros || fila.coste.segundos || fila.coste.sinCoste)) {
      extra = ` · ${textoCosteReq(fila.coste)}`;
    }
    const cola = aviso ? ` · ${aviso}` : "";
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(fila.title)} <span class="num">${esc(nivel)}${cuenta}</span></span><span class="row__sub">${estado}${esc(extra)}${cola}</span></span><span class="chip${fila.hecho ? "" : " chip--warn"}">${chip}</span></div></li>`;
  }).join("");
}

function rushPanel(road) {
  if (!road.rush) return "";
  const cifras = rushCifras(road);
  const titulo = road.rush.modo === "estrategico" ? "Rush estratégico" : "Rush esencial";
  const pendientes = (road.rush.filas || []).filter((f) => !f.hecho).length;
  const lista = road.targetTh <= road.currentTh
    ? `<p class="section-footer">Elige un ayuntamiento superior. Este modo no añade mejoras al TH actual.</p>`
    : `<div class="section"><div class="section-header"><span>Estructuras</span></div><ul class="list">${filasRushHtml(road.rush.filas)}</ul><p class="section-footer">${pendientes ? `${pendientes} pendientes` : "Todo lo pedido ya está"} · ${road.rush.filas.length} en la lista</p></div>`;
  return `<div class="section" data-rush-resumen><div class="card">
      <h2 class="t-headline">${titulo}</h2>
      <p class="t-body">${esc(cifras.costeTxt)}</p>
      <p class="t-body">${esc(cifras.tiempo)}</p>
      <p class="t-body">${esc(cifras.fecha)}</p>
      <p class="t-footnote c-2">${esc(road.rush.nota)}</p>
      ${road.rush.calendarioSeg != null && road.rush.trabajoSeg > road.rush.calendarioSeg ? `<p class="t-footnote c-2">El tiempo es el calendario, con esos constructores a la vez. Los días de constructor del coste son la suma del trabajo.</p>` : ""}
    </div></div>
    ${sugerenciasHtml(road)}
    ${lista}`;
}

function roadmapList(road) {
  const view = timelineRows(road.orden, 40);
  if (!view.pasos && !road.sinTiempo.length) {
    return `<div class="section"><div class="card empty"><p class="t-title3">Nada pendiente con este criterio</p></div></div>`;
  }
  const rows = view.rows.map((row) => {
    const times = row.cnt > 1 ? ` × ${row.cnt}` : "";
    let when = "Sin siguiente fecha";
    if (row.sinDuracion) when = "Sin tiempo en la fuente";
    else if (row.sinHora || row.fin == null) when = "Sin hora exacta: el temporizador en curso no es un número";
    else when = `Empieza ${fmtFin(row.inicio)} · acaba ${fmtFin(row.fin)}`;
    const mark = row.rushClase === "sugerencia" ? " · Sugerencia" : (row.provisional ? " · provisional" : "");
    const pressed = row.provisional ? "true" : "false";
    const keys = encodeURIComponent(JSON.stringify(row.keys));
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(row.title)} <span class="num">Nv ${row.fromLvl} → ${row.toLvl}${times}</span></span><span class="row__sub">${esc(when)}${esc(mark)}</span></span><button type="button" class="btn-text" data-prov="${keys}" data-prov-tag="${esc(road.tag)}" aria-pressed="${pressed}">${row.provisional ? "Quitar" : "Marcar"}</button></div></li>`;
  }).join("");
  const more = view.ocultas ? `<p class="section-footer">Y ${view.ocultas} grupos más. El coste y la fecha final incluyen todos los pasos.</p>` : "";
  const missing = road.sinTiempo.length
    ? `<p class="section-footer">${road.sinTiempo.length === 1 ? "1 paso" : `${road.sinTiempo.length} pasos`} sin tiempo en la fuente: el filtro de duración no los incluye.</p>`
    : "";
  return `<div class="section"><div class="section-header"><span>Línea de tiempo</span></div><ul class="list">${rows}</ul>${more}${missing}</div>`;
}

function renderPlan(tag) {
  const meta = accountByTag(tag);
  const exp = meta && expOf(meta.tag);
  const view = exp ? viewOf(meta.tag) : null;
  if (!meta || !exp || !view) {
    return `<h1 class="large-title">Plan</h1><div class="section"><div class="card empty"><p class="t-title3">Esta cuenta aún no tiene datos</p></div></div>`;
  }
  const road = accountRoadmap(meta);
  const notas = [PLAN_TIMELINE];
  if (road.heroesFuera) notas.push(`En ${HEROES_FUERA} los héroes quedan fuera del plan.`);
  if (road.plan.modo === "rushear") notas.push(RUSH_NOTE);
  else if (road.targetTh > road.currentTh) notas.push(`Para llegar a TH${road.targetTh} el nivel pedido es el máximo de TH${road.capTh}.`);
  if (road.avisoHora) notas.push("Hay una mejora en curso sin hora exacta. No se le pone una.");
  if (road.plan.modo === "rushear" && road.calendarioSeg != null && road.trabajoSeg > road.calendarioSeg) notas.push("El fin usa los constructores a la vez. Los días de constructor del coste son la suma del trabajo, no el calendario.");
  if (road.plan.modo !== "rushear" && !road.conocidos) notas.push("La exportación no trae el número de constructores. No se inventan huecos libres.");
  if (estadoColas(exp, state.now, { staleMs: staleLimit() }).desactualizada) notas.push(`Necesita actualización. Se conserva el último plan, del ${fmtWhen(exp.timestamp * 1000)}.`);
  const fin = road.fin ? `<p class="t-body">Fin estimado ${esc(fmtFin(road.fin))} · ${road.orden.length} pasos</p>` : `<p class="t-body">${road.orden.length} pasos</p>`;
  const cifras = road.rush ? "" : `${fin}<p class="t-body">${esc(costBits(road.coste) || "Sin coste conocido")}</p>`;
  return `<h1 class="large-title">Plan</h1>
    <p class="large-sub">${esc(meta.nombre)} · TH${view.th}</p>
    ${planControls(meta, road)}
    ${coberturaCard(meta, road)}
    ${road.rush ? rushPanel(road) : ""}
    <div class="section"><div class="card"><div class="section-head"><h2 class="t-headline">Criterio</h2>${infoBtn(notas.join(" "))}</div>${cifras}</div></div>
    ${roadmapList(road)}
    ${costCard(exp, view.th, true)}`;
}

function criterioHtml(texto, fuera) {
  const frases = String(texto).split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ#])/).filter(Boolean);
  const notas = frases.filter((f) => /^Los héroes de /.test(f));
  const puntos = frases.filter((f) => !notas.includes(f));
  const nota = fuera || notas.map((f) => `<p class="t-footnote c-2">${esc(f)}</p>`).join("");
  return `<ul class="criterio">${puntos.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>${nota}`;
}

function activeSleep() {
  return sleepFromClocks(state.sleep.desde, state.sleep.hasta);
}

function saveSleep(desde, hasta) {
  state.sleep = { desde: desde || "", hasta: hasta || "" };
  localStorage.setItem("cp-sueno", JSON.stringify(state.sleep));
  roadCache.clear();
  espejarUsuario();
}

function sleepCard() {
  const s = state.sleep;
  const igual = s.desde && s.hasta && s.desde === s.hasta;
  const nota = igual
    ? "Las dos horas son la misma: no se aplica ningún tramo."
    : "Horas de Madrid. Si lo dejas vacío, no se mueve ninguna mejora.";
  return `<div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">Horas de sueño</h2>${infoBtn(`La siguiente mejora no empieza ni termina en ese tramo. La hora de lo que ya se está mejorando no se cambia: sale de la exportación. ${nota}`)}</div>
      <div class="date-row">
        <label>Dormir<input type="time" data-sueno="desde" value="${esc(s.desde)}" aria-label="Hora de dormir"></label>
        <label>Despertar<input type="time" data-sueno="hasta" value="${esc(s.hasta)}" aria-label="Hora de despertar"></label>
      </div>
      ${(s.desde || s.hasta) ? `<button type="button" class="btn btn--plain btn--block" data-sueno-clear>Quitar</button>` : ""}
    </div></div>`;
}

function actualesDe(exp) {
  const out = [];
  const push = (it, queue) => {
    if (!it || it.timer == null) return;
    const hora = finDe(exp.timestamp, it.timer);
    out.push({
      queue,
      extra: !!it.extra,
      id: String(it.data),
      nombre: nameOf(it.data) || "Mejora",
      done: hora.exacta && hora.fin <= state.now,
      exacta: hora.exacta,
      fin: hora.fin,
    });
  };
  for (const b of exp.buildings || []) push(b, "constructor");
  for (const it of exp.traps || []) push(it, "constructor");
  for (const it of exp.heroes || []) push(it, "constructor");
  for (const it of exp.guardians || []) push(it, "constructor");
  for (const it of exp.units || []) push(it, "laboratorio");
  for (const it of exp.spells || []) push(it, "laboratorio");
  for (const it of exp.siege_machines || []) push(it, "laboratorio");
  for (const it of exp.pets || []) push(it, "mascotas");
  return out;
}

function timelineOf(meta, exp, view) {
  const builders = builderStatus(exp);
  return accountTimeline({
    builders,
    actuales: actualesDe(exp),
    siguientes: planQueue(planCandidates(exp, view), { tag: meta.tag }),
    sleep: activeSleep(),
    now: state.now,
    mascotas: view.th >= 14,
  });
}

function lineaTexto(line) {
  let actual = line.clase === "estimado" ? "Libre según la exportación (estimado)" : "Libre en la exportación";
  if (line.desactualizada && line.libreYa) actual = "Necesita actualización. Se conserva el último plan.";
  else if (line.actual && !line.actual.exacta) actual = `${line.actual.nombre}. Sin hora exacta en la exportación.`;
  else if (line.actual && line.actual.exacta && line.clase === "estimado" && line.libreYa) {
    actual = `${line.actual.nombre} · libre según la exportación (estimado)`;
  } else if (line.actual && line.actual.exacta) {
    actual = `${line.actual.nombre} · libre ${fmtFin(line.actual.fin)}`;
    if (line.enSueno) actual += " · cae en horas de sueño";
  }
  let next = "Sin siguiente con este criterio";
  const sig = line.siguiente;
  if (sig && sig.sinHora) next = `${sig.title}. No se programa: la mejora en curso no trae hora.`;
  else if (sig && sig.sinDuracion) next = `${sig.title}. Sin tiempo oficial para el siguiente nivel: no se inventa el fin.`;
  else if (sig && sig.fin != null) {
    next = `${sig.title} · empieza ${fmtFin(sig.inicio)} · acaba ${fmtFin(sig.fin)}`;
    if (sig.finEnSueno) next += " · el fin cae de noche porque dura más que el tiempo despierto";
  }
  return { actual, next };
}

function timelineHtml(tl) {
  const aviso = tl.avisoHora
    ? `<p class="t-footnote c-2">Hay una mejora en curso sin hora exacta. No se le pone una.</p>`
    : "";
  const desconocido = tl.totalConocido
    ? ""
    : `<p class="t-footnote c-2">La exportación no trae el número de constructores. No se inventan huecos libres.</p>`;
  const rows = tl.lineas.map((line) => {
    const text = lineaTexto(line);
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(line.titulo)}</span><span class="row__sub">${esc(text.actual)}</span><span class="row__sub">${esc(text.next)}</span></span></div></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Días y constructores</span></div>
    <ul class="list">${rows}</ul>${aviso}${desconocido}</div>`;
}

function renderAgenda() {
  const list = allAccounts().filter((meta) => accountVisible(accountFilterMeta(meta), state.filters) && expOf(meta.tag));
  const cuentas = list.map((meta) => {
    const exp = expOf(meta.tag);
    const view = viewOf(meta.tag);
    if (!exp || !view) return null;
    const colas = estadoColas(exp, state.now, { staleMs: staleLimit(), th: view.th });
    const tl = timelineOf(meta, exp, view);
    if (colas.desactualizada) {
      for (const line of tl.lineas) if (line.libreYa) line.desactualizada = true;
    }
    return { tag: meta.tag, nombre: meta.nombre, chip: meta.chip, desactualizada: colas.desactualizada, lineas: tl.lineas };
  }).filter(Boolean);
  const modo = ["7d", "cuenta", "curso"].includes(state.agendaVista) ? state.agendaVista : "24h";
  const eventos = finalesEn(cuentas, { now: state.now, modo: modo === "curso" ? "24h" : modo });
  const filaEv = (ev) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(ev.chip || ev.nombre)} · ${esc(ev.titulo)}</span><span class="row__sub">${esc(ev.nombre)} · ${esc(fmtFin(ev.fin))}</span></span></div></li>`;
  let cuerpo = "";
  if (!eventos.length) {
    cuerpo = `<div class="section"><div class="card empty"><p class="t-title3">—</p></div></div>`;
  } else if (modo === "cuenta") {
    const por = new Map();
    for (const ev of eventos) {
      if (!por.has(ev.tag)) por.set(ev.tag, []);
      por.get(ev.tag).push(ev);
    }
    cuerpo = [...por.values()].map((list) => `<div class="section"><div class="section-header"><span>${esc(list[0].nombre)}</span></div><ul class="list">${list.map(filaEv).join("")}</ul></div>`).join("");
  } else {
    cuerpo = franjasDe(eventos).map((g) => {
      const titulo = g.cuentas > 1 ? fraseFranja(g) : dayHeading(g.ms, state.now);
      return `<div class="section"><div class="section-header"><span>${esc(titulo)}</span></div><ul class="list">${g.eventos.map(filaEv).join("")}</ul></div>`;
    }).join("");
  }
  const nav = `<div class="seg-wrap"><nav class="seg seg--nav" role="tablist" aria-label="Agenda"><button type="button" role="tab" data-agenda="24h" aria-selected="${modo === "24h"}">24 h</button><button type="button" role="tab" data-agenda="7d" aria-selected="${modo === "7d"}">7 días</button><button type="button" role="tab" data-agenda="cuenta" aria-selected="${modo === "cuenta"}">Cuenta</button><button type="button" role="tab" data-agenda="curso" aria-selected="${modo === "curso"}">En curso</button></nav></div>`;
  const cuerpoVista = modo === "curso" ? mejorasEnCurso() : cuerpo;
  const operaciones = `<div class="section">${sectionHead("Operaciones", "Sesión, mantenimiento, simulador, gemelos, equilibrio, predicción, guerras, diario, plantillas, estrategias y prioridades. Los apuntes siguen en este iPhone.")}<ul class="list list--tiles"><li><a class="row row--tile row--accion" href="#/operaciones"><span class="accion__ico is-blue" aria-hidden="true">${ICON.operaciones}</span><span class="row__main"><span class="row__title">Operaciones</span><span class="row__sub">Abre la sesión, la simulación y el resto de vistas</span></span>${CHEV}</a></li></ul></div>`;
  return `<h1 class="large-title">Agenda</h1>
    <div class="title-line"><p class="large-sub">Finalizaciones</p>${infoBtn("Finalizaciones con hora, de la exportación. Una cuenta sin actualizar no entra. La hora es la de Madrid. Si varias cuentas caen en la misma hora, es una sola sesión.")}</div>
    ${operaciones}
    ${filterBar({ tiempo: false, recurso: false, th: true, grupo: true })}
    ${nav}
    ${sleepCard()}
    <div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">Calendario</h2>${infoBtn("Web Push, con la app cerrada, necesita un servicio que guarde la suscripción y envíe el aviso. Esta app no tiene servidor, así que no hay aviso al cerrarla. El archivo lleva al Calendario del iPhone el fin de cada mejora que la exportación ya trae, en hora UTC. No se crea solo, no pide permiso de avisos y no añade una alarma.")}</div>
      <button type="button" class="btn btn--secondary btn--block" data-calendario>Añadir al calendario</button>
    </div></div>
    ${cuerpoVista}`;
}

function renderHistorial(tag) {
  const meta = accountByTag(tag);
  const exp = meta && expOf(meta.tag);
  const view = exp ? viewOf(meta.tag) : null;
  if (!meta || !view) {
    return `<h1 class="large-title">Historial</h1><div class="section"><div class="card empty"><p class="t-title3">Esta cuenta aún no tiene datos</p></div></div>`;
  }
  const all = pairsOf(meta.tag);
  const pairs = all.filter((p) => dayInRange(p.day, state.filters, state.now));
  const pace = weeklyPace(pairs);
  const logros = achievements(view, all);
  const cats = logros.alMaximo.map((key) => {
    const cat = CATEGORIES.find((c) => c.key === key);
    return cat ? cat.label : key;
  });
  const logroBits = [];
  if (logros.racha > 0) logroBits.push(logros.racha === 1 ? "1 semana seguida mejorando" : `${logros.racha} semanas seguidas mejorando`);
  if (cats.length) logroBits.push(`Al máximo: ${cats.join(", ")}`);
  if (logros.thCompletado) logroBits.push(`TH${view.th} completado`);
  const logroCard = `<div class="section"><div class="card">
      <h2 class="t-headline">Rachas y logros</h2>
      <p class="t-body">${esc(logroBits.join(" · ") || "Todavía no hay racha ni categoría al máximo.")}</p>
      <p class="t-footnote c-2">La racha cuenta semanas de Madrid seguidas, hasta la última importación, con alguna subida. No depende del filtro de fechas.</p>
    </div></div>`;
  const ritmo = pace.ritmo == null
    ? `<p class="t-footnote c-2">Hacen falta dos importaciones en el periodo para calcular el ritmo.</p>`
    : `<p class="t-title2 num">${fmtNum(pace.ritmo)} <span class="t-footnote">niveles/semana</span></p><p class="t-footnote c-2">${pace.total} niveles en ${pace.weeks.length === 1 ? "1 semana" : `${pace.weeks.length} semanas`} con subidas.</p>`;
  const changes = pairs.slice().reverse().map((pair) => {
    const lines = (pair.rows || []).map((row) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(row.title)}</span><span class="row__sub">${esc(row.change)}</span></span></div></li>`).join("");
    const th = pair.thFrom != null && pair.thTo != null && pair.thTo !== pair.thFrom ? ` · TH${pair.thFrom} → TH${pair.thTo}` : "";
    return `<div class="section"><div class="section-header"><span>${esc(pair.day)}</span><span class="num">${pair.levels} niveles${esc(th)}</span></div><ul class="list">${lines || `<li><div class="row"><span class="row__main"><span class="row__sub">Sin cambios de nivel</span></span></div></li>`}</ul></div>`;
  }).join("");
  return `<h1 class="large-title">Historial</h1>
    <p class="large-sub">${esc(meta.nombre)}</p>
    ${filterBar({ tiempo: true, recurso: false, th: false, grupo: false })}
    ${logroCard}
    <div class="section"><div class="card"><h2 class="t-headline">Ritmo del periodo</h2>${ritmo}</div></div>
    ${changes || `<div class="section"><div class="card empty"><p class="t-title3">Sin importaciones en este periodo</p></div></div>`}`;
}

function chartAccounts() {
  return allAccounts().filter((meta) => accountVisible(accountFilterMeta(meta), state.filters) && latestInRange(meta.tag));
}

function chartCategories(list) {
  const filtro = state.filters.recurso;
  if (!filtro || filtro === "todos") return villageCats();
  const keys = new Set();
  for (const meta of list) {
    const exp = latestInRange(meta.tag);
    if (!exp) continue;
    const set = allowedCats(exp, townHallLevel(exp));
    if (set) for (const key of set) keys.add(key);
  }
  return villageCats().filter((c) => keys.has(c.key));
}

function snapshotRow(meta) {
  const exp = latestInRange(meta.tag);
  const view = exp ? analyze(exp, state.index) : null;
  if (!view) return null;
  const cats = {};
  for (const c of CATEGORIES) cats[c.key] = view.cats[c.key] ? view.cats[c.key].pct : null;
  return {
    tag: meta.tag,
    nombre: meta.nombre,
    chip: meta.chip,
    color: accountColor(state.accounts.findIndex((a) => a.tag === meta.tag)),
    th: view.th,
    media: view.media,
    cats,
    view,
  };
}

function legendLabel(meta) {
  if (!meta || !meta.nombre || meta.nombre === meta.tag) return meta && (meta.chip || meta.tag) || "";
  return meta.nombre;
}

function mediaLines(list) {
  return list.map((meta) => {
    const name = legendLabel(meta);
    return {
      name,
      color: accountColor(state.accounts.findIndex((a) => a.tag === meta.tag)),
      points: evolutionPoints(meta.tag).filter((p) => dayInRange(p.day, state.filters, state.now)).map((p) => ({
        day: p.day,
        v: p.v,
        label: `${name} ${fmtPct(p.v)}`,
      })),
    };
  });
}

function categoryLines(tag) {
  const rows = state.rows.filter((r) => r.tag === tag).slice().sort((a, b) => a.timestamp - b.timestamp);
  const exp = latestInRange(tag);
  const allow = exp ? allowedCats(exp, townHallLevel(exp)) : null;
  return CATEGORIES.filter((c) => !allow || allow.has(c.key)).map((c) => ({
    name: c.label,
    color: CAT_COLOR[c.key] || "#5856D6",
    points: rows.map((row) => {
      const day = madridDayKey(row.timestamp * 1000);
      if (!dayInRange(day, state.filters, state.now)) return null;
      const view = analyze(row, state.index);
      const v = view.cats[c.key] && view.cats[c.key].pct;
      if (v == null) return null;
      return { day, v, label: `${c.label} ${fmtPct(v)}` };
    }).filter(Boolean),
  }));
}

function multiLineSvg(series, aria) {
  const named = lineSeries(series);
  if (!named.length) return `<p class="t-footnote c-2">Sin puntos en este periodo. Cada punto sería una exportación real.</p>`;
  const colorOf = new Map((series || []).map((s) => [s.name, s.color]));
  const days = [...new Set(named.flatMap((s) => s.points.map((p) => p.day)))].sort();
  const xOf = (day) => {
    if (days.length === 1) return 170;
    const i = days.indexOf(day);
    return 40 + ((300 - 40) * i) / (days.length - 1);
  };
  const yOf = (v) => 156 - ((v || 0) / 100) * (156 - 12);
  const lines = named.map((s) => {
    const color = colorOf.get(s.name) || CAT_COLOR.defensas;
    const coords = s.points.map((p) => `${xOf(p.day)},${yOf(p.v)}`).join(" ");
    const dots = s.points.map((p) => `<circle cx="${xOf(p.day)}" cy="${yOf(p.v)}" r="3.5" fill="${color}"><title>${esc(p.label || `${s.name} ${fmtPct(p.v)}`)}</title></circle>`).join("");
    const poly = s.points.length > 1 ? `<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : "";
    return poly + dots;
  }).join("");
  const legend = named.map((s) => {
    const color = colorOf.get(s.name) || CAT_COLOR.defensas;
    return `<span class="legend"><i style="background:${color}"></i>${esc(s.name)}</span>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 343 180" role="img" aria-label="${esc(aria)}">
      <g class="chart__grid"><line x1="32" x2="335" y1="12" y2="12"/><line x1="32" x2="335" y1="84" y2="84"/><line x1="32" x2="335" y1="156" y2="156"/></g>
      <g class="chart__y"><text x="26" y="16">100</text><text x="26" y="88">50</text><text x="26" y="160">0</text></g>
      ${lines}
      <g class="chart__x"><text x="${xOf(days[0])}" y="174">${esc(chartDay(days[0]))}</text>${days.length > 1 ? `<text x="${xOf(days[days.length - 1])}" y="174">${esc(chartDay(days[days.length - 1]))}</text>` : ""}</g>
    </svg>
    <div class="legend-row legend-row--cuentas">${legend}</div>
    <p class="t-footnote c-2">Cada punto es una exportación real.</p>`;
}

function groupedHtml(rows, cats) {
  const groups = groupedBars(rows, cats);
  return groups.map((row) => {
    const bars = row.bars.filter((b) => b.value != null).map((b) => `<div class="bar-row"><span>${esc(b.label)}</span>${barHtml(b.key, b.value, null, { mini: true, label: `${b.label} ${fmtPct(b.value)}` })}<span class="num">${fmtPct(b.value)}</span></div>`).join("");
    return `<h3 class="t-headline">${esc(row.nombre)}</h3><div class="chart-bars">${bars}</div>`;
  }).join("");
}

function stackedHtml(rows, cats) {
  return rows.map((row) => {
    const segs = cats.map((c) => {
      const v = row.cats[c.key];
      if (v == null) return "";
      return `<i class="cat-${CAT_CLASS[c.key]}" style="flex:${Math.max(0, v)} 1 0" title="${esc(c.label)} ${esc(fmtPct(v))}"></i>`;
    }).join("");
    const aria = cats.map((c) => row.cats[c.key] == null ? "" : `${c.label} ${fmtPct(row.cats[c.key])}`).filter(Boolean).join(", ");
    return `<div class="bar-row"><span>${esc(row.chip || row.nombre)}</span><div class="stack-bar" role="img" aria-label="${esc(aria)}">${segs}</div></div>`;
  }).join("");
}

function heatHtml(rows, cats) {
  const grid = heatmap(rows, cats);
  const byTag = new Map((rows || []).map((row) => [row.tag, row]));
  const nivel = (v) => (v >= 100 ? "max" : v >= 80 ? "hi" : v >= 50 ? "mid" : "lo");
  const head = `<div class="heat__row" style="--cols:${cats.length}"><span></span>${cats.map((c) => `<span class="heat__lab" title="${esc(c.label)}">${esc(c.label.slice(0, 3))}</span>`).join("")}</div>`;
  const body = grid.map((row) => {
    const snap = byTag.get(row.tag);
    const corto = snap ? (snap.chip || legendLabel(snap)) : row.nombre;
    const cells = row.cells.map((cell) => {
      if (cell.value == null) return `<span class="heat__cell is-na" title="${esc(cell.label)}: bloqueada"></span>`;
      return `<span class="heat__cell heat--${nivel(cell.value)}" title="${esc(row.nombre)} · ${esc(cell.label)} ${esc(fmtPct(cell.value))}"><b>${Math.floor(cell.value)}</b></span>`;
    }).join("");
    return `<div class="heat__row" style="--cols:${cats.length}"><span class="heat__name">${esc(corto)}</span>${cells}</div>`;
  }).join("");
  const legend = `<div class="heat-legend" aria-hidden="true"><span class="heat--lo">&lt; 50 %</span><span class="heat--mid">50–79 %</span><span class="heat--hi">80–99 %</span><span class="heat--max">100 %</span><span class="is-na">Bloqueada</span></div>`;
  const aria = grid.map((row) => `${row.nombre}: ${row.cells.map((c) => `${c.label} ${c.value == null ? "bloqueada" : fmtPct(c.value)}`).join(", ")}`).join(". ");
  return `<div class="heat" role="img" aria-label="${esc(aria)}">${head}${body}</div>${legend}<p class="t-footnote c-2">Cada celda es el % de esa categoría en la última exportación del periodo.</p>`;
}

function groupedCategoryHtml(snaps, cats) {
  const groups = groupedByCategory(snaps, cats);
  const legend = snaps.map((row) => `<span class="legend"><i style="background:${row.color}"></i>${esc(legendLabel(row))} ${esc(fmtPct(row.media))}</span>`).join("");
  const blocks = groups.map((group) => {
    const bars = group.bars.map((bar) => {
      if (bar.value == null) return `<i class="is-na" title="${esc(bar.label)}: bloqueada"></i>`;
      return `<i style="--c:${bar.color};--k:${Math.max(0.04, bar.value / 100).toFixed(3)}" title="${esc(bar.label)} ${esc(fmtPct(bar.value))}"></i>`;
    }).join("");
    const aria = group.bars.filter((bar) => bar.value != null).map((bar) => `${bar.label} ${fmtPct(bar.value)}`).join(", ");
    return `<div class="gcat"><h3>${esc(group.label)}</h3><div class="gbar" role="img" aria-label="${esc(aria)}">${bars}</div></div>`;
  }).join("");
  return `<div class="legend-row legend-row--cuentas">${legend}</div>${blocks}<p class="t-footnote c-2">Cada grupo es una categoría. Cada barra es una cuenta, con su color.</p>`;
}

function radarSvg(view, cats) {
  const list = cats.map((c) => ({ key: c.key, label: c.label, value: view.cats[c.key] ? view.cats[c.key].pct : null })).filter((c) => c.value != null);
  const pts = radarPoints(list);
  if (pts.length < 3) return `<p class="t-footnote c-2">Hacen falta al menos tres categorías desbloqueadas.</p>`;
  const n = pts.length;
  const ring = (k) => pts.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return `${(160 + Math.cos(angle) * 100 * k).toFixed(1)},${(120 + Math.sin(angle) * 100 * k).toFixed(1)}`;
  }).join(" ");
  const spokes = pts.map((p, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = (160 + Math.cos(angle) * 100).toFixed(1);
    const y = (120 + Math.sin(angle) * 100).toFixed(1);
    const lx = (160 + Math.cos(angle) * 118).toFixed(1);
    const ly = (120 + Math.sin(angle) * 118).toFixed(1);
    return `<line x1="160" y1="120" x2="${x}" y2="${y}" class="chart__grid"/><text x="${lx}" y="${ly}">${esc(String(p.label).split(" ")[0])}</text>`;
  }).join("");
  const aria = pts.map((p) => `${p.label} ${fmtPct(p.value)}`).join(", ");
  return `<svg class="chart radar" viewBox="0 0 320 250" role="img" aria-label="${esc(aria)}">
      <polygon class="ring" points="${ring(0.5)}"/><polygon class="ring" points="${ring(1)}"/>
      ${spokes}
      <polygon class="chart__area" points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}"/>
      <polygon class="chart__line" points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}"/>
    </svg>`;
}

function paceBlock(tag) {
  const pairs = pairsOf(tag).filter((p) => dayInRange(p.day, state.filters, state.now));
  const pace = weeklyPace(pairs);
  if (pace.ritmo == null) return `<p class="t-footnote c-2">Hacen falta dos importaciones en el periodo.</p>`;
  const max = Math.max(...pace.weeks.map((w) => w.levels), 1);
  const bars = pace.weeks.map((w) => `<div class="bar-row"><span>${esc(String(w.week).slice(5))}</span>${barHtml("defensas", (w.levels / max) * 100, null, { mini: true, plain: true, label: `${w.week}: ${w.levels} niveles` })}<span class="num">${w.levels}</span></div>`).join("");
  return `<p class="t-title2 num">${fmtNum(pace.ritmo)} <span class="t-footnote">niveles/semana</span></p><div class="chart-bars">${bars}</div>`;
}

function periodNote(tag) {
  const pairs = pairsOf(tag).filter((p) => dayInRange(p.day, state.filters, state.now));
  const n = pairs.reduce((s, p) => s + p.levels, 0);
  const label = state.filters.tiempo === "todo" ? "en todo el historial" : "en el periodo";
  return `${n} ${n === 1 ? "nivel" : "niveles"} ${label}. El % es el de la última exportación.`;
}

function armNotices() {
  clearTimeout(armNotices._t);
  armNotices._t = 0;
  if (!state.ready || !state.notifyOn) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  let soonest = null;
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    for (const u of upgrades(exp)) {
      if (u.extra || u.done) continue;
      if (!soonest || u.end < soonest.end) soonest = { end: u.end, nombre: meta.nombre };
    }
  }
  if (!soonest) return;
  const wait = soonest.end - Date.now();
  if (wait <= 0) return;
  const fireAt = soonest.end;
  armNotices._t = setTimeout(() => {
    if (Date.now() + 1500 >= fireAt) {
      try {
        new Notification("Mejora terminada", { body: `${soonest.nombre}: una mejora ha llegado a su fin.` });
      } catch { /* el navegador no mostró el aviso */ }
    }
    state.now = Date.now();
    armNotices();
  }, Math.min(wait, 2147483647));
}

function abrirActualizar() {
  let ses = readSession(localStorage);
  if (!ses) {
    const order = ordenDeSesion(allAccounts().map((meta) => {
      const p = prioridadDe(meta);
      return { tag: meta.tag, tier: p.tier, sortWhen: p.sortWhen, principal: !!meta.principal, nombre: meta.nombre };
    }));
    ses = blankSession(order, state.now);
    writeSession(localStorage, ses);
  }
  state.actualizarManual = false;
  if (location.hash !== "#/actualizar") location.hash = "#/actualizar";
  else render();
}

function botonActualizar() {
  const ses = readSession(localStorage);
  const extra = ses && ses.order.length ? ` · ${progressOf(ses).label}` : "";
  return `<button type="button" class="btn btn--primary btn--block" data-actualizar>Actualizar todas${esc(extra)}</button>`;
}

function nombreCuenta(tag) {
  const meta = accountByTag(tag);
  return meta ? meta.nombre : tag;
}

function filaSesion(ses, tag, i, next) {
  const row = ses.done[tag];
  let estado = "Pendiente";
  if (row && row.kind === "ready") estado = "Completada";
  else if (row && row.kind === "older") estado = "Al histórico";
  else if (row) estado = "Completada";
  else if (tag === next) estado = "Siguiente";
  const cls = tag === next && !row ? " chip--main" : " chip--muted";
  const exp = expOf(tag);
  const ts = row && row.timestamp ? row.timestamp : (exp && exp.timestamp);
  const fecha = ts ? `Última actualización ${fmtWhen(ts * 1000)}` : "Sin datos";
  return `<li><div class="row row--tile"><span class="orden-n num" aria-hidden="true">${i + 1}</span><span class="row__main"><span class="row__title"><span class="sr-only">${i + 1}. </span>${esc(nombreCuenta(tag))}</span><span class="row__sub tag">${esc(tag)}</span><span class="row__sub">${esc(fecha)}</span></span><span class="chip${cls}">${estado}</span></div></li>`;
}

function campoPegado(ses) {
  const texto = ses.pending || state.actualizarBorrador || "";
  if (!state.actualizarManual && !ses.pending) return "";
  const aviso = ses.pending
    ? `<p class="t-body">Quedó un pegado sin guardar. Si iOS cerró la app, tócalo otra vez.</p>`
    : `<p class="t-footnote c-2">Mantén pulsado el campo y elige Pegar.</p>`;
  return `${aviso}<label class="t-footnote" for="act-paste">Pega aquí el JSON</label><textarea id="act-paste" class="act-paste" data-actualizar-text autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">${esc(texto)}</textarea><button type="button" class="btn btn--primary btn--block" data-pegar-campo>Guardar este pegado</button>`;
}

function renderActualizar() {
  const ses = readSession(localStorage);
  if (!ses) {
    return `<h1 class="large-title">Actualizar todas</h1>
      <p class="large-sub">Sin la app Atajos.</p>
      <div class="section"><div class="card empty"><p class="t-title3">Aún no hay una lista</p><p class="t-subhead c-2">Se abre con las cuentas en el orden de Abrir hoy.</p><button type="button" class="btn btn--primary" data-actualizar>Empezar</button></div></div>`;
  }
  const prog = progressOf(ses);
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
  const standalone = isStandalone(navigator, (q) => window.matchMedia(q));
  const hint = standalone
    ? "Después de copiar, vuelve a este icono. Safari y el icono de inicio no comparten los datos."
    : "Después de copiar, vuelve a esta pestaña de Safari. El icono de inicio no comparte estos datos.";
  const barra = `<div class="section"><div class="card act-card">
      <div class="act-top"><h2 class="t-headline">Progreso</h2><p class="act-count num" aria-live="polite">${esc(prog.label)}</p></div>
      <div class="act-bar" role="progressbar" aria-valuenow="${prog.done}" aria-valuemin="0" aria-valuemax="${prog.total}" aria-label="${prog.done} de ${prog.total} cuentas"><span style="width:${pct}%"></span></div>
    </div></div>`;
  if (ses.status === "done") {
    const sum = summaryOf(ses);
    const bloque = (titulo, tags) => {
      if (!tags.length) return "";
      const lis = tags.map((tag) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(nombreCuenta(tag))}</span><span class="row__sub tag">${esc(tag)}</span></span></div></li>`).join("");
      return `<div class="section"><div class="section-header"><span>${titulo}</span></div><ul class="list">${lis}</ul></div>`;
    };
    return `<div class="act-root" data-standalone="${standalone ? "1" : "0"}"><h1 class="large-title">Actualizar todas</h1>
      <p class="large-sub">Lista terminada</p>
      ${barra}
      <div class="section"><div class="card"><p class="t-body">${esc(fraseResumen(ses))}</p></div></div>
      ${ses.pending ? `<div class="section act-actions">${campoPegado(ses)}</div>` : ""}
      ${bloque("Completadas", sum.changed.concat(sum.same, sum.history))}
      ${bloque("Pendientes", sum.missing)}
      <div class="section"><button type="button" class="btn btn--primary btn--block" data-actualizar-listo>Listo</button></div></div>`;
  }
  const next = nextOf(ses);
  const siguiente = next
    ? `<div class="section"><div class="card">
        <p class="t-footnote c-2">Siguiente</p>
        <h2 class="t-title2">${esc(nombreCuenta(next))}</h2>
        <p class="tag">${esc(next)}</p>
        <p class="t-body">En el juego: Ajustes → Más ajustes → Exportar datos → Copiar.</p>
        <p class="t-footnote c-2">En inglés: Settings → More Settings → Data Export → Copy.</p>
      </div></div>
      <p class="section-footer">${esc(hint)}</p>`
    : `<div class="section"><div class="card empty"><p class="t-title3">No hay cuentas en la lista</p></div></div>`;
  const manual = state.actualizarManual || !!ses.pending;
  const listaDe = (tags) => tags.map((tag) => filaSesion(ses, tag, ses.order.indexOf(tag), next)).join("");
  const hechas = ses.order.filter((tag) => ses.done[tag]);
  const pendientes = ses.order.filter((tag) => !ses.done[tag]);
  const bloqueLista = (titulo, tags) => tags.length
    ? `<div class="section"><div class="section-header"><span>${titulo}</span></div><ul class="list list--tiles orden-list">${listaDe(tags)}</ul></div>`
    : "";
  return `<div class="act-root" data-standalone="${standalone ? "1" : "0"}"><h1 class="large-title">Actualizar todas</h1>
    <p class="large-sub">El orden queda fijo al empezar. Se sigue por la primera pendiente. ${esc(prog.label)}</p>
    ${barra}
    ${siguiente}
    <div class="section act-actions">
      <button type="button" class="btn btn--primary btn--block" data-pegar-cuenta>Pegar esta cuenta</button>
      ${manual ? "" : `<button type="button" class="btn btn--secondary btn--block" data-pegar-mano>Pegar a mano</button>`}
      ${campoPegado(ses)}
      <button type="button" class="btn btn--secondary btn--block" data-go="#/inicio">Dejar para luego</button>
    </div>
    ${bloqueLista("Completadas", hechas)}
    ${bloqueLista("Pendientes", pendientes)}</div>`;
}

async function pegarCuenta() {
  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch {
    state.actualizarManual = true;
    state.actualizarFocus = true;
    showToast("err", "Safari no dejó leer el portapapeles. Pega el JSON en el campo.");
    render();
    return;
  }
  await aplicarPegado(text);
}

async function aplicarPegado(text) {
  const cur = readSession(localStorage);
  if (!cur) return;
  const marcado = withPending(cur, text);
  writeSession(localStorage, marcado);
  const { items } = clipboardImportPlan(text || "", classifyCtx());
  const result = recordPaste(marcado, items, state.now);
  writeSession(localStorage, result.session);
  const accepted = result.notes.some((n) => n.kind === "ready" || n.kind === "duplicate" || n.kind === "older");
  if (!accepted) {
    writeSession(localStorage, { ...result.session, pending: "" });
    state.actualizarBorrador = text || "";
    state.actualizarManual = true;
    state.actualizarFocus = true;
    showToast("err", mensajePegado(result.notes, nombreCuenta));
    render();
    return;
  }
  let stats = new Map();
  try {
    if (result.save.length) stats = await persistirPegado(result.save);
  } catch {
    state.actualizarManual = true;
    state.actualizarFocus = true;
    showToast("err", "No se pudo guardar. El texto sigue en este iPhone: toca Guardar este pegado.");
    render();
    return;
  }
  let ses = { ...result.session, pending: "" };
  for (const [tag, dato] of stats) ses = anotarResultado(ses, tag, dato);
  writeSession(localStorage, ses);
  state.actualizarManual = false;
  state.actualizarBorrador = "";
  showToast("ok", mensajePegado(result.notes, nombreCuenta));
  render();
}

function resultadoDePegado(before, after) {
  if (!before || !after || !state.index) {
    return { niveles: 0, mejoras: 0, ctorAntes: null, ctorDespues: null, mediaAntes: null, mediaDespues: null };
  }
  const diff = diffExports(before, after, state.index, after.timestamp * 1000);
  const mejoras = upgradesOf(before).filter((u) => !u.extra && u.end <= after.timestamp * 1000).length;
  const thAntes = townHallLevel(before);
  const thDespues = townHallLevel(after);
  const c0 = estadoColas(before, after.timestamp * 1000, { th: thAntes });
  const c1 = estadoColas(after, after.timestamp * 1000, { th: thDespues });
  return {
    niveles: Math.max(0, diff.levelDelta || 0),
    mejoras,
    ctorAntes: c0.builders.libresReales,
    ctorDespues: c1.builders.libresReales,
    mediaAntes: diff.mediaFrom,
    mediaDespues: diff.mediaTo,
  };
}

async function persistirPegado(save) {
  const before = new Map();
  for (const it of save) before.set(it.value.tag, state.latest.get(it.value.tag) || null);
  for (const it of save) await putExport(it.value);
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  const seen = new Set();
  for (const it of save) {
    const tag = it.value.tag;
    if (seen.has(tag)) continue;
    seen.add(tag);
    const rec = reconcileProvisionals(state.provisionales, { tag, before: before.get(tag), after: state.latest.get(tag) });
    state.provisionales = rec.provisionales;
  }
  saveProvisionals();
  for (const tag of seen) aplicarGancho(tag);
  try {
    await putCopy(buildBackup(camposCopia()));
    state.copyAt = Date.now();
  } catch { /* la copia automática no bloquea el guardado */ }
  armFlash(save.map((it) => it.value.tag));
  const stats = new Map();
  for (const it of save) {
    if (it.kind !== "ready" || stats.has(it.value.tag)) continue;
    const after = state.latest.get(it.value.tag);
    if (!after || after.timestamp !== it.value.timestamp) continue;
    stats.set(it.value.tag, resultadoDePegado(before.get(it.value.tag), after));
  }
  anotarCambios(seen, before);
  return stats;
}

async function savePlan(plan, opts = {}) {
  const before = new Map();
  for (const it of plan.save) before.set(it.value.tag, state.latest.get(it.value.tag) || null);
  try {
    for (const it of plan.save) await putExport(it.value);
  } catch {
    if (opts.sheet) {
      state.importUi.saveError = true;
      render();
    } else showToast("err", "No se pudo guardar");
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
  const avisos = [];
  const seenTags = new Set();
  for (const it of plan.save) {
    const tag = it.value.tag;
    if (seenTags.has(tag)) continue;
    seenTags.add(tag);
    const rec = reconcileProvisionals(state.provisionales, { tag, before: before.get(tag), after: state.latest.get(tag) });
    state.provisionales = rec.provisionales;
    avisos.push(...rec.avisos);
  }
  saveProvisionals();
  for (const tag of seenTags) aplicarGancho(tag);
  try {
    await putCopy(buildBackup(camposCopia()));
    state.copyAt = Date.now();
  } catch { /* la copia automática no bloquea el guardado */ }
  armFlash(plan.tags);
  anotarCambios(seenTags, before);
  const known = plan.save.filter((it) => it.kind !== "new");
  const base = known.length ? successToast(known) : (plan.count === 1 ? "1 cuenta importada" : `${plan.count} cuentas importadas`);
  const extra = reconcileMessage(avisos);
  const batch = plan.save.length > 1 ? batchSummary(plan.save.map((it) => ({ kind: it.kind }))) : "";
  const pending = allAccounts().filter((meta) => stale(expOf(meta.tag))).map((meta) => meta.nombre);
  const pendingNote = plan.save.length > 1 && pending.length ? ` Siguen sin actualizar: ${pending.join(", ")}.` : "";
  showToast("ok", [base, batch, extra].filter(Boolean).join(". ") + pendingNote);
  state.importUi = freshImport();
  if (location.hash !== "#/roster") location.hash = "#/roster";
  else render();
}

async function pasteNow() {
  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch {
    state.importUi = freshImport();
    state.importUi.active = true;
    state.importUi.mode = "paste";
    showToast("err", "Safari no dejó leer el portapapeles. Pega el JSON en el campo.");
    if (location.hash !== "#/importar") location.hash = "#/importar";
    else render();
    return;
  }
  const { items, plan } = clipboardImportPlan(text || "", classifyCtx());
  if (!plan.save.length) {
    state.importUi = freshImport();
    state.importUi.active = true;
    state.importUi.mode = "paste";
    state.importUi.text = text || "";
    state.importUi.items = items;
    state.importUi.phase = items.length > 1 ? "batch" : (items.length ? "single" : "entry");
    state.importUi.needsFocus = true;
    if (!items.length) showToast("err", "No hay una exportación en el portapapeles.");
    if (location.hash !== "#/importar") location.hash = "#/importar";
    else render();
    return;
  }
  await savePlan(plan);
}

async function toggleNotify() {
  if (typeof Notification === "undefined") {
    showToast("err", "Este navegador no permite avisos.");
    render();
    return;
  }
  if (!state.notifyOn) {
    let perm = Notification.permission;
    if (perm === "default") {
      try { perm = await Notification.requestPermission(); } catch { perm = "denied"; }
    }
    if (perm !== "granted") {
      state.notifyOn = false;
      localStorage.setItem("cp-notify", "0");
      showToast("err", "Sin permiso de avisos.");
      render();
      return;
    }
    state.notifyOn = true;
  } else state.notifyOn = false;
  localStorage.setItem("cp-notify", state.notifyOn ? "1" : "0");
  render();
}

function navbar(r) {
  const titles = { inicio: "Clash Progreso", roster: "Cuentas", progreso: "Progreso", mejoras: "Mejoras", graficos: "Análisis", ranking: "Análisis", analisis: "Análisis", copia: "Copia", detalle: "Detalle", ahora: "Ahora", plan: "Plan", historial: "Historial", agenda: "Agenda", equipo: "Equipamiento", perfil: "Perfil", actualizar: "Actualizar", operaciones: "Operaciones" };
  let lead = "";
  let trail = "";
  let title = titles[r.name] || "";
  let collapsed = "false";
  if (r.name === "inicio" && r.sub) {
    lead = `<button class="btn-text" data-go="#/inicio">${BACK} Inicio</button>`;
    collapsed = "true";
  } else if (r.name === "inicio") {
    trail = `<button class="btn-text btn-ajustes" data-go="#/copia" aria-label="Ajustes, copia y Acerca de">${ICON.ajustes}</button>`;
  } else if (r.name === "agenda" && r.sub) {
    lead = `<button class="btn-text" data-go="#/agenda">${BACK} Agenda</button>`;
    collapsed = "true";
  } else if (r.name === "roster" && r.sub) {
    lead = `<button class="btn-text" data-go="#/roster">${BACK} Cuentas</button>`;
    collapsed = "true";
  } else if (r.name === "copia" || r.name === "ahora" || r.name === "actualizar") {
    lead = `<button class="btn-text" data-go="#/inicio">${BACK} Inicio</button>`;
    collapsed = "true";
  } else if (r.name === "roster" || r.name === "importar") {
    trail = `<button class="btn-text btn-text--bold" data-go="#/importar">Importar</button>`;
  } else if (r.name === "perfil") {
    title = "Perfil";
    lead = `<button class="btn-text" data-go="#/roster">${BACK} Cuentas</button>`;
    collapsed = "true";
  } else if (r.name === "historial") {
    title = "Historial";
    const backTag = r.tag || state.selected;
    lead = backTag
      ? `<button class="btn-text" data-go="#/progreso/${backTag.slice(1)}">${BACK} Progreso</button>`
      : `<button class="btn-text" data-go="#/roster">${BACK} Cuentas</button>`;
    collapsed = "true";
  } else if (r.name === "plan" || r.name === "equipo") {
    title = r.name === "plan" ? "Plan" : "Equipamiento";
    lead = `<button class="btn-text" data-go="#/mejoras">${BACK} Mejoras</button>`;
    collapsed = "true";
  } else if (r.name === "ranking" || r.name === "agenda" || r.name === "graficos") {
    collapsed = "true";
  } else if (r.name === "operaciones" && r.sub && r.sub !== "hub") {
    title = "Operaciones";
    lead = `<button class="btn-text" data-go="#/operaciones">${BACK} Operaciones</button>`;
    collapsed = "true";
  } else if (r.name === "operaciones") {
    title = "Operaciones";
    lead = `<button class="btn-text" data-go="#/agenda">${BACK} Agenda</button>`;
    collapsed = "true";
  } else if (r.name === "detalle") {
    const cat = CATEGORIES.find((c) => c.key === r.cat);
    title = cat ? cat.label : "Detalle";
    lead = `<button class="btn-text" data-go="#/progreso/${r.tag.slice(1)}">${BACK} Progreso</button>`;
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
    ${item("inicio", "#/inicio", "Inicio", ICON.inicio)}
    ${item("roster", "#/roster", "Cuentas", ICON.cuentas)}
    ${item("mejoras", "#/mejoras", "Mejoras", ICON.mejoras)}
    ${item("analisis", "#/ranking", "Análisis", ICON.analisis)}
    ${item("agenda", "#/agenda", "Agenda", ICON.agenda)}
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
  const q = state.rosterQ.trim().toLocaleLowerCase("es");
  const shown = list.filter((meta) => accountVisible(accountFilterMeta(meta), state.filters)
    && (!q || String(meta.alias || meta.tag).toLocaleLowerCase("es").includes(q) || meta.tag.toLocaleLowerCase("es").includes(q)));
  const empty = list.length
    ? ""
    : `<div class="section"><div class="card empty"><p class="t-title3">Aún no hay cuentas</p><p class="t-subhead c-2">Las de prueba se pueden borrar. Añade la tuya importando su JSON.</p><button class="btn btn--primary" data-go="#/importar">Añadir cuenta</button></div></div>`;
  const rows = shown.map(rowCuenta).join("");
  const seedInfo = isSeedRoster(list)
    ? `Las ${list.length} son de prueba: añade, renombra o borra cuentas. % = media de las categorías desbloqueadas.`
    : "% = media de las categorías desbloqueadas. Una cuenta sin Principal usa como destacada la de TH más alto.";
  return `<h1 class="large-title">Cuentas</h1>
    <p class="large-sub">${shown.length === list.length ? (list.length === 1 ? "1 cuenta" : `${list.length} cuentas`) : `${shown.length} de ${list.length}`} · ${esc(sortLabel)}</p>
    <div class="section">${sectionHead("Actualizar", "Recorre la lista, copia en el juego y pega cada cuenta al volver.")}${botonActualizar()}</div>
    ${rosterTools(shown)}
    ${staleCard()}
    <label class="filter-search"><span class="sr-only">Buscar cuenta</span><input data-roster-q type="search" enterkeyhint="search" placeholder="Buscar cuenta" value="${esc(state.rosterQ)}" aria-label="Buscar cuenta"></label>
    <label class="sort-label">Ordenar
      <select data-sort aria-label="Ordenar cuentas">
        <option value="th"${state.sortMode === "th" ? " selected" : ""}>TH</option>
        <option value="nombre"${state.sortMode === "nombre" ? " selected" : ""}>Nombre</option>
        <option value="pct"${state.sortMode === "pct" ? " selected" : ""}>Porcentaje</option>
      </select>
    </label>
    ${empty}
    ${list.length ? `<div class="section">${sectionHead("Lista", seedInfo)}<ul class="list list--tiles">${rows}</ul></div>` : infoBtn(seedInfo)}
    <div class="section"><button class="btn btn--primary btn--block" data-go="#/importar">Añadir cuenta</button></div>
`;
}

function staleCard() {
  const days = state.staleDays;
  const pending = allAccounts().filter((meta) => {
    const exp = expOf(meta.tag);
    return !exp || stale(exp);
  });
  if (!pending.length) return "";
  const lis = pending.map((meta) => `<li><a class="row" href="#/progreso/${meta.tag.slice(1)}"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${expOf(meta.tag) ? "Sin actualización reciente" : "Sin importar"}</span></span>${CHEV}</a></li>`).join("");
  const dia = days === 1 ? "día" : "días";
  return `<div class="section">${sectionHead("Hace tiempo sin datos", `Cuentas con más de ${days} ${dia} sin una exportación nueva, o sin datos. Al pegar un lote, el resumen dice cuáles siguen pendientes.`)}<ul class="list">${lis}</ul></div>`;
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
    return `<li><div class="row row--tile row--account${flash}">
      <a class="row__main" href="#/progreso/${meta.tag.slice(1)}">
        <span class="row__title">${esc(meta.nombre)} ${mark}</span>
        <span class="row__sub"><span class="chip chip--muted">Sin importar</span></span>
      </a>
      <span class="row__tools"><a class="btn-text" href="#/perfil/${meta.tag.slice(1)}">Perfil</a><button type="button" class="btn-text" data-edit="${esc(meta.tag)}">Editar</button></span>
    </div></li>`;
  }
  const a = viewOf(meta.tag);
  const when = fmtWhen(exp.timestamp * 1000);
  const title = meta.nombre === meta.tag ? `<span class="tag">${esc(meta.tag)}</span>` : esc(meta.nombre);
  const aria = `${meta.nombre}, TH${a.th}, media ${fmtPct(a.media)}${meta.principal ? ", Principal" : meta.featured ? ", destacada" : ""}`;
  return `<li><div class="row row--tile row--account${flash}">
    ${thumb(1000001, { size: 44, th: a.th })}
    <a class="row__main" href="#/progreso/${meta.tag.slice(1)}" aria-label="${esc(aria)}">
      <span class="row__title">${title} ${mark}</span>
      <span class="row__sub">TH${a.th} · <span class="tag">${esc(meta.tag)}</span> · ${esc(when)}${stale(exp) ? ` · <span class="chip chip--warn">Necesita actualización</span>` : ""}${(meta.grupos || []).length ? ` · ${esc(meta.grupos.join(", "))}` : ""}</span>
      ${goalBar(meta, a)}
      ${meterHtml(a.media, `Media ${fmtPct(a.media)}`)}
    </a>
    <span class="row__tools"><a class="btn-text" href="#/perfil/${meta.tag.slice(1)}">Perfil</a><button type="button" class="btn-text" data-edit="${esc(meta.tag)}">Editar</button></span>
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
    return `<h1 class="large-title">Progreso</h1><div class="section"><div class="card empty"><p class="t-title3">Aún no hay cuentas</p><button class="btn btn--primary" data-go="#/importar">Añadir cuenta</button></div></div>`;
  }
  const exp = expOf(meta.tag);
  const options = list.map((r) => `<option value="${esc(r.tag)}"${r.tag === meta.tag ? " selected" : ""}>${esc(r.nombre)}</option>`).join("");
  const a = exp ? viewOf(meta.tag) : null;
  const sub = !a ? "Sin importar" : `${esc(meta.tag)} · media ${fmtPct(a.media)}`;
  const filt = state.progFilter;
  const inFleet = accountVisible(accountFilterMeta(meta), state.filters);
  const rows = exp ? progressRows(exp, state.index).filter(resourceAllowsItem) : [];
  const counts = chipCounts(rows, { status: filt.status, query: filt.q, index: state.index });
  const narrowed = filt.cat !== "todas" || filt.status !== "todos" || String(filt.q || "").trim();
  const links = exp ? `<div class="section"><ul class="list">
      <li><a class="row" href="#/perfil/${meta.tag.slice(1)}"><span class="row__main"><span class="row__title">Perfil</span></span>${CHEV}</a></li>
      <li><a class="row" href="#/progreso/${meta.tag.slice(1)}/plan"><span class="row__main"><span class="row__title">Plan</span></span>${CHEV}</a></li>
      <li><a class="row" href="#/progreso/${meta.tag.slice(1)}/historial"><span class="row__main"><span class="row__title">Historial</span></span>${CHEV}</a></li>
    </ul></div>` : "";
  const body = !exp
    ? `<div class="section"><div class="card empty"><p class="t-title3">Esta cuenta aún no tiene datos</p><p class="t-subhead c-2">Importa su exportación JSON para ver el progreso.</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div></div>`
    : !inFleet
      ? `<div class="section"><div class="card empty"><p class="t-title3">Esta cuenta queda fuera del filtro</p><button type="button" class="btn btn--secondary" data-clear-filters>Quitar filtros de cuenta</button></div></div>`
      : `${filterControls(counts, filt)}<p class="section-footer">${esc(periodNote(meta.tag))}</p>${narrowed ? filterList(exp, meta, a) : catsBlock(exp, meta)}`;
  return `<h1 class="large-title">Progreso</h1>
    <div class="section"><div class="list picker"><a class="row row--thumb44" href="#/progreso/${meta.tag.slice(1)}">
      ${exp ? thumb(1000001, { size: 44, th: a.th }) : `<span class="thumb thumb--44 thumb--empty">TH</span>`}
      <span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${sub}</span></span>
      <svg class="chevron" viewBox="0 0 9 14" aria-hidden="true"><path d="M2 1.5 6.5 7 2 12.5M5 1.5 9 7 5 12.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
    </a><select aria-label="Cuenta" data-account>${options}</select></div></div>
    ${filterBar({ tiempo: true, recurso: true, th: true, grupo: true })}
    ${exp && inFleet ? summaryCard(a, meta) : ""}
    ${recursosCard(meta)}
    ${exp && inFleet ? rushCard(meta) : ""}
    ${links}
    ${body}
    ${exp && inFleet ? equipoSection(exp, meta) : ""}
    ${exp && inFleet && !narrowed ? builderBaseSection(exp) : ""}
`;
}

function equipoSection(exp, meta) {
  const view = viewOf(meta.tag);
  const rows = equipmentRows(exp, state.index, view.th);
  const bag = oreTotal(rows);
  const ores = `${fmtRes(bag.brillante)} brillante · ${fmtRes(bag.reluciente)} reluciente · ${fmtRes(bag.estrellada)} estrellada`;
  const row = view.cats.equipamiento;
  const pct = row && row.pct != null ? fmtPct(row.pct) : "—";
  const conTope = rows.filter((p) => !p.bloqueado).length;
  return `<div class="section">${sectionHead("Equipamiento", "No entra en la media, el plan ni el coste de la aldea. El total de la flota está en Mejoras.")}
    <ul class="list list--tiles"><li><a class="row row--tile" href="#/equipo/${meta.tag.slice(1)}">
      <span class="row__main"><span class="row__title">Piezas</span>
        <span class="row__sub">${conTope} · ${esc(pct)}</span>
        <span class="row__sub">${esc(ores)}</span>
      </span>${CHEV}</a></li></ul>
    </div>`;
}

function rushCard(meta) {
  const gaps = rushGaps(state.rows, state.index, meta.tag);
  if (!gaps.length) return "";
  const lis = gaps.map((g) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(g.label)}</span><span class="row__sub">${fmtPct(g.pct)} · TH${g.th}</span></span></div></li>`).join("");
  return `<div class="section">${sectionHead("Al subir de TH", `Hace falta más de una exportación. El aviso sale por debajo del 50 %. Los héroes de ${HEROES_FUERA} no entran en este aviso.`)}<ul class="list">${lis}</ul></div>`;
}

function filterControls(counts, filt) {
  const short = { ejercito_edif: "Ejército" };
  const chips = [{ key: "todas", label: "Todas" }].concat(villageCats().map((c) => ({ key: c.key, label: short[c.key] || c.label })));
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
  const visible = sortFilterRows(applyFilter(progressRows(exp, state.index).filter(resourceAllowsItem), {
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

const RECURSO_CAMPOS = [
  ["oro", "Oro"],
  ["elixir", "Elixir"],
  ["oscuro", "Oscuro"],
  ["brillante", "Brillante"],
  ["glowy", "Reluciente"],
  ["starry", "Estrellada"],
];

function recursoInput(clave, etiqueta, valor, prefijo) {
  const name = prefijo ? `${prefijo}${clave}` : clave;
  const v = valor == null ? "" : String(valor);
  return `<label>${esc(etiqueta)}<input inputmode="numeric" enterkeyhint="done" autocomplete="off" data-res="${esc(name)}" value="${esc(v)}" aria-label="${esc(etiqueta)}"></label>`;
}

function recursosCard(meta) {
  if (!meta) return "";
  const rec = recursosDeCuenta(meta);
  const fecha = rec && rec.actualizado ? fmtFin(rec.actualizado) : "Sin fecha";
  const abierto = !!(rec && rec.ingresos);
  const campos = RECURSO_CAMPOS.map(([clave, etiqueta]) => recursoInput(clave, etiqueta, rec && rec[clave])).join("");
  const ingresos = RECURSO_CAMPOS.map(([clave, etiqueta]) => recursoInput(clave, etiqueta, rec && rec.ingresos && rec.ingresos[clave], "ing-")).join("");
  return `<div class="section" data-recursos="${esc(meta.tag)}"><div class="card">
    <div class="section-head"><h2 class="t-headline">Recursos <span class="chip">Manual</span></h2>${infoBtn("Cifras a mano. La exportación no trae el oro ni las menas, así que no están confirmadas. Al día es un ingreso estimado.")}</div>
    <p class="t-footnote c-2">${esc(fecha)}</p>
    <div class="res-grid">${campos}</div>
    <button type="button" class="btn btn--plain" data-recursos-dia aria-pressed="${abierto ? "true" : "false"}" aria-expanded="${abierto ? "true" : "false"}">Al día</button>
    <div class="res-grid" data-recursos-ingresos ${abierto ? "" : "hidden"}>${ingresos}</div>
    <button type="button" class="btn btn--primary btn--block" data-recursos-save>Guardar</button>
  </div></div>`;
}

const NOMBRE_FALTA = {
  oro: "oro",
  elixir: "elixir",
  oscuro: "oscuro",
  brillante: "brillante",
  glowy: "reluciente",
  starry: "estrellada",
  muros: "oro o elixir",
};

function textoCubrir(res) {
  if (!res) return "";
  if (res.alcanza) return "Te alcanza";
  const orden = ["oro", "elixir", "oscuro", "muros", "brillante", "glowy", "starry"];
  const bits = [];
  for (const clave of orden) {
    if (!(clave in res.falta)) continue;
    const valor = res.falta[clave];
    const nombre = NOMBRE_FALTA[clave] || clave;
    bits.push(valor == null ? `sin ${nombre}` : `faltan ${fmtRes(valor)} ${nombre}`);
  }
  let line = bits.join(" · ") || "Falta";
  if (res.dias) line += ` · ~${res.dias} d`;
  return line;
}

function siguientePaso(road) {
  const list = (road.orden || []).filter((s) => s.inicio != null);
  list.sort((a, b) => a.inicio - b.inicio || String(a.title).localeCompare(String(b.title), "es"));
  return list[0] || (road.orden || [])[0] || null;
}

function costeObjetivo(road) {
  const base = road.rush ? road.rush.coste : road.coste;
  if (road.rush || !(road.targetTh > road.currentTh)) return base;
  const extra = costeThRango(road.currentTh, road.targetTh);
  if (!extra) return base;
  return { ...base, oro: (base.oro || 0) + extra.oro };
}

function coberturaCard(meta, road) {
  const rec = recursosDeCuenta(meta);
  if (!rec) return "";
  const paso = siguientePaso(road);
  const sig = paso ? cubrir(rec, costeDePaso(paso)) : null;
  const obj = cubrir(rec, costeObjetivo(road));
  const nombre = paso ? `${paso.title} Nv ${paso.fromLvl} → ${paso.toLvl}` : "Nada pendiente";
  const sigTxt = paso ? textoCubrir(sig) : "Nada pendiente";
  const cls = (res, vacio) => (vacio || (res && res.alcanza) ? "cubre-ok" : "cubre-no");
  return `<div class="section" data-cobertura><div class="card">
    <div class="section-head"><h2 class="t-headline">¿Alcanza? <span class="chip">Manual</span></h2>${infoBtn("Con las cifras a mano de la cuenta. Sin esas cifras, el plan no cambia.")}</div>
    <p class="t-body ${cls(sig, !paso)}">Siguiente · ${esc(nombre)}: ${esc(sigTxt)}</p>
    <p class="t-body ${cls(obj, false)}">Objetivo: ${esc(textoCubrir(obj))}</p>
  </div></div>`;
}

function summaryCard(a) {
  const info = `Media del máximo de TH${a.th}.${a.thSig ? ` TH${a.thSig}: ${fmtPct(a.sigMedia)}.` : ""} Ofensiva: media de laboratorio y héroes.${a.thSig ? ` TH${a.thSig}: ${fmtPct(a.sigOffense)}.` : ""}`;
  return `<div class="section"><div class="card">
    <div class="section-head"><h2 class="t-headline">Resumen</h2>${infoBtn(info)}</div>
    <div class="summary">
      <div><p class="t-footnote c-2">Media</p><p class="t-title1 num">${fmtPct(a.media)}</p></div>
      <div><p class="t-footnote c-2">Ofensiva</p><p class="t-title1 num">${fmtPct(a.offense)}</p></div>
    </div>
  </div></div>`;
}

function catsBlock(exp, meta) {
  const a = viewOf(meta.tag);
  const allow = allowedCats(exp, a.th);
  const cats = villageCats().filter((c) => !allow || allow.has(c.key));
  const legend = a.thSig
    ? `Relleno: nivel actual · Marca: máximo TH${a.th} · Final: máximo TH${a.thSig}`
    : `Relleno: nivel actual frente al máximo de TH${a.th}`;
  const rows = cats.map((c) => catRow(exp, meta, a, c)).join("");
  const showWalls = (!allow || allow.has("muros")) && state.filters.recurso !== "oscuro" && state.filters.recurso !== "otros";
  const showHeroes = !allow || allow.has("heroes");
  if (!cats.length) {
    return `<div class="section"><div class="card empty"><p class="t-title3">Nada con ese recurso</p><p class="t-subhead c-2">Prueba otro recurso o vuelve a Todos.</p></div></div>`;
  }
  return `<div class="section">${sectionHead("Aldea", legend)}<ul class="list">${rows}</ul></div>
    ${showWalls ? wallsCard(a) : ""}
    ${showHeroes ? heroesCard(a) : ""}`;
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
    const line = levelLine(h);
    const lvl = h.lvl == null ? 0 : h.lvl;
    const name = nameOf(h.id) || "Héroe";
    const aria = heroAria(name, h, line);
    const title = rowTitle(name);
    if (!line.bar) {
      return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
        ${thumb(h.id, { size: 40, lvl: h.lvl })}
        <span class="row__main">${title}<span class="row__sub">${esc(line.text)}</span></span>
      </button></li>`;
    }
    const p = h.max ? (lvl / h.max) * 100 : 0;
    const maxed = lvl >= h.max;
    return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}" data-max="${h.max || ""}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
      ${thumb(h.id, { size: 40, lvl: h.lvl })}
      <span class="row__main">${title}<span class="row__sub num">${esc(line.text)}</span></span>
      <span class="row__trail">${barHtml("heroes", p, null, { mini: true, maxed, decorative: true })}</span>
    </button></li>`;
  }).join("");
  return `<div class="section"><div class="section-header"><span>Héroes</span></div><ul class="list">${rows}</ul></div>`;
}

function eqHeroes() {
  return HERO_ORDER.filter((id) => state.index.items[id]).map((id) => ({
    id,
    nombreEn: state.index.items[id].nombre_en,
    nombre: nameOf(id) || state.index.items[id].nombre_en,
  }));
}

function elegidosDe(tag) {
  const list = state.eqElegidos[tag];
  return Array.isArray(list) ? list : [];
}

function oreTiles(bag) {
  const cell = (n, label) => `<div><b class="num">${fmtRes(n)}</b><span>${label}</span></div>`;
  return `<div class="eq-ores">${cell(bag.brillante, "Brillante")}${cell(bag.reluciente, "Reluciente")}${cell(bag.estrellada, "Estrellada")}</div>`;
}

function oreCard(bag, note) {
  const falta = bag.sinCoste
    ? `<p class="t-footnote c-2">${bag.sinCoste === 1 ? "1 nivel no tiene fila en la fuente y no cuenta como cero." : `${bag.sinCoste} niveles no tienen fila en la fuente y no cuentan como cero.`}</p>`
    : "";
  return `<div class="section"><div class="card eq-total">
      <h2 class="t-headline">Total para maxear todo el equipamiento</h2>
      ${oreTiles(bag)}
      <p class="t-footnote c-2">${esc(note)} Este total no cambia con los filtros.</p>
      ${falta}
    </div></div>`;
}

function eqLevelRows(row) {
  if (!row.pendientes.length) return "";
  const lis = row.pendientes.map((step) => {
    const cost = step.mena
      ? `${fmtRes(step.mena.brillante)} brillante · ${fmtRes(step.mena.reluciente)} reluciente · ${fmtRes(step.mena.estrellada)} estrellada`
      : "Sin coste en la fuente";
    return `<li class="eq-lv"><b class="num">Nv ${step.nivel}</b><span>${esc(cost)}</span></li>`;
  }).join("");
  return `<ul class="eq-lvs">${lis}</ul>`;
}

function eqPiece(row, tag, elegidos) {
  const elegido = elegidos.includes(row.id);
  const rare = rarezaEs(row.rareza);
  let estado;
  if (row.bloqueado) {
    const donde = row.unlockTh != null ? `disponible en TH${row.unlockTh}` : "sin tope en este ayuntamiento";
    estado = row.lvl != null ? `Nv ${row.lvl} · bloqueado · ${donde}` : `Bloqueado · ${donde}`;
  } else if (row.overMax) {
    estado = `Nv ${row.lvl} · máximo desactualizado (máx. ${row.max})`;
  } else if (row.max != null && row.lvl >= row.max) {
    estado = `Nv ${row.lvl} / ${row.max} · al máximo`;
  } else {
    const n = row.pendientes.length;
    estado = `Nv ${row.lvl} / ${row.max} · ${n === 1 ? "1 nivel restante" : `${n} niveles restantes`}`;
  }
  const aria = [row.nombre, rare, estado, elegido ? "elegida para ocultar" : ""].filter(Boolean).join(", ");
  return `<li class="eq-piece${elegido ? " is-elegido" : ""}">
      <div class="eq-piece__top">
        <button type="button" class="eq-piece__open" data-ficha="${row.id}" data-lvl="${row.lvl == null ? "" : row.lvl}" data-max="${row.max || ""}"${row.unlockTh != null ? ` data-unlock="${row.unlockTh}"` : ""} aria-label="${esc(aria)}">
          ${thumb(row.id, { size: 52, lvl: row.lvl })}
          <span class="row__main"><span class="row__title">${esc(row.nombre)}${elegido ? ` <span class="chip chip--muted">Elegida</span>` : ""}</span>
            <span class="row__sub">${esc([rare, estado].filter(Boolean).join(" · "))}</span>
          </span>
        </button>
        <button type="button" class="btn-text" data-eq-elegir="${esc(row.id)}" data-eq-tag="${esc(tag)}" aria-pressed="${elegido ? "true" : "false"}">${elegido ? "Quitar" : "Elegir"}</button>
      </div>
      ${eqLevelRows(row)}
    </li>`;
}

function eqCell(p) {
  const name = p.unknown ? "Sin identificar" : (nameOf(p.id) || "Pieza");
  const level = p.max != null && !p.overMax ? `nivel ${p.lvl} de ${p.max}` : `nivel ${p.lvl}`;
  const aria = p.unknown
    ? `Sin identificar, ID ${p.id}, nivel ${p.lvl}`
    : [name, level, p.overMax ? "máximo desactualizado" : ""].filter(Boolean).join(", ");
  const cls = [p.unknown ? "is-unknown" : "", p.lvl <= 1 ? "is-lvl1" : "", p.max && p.lvl >= p.max && !p.overMax ? "is-max" : "", p.overMax ? "is-over" : ""].filter(Boolean).join(" ");
  const cap = p.unknown
    ? `<span class="eq__cap">sin identificar</span>`
    : (p.overMax
      ? `<span class="eq__cap eq__cap--warn">máx. ${p.max}</span>`
      : (p.meta && p.meta.estado === "faltante" ? `<span class="eq__cap">${esc(name)}</span>` : ""));
  const box = p.unknown
    ? `<span class="thumb thumb--52 thumb--unknown" aria-hidden="true">?</span>`
    : thumb(p.id, { size: 52, lvl: p.lvl });
  return `<li><button class="eq ${cls}" data-ficha="${p.id}" data-lvl="${p.lvl}" data-max="${p.max || ""}"${p.unlockTh != null ? ` data-unlock="${p.unlockTh}"` : ""} aria-label="${esc(aria)}">${box}<span class="eq__lvl num">${p.lvl}</span>${cap}</button></li>`;
}

function renderDetalle(tag, catKey) {
  const meta = accountByTag(tag);
  const exp = expOf(tag);
  const cat = CATEGORIES.find((c) => c.key === catKey);
  if (!meta || !exp || !cat) return `<div class="section"><div class="card empty"><p class="t-title3">No hay datos</p></div></div>`;
  const a = viewOf(tag);
  if (catKey === "muros") return renderMuros(a);
  const row = a.cats[catKey];
  const items = categoryItems(exp, state.index, catKey, a.th).filter((it) => resourceAllowsItem({ ...it, categoryKey: catKey }));
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
  return head + blocks;
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
  const title = unknown ? "Sin identificar" : (nameOf(it.id) || "Ítem");
  const idBadge = unknown ? `<span class="badge badge-id">${esc(it.id)}</span>` : "";
  const cnt = it.cnt > 1 ? `×${it.cnt}` : "";
  const extras = `${cnt ? `<span class="num">${cnt}</span>` : ""}${idBadge}`;
  const aria = detailAria(title, it, a, { unknown });
  return `<li><button class="row row--thumb40${unknown ? " is-unknown" : ""}" data-ficha="${it.id}" data-lvl="${lv.lvl}" data-max="${it.max || ""}"${it.unlockTh != null ? ` data-unlock="${it.unlockTh}"` : ""} aria-label="${esc(aria)}">
    ${thumb(it.id, { size: 40, lvl: lv.lvl })}
    <span class="row__main">${rowTitle(title, extras)}<span class="row__sub num">${esc(lv.text)}</span></span>
    ${lv.bar}
  </button></li>`;
}

function renderMuros(a) {
  const filtro = state.filters.recurso;
  if (filtro === "oscuro" || filtro === "otros") {
    return `<div class="section"><div class="card empty"><p class="t-title3">Los muros no usan ese recurso</p><p class="t-subhead c-2">Se pagan con oro o con elixir, uno de los dos.</p></div></div>`;
  }
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
`;
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
    const idBadge = unknown ? `<span class="badge badge-id">${esc(id)}</span>` : "";
    const lvl = it.lvl || 0;
    return `<li><button class="row row--thumb40${unknown ? " is-unknown" : ""}" data-ficha="${id}" data-lvl="${lvl}">
      ${thumb(id, { size: 40, lvl })}
      <span class="row__main">${rowTitle(title, idBadge)}<span class="row__sub num">Nv ${lvl}</span></span>
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
  const mode = state.mejorasMode === "costes" || state.mejorasMode === "equipo" ? state.mejorasMode : "plan";
  const n = allAccounts().filter((r) => expOf(r.tag)).length;
  const body = mode === "costes" ? mejorasCostes() : mode === "equipo" ? mejorasEquipo() : mejorasPlan();
  const tab = (id, label) => `<button type="button" role="tab" data-mej="${id}" aria-selected="${mode === id}">${label}</button>`;
  return `<h1 class="large-title">Mejoras</h1>
    <p class="large-sub">${n === 1 ? "1 cuenta" : `${n} cuentas`}</p>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Mejoras">
      ${tab("plan", "Plan")}${tab("costes", "Costes")}${tab("equipo", "Equipo")}
    </div></div>
    ${body}
  `;
}

function mejorasPlan() {
  const rows = allAccounts().map((meta) => {
    const exp = expOf(meta.tag);
    const road = exp ? accountRoadmap(meta) : null;
    const label = road ? planLabel(road.plan, road.currentTh) : "Sin datos";
    const th = road && road.currentTh != null ? `TH${road.currentTh}` : "";
    const fin = road && road.rush && road.rush.fin ? fmtFin(road.rush.fin) : road && road.fin ? fmtFin(road.fin) : "";
    const sub = [th, label, fin].filter(Boolean).join(" · ");
    const thumbHtml = exp ? thumb(1000001, { size: 44, th: viewOf(meta.tag).th }) : "";
    return `<li><a class="row row--tile" href="#/progreso/${meta.tag.slice(1)}/plan">${thumbHtml}<span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(sub)}</span></span>${CHEV}</a></li>`;
  }).join("");
  return `<div class="section">${sectionHead("Plan", "Maxear o rushear, por cuenta. Rush esencial es el mínimo para subir el ayuntamiento. Rush estratégico suma sugerencias que se pueden quitar.")}<ul class="list list--tiles">${rows || `<li><div class="card empty"><p class="t-title3">Sin cuentas</p></div></li>`}</ul></div>`;
}

function mejorasEquipo() {
  const flota = `<li><a class="row" href="#/equipo"><span class="row__main"><span class="row__title">Flota</span></span>${CHEV}</a></li>`;
  const rows = allAccounts().filter((meta) => expOf(meta.tag)).map((meta) => {
    const a = viewOf(meta.tag);
    return `<li><a class="row row--tile" href="#/equipo/${meta.tag.slice(1)}">${thumb(1000001, { size: 44, th: a.th })}<span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">TH${a.th}</span></span>${CHEV}</a></li>`;
  }).join("");
  return `<div class="section">${sectionHead("Equipamiento", "Piezas de héroe y menas. No entra en la media ni en el plan.")}<ul class="list list--tiles">${flota}${rows}</ul></div>`;
}

function mejorasEnCurso() {
  const all = [];
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    for (const u of upgrades(exp)) all.push({ ...u, meta, exp });
  }
  const vista = state.cursoVista === "cuenta" ? "cuenta" : "fin";
  const chip = (id, label) => `<button type="button" data-curso="${id}" aria-pressed="${vista === id}">${label}</button>`;
  const chips = `<div class="chip-row" role="toolbar" aria-label="En curso">${chip("fin", "Por fin")}${chip("cuenta", "Por cuenta")}</div>`;
  if (!all.length) return `${chips}<div class="section"><div class="card empty"><p class="t-title3">—</p></div></div>`;
  const active = all.filter((u) => !u.done);
  if (vista === "cuenta") return chips + mejorasPorCuenta();
  if (!active.length && all.every((u) => u.done)) return `${chips}<div class="section"><div class="card empty"><p class="t-title3">—</p></div></div>`;
  return chips + mejorasPorFin(all);
}

function mejorasCostes() {
  return allAccounts().map((meta) => {
    const exp = expOf(meta.tag);
    if (!exp) return "";
    const a = viewOf(meta.tag);
    return `<div class="section"><div class="card acct-tile">
        ${thumb(1000001, { size: 52, th: a.th })}
        <div class="acct-tile__main"><div class="section-head"><div class="t-headline acct-tile__name">${esc(meta.nombre)}</div>${infoBtn(`Hasta el máximo de TH${a.th}. Ese total no incluye subir el ayuntamiento: va en su propia línea.`)}</div>
        </div>
      </div>${costCard(exp, a.th, true)}</div>`;
  }).join("");
}

function mejorasPorFin(all) {
  const free = [];
  let vencidosCtor = 0;
  for (const row of fleetRows()) {
    vencidosCtor += row.builders.vencidos || 0;
    if (row.builders.known && !row.builders.over && row.builders.free > 0) free.push({ meta: accountByTag(row.tag), b: row.builders });
  }
  const libreInfo = free.length
    ? `${free.length === 1 ? "1 cuenta" : `${free.length} cuentas`} con constructores libres en la exportación.`
    : "";
  const estimadoInfo = vencidosCtor
    ? `${vencidosCtor === 1 ? "1 temporizador de constructor ya habría acabado" : `${vencidosCtor} temporizadores de constructor ya habrían acabado`}. Es una estimación de la última exportación, no un constructor confirmado.`
    : "";
  const freeCard = free.length ? `<div class="section"><div class="card"><div class="chip-cloud">${free.map(({ meta, b }) => {
        const a = viewOf(meta.tag);
        return `<span class="chip chip--account">${thumb(1000001, { size: 22, pad: 1, th: a.th })} ${esc(meta.chip)} ${b.free}</span>`;
      }).join("")}</div></div></div>` : "";
  const done = all.filter((u) => u.done);
  const pending = all.filter((u) => !u.done).sort((a, b) => a.end - b.end || rosterIndex(a.meta.tag) - rosterIndex(b.meta.tag));
  const doneBlock = done.length ? `<div class="section">${sectionHead("Estimadas", "Pendiente de reimportar. No es un constructor confirmado.")}<ul class="list">${done.map(upRow).join("")}</ul></div>` : "";
  const byDay = new Map();
  for (const u of pending) {
    const key = madridDayKey(u.end);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(u);
  }
  for (const list of byDay.values()) list.sort((a, b) => rosterIndex(a.meta.tag) - rosterIndex(b.meta.tag) || a.end - b.end);
  const days = [...byDay.entries()].map(([key, list]) => `<div class="section"><div class="section-header"><span>${esc(dayHeading(list[0].end, state.now))}</span></div><ul class="list">${list.map(upRow).join("")}</ul></div>`).join("");
  return `<div class="section">${sectionHead("En curso", [libreInfo, estimadoInfo].filter(Boolean).join(" "))}</div>` + freeCard + doneBlock + days + helpersBlock();
}

function mejorasPorCuenta() {
  return allAccounts().map((meta) => {
    const exp = expOf(meta.tag);
    if (!exp) return "";
    const a = viewOf(meta.tag);
    const b = builderStatus(exp);
    const colas = estadoColas(exp, state.now, { staleMs: staleLimit(), th: a.th });
    const list = upgrades(exp);
    const labN = list.filter((u) => u.queue === "laboratorio" && !u.done).length;
    const petN = list.filter((u) => u.queue === "mascotas" && !u.done).length;
    const bob = list.filter((u) => u.extra && u.queue === "constructor").length;
    const slots = slotsHtml(b, labN, petN, a.th >= 14);
    const notas = [];
    if (colas.desactualizada) notas.push("Necesita actualización. Se conserva el último plan.");
    if (colas.builders.vencidos) notas.push(colas.builders.vencidos === 1 ? "1 temporizador ya habría acabado (estimado). No es un constructor confirmado." : `${colas.builders.vencidos} temporizadores ya habrían acabado (estimado). No es un constructor confirmado.`);
    notas.push(`Tiempos desde la exportación de ${fmtWhen(exp.timestamp * 1000)}.`);
    return `<div class="section"><div class="card acct-tile">
        ${thumb(1000001, { size: 52, th: a.th })}
        <div class="acct-tile__main"><div class="section-head"><div class="t-headline acct-tile__name">${esc(meta.nombre)}</div>${infoBtn(notas.join(" "))}</div>
          ${meterHtml(a.media, `Media ${fmtPct(a.media)}`)}
          ${builderHead(b, bob)}
          ${slots}
        </div>
      </div><ul class="list">${list.map((u) => upRow({ ...u, meta, exp })).join("") || ""}</ul></div>`;
  }).join("");
}

/** Las chozas salen aparte. B.O.B ya va en el total de huecos, no en este rótulo. */
function builderCaption(status, bob) {
  return {
    chozas: status && status.known ? (status.chozas != null ? status.chozas : status.total) : null,
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
  const level = u.nuevo ? "Nuevo" : `Nv ${u.lvl} → ${u.lvl + 1}`;
  const remain = u.done ? "Estimada" : (fmtRemain(u.end, state.now) || "en < 1 min");
  const soon = !u.done && u.end - state.now < 3600000;
  const queue = u.extra && u.queue === "constructor" ? "B.O.B" : (QUEUE_LABEL[u.queue] || u.queue);
  return `<li><div class="row row--upgrade row--thumb40${unknown ? " is-unknown" : ""}">
    ${thumb(u.id, { size: 40, lvl: u.lvl })}
    <span class="row__main">${rowTitle(title)}
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
      ${thumb(h.id, { size: 40, lvl: h.lvl })}
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
`;
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
  const preN = state.peso && state.peso.precache_instalacion_archivos;
  let note = preN
    ? `Al instalar se guardan ${preN} imágenes. El resto se guarda al verlas por primera vez. Recomendado con wifi.`
    : "El resto de imágenes se guarda al verlas por primera vez. Recomendado con wifi.";
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
      <div class="sheet__body">${importBody()}</div>
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
      ${thumb(row.id, { size: 40, lvl: row.lvl })}
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
  await savePlan(plan, { sheet: true });
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

function finesDeCalendario() {
  const eventos = [];
  for (const meta of allAccounts()) {
    const exp = expOf(meta.tag);
    if (!exp) continue;
    for (const u of upgrades(exp)) {
      if (u.extra || u.done || !Number.isFinite(u.end)) continue;
      const nombre = itemName(state.index.items[u.id]) || "Mejora";
      eventos.push({
        uid: `cp-${meta.tag.replace("#", "")}-${u.id}-${u.lvl}-${u.end}@clash-progreso`,
        titulo: `${meta.nombre}: ${nombre}`,
        fin: u.end,
      });
    }
  }
  return eventos;
}

async function exportarCalendario() {
  const eventos = finesDeCalendario();
  if (!eventos.length) {
    showToast("err", "No hay un fin por anotar.");
    render();
    return;
  }
  const name = "clash-progreso.ics";
  const blob = new Blob([textoIcs(eventos, { ahora: state.now })], { type: "text/calendar" });
  const file = new File([blob], name, { type: "text/calendar" });
  if (typeof navigator !== "undefined" && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: name });
      showToast("ok", "Calendario listo");
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
  showToast("ok", "Calendario listo");
  render();
}

async function exportBackup() {
  const now = Date.now();
  const payload = buildBackup(camposCopia({ now }));
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
  const merged = mergeBackup({
    accounts: state.accounts,
    exports: state.rows,
    planes: state.planes,
    provisionales: state.provisionales,
    sueno: state.sleep,
    documentos: state.documentos,
  }, data);
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
  state.planes = merged.planes || {};
  state.provisionales = merged.provisionales || [];
  if (merged.sueno) state.sleep = { desde: merged.sueno.desde || "", hasta: merged.sueno.hasta || "" };
  if (Array.isArray(merged.documentos)) state.documentos = merged.documentos;
  savePlanes();
  saveProvisionals();
  saveSleep(state.sleep.desde, state.sleep.hasta);
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
      <div class="sheet__body"><div class="ficha">${inner}</div></div>
    </div>`;
}

function fichaArt(id, item, lvl) {
  const fastKey = lvl != null && item && item.imagenes_por_nivel && item.imagenes_por_nivel[String(lvl) + "-fast-attack"]
    ? String(lvl) + "-fast-attack"
    : null;
  if (!fastKey) {
    return `<div style="display:flex;justify-content:center">${thumb(id, { size: 96, ficha: true, lvl })}</div>`;
  }
  return `<div class="ficha-modes">
      <figure>${thumb(id, { size: 72, ficha: true, lvl })}<figcaption class="t-footnote c-2">Largo alcance</figcaption></figure>
      <figure>${thumb(id, { size: 72, ficha: true, levelKey: fastKey })}<figcaption class="t-footnote c-2">Ataque rápido</figcaption></figure>
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
  if (unknown) badges.push(`<span class="badge">sin identificar</span>`);
  const notes = [];
  const choice = item ? imageChoice(item, f.lvl) : null;
  if (choice && choice.im && choice.im.official === false) notes.push(`<p class="t-footnote c-2">Imagen no oficial</p>`);
  else if (item && item.estado === "faltante") notes.push(`<p class="t-footnote c-2">Sin imagen oficial en el Fan Kit</p>`);
  if (item && item.nombre_pendiente) notes.push(`<p class="t-footnote c-2">Nombre en español sin confirmar</p>`);
  if (item && (item.rareza || item.heroe)) {
    const parts = [];
    if (item.rareza) parts.push(rarezaEs(item.rareza));
    if (item.heroe) parts.push(heroLabel(item.heroe));
    notes.push(`<p class="t-footnote c-2">${esc(parts.join(" · "))}</p>`);
  }
  const line = levelLine(f);
  const over = overMaxLabel(f.lvl, f.max);
  const overChip = over ? ` <span class="chip chip--warn">${esc(over)}</span>` : "";
  const marca = item ? imageChoice(item, f.lvl).marca : null;
  const marcaHtml = marca ? `<p class="t-footnote c-2 ficha-marca" data-level-note>${esc(marca)}</p>` : "";
  return fichaFrame(`
        ${fichaArt(f.id, item, f.lvl)}
        ${marcaHtml}
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

function levelCard(list) {
  const kinds = [["th", "TH"], ["heroes", "Héroes"], ["estructuras", "Estructuras"], ["muros", "Muros"], ["lab", "Laboratorio"], ["mascotas", "Mascotas"], ["cara", "Cara a cara"], ["mismo", "Mismo TH"], ["ritmo", "Ritmo"]];
  const chips = kinds.map(([id, label]) => filterChip("data-level-kind", id, label, state.levelKind === id)).join("");
  const body = levelBody(list, state.levelKind);
  return `<div class="card"><h2 class="t-headline">Niveles</h2><p class="t-footnote c-2">Niveles de la exportación, no porcentajes. Con una sola importación hay un punto: no se inventan más. El equipamiento no entra aquí.</p><div class="chip-row" role="toolbar" aria-label="Vista de niveles">${chips}</div>${body}</div>`;
}

function levelBody(list, kind) {
  if (kind === "th") {
    const rows = list.map((meta) => {
      const points = state.rows.filter((r) => r.tag === meta.tag).slice().sort((a, b) => a.timestamp - b.timestamp)
        .map((exp) => `TH${townHallLevel(exp)} · ${madridDayKey(exp.timestamp * 1000)}`);
      return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(points.join(" → ") || "Sin datos")}</span></span></div></li>`;
    }).join("");
    return `<ul class="list">${rows}</ul>`;
  }
  if (kind === "heroes" || kind === "mascotas") {
    const rows = list.map((meta) => {
      const view = viewOf(meta.tag);
      const source = kind === "heroes" ? (view && view.heroes) || [] : (view && view.pets) || [];
      const bits = source.filter((h) => h.max != null).map((h) => `${nameOf(h.id) || "Ítem"} ${h.lvl}/${h.max}`);
      return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(bits.join(" · ") || "Sin niveles")}</span></span></div></li>`;
    }).join("");
    return `<ul class="list">${rows}</ul>`;
  }
  if (kind === "estructuras" || kind === "lab") {
    const keys = kind === "lab" ? ["laboratorio"] : ["defensas", "recursos", "ejercito_edif", "trampas", "muros"];
    const rows = list.map((meta) => {
      const exp = expOf(meta.tag);
      const view = viewOf(meta.tag);
      if (!exp || !view) return "";
      const bits = keys.map((key) => {
        const items = key === "muros"
          ? (view.walls && view.walls.hist || []).filter((h) => h.cnt)
          : categoryItems(exp, state.index, key, view.th).filter((it) => it.max != null && !it.capsOnly);
        let sum = 0;
        let n = 0;
        let at = 0;
        if (key === "muros") {
          for (const h of items) { sum += h.lvl * h.cnt; n += h.cnt; if (view.walls.max != null && h.lvl >= view.walls.max) at += h.cnt; }
        } else {
          for (const it of items) {
            const cnt = it.cnt || 1;
            sum += (it.lvl || 0) * cnt;
            n += cnt;
            if ((it.lvl || 0) >= it.max) at += cnt;
          }
        }
        const mean = n ? Math.round((sum / n) * 10) / 10 : null;
        const label = (CATEGORIES.find((c) => c.key === key) || {}).label || key;
        return mean == null ? "" : `${label} ${fmtNum(mean)} · ${at} al máximo`;
      }).filter(Boolean);
      return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(bits.join(" · "))}</span></span></div></li>`;
    }).join("");
    return `<ul class="list">${rows}</ul>`;
  }
  if (kind === "muros") {
    const rows = list.map((meta) => {
      const view = viewOf(meta.tag);
      const hist = (view && view.walls && view.walls.hist || []).filter((h) => h.cnt);
      const bits = hist.map((h) => `Nv ${h.lvl} × ${h.cnt}`);
      return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(bits.join(" · ") || "Sin muros")}</span></span></div></li>`;
    }).join("");
    return `<ul class="list">${rows}</ul>`;
  }
  if (kind === "cara") {
    const picked = compareAccounts(fleetRows(list), state.compareTags);
    if (picked.length < 2) return `<p class="t-footnote c-2">Marca de 2 a 3 cuentas en Ranking para verlas juntas.</p>`;
    const ids = new Set();
    for (const row of picked) for (const h of (viewOf(row.tag) && viewOf(row.tag).heroes) || []) ids.add(h.id);
    const lines = [...ids].map((id) => {
      const cells = picked.map((row) => {
        const h = ((viewOf(row.tag) && viewOf(row.tag).heroes) || []).find((x) => x.id === id);
        return `${row.nombre} ${h && h.lvl != null ? h.lvl : "—"}/${h && h.max != null ? h.max : "—"}`;
      });
      return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(nameOf(id) || "Héroe")}</span><span class="row__sub">${esc(cells.join(" · "))}</span></span></div></li>`;
    }).join("");
    return `<ul class="list">${lines}</ul>`;
  }
  if (kind === "mismo") {
    const groups = new Map();
    for (const meta of list) {
      const view = viewOf(meta.tag);
      if (!view || view.th == null) continue;
      if (!groups.has(view.th)) groups.set(view.th, []);
      groups.get(view.th).push(meta);
    }
    const blocks = [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([th, metas]) => {
      if (metas.length < 2) return "";
      const bits = metas.map((meta) => `${meta.nombre} ${fmtPct(viewOf(meta.tag).media)}`);
      return `<li><div class="row"><span class="row__main"><span class="row__title">TH${th}</span><span class="row__sub">${esc(bits.join(" · "))}</span></span></div></li>`;
    }).join("");
    return blocks ? `<ul class="list">${blocks}</ul>` : `<p class="t-footnote c-2">No hay dos cuentas con el mismo TH en este filtro.</p>`;
  }
  const rows = list.map((meta) => {
    const pace = weeklyPace(pairsOf(meta.tag));
    const text = pace.ritmo == null ? "Hacen falta dos importaciones. No se inventa un ritmo de 0." : `${fmtNum(pace.ritmo)} niveles por semana · ${pace.total} niveles`;
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(meta.nombre)}</span><span class="row__sub">${esc(text)}</span></span></div></li>`;
  }).join("");
  return `<ul class="list">${rows}</ul>`;
}

function renderEquipoFlota(list) {
  const accounts = list.map((meta) => {
    const exp = expOf(meta.tag);
    const view = viewOf(meta.tag);
    return {
      tag: meta.tag,
      nombre: meta.nombre,
      th: view ? view.th : null,
      piezas: equipmentRows(exp, state.index, view && view.th),
    };
  });
  const { total, filas } = fleetOre(accounts);
  const rows = filas.map((row) => `<li><button type="button" class="row row--tile" data-eq-cuenta="${esc(row.tag)}">
      <span class="row__main"><span class="row__title">${esc(row.nombre)}</span>
        <span class="row__sub">TH${row.th == null ? "—" : row.th} · ${fmtRes(row.bag.brillante)} brillante · ${fmtRes(row.bag.reluciente)} reluciente · ${fmtRes(row.bag.estrellada)} estrellada</span>
      </span>${CHEV}</button></li>`).join("");
  return `${oreCard(total, `${filas.length === 1 ? "1 cuenta" : `${filas.length} cuentas`}. Cada una usa el tope de su ayuntamiento.`)}
    <div class="section"><div class="section-header"><span>Por cuenta</span></div><ul class="list list--tiles">${rows}</ul>
    <p class="section-footer">Fuente: <a href="${esc(COST_URL)}" target="_blank" rel="noopener noreferrer">${esc(COST_SOURCE)}</a>.</p></div>`;
}

function renderEquipoCuenta(meta, list) {
  const exp = expOf(meta.tag);
  const view = viewOf(meta.tag);
  const rows = equipmentRows(exp, state.index, view.th);
  const bag = oreTotal(rows);
  const filtro = state.eqFiltro;
  const elegidos = elegidosDe(meta.tag);
  const visible = applyEqFilter(rows, filtro, elegidos);
  const heroes = eqHeroes();
  const groups = groupByHero(visible, heroes);
  const options = list.map((m) => `<option value="${esc(m.tag)}"${m.tag === meta.tag ? " selected" : ""}>${esc(m.nombre)}</option>`).join("");
  const heroOpts = [`<option value="todos"${filtro.heroe === "todos" ? " selected" : ""}>Todos los héroes</option>`]
    .concat(heroes.map((h) => `<option value="${esc(h.nombreEn)}"${filtro.heroe === h.nombreEn ? " selected" : ""}>${esc(h.nombre)}</option>`))
    .join("");
  const rare = (id, label) => `<button type="button" role="tab" data-eq-rareza="${id}" aria-selected="${(filtro.rareza || "todos") === id}">${label}</button>`;
  const cards = groups.map((g) => {
    const hero = heroes.find((h) => h.nombreEn === g.nombreEn);
    const head = hero ? thumb(hero.id, { size: 28 }) : "";
    const lis = g.piezas.map((p) => eqPiece(p, meta.tag, elegidos)).join("");
    return `<section class="card eq-group"><header class="eq-group__hdr">${head}<h3>${esc(g.nombre)}</h3><span class="num">${g.piezas.length}</span></header><ul class="eq-pieces">${lis}</ul></section>`;
  }).join("");
  const empty = `<div class="card empty"><p class="t-title3">Nada con ese filtro</p><p class="t-subhead c-2">Prueba otro héroe o muestra los bloqueados.</p></div>`;
  const ocultos = rows.filter((r) => elegidos.includes(r.id)).length;
  const row = view.cats.equipamiento;
  const pct = row && row.pct != null ? fmtPct(row.pct) : "—";
  return `<label class="sort-label">Cuenta <select data-account aria-label="Cuenta">${options}</select></label>
    ${oreCard(bag, `${meta.nombre} · TH${view.th}.`)}
    <div class="section">${sectionHead("Filtros", `Elegir aparta una pieza de la lista. La exportación no dice cuál lleva puesta el héroe.${ocultos ? ` ${ocultos === 1 ? "1 elegida." : `${ocultos} elegidas.`}` : ""} Progreso del equipamiento ${pct}. El % no cuenta piezas en nivel 1 ni sin identificar.`)}
      <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Rareza">${rare("todos", "Todos")}${rare("Common", "Común")}${rare("Epic", "Épica")}</div></div>
      <label class="sort-label">Héroe <select data-eq-heroe aria-label="Héroe">${heroOpts}</select></label>
      <div class="chip-row" role="toolbar" aria-label="Más filtros">
        <button type="button" data-eq-bloqueados aria-pressed="${filtro.bloqueados ? "true" : "false"}">Mostrar bloqueados</button>
        <button type="button" data-eq-ocultar aria-pressed="${filtro.ocultar ? "true" : "false"}">Ocultar elegidos</button>
      </div>
    </div>
    <div class="section stack">${cards || empty}</div>
    <p class="section-footer"><a href="${esc(COST_URL)}" target="_blank" rel="noopener noreferrer">Fuente</a></p>`;
}

function renderEquipo(tag) {
  const list = allAccounts().filter((meta) => expOf(meta.tag));
  const meta = (tag && accountByTag(tag)) || list.find((m) => m.tag === state.selected) || list[0];
  if (!meta || !expOf(meta.tag)) {
    return `<h1 class="large-title">Equipamiento</h1><div class="section"><div class="card empty"><p class="t-title3">Aún no hay datos</p></div></div>`;
  }
  const vista = state.eqVista === "flota" ? "flota" : "cuenta";
  const seg = (id, label) => `<button type="button" role="tab" data-eq-vista="${id}" aria-selected="${vista === id}">${label}</button>`;
  const head = `<h1 class="large-title">Equipamiento</h1>
    <div class="title-line"><p class="large-sub">${vista === "flota" ? "Flota" : esc(meta.nombre)}</p>${infoBtn("Apartado de cada cuenta, separado de la aldea. No entra en la media, el plan ni los gráficos.")}</div>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Alcance">${seg("cuenta", "Esta cuenta")}${seg("flota", "Flota")}</div></div>`;
  return head + (vista === "flota" ? renderEquipoFlota(list) : renderEquipoCuenta(meta, list));
}

function perfilAjustes(facts) {
  const rows = [];
  if (facts.constructores.known) {
    const grupos = facts.constructores.grupos.map((g) => `Nv ${g.lvl} × ${g.cnt}`).join(" · ");
    const bob = facts.bob
      ? ` ${(nameOf(facts.bob.id) || "Cabaña de B.O.B.")} Nv ${facts.bob.lvl}${facts.bob.cnt > 1 ? ` × ${facts.bob.cnt}` : ""} no entra en este número.`
      : "";
    const lvl = facts.constructores.grupos.length ? facts.constructores.grupos[facts.constructores.grupos.length - 1].lvl : null;
    rows.push(`<li><div class="row row--tile row--thumb44">
      ${thumb(1000015, { size: 44, lvl })}
      <span class="row__main"><span class="row__title">Constructores <span class="chip chip--muted">De la exportación</span></span>
        <span class="row__sub">${esc(grupos + bob)}</span></span>
      <span class="row__trail num">${facts.constructores.total}</span>
    </div></li>`);
  }
  for (const h of facts.helpers) {
    const title = nameOf(h.id) || "Ayudante";
    rows.push(`<li><div class="row row--tile row--thumb44">
      ${thumb(h.id, { size: 44, lvl: h.lvl })}
      <span class="row__main"><span class="row__title">${esc(title)} <span class="chip chip--muted">De la exportación</span></span>
        <span class="row__sub">Nivel en la exportación</span></span>
      <span class="row__trail num">Nv ${h.lvl}</span>
    </div></li>`);
  }
  if (!rows.length) return "";
  return `<div class="section"><div class="section-header"><span>Ajustes de perfil</span></div><ul class="list list--tiles">${rows.join("")}</ul>
    <p class="section-footer">Si la exportación no trae un ajuste, no se muestra.</p></div>`;
}

function perfilHeroes(view, tag) {
  if (!view) return "";
  const rows = view.heroes.map((h) => {
    const line = levelLine(h);
    const lvl = h.lvl == null ? 0 : h.lvl;
    const name = nameOf(h.id) || "Héroe";
    const aria = heroAria(name, h, line);
    const title = rowTitle(name);
    if (!line.bar) {
      return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
        ${thumb(h.id, { size: 40, lvl: h.lvl })}
        <span class="row__main">${title}<span class="row__sub">${esc(line.text)}</span></span>
      </button></li>`;
    }
    const p = h.max ? (lvl / h.max) * 100 : 0;
    const maxed = lvl >= h.max;
    return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}" data-max="${h.max || ""}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""} aria-label="${esc(aria)}">
      ${thumb(h.id, { size: 40, lvl: h.lvl })}
      <span class="row__main">${title}<span class="row__sub num">${esc(line.text)}</span></span>
      <span class="row__trail">${barHtml("heroes", p, null, { mini: true, maxed, decorative: true })}</span>
    </button></li>`;
  }).join("");
  const nota = tag === HEROES_FUERA
    ? `En ${esc(HEROES_FUERA)} los héroes quedan fuera del plan. Aquí solo se ve el nivel frente al máximo del ayuntamiento.`
    : "Nivel de la exportación frente al máximo de este ayuntamiento.";
  return `<div class="section"><div class="section-header"><span>Niveles de héroes</span></div><ul class="list">${rows}</ul><p class="section-footer">${nota}</p></div>`;
}

function perfilClan(clan) {
  if (!clan || !clan.length) return "";
  const lis = clan.map((row) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(row.etiqueta)}</span></span><span class="row__trail num">${esc(String(row.valor))}</span></div></li>`).join("");
  return `<div class="section"><div class="section-header"><span>Clan</span></div><ul class="list">${lis}</ul><p class="section-footer">Estos datos vienen en la exportación.</p></div>`;
}

function renderPerfil(tag) {
  const list = allAccounts();
  const meta = (tag && accountByTag(tag)) || list.find((m) => m.tag === state.selected) || list[0];
  if (!meta) {
    return `<h1 class="large-title">Perfil</h1><div class="section"><div class="card empty"><p class="t-title3">Aún no hay cuentas</p></div></div>`;
  }
  const options = list.map((r) => `<option value="${esc(r.tag)}"${r.tag === meta.tag ? " selected" : ""}>${esc(r.nombre)}</option>`).join("");
  const picker = `<label class="sort-label">Cuenta <select data-account aria-label="Cuenta">${options}</select></label>`;
  const exp = expOf(meta.tag);
  if (!exp) {
    return `<h1 class="large-title">Perfil</h1>
      <p class="large-sub">${esc(meta.nombre)} · <span class="tag">${esc(meta.tag)}</span></p>
      ${picker}
      <div class="section"><div class="card empty"><p class="t-title3">Esta cuenta aún no tiene exportación</p><p class="t-subhead c-2">El perfil muestra solo lo que trae el JSON.</p></div></div>`;
  }
  const facts = exportFacts(exp);
  const view = viewOf(meta.tag);
  const th = facts.th == null ? "—" : `TH${facts.th}`;
  const tiles = [`<div><b class="num">${esc(th)}</b><span>Ayuntamiento</span></div>`];
  if (facts.casaConstructor != null) {
    tiles.push(`<div><b class="num">${facts.casaConstructor}</b><span>Casa del constructor</span></div>`);
  }
  const when = facts.timestamp ? `Exportación del ${fmtWhen(facts.timestamp * 1000)}` : "Sin fecha en la exportación";
  const nombre = meta.nombre === meta.tag ? `<span class="tag">${esc(meta.tag)}</span>` : esc(meta.nombre);
  return `<h1 class="large-title">Perfil</h1>
    <p class="large-sub">Solo lo que trae la exportación de esta cuenta.</p>
    ${picker}
    <div class="section"><div class="card perfil-head">
      <div class="perfil-id">
        ${thumb(1000001, { size: 72, th: facts.th })}
        <span class="row__main">
          <span class="row__title">${nombre}</span>
          <span class="row__sub"><span class="tag">${esc(facts.tag || meta.tag)}</span></span>
        </span>
      </div>
      <div class="perfil-tiles">${tiles.join("")}</div>
      <p class="t-footnote c-2 perfil-note">${esc(when)}. El nombre es el de la cuenta: el JSON no trae el del jugador.</p>
    </div></div>
    ${perfilAjustes(facts)}
    ${perfilHeroes(view, meta.tag)}
    ${perfilClan(facts.clan)}`;
}

function screenFor(r) {
  if (!state.ready) {
    return `<h1 class="large-title">Clash Progreso</h1><div class="section"><div class="card"><div class="sk sk--line"></div></div></div>`;
  }
  if (r.name === "inicio" && r.sub) return renderAtencion(r);
  if (r.name === "inicio") return renderInicio();
  if (r.name === "roster" && r.sub) return renderAtencion(r);
  if (r.name === "roster" || r.name === "ajustes" || r.name === "importar") return renderRoster();
  if (r.name === "progreso") return renderProgreso(r.tag || state.selected);
  if (r.name === "detalle") return renderDetalle(r.tag, r.cat);
  if (r.name === "mejoras") return renderMejoras();
  if (r.name === "graficos" || r.name === "evolucion") return renderGraficos();
  if (r.name === "copia") return renderCopia();
  if (r.name === "ahora") return renderAhora();
  if (r.name === "ranking") return renderRanking();
  if (r.name === "agenda" && r.sub) return renderAtencion(r);
  if (r.name === "agenda") return renderAgenda();
  if (r.name === "plan") return renderPlan(r.tag);
  if (r.name === "historial") return renderHistorial(r.tag);
  if (r.name === "equipo") return renderEquipo(r.tag);
  if (r.name === "perfil") return renderPerfil(r.tag);
  if (r.name === "actualizar") return renderActualizar();
  if (r.name === "operaciones" && r.sub === "estrategias") return renderEstrategias();
  if (r.name === "operaciones" && (r.sub === "prioridades" || r.sub === "rescate")) return renderAtencion(r);
  if (r.name === "operaciones") return renderOperaciones(r);
  return renderInicio();
}

function renderGraficos() {
  const list = chartAccounts();
  if (!allAccounts().some((m) => expOf(m.tag))) {
    return `<h1 class="large-title">Gráficos</h1>${analisisNav("graficos")}<div class="section"><div class="card empty"><p class="t-title3">Aún no hay datos</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div></div>`;
  }
  const kinds = [["lineas", "Líneas"], ["barras", "Barras"], ["apiladas", "Apiladas"], ["radar", "Radar"], ["calor", "Calor"], ["ritmo", "Ritmo"], ["niveles", "Niveles"]];
  const kindChips = kinds.map(([id, label]) => filterChip("data-chart-kind", id, label, state.chartKind === id)).join("");
  const needsAccount = state.chartKind === "radar" || state.chartKind === "ritmo";
  const tag = list.some((m) => m.tag === state.chartTag) ? state.chartTag : (list[0] ? list[0].tag : "");
  const meta = tag ? accountByTag(tag) : null;
  const opts = list.map((m) => `<option value="${esc(m.tag)}"${m.tag === tag ? " selected" : ""}>${esc(m.nombre)}</option>`).join("");
  const cats = chartCategories(list);
  const snaps = list.map(snapshotRow).filter(Boolean);
  let card = `<div class="card empty"><p class="t-title3">Sin cuentas en este filtro</p></div>`;
  if (list.length && (meta || !needsAccount)) {
    if (state.chartKind === "lineas") {
      card = `<div class="card"><div class="section-head"><h2 class="t-headline">Evolución</h2>${infoBtn("Porcentaje de cada cuenta en cada exportación del periodo.")}</div>${multiLineSvg(mediaLines(list), "Evolución del porcentaje de cada cuenta")}</div>`;
    } else if (state.chartKind === "barras") {
      card = `<div class="card"><div class="section-head"><h2 class="t-headline">Por categoría</h2>${infoBtn("Cada barra es el % de una cuenta en la última exportación del periodo.")}</div>${groupedCategoryHtml(snaps, cats)}</div>`;
    } else if (state.chartKind === "apiladas") {
      card = `<div class="card"><div class="section-head"><h2 class="t-headline">Comparación</h2>${infoBtn("Cada color es el % de una categoría. No es una suma de oro, elixir ni oscuro.")}</div><div class="chart-bars">${stackedHtml(snaps, cats)}</div></div>`;
    } else if (state.chartKind === "radar") {
      const snap = snaps.find((s) => s.tag === tag);
      card = `<div class="card"><h2 class="t-headline">Radar · ${esc(meta.nombre)}</h2>${snap ? radarSvg(snap.view, cats) : ""}</div>`;
    } else if (state.chartKind === "calor") {
      card = `<div class="card"><h2 class="t-headline">Cuentas × categorías</h2>${heatHtml(snaps, cats)}</div>`;
    } else if (state.chartKind === "niveles") {
      card = levelCard(list);
    } else {
      card = `<div class="card"><h2 class="t-headline">Ritmo · ${esc(meta.nombre)}</h2>${paceBlock(tag)}</div>`;
    }
  }
  const picker = needsAccount && list.length
    ? `<label class="sort-label">Cuenta <select data-chart aria-label="Cuenta del gráfico">${opts}</select></label>`
    : "";
  return `<h1 class="large-title">Gráficos</h1>${analisisNav("graficos")}
    <div class="title-line"><p class="large-sub">% del máximo</p>${infoBtn("Porcentaje del máximo del TH de cada cuenta. La media no incluye categorías bloqueadas.")}</div>
    ${filterBar({ tiempo: true, recurso: true, th: true, grupo: true })}
    <div class="chip-row" role="toolbar" aria-label="Tipo de gráfico">${kindChips}</div>
    ${picker}
    <div class="section">${card}</div>`;
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
    <p class="large-sub">En este iPhone</p>
    <div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">Copia</h2>${infoBtn(`Un JSON con las ${n} cuentas y las ${hist} exportaciones del historial. Restaurar fusiona por tag y fecha de exportación: no borra nada y conserva todo el historial. Nada sale del iPhone salvo el archivo que guardes tú. La copia incluye las marcas provisionales del plan, la meta de cada cuenta y el horario de sueño.`)}</div>
      ${state.datosFallo ? `<p class="t-footnote c-2">No se pudo usar el almacén del iPhone. Los datos siguen en este teléfono.</p>` : ""}
      <p class="t-title2 num">${n}</p>
      <p class="t-footnote c-2">${esc(thLine)}</p>
      <p class="t-footnote c-2">Última importación: ${esc(lastImportLabel())}</p>
      ${copyWarning()}
      <button type="button" class="btn btn--primary btn--block" data-backup>Exportar JSON · ${n}</button>
      <button type="button" class="btn btn--secondary btn--block" data-backup-pick>Restaurar</button>
    </div></div>
    <div class="section"><div class="card">
      <div class="section-head"><h2 class="t-headline">Apariencia</h2>${infoBtn("Una cuenta avisa cuando la exportación tiene más de esos días. El valor inicial es 7.")}</div>
      <div class="chip-row" role="toolbar" aria-label="Tema">${[["sistema", "Sistema"], ["light", "Claro"], ["dark", "Oscuro"]].map(([id, label]) => `<button type="button" data-theme="${id}" aria-pressed="${state.theme === id ? "true" : "false"}">${label}</button>`).join("")}</div>
      <label class="sort-label">Días sin actualizar
        <input data-stale-days type="number" min="1" max="90" value="${state.staleDays}" aria-label="Días sin actualizar">
      </label>
    </div></div>
    <div class="section"><div class="card offline-dl${done ? " is-done" : ""}">
      <div class="offline-dl__top"><h3>Imágenes sin conexión</h3><span class="num">${count}\u00a0de\u00a0${totalN}</span></div>
      <div class="bar" style="--p:${Math.min(100, p)};--cat:var(--tint)" role="img" aria-label="${esc(status)}"><span class="bar__fill"></span></div>
      <p class="offline-dl__status">${esc(status)}</p>
      ${btn}
      <p class="t-footnote c-2">${esc(note)}</p>
    </div></div>
    <div class="section"><ul class="list">
      <li><button class="row" data-restore><span class="row__main"><span class="row__title">Restaurar datos de prueba</span></span></button></li>
      <li><button class="row row--destructive" data-wipe><span class="row__main"><span class="row__title">Borrar todos los datos</span></span></button></li>
    </ul></div>
    <div class="section">${sectionHead("Acerca de", "Material no oficial, no respaldado por Supercell. Arte © Supercell bajo la Fan Content Policy. Las imágenes del Fan Kit se muestran sin modificar. Las no oficiales son una reducción (lado largo como máximo 512 px, sin recorte); imágenes no oficiales: ClashKing y Fandom (autores en el manifiesto). Esta app es gratuita, privada y sin fines comerciales.")}<ul class="list">
      <li><div class="row"><span class="row__main"><span class="row__title">Versión</span></span><span class="row__trail">${esc(APP_VERSION)}</span></div></li>
    </ul></div>
    <div class="section"><div class="card about">
      <p class="t-body" lang="en">This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer">www.supercell.com/fan-content-policy</a>.</p>
      <p><a class="btn btn--plain" href="https://supercell.com/en/fan-content-policy/" target="_blank" rel="noopener noreferrer">Leer la Fan Content Policy</a></p>
    </div></div>
    <input class="file-input" data-backup-file type="file" accept=".json,application/json,text/json,text/plain" tabindex="-1" aria-hidden="true">`;
}

function copyWarning() {
  const at = state.copyAt;
  if (!at) return `<p class="t-footnote c-2">Aún no hay una copia automática en este iPhone. Se guarda al importar.</p>`;
  const days = Math.floor((state.now - at) / 86400000);
  if (days < 7) return `<p class="t-footnote c-2">Copia automática del ${esc(fmtWhen(at))}.</p>`;
  const dia = days === 1 ? "día" : "días";
  return `<p class="t-footnote c-2">La última copia automática es del ${esc(fmtWhen(at))}. Llevas ${days} ${dia} sin una copia nueva.</p>`;
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
        <label class="alias-field">Grupo
          <input data-grupo-text maxlength="16" autocapitalize="off" autocomplete="off" aria-label="Nuevo grupo" placeholder="farming, TH11…">
        </label>
        <div class="section"><button type="button" class="btn btn--secondary btn--block" data-grupo-add>Añadir grupo</button></div>
        ${(meta.grupos || []).length ? `<div class="chip-row" role="list" aria-label="Grupos">${meta.grupos.map((g) => `<button type="button" data-grupo-del="${esc(g)}" aria-label="Quitar ${esc(g)}">${esc(g)}</button>`).join("")}</div>` : `<p class="section-footer">Sin grupos. Sirven para filtrar en Cuentas, Gráficos y Ranking.</p>`}
        <label class="sort-label">Meta de progreso
          <select data-meta-clave aria-label="Meta">
            <option value="" ${!meta.meta ? "selected" : ""}>Sin meta</option>
            <option value="media" ${meta.meta && meta.meta.clave === "media" ? "selected" : ""}>Media</option>
            ${villageCats().map((c) => `<option value="${c.key}" ${meta.meta && meta.meta.clave === c.key ? "selected" : ""}>${esc(c.label)}</option>`).join("")}
          </select>
        </label>
        <label class="alias-field">Porcentaje de la meta
          <input data-meta-pct type="number" min="1" max="100" inputmode="numeric" aria-label="Porcentaje de la meta" value="${meta.meta ? meta.meta.pct : ""}">
        </label>
        <div class="section"><button type="button" class="btn btn--secondary btn--block" data-principal="${esc(meta.tag)}">${meta.principal ? "Quitar Principal" : "Marcar como Principal"}</button></div>
        <div class="section"><button type="button" class="btn btn--destructive btn--block" data-delete="${esc(meta.tag)}">Borrar cuenta</button></div>
        <p class="section-footer">Puede haber varias cuentas Principal. Si no marcas ninguna, destaca la de TH más alto.</p>
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

function focusActualizar() {
  if (!state.actualizarFocus) return;
  state.actualizarFocus = false;
  const el = document.querySelector("[data-actualizar-text]");
  if (el) el.focus();
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

let tituloObserver = null;
let enRecuperacion = false;

function soltarPantalla() {
  const app = document.getElementById("app");
  if (!app) return;
  if (!document.querySelector(".sheet, .alert")) {
    app.querySelectorAll("[inert]").forEach((el) => el.removeAttribute("inert"));
    app.querySelectorAll(".sheet-backdrop, .alert-backdrop").forEach((el) => el.remove());
  }
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

function avisoDiscreto(texto) {
  let el = document.getElementById("aviso-discreto");
  if (!el) {
    el = document.createElement("p");
    el.id = "aviso-discreto";
    el.className = "aviso-discreto";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = texto;
  clearTimeout(avisoDiscreto._t);
  avisoDiscreto._t = setTimeout(() => { if (el) el.remove(); }, 3200);
}

function recuperar(err) {
  console.error(err);
  if (enRecuperacion) {
    soltarPantalla();
    avisoDiscreto("Algo no ha respondido. Puedes seguir.");
    return;
  }
  enRecuperacion = true;
  try {
    soltarPantalla();
    try { render(); } catch (err2) { console.error(err2); soltarPantalla(); }
    avisoDiscreto("Algo no ha respondido. Puedes seguir.");
  } finally {
    enRecuperacion = false;
  }
}

function abrirFuera(ev, enlace) {
  ev.preventDefault();
  try {
    const abierta = window.open(enlace.href, "_blank", "noopener,noreferrer");
    if (!abierta) avisoDiscreto("El enlace se abre en Safari.");
  } catch {
    avisoDiscreto("El enlace se abre en Safari.");
  }
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
  let screen = "";
  try {
    screen = screenFor(r);
  } catch (err) {
    console.error(err);
    screen = `<h1 class="large-title">Esta pantalla</h1><div class="section"><div class="card"><p class="t-body">No se pudo pintar esta pantalla.</p></div></div>`;
  }
  try {
    root.innerHTML = `${navbar(r)}<main class="screen" id="screen">${screen}</main>${tabbar(r)}${r.name === "ajustes" ? renderAjustes() : ""}${state.editor ? renderEditor() : ""}${r.name === "importar" ? renderImport() : ""}${fichaSheet()}${renderAlert()}${renderToast()}`;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<main class="screen" id="screen"><h1 class="large-title">Esta pantalla</h1><div class="section"><div class="card"><p class="t-body">No se pudo pintar esta pantalla.</p></div></div></main>${tabbar(r)}`;
  }
  bind(r);
  const title = document.querySelector(".large-title");
  const nav = document.querySelector(".navbar");
  if (tituloObserver) { tituloObserver.disconnect(); tituloObserver = null; }
  if (title && nav && nav.dataset.collapsed !== "true") {
    tituloObserver = new IntersectionObserver(([e]) => { nav.dataset.collapsed = String(!e.isIntersecting); }, {
      rootMargin: `-${nav.offsetHeight}px 0px 0px 0px`, threshold: 0,
    });
    tituloObserver.observe(title);
  }
  paintOfflineThumbs();
  settleSheetFocus();
  focusImportTarget();
  focusActualizar();
  settleAlert();
  if (state.scrollAdded && r.name === "roster") {
    state.scrollAdded = false;
    document.getElementById("otras-cuentas")?.scrollIntoView({ block: "start" });
  }
  armNotices();
}

function destinoDelToque(ev) {
  const nodo = ev.target && ev.target.nodeType === 1 ? ev.target : ev.target && ev.target.parentElement;
  if (!nodo || !nodo.closest) return "";
  const enlace = nodo.closest("a[href^='#']");
  if (enlace) return enlace.getAttribute("href") || "#/inicio";
  const mini = nodo.closest(".thumb");
  const fila = mini && mini.parentElement;
  if (fila && fila.classList.contains("row--account")) {
    const principal = fila.querySelector("a.row__main");
    if (principal) return principal.getAttribute("href") || "";
  }
  return "";
}

function seguirEnlace(ev, href) {
  const act = accionTab(location.hash, href || "#/inicio");
  ev.preventDefault();
  if (act.type === "scroll") {
    document.getElementById("screen")?.scrollTo?.({ top: 0 });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    return;
  }
  if (location.hash !== act.hash) location.hash = act.hash;
  else render();
}

function bind(r) {
  document.getElementById("app").onclick = (ev) => {
    atenderToque(ev).catch((err) => recuperar(err));
  };
  async function atenderToque(ev) {
  try {
    const origen = ev.target && ev.target.nodeType === 1 ? ev.target : ev.target && ev.target.parentElement;
    if (!origen || !origen.closest) return;
    const evoChip = origen.closest("[data-evo]");
    if (evoChip) {
      ev.preventDefault();
      const clave = evoChip.dataset.evo;
      state.estrategiasCfg = { ...state.estrategiasCfg, [clave]: Number(evoChip.dataset.arg) };
      render();
      return;
    }
    if (origen.closest("[data-evo-empezar]")) {
      ev.preventDefault();
      lanzarEstrategias();
      return;
    }
    if (origen.closest("[data-evo-parar]")) {
      ev.preventDefault();
      pararExploracion();
      state.estrategiasEstado = "Parada. Simulación.";
      render();
      return;
    }
    const adoptar = origen.closest("[data-evo-adoptar]");
    if (adoptar) {
      ev.preventDefault();
      adoptarEstrategia(adoptar.dataset.evoAdoptar);
      return;
    }
    const op = origen.closest("[data-op]");
    if (op) {
      ev.preventDefault();
      aplicarOperacion(op.dataset.op, op.dataset.arg || "");
      return;
    }
    const info = origen.closest("[data-info]");
    if (info) {
      ev.preventDefault();
      const abierto = info.getAttribute("aria-expanded") === "true";
      for (const otro of document.querySelectorAll("[data-info]")) {
        otro.setAttribute("aria-expanded", "false");
        otro.setAttribute("aria-pressed", "false");
        const pop = otro.nextElementSibling;
        if (pop && pop.classList.contains("info-pop")) pop.hidden = true;
      }
      if (!abierto) {
        info.setAttribute("aria-expanded", "true");
        info.setAttribute("aria-pressed", "true");
        const pop = info.nextElementSibling;
        if (pop && pop.classList.contains("info-pop")) pop.hidden = false;
      }
      return;
    }
    const externo = origen.closest("a[href^='http']");
    if (externo) { abrirFuera(ev, externo); return; }
    const dest = destinoDelToque(ev);
    if (dest) {
      seguirEnlace(ev, dest);
      return;
    }
    const eqVista = origen.closest("[data-eq-vista]");
    if (eqVista) {
      state.eqVista = eqVista.dataset.eqVista === "flota" ? "flota" : "cuenta";
      localStorage.setItem("cp-eq-vista", state.eqVista);
      render();
      return;
    }
    const eqCuenta = origen.closest("[data-eq-cuenta]");
    if (eqCuenta) {
      state.eqVista = "cuenta";
      localStorage.setItem("cp-eq-vista", "cuenta");
      const dest = "#/equipo/" + eqCuenta.dataset.eqCuenta.slice(1);
      if (location.hash === dest) render();
      else location.hash = dest;
      return;
    }
    const eqRareza = origen.closest("[data-eq-rareza]");
    if (eqRareza) {
      state.eqFiltro = { ...state.eqFiltro, rareza: eqRareza.dataset.eqRareza || "todos" };
      localStorage.setItem("cp-eq-filtro", JSON.stringify(state.eqFiltro));
      render();
      return;
    }
    if (origen.closest("[data-eq-bloqueados]")) {
      state.eqFiltro = { ...state.eqFiltro, bloqueados: !state.eqFiltro.bloqueados };
      localStorage.setItem("cp-eq-filtro", JSON.stringify(state.eqFiltro));
      render();
      return;
    }
    if (origen.closest("[data-eq-ocultar]")) {
      state.eqFiltro = { ...state.eqFiltro, ocultar: !state.eqFiltro.ocultar };
      localStorage.setItem("cp-eq-filtro", JSON.stringify(state.eqFiltro));
      render();
      return;
    }
    const eqElegir = origen.closest("[data-eq-elegir]");
    if (eqElegir) {
      const tag = eqElegir.dataset.eqTag;
      const id = eqElegir.dataset.eqElegir;
      const cur = elegidosDe(tag).slice();
      const at = cur.indexOf(id);
      if (at >= 0) cur.splice(at, 1);
      else cur.push(id);
      state.eqElegidos = { ...state.eqElegidos, [tag]: cur };
      localStorage.setItem("cp-eq-elegidos", JSON.stringify(state.eqElegidos));
      render();
      return;
    }
    const go = origen.closest("[data-go]");
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
    if (origen.closest("[data-paste-now]")) { await pasteNow(); return; }
    if (origen.closest("[data-pegar-cuenta]")) { await pegarCuenta(); return; }
    if (origen.closest("[data-pegar-campo]")) {
      const campo = document.querySelector("[data-actualizar-text]");
      await aplicarPegado(campo ? campo.value : "");
      return;
    }
    if (origen.closest("[data-pegar-mano]")) {
      state.actualizarManual = true;
      state.actualizarFocus = true;
      render();
      return;
    }
    if (origen.closest("[data-actualizar-listo]")) {
      clearSession(localStorage);
      state.actualizarManual = false;
      state.actualizarBorrador = "";
      if (location.hash !== "#/inicio") location.hash = "#/inicio";
      else render();
      return;
    }
    if (origen.closest("[data-actualizar]")) { abrirActualizar(); return; }
    const guardarRec = origen.closest("[data-recursos-save]");
    if (guardarRec) {
      const root = guardarRec.closest("[data-recursos]");
      const tag = root && root.getAttribute("data-recursos");
      const leer = (name) => {
        const el = root && root.querySelector(`[data-res="${name}"]`);
        return el ? el.value : "";
      };
      const raw = { ingresos: {} };
      for (const [clave] of RECURSO_CAMPOS) {
        raw[clave] = leer(clave);
        raw.ingresos[clave] = leer(`ing-${clave}`);
      }
      state.accounts = setRecursos(state.accounts, tag, raw, Date.now());
      persistRoster();
      avisoDiscreto(recursosDeCuenta(state.accounts.find((a) => a.tag === tag)) ? "Guardado" : "Sin cifras");
      render();
      return;
    }
    const alDia = origen.closest("[data-recursos-dia]");
    if (alDia) {
      const root = alDia.closest("[data-recursos]");
      const panel = root && root.querySelector("[data-recursos-ingresos]");
      const open = alDia.getAttribute("aria-pressed") !== "true";
      alDia.setAttribute("aria-pressed", open ? "true" : "false");
      alDia.setAttribute("aria-expanded", open ? "true" : "false");
      if (panel) panel.hidden = !open;
      return;
    }
    const ctor = origen.closest("[data-ctor]");
    if (ctor) {
      const tag = ctor.dataset.ctorTag;
      const n = Number(ctor.dataset.ctor);
      if (tag && (n === 4 || n === 5 || n === 6)) setAccountPlan(tag, { constructores: n });
      render();
      return;
    }
    const rushModo = origen.closest("[data-rush]");
    if (rushModo) {
      const tag = route().tag;
      const rush = rushModo.dataset.rush === "estrategico" ? "estrategico" : "esencial";
      if (tag) setAccountPlan(tag, { modo: "rushear", rush });
      render();
      return;
    }
    const sug = origen.closest("[data-sugerencia]");
    if (sug && !sug.disabled) {
      const tag = route().tag;
      const id = sug.dataset.sugerencia;
      if (tag && id) {
        if (state.planes[tag] == null) setAccountPlan(tag, { modo: "rushear", rush: "estrategico" });
        const plan = effectivePlan(state.planes[tag]);
        const off = new Set(plan.sugerenciasOff);
        if (off.has(id)) off.delete(id);
        else off.add(id);
        setAccountPlan(tag, { modo: "rushear", rush: "estrategico", sugerenciasOff: [...off] });
      }
      render();
      return;
    }
    const modo = origen.closest("[data-plan-modo]");
    if (modo) {
      const tag = route().tag;
      if (tag) setAccountPlan(tag, { modo: modo.dataset.planModo === "rushear" ? "rushear" : "maxear" });
      render();
      return;
    }
    const flag = origen.closest("[data-plan-flag]");
    if (flag) {
      const tag = route().tag;
      const id = flag.dataset.planFlag;
      if (tag && state.planes[tag] == null) setAccountPlan(tag, {});
      const plan = effectivePlan(state.planes[tag]);
      if (tag && ["ataque", "defensa", "muros", "heroes"].includes(id)) setAccountPlan(tag, { [id]: !plan[id] });
      render();
      return;
    }
    const prov = origen.closest("[data-prov]");
    if (prov) {
      const tag = prov.dataset.provTag;
      let keys = [];
      try { keys = JSON.parse(decodeURIComponent(prov.dataset.prov)); } catch { keys = []; }
      const road = accountRoadmap(accountByTag(tag) || { tag });
      const steps = road ? road.orden.filter((s) => keys.includes(s.key)) : [];
      for (const step of steps) state.provisionales = toggleProvisional(state.provisionales, step, tag, state.now);
      saveProvisionals();
      render();
      return;
    }
    const themeBtn = origen.closest("button[data-theme]");
    if (themeBtn) {
      state.theme = themeBtn.dataset.theme;
      localStorage.setItem("cp-theme", state.theme);
      applyTheme(state.theme);
      render();
      return;
    }
    if (origen.closest("[data-notify]")) { await toggleNotify(); return; }
    if (origen.closest("[data-calendario]")) { await exportarCalendario(); return; }
    if (origen.closest("[data-clear-filters]")) { setFilter({ th: "", grupo: "" }); render(); return; }
    if (origen.closest("[data-sueno-clear]")) { saveSleep("", ""); render(); return; }
    const tiempo = origen.closest("[data-tiempo]");
    if (tiempo) { setFilter({ tiempo: tiempo.dataset.tiempo }); render(); return; }
    const recurso = origen.closest("[data-recurso]");
    if (recurso) { setFilter({ recurso: recurso.dataset.recurso }); render(); return; }
    const thf = origen.closest("[data-th]");
    if (thf) { setFilter({ th: thf.dataset.th || "" }); render(); return; }
    const grupo = origen.closest("[data-grupo]");
    if (grupo && grupo.dataset.grupoDel == null) { setFilter({ grupo: grupo.dataset.grupo || "" }); render(); return; }
    const kind = origen.closest("[data-chart-kind]");
    if (kind) { state.chartKind = kind.dataset.chartKind; localStorage.setItem("cp-chart-kind", state.chartKind); render(); return; }
    const levelKind = origen.closest("[data-level-kind]");
    if (levelKind) { state.levelKind = levelKind.dataset.levelKind; localStorage.setItem("cp-level-kind", state.levelKind); render(); return; }
    const rank = origen.closest("[data-rank]");
    if (rank) { state.rankKey = rank.dataset.rank; localStorage.setItem("cp-rank", state.rankKey); render(); return; }
    const compare = origen.closest("[data-compare]");
    if (compare) {
      const tag = compare.dataset.compare;
      const has = state.compareTags.includes(tag);
      if (!has && state.compareTags.length >= 3) showToast("err", "Como máximo 3 cuentas.");
      else {
        state.compareTags = has ? state.compareTags.filter((t) => t !== tag) : state.compareTags.concat(tag);
        localStorage.setItem("cp-compare", JSON.stringify(state.compareTags));
      }
      render();
      return;
    }
    if (origen.closest("[data-grupo-add]")) {
      const input = document.querySelector("[data-grupo-text]");
      const acc = state.accounts.find((a) => a.tag === state.editor);
      const next = cleanGrupos((acc && acc.grupos || []).concat(input ? input.value : ""));
      if (!acc || next.length === (acc.grupos || []).length) showToast("err", "Ese grupo no se ha añadido.");
      else {
        state.accounts = setGrupos(state.accounts, state.editor, next);
        persistRoster();
      }
      render();
      return;
    }
    const gdel = origen.closest("[data-grupo-del]");
    if (gdel) {
      const acc = state.accounts.find((a) => a.tag === state.editor);
      const next = (acc && acc.grupos || []).filter((g) => g !== gdel.dataset.grupoDel);
      state.accounts = setGrupos(state.accounts, state.editor, next);
      persistRoster();
      render();
      return;
    }
    const seg = origen.closest("[data-seg]");
    if (seg) {
      const tag = (route().tag) || state.selected;
      state.seg[tag] = seg.dataset.seg;
      localStorage.setItem("cp-seg-" + tag, seg.dataset.seg);
      render();
      return;
    }
    const mej = origen.closest("[data-mej]");
    if (mej) {
      state.mejorasMode = mej.dataset.mej;
      localStorage.setItem("cp-mejoras", state.mejorasMode);
      render();
      return;
    }
    const agendaVista = origen.closest("[data-agenda]");
    if (agendaVista) {
      const id = agendaVista.dataset.agenda;
      state.agendaVista = id === "7d" || id === "cuenta" || id === "curso" ? id : "24h";
      localStorage.setItem("cp-agenda", state.agendaVista);
      render();
      return;
    }
    const curso = origen.closest("[data-curso]");
    if (curso) {
      state.cursoVista = curso.dataset.curso === "cuenta" ? "cuenta" : "fin";
      localStorage.setItem("cp-curso", state.cursoVista);
      render();
      return;
    }
    const pcat = origen.closest("[data-pcat]");
    if (pcat) {
      state.progFilter = { ...state.progFilter, cat: pcat.dataset.pcat };
      render();
      return;
    }
    const pstatus = origen.closest("[data-pstatus]");
    if (pstatus) {
      state.progFilter = { ...state.progFilter, status: pstatus.dataset.pstatus };
      render();
      return;
    }
    const edit = origen.closest("[data-edit]");
    if (edit) {
      rememberOpener(edit, `[data-edit="${cssAttr(edit.dataset.edit)}"]`);
      state.editor = edit.dataset.edit;
      state.sheetKey = "";
      render();
      return;
    }
    if (origen.closest("[data-close-editor]")) { state.editor = null; render(); return; }
    const principal = origen.closest("[data-principal]");
    if (principal) {
      const tag = principal.dataset.principal;
      const cur = state.accounts.find((a) => a.tag === tag);
      state.accounts = setPrincipal(state.accounts, tag, !(cur && cur.principal));
      persistRoster();
      render();
      return;
    }
    const del = origen.closest("[data-delete]");
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
    if (origen.closest("[data-backup]")) { await exportBackup(); return; }
    if (origen.closest("[data-backup-pick]")) { document.querySelector("[data-backup-file]")?.click(); return; }
    const ficha = origen.closest("[data-ficha]");
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
    if (origen.closest("[data-close-ficha]")) { state.ficha = null; render(); return; }
    if (origen.closest("[data-close]")) { location.hash = "#/roster"; return; }
    if (origen.closest("[data-restore]")) {
      rememberAlertOpener(origen.closest("[data-restore]"), "[data-restore]");
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
    if (origen.closest("[data-wipe]")) {
      rememberAlertOpener(origen.closest("[data-wipe]"), "[data-wipe]");
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
    const alertBtn = origen.closest("[data-alert]");
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
    const dl = origen.closest("[data-dl]");
    if (dl) {
      if (dl.dataset.dl === "start") downloadAll().catch((err) => recuperar(err));
      if (dl.dataset.dl === "stop" && state.dlAbort) {
        state.dlAbort.abort();
        state.dl.phase = "idle";
        state.dlAbort = null;
        render();
      }
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
    const quitar = origen.closest("[data-quitar]");
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
    const im = origen.closest("[data-im]");
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
    if (origen.closest("[data-im-back]")) { goBackImport(); return; }
    const rowBtn = origen.closest("[data-im-row]");
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
    const actBtn = origen.closest("[data-act]");
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
  } catch (err) {
    recuperar(err);
  }
  }
  const sel = document.querySelector("[data-account]");
  if (sel) sel.onchange = () => {
    const tail = sel.value.slice(1);
    const name = route().name;
    const prefix = name === "equipo" ? "#/equipo/" : name === "perfil" ? "#/perfil/" : "#/progreso/";
    location.hash = prefix + tail;
  };
  const eqHeroe = document.querySelector("[data-eq-heroe]");
  if (eqHeroe) eqHeroe.onchange = () => {
    state.eqFiltro = { ...state.eqFiltro, heroe: eqHeroe.value || "todos" };
    localStorage.setItem("cp-eq-filtro", JSON.stringify(state.eqFiltro));
    render();
  };
  const sort = document.querySelector("[data-sort]");
  if (sort) sort.onchange = () => { state.sortMode = sort.value; localStorage.setItem("cp-sort", state.sortMode); render(); };
  const chart = document.querySelector("[data-chart]");
  if (chart) chart.onchange = () => { state.chartTag = chart.value; localStorage.setItem("cp-chart", state.chartTag); render(); };
  document.querySelectorAll("[data-sueno]").forEach((input) => {
    input.onchange = () => {
      const desdeSueno = document.querySelector('[data-sueno="desde"]');
      const hastaSueno = document.querySelector('[data-sueno="hasta"]');
      saveSleep(desdeSueno ? desdeSueno.value : "", hastaSueno ? hastaSueno.value : "");
      render();
    };
  });
  const desde = document.querySelector("[data-desde]");
  if (desde) desde.onchange = () => { setFilter({ desde: desde.value }); render(); };
  const hasta = document.querySelector("[data-hasta]");
  if (hasta) hasta.onchange = () => { setFilter({ hasta: hasta.value }); render(); };
  const rosterQ = document.querySelector("[data-roster-q]");
  if (rosterQ) rosterQ.oninput = () => {
    const pos = rosterQ.selectionStart;
    state.rosterQ = rosterQ.value;
    render();
    const again = document.querySelector("[data-roster-q]");
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* tipo search */ } }
  };
  document.querySelectorAll("[data-plan-th], [data-plan-cat], [data-plan-recurso], [data-plan-dur]").forEach((input) => {
    input.onchange = () => {
      const tag = route().tag;
      if (!tag) return;
      const patch = {};
      const thSel = document.querySelector("[data-plan-th]");
      const catSel = document.querySelector("[data-plan-cat]");
      const recSel = document.querySelector("[data-plan-recurso]");
      const durSel = document.querySelector("[data-plan-dur]");
      if (thSel) patch.th = thSel.value ? Number(thSel.value) : null;
      if (catSel) patch.categoria = catSel.value || "";
      if (recSel) patch.recurso = recSel.value || "todos";
      if (durSel) patch.duracion = durSel.value || "";
      setAccountPlan(tag, patch);
      render();
    };
  });
  const staleDays = document.querySelector("[data-stale-days]");
  if (staleDays) staleDays.onchange = () => {
    const n = Math.max(1, Math.min(90, Math.round(Number(staleDays.value) || 7)));
    state.staleDays = n;
    localStorage.setItem("cp-stale-days", String(n));
    render();
  };
  const metaClave = document.querySelector("[data-meta-clave]");
  const metaPct = document.querySelector("[data-meta-pct]");
  const saveMeta = () => {
    if (!state.editor) return;
    const clave = metaClave ? metaClave.value : "";
    const pct = metaPct ? Number(metaPct.value) : NaN;
    state.accounts = setMeta(state.accounts, state.editor, clave ? { clave, pct } : null);
    persistRoster();
    render();
  };
  if (metaClave) metaClave.onchange = saveMeta;
  if (metaPct) metaPct.onchange = saveMeta;
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
  const cambio = bytes !== state.cacheBytes || count !== state.cacheCount;
  state.cacheBytes = bytes;
  state.cacheCount = count;
  if (cambio && (route().name === "ajustes" || route().name === "copia") && state.dl.phase !== "downloading") render();
}

async function downloadAll() {
  if (!navigator.onLine) { state.dl.phase = "offline"; render(); return; }
  const ctrl = new AbortController();
  state.dlAbort = ctrl;
  state.dl = { phase: "downloading", doneBytes: state.cacheBytes, doneCount: state.cacheCount, errors: 0, note: "" };
  render();
  try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
  if (ctrl.signal.aborted) {
    if (state.dl.phase === "downloading") { state.dl.phase = "idle"; render(); }
    return;
  }
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

function camposCopia(extra = {}) {
  return {
    accounts: state.accounts,
    exports: state.rows,
    planes: state.planes,
    provisionales: state.provisionales,
    sueno: state.sleep,
    documentos: state.documentos,
    version: APP_VERSION,
    ...extra,
  };
}

function docOp() {
  const found = (state.documentos || []).find((d) => d && d.id === "operaciones");
  if (found) return docDe(found);
  try {
    const raw = JSON.parse(localStorage.getItem("cp-operaciones") || "null");
    if (raw && raw.id === "operaciones") return docDe(raw);
  } catch { /* vacío */ }
  return docVacio();
}

function guardarOp(doc) {
  const limpio = docDe(doc);
  const rest = (state.documentos || []).filter((d) => d && d.id !== "operaciones" && d.tipo !== "sesion");
  const sesion = limpio.sesion && !limpio.sesion.cerrada ? { ...limpio.sesion, tipo: "sesion" } : null;
  state.documentos = rest.concat([limpio]).concat(sesion ? [sesion] : []);
  try { localStorage.setItem("cp-operaciones", JSON.stringify(limpio)); } catch { /* el teléfono no admite más */ }
  espejarUsuario();
}

function espejarUsuario() {
  if (!state.fuenteIdb) return;
  const docs = [
    { id: "roster", tipo: "roster", version: 2, accounts: state.accounts },
    { id: "planes", tipo: "planes", planes: state.planes },
    { id: "provisionales", tipo: "provisionales", marcas: state.provisionales },
    { id: "sueno", tipo: "sueno", desde: state.sleep.desde || "", hasta: state.sleep.hasta || "" },
  ].concat((state.documentos || []).filter((d) => d && !["roster", "planes", "provisionales", "sueno"].includes(d.id)));
  guardarDocumentos(docs).catch(() => { state.datosFallo = true; });
}

function aplicarGancho(tag) {
  const next = trasImportar({ tag, documentos: state.documentos, now: state.now });
  state.documentos = next.documentos;
  if (!next.cambiados) return;
  const doc = docOp();
  if (doc.sesion) doc.sesion = { ...doc.sesion, recalcular: state.now };
  const meta = accountByTag(tag);
  doc.aviso = avisoTrasImportar(tag, meta && meta.nombre);
  guardarOp(doc);
}

function anotarCambios(tags, before) {
  const entradas = [];
  for (const tag of tags) {
    const meta = accountByTag(tag);
    const after = state.latest.get(tag);
    const prev = before.get(tag);
    const res = resultadoDePegado(prev, after);
    entradas.push(entradaDeImportacion({
      tag,
      nombre: meta && meta.nombre,
      at: state.now,
      niveles: res.niveles,
      mejoras: res.mejoras,
      thAntes: prev ? townHallLevel(prev) : null,
      thDespues: after ? townHallLevel(after) : null,
    }));
  }
  if (!entradas.length) return;
  guardarOp(sumarDiario(docOp(), entradas));
}

function fichasOperacion() {
  return allAccounts().map((meta) => {
    const exp = expOf(meta.tag);
    const view = exp && state.index ? viewOf(meta.tag) : null;
    const colas = exp ? estadoColas(exp, state.now, { staleMs: staleLimit(), th: view && view.th }) : null;
    const cats = {};
    if (view) {
      for (const key of VILLAGE_KEYS) cats[key] = view.cats[key] ? view.cats[key].pct : null;
    }
    const pairs = exp ? pairsOf(meta.tag) : [];
    return {
      tag: meta.tag,
      nombre: meta.nombre,
      principal: !!meta.principal,
      th: view ? view.th : null,
      media: view ? view.media : null,
      cats,
      libreAccion: colas ? colas.builders.libresAccion : 0,
      labLibre: !!(colas && colas.laboratorio.libreAccion),
      mascotasLibres: !!(colas && colas.mascotas.libreAccion),
      ayudanteLibre: !!(exp && helpersOf(exp).some((h) => !h.cooldown || (h.end != null && h.end <= state.now))),
      herreriaLibre: !!(exp && (exp.buildings || []).some((b) => b && String(b.data) === "1000070" && b.timer == null)),
      desactualizada: colas ? !!colas.desactualizada : !exp,
      heroesConTimer: !!(exp && meta.tag !== HEROES_FUERA && (exp.heroes || []).some((h) => h && h.timer != null)),
      muestras: pairs.length,
      ritmo: weeklyPace(pairs).ritmo,
      planModo: state.planes[meta.tag] && state.planes[meta.tag].modo,
    };
  });
}

function renderEstrategias() {
  return htmlEstrategias({
    cfg: state.estrategiasCfg,
    estado: state.estrategiasEstado,
    resultado: state.estrategiasResultado,
  });
}

function lanzarEstrategias() {
  state.estrategiasEstado = "Buscando… Simulación.";
  const nodo = document.querySelector("[data-evo-estado]");
  if (nodo) nodo.textContent = state.estrategiasEstado;
  const cfg = state.estrategiasCfg;
  setTimeout(() => {
    if (route().name !== "operaciones" || route().sub !== "estrategias") return;
    const packs = empaquetarCuentas(allAccounts().map((meta) => ({
      exp: expOf(meta.tag),
      tag: meta.tag,
      plan: state.planes[meta.tag] || null,
      provisionals: state.provisionales,
    })), state.index, state.now);
    state.estrategiasCuentas = allAccounts().map((meta) => meta.tag);
    empezarExploracion({
      packs,
      ahora: state.now,
      horizonte: cfg.horizonte,
      presupuesto: cfg.presupuesto,
      semilla: 41011,
      topeEval: 20000,
      maxMs: 120000,
    }, (msg) => {
      if (route().name !== "operaciones" || route().sub !== "estrategias") return;
      if (msg.tipo === "progreso") {
        const vivo = document.querySelector("[data-evo-estado]");
        if (vivo) vivo.textContent = `Generación ${msg.generacion}. Simulación.`;
        return;
      }
      if (msg.tipo === "fin") {
        state.estrategiasResultado = msg.resultado;
        state.estrategiasEstado = "Lista. Simulación.";
        render();
        return;
      }
      if (msg.tipo === "error") {
        state.estrategiasEstado = "No se pudo buscar.";
        render();
      }
    });
  }, 0);
}

function adoptarEstrategia(id) {
  const res = state.estrategiasResultado;
  const est = res && (res.estrategias || []).find((item) => item.id === id);
  const tags = state.estrategiasCuentas || [];
  if (!est) return;
  for (let k = 0; k < est.orden.length; k += 1) {
    const idx = est.orden[k];
    const tag = tags[idx];
    if (!tag) continue;
    const pesos = est.pesos[idx] || [];
    setAccountPlan(tag, {
      modo: "maxear",
      heroes: tag === HEROES_FUERA ? false : pesos[2] >= 0.5,
      ataque: pesos[0] >= 0.5 || pesos[1] >= 0.5,
      defensa: pesos[3] >= 0.5 || pesos[4] >= 0.5,
      muros: pesos[6] >= 0.5,
    });
  }
  showToast("ok", "El plan recoge la estrategia.");
  render();
}

function renderAtencion(r) {
  return htmlAtencion({
    sub: r.sub,
    now: state.now,
    sueno: state.sleep,
    cuentas: fichasOperacion(),
    doc: docOp(),
  });
}

function renderOperaciones(r) {
  return htmlOperaciones({
    sub: r.sub || "hub",
    now: state.now,
    cuentas: fichasOperacion(),
    doc: docOp(),
  });
}

function aplicarOperacion(op, arg) {
  let valor = arg;
  if (op === "nota") {
    const campo = document.querySelector("[data-op-nota]");
    valor = campo ? campo.value : "";
  }
  if (op === "hibernar" && String(arg).startsWith("custom|")) {
    const campo = document.querySelector("[data-op-dias]");
    const n = Math.round(Number(campo && campo.value));
    valor = (n > 0 && n <= 365 ? String(n) : "0") + arg.slice("custom".length);
  }
  const cuentas = fichasOperacion();
  const foco = cuentas.find((cuenta) => cuenta.tag === docOp().tagFoco) || cuentas[0];
  const next = reducir(docOp(), op, valor, {
    cuentas,
    now: state.now,
    costeTh: foco ? costeSubirTh(foco.th) : null,
  });
  if (next.plan) setAccountPlan(next.plan.tag, next.plan.patch);
  guardarOp(next.doc);
  if (next.toast) showToast("ok", next.toast);
  render();
}

function tomarFuente(documentos) {
  const roster = documentos.find((d) => d.id === "roster");
  const planes = documentos.find((d) => d.id === "planes");
  const marcas = documentos.find((d) => d.id === "provisionales");
  const sueno = documentos.find((d) => d.id === "sueno");
  if (roster && Array.isArray(roster.accounts)) state.accounts = roster.accounts;
  if (planes && planes.planes && typeof planes.planes === "object") state.planes = planes.planes;
  if (marcas && Array.isArray(marcas.marcas)) state.provisionales = marcas.marcas;
  if (sueno) state.sleep = { desde: sueno.desde || "", hasta: sueno.hasta || "" };
  state.documentos = documentos.filter((d) => d.id !== "roster" && d.id !== "planes" && d.id !== "provisionales" && d.id !== "sueno");
  localStorage.setItem(ROSTER_KEY, JSON.stringify({ version: 2, accounts: state.accounts }));
  localStorage.setItem("cp-planes", JSON.stringify(state.planes));
  localStorage.setItem("cp-provisional", JSON.stringify(state.provisionales));
  localStorage.setItem("cp-sueno", JSON.stringify(state.sleep));
  state.fuenteIdb = true;
}

async function aplicarMigracion() {
  try {
    const schema = await leerSchema();
    if (schema && schema.version === 3 && schema.migrado === true) {
      const documentos = await leerDocumentos();
      const roster = documentos.find((d) => d.id === "roster");
      const planes = documentos.find((d) => d.id === "planes");
      const prov = documentos.find((d) => d.id === "provisionales");
      const ok = verificarDocumentos(documentos, {
        cuentas: roster && Array.isArray(roster.accounts) ? roster.accounts.length : -1,
        planes: planes && planes.planes ? Object.keys(planes.planes).length : -1,
        marcas: prov && Array.isArray(prov.marcas) ? prov.marcas.length : -1,
      });
      if (!ok) { state.datosFallo = true; return; }
      tomarFuente(documentos);
      return;
    }
    const volcado = volcadoLiteral(localStorage);
    if (!volcado.ok) { state.datosFallo = true; return; }
    const plan = prepararMigracion({
      schema,
      claves: volcado.claves,
      added: state.added,
      exportTags: [...new Set(state.rows.map((r) => r.tag))],
      seeded: localStorage.getItem("cp-seeded"),
    });
    await guardarRecuperacion({
      id: "volcado-" + Date.now(),
      at: Date.now(),
      version: APP_VERSION,
      claves: plan.recuperacion.claves,
    });
    if (!plan.migrado) {
      await guardarSchema({ id: "actual", version: 3, migrado: false });
      return;
    }
    await guardarDocumentos(plan.documentos.concat(state.documentos || []));
    const escritos = await leerDocumentos();
    const ok = verificarDocumentos(escritos, plan);
    await guardarSchema({ id: "actual", version: 3, migrado: ok });
    if (!ok) return;
    state.documentos = escritos.filter((d) => d.id !== "roster" && d.id !== "planes" && d.id !== "provisionales" && d.id !== "sueno");
    state.fuenteIdb = true;
  } catch {
    state.datosFallo = true;
  }
}

async function boot() {
  applyTheme(state.theme);
  state.added = loadAdded();
  announce("");
  render();
  const [manifest, caps, bundle] = await Promise.all([
    fetch("./assets/manifest.json?v=" + APP_VERSION).then((r) => r.json()),
    fetch("./data/caps_clashrecord.json?v=" + APP_VERSION).then((r) => r.json()),
    fetch("./data/bundle.json?v=" + APP_VERSION).then((r) => r.json()),
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
  await aplicarMigracion();
  cargarFuentes();
  try { state.copyAt = await latestCopyAt(); } catch { state.copyAt = null; }
  state.ready = true;
  const lote = loteTextFromUrl(location.href);
  if (lote) {
    history.replaceState(null, "", location.pathname + location.search + "#/roster");
    const imported = clipboardImportPlan(lote, classifyCtx());
    if (imported.plan.save.length) await savePlan(imported.plan);
    else {
      state.importUi = freshImport();
      state.importUi.active = true;
      state.importUi.mode = "paste";
      state.importUi.text = lote;
      state.importUi.items = imported.items;
      state.importUi.phase = imported.items.length ? "batch" : "entry";
      location.hash = "#/importar";
    }
  } else {
    const sesion = readSession(localStorage);
    const abierta = route().name;
    if (sesion && abierta !== "actualizar" && abierta !== "inicio") location.hash = "#/actualizar";
  }
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js?v=" + APP_VERSION, { type: "module" })
      .then(() => navigator.serviceWorker.ready)
      .then(() => measureCache())
      .catch(() => measureCache());
  } else {
    measureCache();
  }
}

window.addEventListener("hashchange", () => {
  try {
    render();
    if (route().name === "ajustes" || route().name === "copia") measureCache();
  } catch (err) {
    recuperar(err);
  }
});
window.addEventListener("error", (ev) => {
  if (ev.target && ev.target !== window) return;
  recuperar(ev.error || ev.message || "error");
});
window.addEventListener("unhandledrejection", (ev) => {
  ev.preventDefault();
  recuperar(ev.reason || "error");
});
document.addEventListener("keydown", (ev) => { if (!onAlertKey(ev)) onSheetEscape(ev); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  state.now = Date.now();
  const name = route().name;
  if (name === "mejoras" || name === "ahora" || name === "roster") render();
  else armNotices();
});
setInterval(() => {
  state.now = Date.now();
  const name = route().name;
  if (name === "mejoras" || name === "ahora") render();
  else armNotices();
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
