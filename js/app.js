import {
  CATEGORIES, HERO_ORDER, ROSTER, analyze, averagePct, builderStatus, categoryItems,
  capsFichaLines, categoryUnlock, catFoot, equipmentView, helpersOf, indexCaps, initials,
  itemName, levelLine, rarezaEs, rosterByTag, townHallLevel, upgradesOf,
} from "./progress.js";
import { LEGAL, dayHeading, esc, fmtBytes, fmtFin, fmtNum, fmtPct, fmtRemain, madridDayKey } from "./format.js";
import { IMAGE_CACHE } from "./caches.js";
import { parseLoose } from "./parse.js";
import { allExports, clearExports, latestByTag, putExport, restoreBundled, seedBundled } from "./store.js";

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
  mejorasMode: localStorage.getItem("cp-mejoras") || "fin",
  evo: localStorage.getItem("cp-evo") || "roster",
  selected: localStorage.getItem("cp-account") || "#28PLGP0G2",
  ficha: null,
  toast: null,
  alert: null,
  flash: null,
  now: Date.now(),
  importUi: { mode: "paste", text: "", items: [], reviewed: false },
  dlAbort: null,
};

const $ = (sel, root = document) => root.querySelector(sel);

function route() {
  const raw = (location.hash || "#/roster").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const name = parts[0] || "roster";
  if (name === "progreso" && parts[1] && parts[2]) {
    return { name: "detalle", tag: "#" + parts[1], cat: parts[2] };
  }
  if (name === "progreso" && parts[1]) return { name: "progreso", tag: "#" + parts[1] };
  return { name, tag: null, cat: null };
}

function baseTab(r) {
  if (r.name === "detalle" || r.name === "progreso") return "progreso";
  if (r.name === "mejoras" || r.name === "evolucion" || r.name === "roster") return r.name;
  return "roster";
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

function barHtml(catKey, pctVal, mark, opts = {}) {
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
  return `<div class="${cls.join(" ")}" style="${style.join(";")}"${empty} role="img" aria-label="${esc(opts.label || "")}"><span class="bar__fill"></span>${markEl}</div>`;
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
  const titles = { roster: "Roster", progreso: "Progreso", mejoras: "Mejoras", evolucion: "Evolución", detalle: "Detalle" };
  let lead = "";
  let trail = "";
  let title = titles[tab] || "";
  let collapsed = "false";
  if (r.name === "roster") {
    lead = `<button class="btn-text" data-go="#/ajustes">Ajustes</button>`;
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
  return `<nav class="tabbar material-bar" aria-label="Secciones">
    ${item("roster", "#/roster", "Roster", `<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="5" width="8" height="8" rx="2"/><rect x="16" y="5" width="8" height="8" rx="2"/><rect x="4" y="16" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/></svg>`)}
    ${item("progreso", "#/progreso", "Progreso", `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 8h18M5 14h12M5 20h15"/></svg>`)}
    ${item("mejoras", "#/mejoras", "Mejoras", `<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5"/><path d="M14 8.5V14l3.5 2.5"/></svg>`)}
    ${item("evolucion", "#/evolucion", "Evolución", `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 21l6-6 4 3 9-9"/><path d="M4 24h20"/></svg>`)}
  </nav>`;
}

function subImported() {
  const n = ROSTER.filter((r) => expOf(r.tag)).length;
  let last = 0;
  for (const r of ROSTER) {
    const e = expOf(r.tag);
    if (e && e.timestamp > last) last = e.timestamp;
  }
  if (!last) return `${n} de 11 cuentas`;
  return `${n} de 11 · última ${fmtWhen(last * 1000)}`;
}

function renderRoster() {
  const any = ROSTER.some((r) => expOf(r.tag));
  const featured = ROSTER.filter((r) => r.featured);
  const groups = [
    { title: "TH13 · 4 cuentas", rows: ROSTER.filter((r) => !r.featured && r.objetivo === 15 && r.chip.startsWith("13")) },
    { title: "TH11 · 5 cuentas", rows: ROSTER.filter((r) => r.chip.startsWith("11")) },
  ];
  const cards = featured.map((meta) => featuredCard(meta)).join("");
  const empty = any ? "" : `<div class="card empty"><p class="t-title3">Aún no hay datos</p><p class="t-subhead c-2">Importa la exportación JSON de cada cuenta para ver su progreso.</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div>`;
  return `<h1 class="large-title">Roster</h1>
    <p class="large-sub">11 cuentas · ${esc(subImported())}</p>
    ${empty}
    <div class="section"><div class="section-header"><span>Principales</span></div><div class="stack">${cards}</div></div>
    ${groups.map((g) => `<div class="section"><div class="section-header"><span>${esc(g.title)}</span></div><ul class="list">${g.rows.map(rowAccount).join("")}</ul></div>`).join("")}
    <div class="section" style="text-align:center"><button class="btn btn--plain" data-go="#/ajustes">Ajustes y aviso legal</button></div>
    ${LEGAL}`;
}

function featuredCard(meta) {
  const exp = expOf(meta.tag);
  const flash = state.flash === meta.tag ? " is-flash" : "";
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
  const flash = state.flash === meta.tag ? " is-flash" : "";
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

function renderProgreso(tag) {
  const meta = rosterByTag(tag) || ROSTER[0];
  const exp = expOf(meta.tag);
  const seg = state.seg[meta.tag] || localStorage.getItem("cp-seg-" + meta.tag) || "cats";
  const options = ROSTER.map((r) => `<option value="${esc(r.tag)}"${r.tag === meta.tag ? " selected" : ""}>${esc(r.nombre)}</option>`).join("");
  let body;
  if (!exp) {
    body = `<div class="card empty"><p class="t-title3">Esta cuenta aún no tiene datos</p><p class="t-subhead c-2">Importa su exportación JSON para ver el progreso.</p><button class="btn btn--primary" data-go="#/importar">Importar JSON</button></div>`;
  } else if (seg === "eq") body = equipBlock(exp, meta);
  else body = catsBlock(exp, meta);
  const a = exp ? viewOf(meta.tag) : null;
  const sub = a ? `TH${a.th} · objetivo TH${meta.objetivo} · datos de ${fmtWhen(exp.timestamp * 1000)}` : "Sin importar";
  return `<h1 class="large-title">Progreso</h1>
    <div class="section"><div class="list picker"><a class="row row--thumb44" href="#/progreso/${meta.tag.slice(1)}">
      ${exp ? thumb(1000001, { size: 44, th: a.th }) : `<span class="thumb thumb--44 thumb--empty">TH</span>`}
      <span class="row__main"><span class="row__title">${meta.featured ? esc(meta.nombre) : `<span class="tag">${esc(meta.nombre)}</span>`}</span><span class="row__sub">${esc(sub)}</span></span>
      <svg class="chevron" viewBox="0 0 9 14" aria-hidden="true"><path d="M2 1.5 6.5 7 2 12.5M5 1.5 9 7 5 12.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
    </a><select aria-label="Cuenta" data-account>${options}</select></div></div>
    ${exp ? summaryCard(a, meta) : ""}
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Vista de progreso">
      <button role="tab" data-seg="cats" aria-selected="${seg !== "eq"}">Categorías</button>
      <button role="tab" data-seg="eq" aria-selected="${seg === "eq"}">Equipamiento</button>
    </div></div>
    ${body}
    ${exp && seg !== "eq" ? builderBaseSection(exp) : ""}
    ${LEGAL}`;
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
  const inner = `<span class="row__main"><div class="prog ${cls}">
      <span class="row__title"><span class="dot"></span>${esc(c.label)}</span>
      <span class="prog__pct num${maxed ? " is-max" : ""}">${esc(label)}</span>
      ${barHtml(c.key, fill, mark, { maxed, label: `${c.label}: ${fmtPct(row.pct)}` })}
      <span class="prog__foot">${esc(foot)}</span>
    </div></span>${href ? CHEV : ""}`;
  if (!href) {
    return `<li><button class="row" data-seg="eq" style="padding-top:12px;padding-bottom:12px">${inner}</button></li>`;
  }
  return `<li><a class="row" style="padding-top:12px;padding-bottom:12px" href="${href}">${inner}</a></li>`;
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
    const badge = item.estado === "id_deducido" ? `<span class="badge badge--soft">ID deducido</span>` : "";
    const line = levelLine(h);
    const lvl = h.lvl == null ? 0 : h.lvl;
    if (!line.bar) {
      return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""}>
        ${thumb(h.id, { size: 40 })}
        <span class="row__main"><span class="row__title">${esc(nameOf(h.id) || "Héroe")}${badge}</span><span class="row__sub">${esc(line.text)}</span></span>
      </button></li>`;
    }
    const p = h.max ? (lvl / h.max) * 100 : 0;
    const maxed = lvl >= h.max;
    return `<li><button class="row row--thumb40" data-ficha="${h.id}" data-lvl="${lvl}" data-max="${h.max || ""}"${h.unlockTh != null ? ` data-unlock="${h.unlockTh}"` : ""}>
      ${thumb(h.id, { size: 40 })}
      <span class="row__main"><span class="row__title">${esc(nameOf(h.id) || "")}${badge}</span><span class="row__sub num">${esc(line.text)}</span></span>
      <span class="row__trail">${barHtml("heroes", p, null, { mini: true, maxed, label: line.text })}</span>
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
  const aria = p.unknown ? `Sin identificar, ID ${p.id}, nivel ${p.lvl}` : `${name}, nivel ${p.lvl}`;
  const cls = [p.unknown ? "is-unknown" : "", p.lvl <= 1 ? "is-lvl1" : "", p.max && p.lvl >= p.max ? "is-max" : ""].filter(Boolean).join(" ");
  const cap = p.unknown
    ? `<span class="eq__cap">sin identificar</span>`
    : (p.meta && p.meta.estado === "id_deducido" ? `<span class="eq__cap eq__cap--soft">ID deducido</span>` : "");
  const box = p.unknown
    ? `<span class="thumb thumb--52 thumb--unknown" aria-hidden="true">?</span>`
    : thumb(p.id, { size: 52 });
  return `<li><button class="eq ${cls}" data-ficha="${p.id}" data-lvl="${p.lvl}" data-max="${p.max || ""}"${p.unlockTh != null ? ` data-unlock="${p.unlockTh}"` : ""} aria-label="${esc(aria)}">${box}<span class="eq__lvl num">${p.lvl}</span>${cap}</button></li>`;
}

function renderDetalle(tag, catKey) {
  const meta = rosterByTag(tag);
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
    const note = title === "Sin identificar" ? `<p class="section-footer">${list.length} ítems sin identificar no cuentan en el % salvo cuando el archivo de máximos les da un tope (laboratorio, defensas crafteadas y el guardián sin ficha).</p>` : "";
    return `<div class="section"><div class="section-header"><span>${title}</span></div><ul class="list">${list.map((it) => detailRow(it, catKey, a)).join("")}</ul>${note}</div>`;
  }).join("");
  return head + blocks + LEGAL;
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
    ? barHtml(catKey, p, null, { mini: true, maxed: it.max != null && lvl >= it.max, label: text })
    : "";
  return { text, bar, lvl };
}

function detailRow(it, catKey, a) {
  const lv = rowLevel(it, a, catKey);
  if (it.capsOnly) {
    const title = it.capsName;
    return `<li><button class="row row--thumb40" data-ficha="caps" data-caps-name="${esc(title)}" data-lvl="${lv.lvl}" data-max="${it.max || ""}"${it.unlockTh != null ? ` data-unlock="${it.unlockTh}"` : ""}>
      ${emptyNamedThumb(title, 40)}
      <span class="row__main"><span class="row__title">${esc(title)}</span><span class="row__sub num">${esc(lv.text)}</span></span>
      ${lv.bar}
    </button></li>`;
  }
  const meta = state.index.items[it.id];
  const unknown = !meta || meta.estado === "sin_identificar";
  const title = unknown ? "Sin identificar" : (nameOf(it.id) || "Ítem");
  const badge = meta && meta.estado === "id_deducido" ? `<span class="badge badge--soft">ID deducido</span>` : "";
  const idBadge = unknown ? `<span class="badge badge-id">${esc(it.id)}</span>` : "";
  const cnt = it.cnt > 1 ? ` ×${it.cnt}` : "";
  return `<li><button class="row row--thumb40${unknown ? " is-unknown" : ""}" data-ficha="${it.id}" data-lvl="${lv.lvl}" data-max="${it.max || ""}"${it.unlockTh != null ? ` data-unlock="${it.unlockTh}"` : ""}>
    ${thumb(it.id, { size: 40 })}
    <span class="row__main"><span class="row__title">${esc(title)}${cnt ? ` <span class="num">${cnt.trim()}</span>` : ""}${badge}${idBadge}</span><span class="row__sub num">${esc(lv.text)}</span></span>
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
      <span class="row__main"><span class="row__title">${esc(title)}${badge}${idBadge}</span><span class="row__sub num">Nv ${lvl}</span></span>
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
  for (const meta of ROSTER) {
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
    <p class="large-sub">${active.length} en curso · ${ROSTER.filter((r) => expOf(r.tag)).length} cuentas</p>
    <div class="seg-wrap"><div class="seg" role="tablist" aria-label="Orden de mejoras">
      <button role="tab" data-mej="fin" aria-selected="${mode !== "cuenta"}">Por fin</button>
      <button role="tab" data-mej="cuenta" aria-selected="${mode === "cuenta"}">Por cuenta</button>
    </div></div>
    ${body}
    ${LEGAL}`;
}

function mejorasPorFin(all) {
  const free = [];
  for (const meta of ROSTER) {
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
  const pending = all.filter((u) => !u.done).sort((a, b) => a.end - b.end);
  const doneBlock = done.length ? `<div class="section"><div class="section-header"><span>Terminadas · pendiente de reimportar</span></div><ul class="list">${done.map(upRow).join("")}</ul></div>` : "";
  const byDay = new Map();
  for (const u of pending) {
    const key = madridDayKey(u.end);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(u);
  }
  const days = [...byDay.entries()].map(([key, list]) => `<div class="section"><div class="section-header"><span>${esc(dayHeading(list[0].end, state.now))}</span></div><ul class="list">${list.map(upRow).join("")}</ul></div>`).join("");
  return freeCard + doneBlock + days + helpersBlock();
}

function mejorasPorCuenta() {
  return ROSTER.map((meta) => {
    const exp = expOf(meta.tag);
    if (!exp) return "";
    const a = viewOf(meta.tag);
    const b = builderStatus(exp);
    const list = upgrades(exp);
    const labN = list.filter((u) => u.queue === "laboratorio" && !u.done).length;
    const petN = list.filter((u) => u.queue === "mascotas" && !u.done).length;
    const warn = b.over ? `<span class="chip chip--warn">Revisar constructores</span>` : "";
    const foot = b.over ? `<p class="t-footnote c-2" style="margin:8px 0 0">Hay más mejoras que constructores conocidos</p>` : "";
    const slots = slotsHtml(b, labN, petN, a.th >= 14);
    return `<div class="section"><div class="card" style="display:flex;gap:8px;align-items:flex-start">
        ${thumb(1000001, { size: 40, th: a.th })}
        <div style="flex:1"><div class="t-headline">${esc(meta.featured ? meta.nombre : meta.tag)} ${warn}</div>
          ${slots}${foot}
          <p class="t-footnote c-2" style="margin:8px 0 0">Tiempos estimados desde la exportación de ${esc(fmtWhen(exp.timestamp * 1000))}</p>
        </div>
      </div><ul class="list" style="margin-top:8px">${list.map((u) => upRow({ ...u, meta, exp })).join("") || ""}</ul></div>`;
  }).join("");
}

function slotsHtml(b, labN, petN, pets) {
  const dots = (n, on) => Array.from({ length: Math.max(n, on) }, (_, i) => `<i class="${i < on ? "on" : "free"}"></i>`).join("");
  let ctor;
  if (!b.known) ctor = `<div class="slots"><span class="slots__lbl">Constructores</span><span class="num">${b.occupied} ocupados</span></div>`;
  else if (b.over) ctor = `<div class="slots" role="img" aria-label="Constructores: ${b.occupied} ocupados"><span class="slots__lbl">Constructores</span>${dots(b.occupied, b.occupied)}<span class="num">${b.occupied}</span></div>`;
  else ctor = `<div class="slots" role="img" aria-label="Constructores: ${b.occupied} de ${b.total}"><span class="slots__lbl">Constructores</span>${dots(b.total, b.occupied)}<span class="num">${b.occupied}/${b.total}</span></div>`;
  const lab = `<div class="slots" role="img" aria-label="Laboratorio: ${labN}"><span class="slots__lbl">Laboratorio</span>${dots(labN, labN)}<span class="num">${labN}</span></div>`;
  const pet = pets ? `<div class="slots"><span class="slots__lbl">Mascotas</span>${petN ? `<i class="on"></i>` : `<i class="free"></i>`}<span class="num">${petN}</span></div>` : "";
  return ctor + lab + pet;
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
    <span class="row__main"><span class="row__title">${esc(title)}${badge}</span>
      <span class="row__sub">${esc(level)} · ${accountChip(meta)} · ${esc(queue)}${u.done ? " · pendiente de reimportar" : ""}</span></span>
    <span class="row__trail row__trail--stack"><span class="t-subhead num${u.done ? " done-label" : soon ? " soon" : ""}">${esc(remain)}</span><span class="t-footnote c-2 num">${esc(fmtWhen(u.end))}</span></span>
  </div></li>`;
}

function helpersBlock() {
  const rows = [];
  for (const meta of ROSTER) {
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
      for (const exp of list) {
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
    <g class="chart__x"><text x="${xs[0]}" y="174">${esc(pts[0].day.slice(8))}/${esc(pts[0].day.slice(5, 7))}</text>${pts.length > 1 ? `<text x="${xs[xs.length - 1]}" y="174">${esc(last.day.slice(8))}/${esc(last.day.slice(5, 7))}</text>` : ""}</g>
  </svg>
  <table class="sr-only"><caption>Progreso medio</caption><tbody>${pts.map((p) => `<tr><td>${esc(p.day)}</td><td>${esc(fmtPct(p.v))}</td></tr>`).join("")}</tbody></table>`;
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

function renderAjustes() {
  const imported = ROSTER.filter((r) => expOf(r.tag)).length;
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
  return `<div class="sheet-backdrop" data-close="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="aj-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><span></span><h2 id="aj-title">Ajustes</h2><button class="btn-text btn-text--bold" data-go="#/roster">OK</button></div>
      <div class="sheet__body">
        <div class="section-header"><span>Datos</span></div>
        <div class="section" style="margin-top:0"><ul class="list">
          <li><button class="row" data-go="#/importar"><span class="row__main"><span class="row__title">Importar JSON</span></span>${CHEV}</button></li>
          <li><div class="row"><span class="row__main"><span class="row__title">Cuentas importadas</span></span><span class="row__trail num">${imported} de 11</span></div></li>
          <li><button class="row row--destructive" data-wipe><span class="row__main"><span class="row__title">Borrar todos los datos</span></span></button></li>
          <li><button class="row" data-restore><span class="row__main"><span class="row__title">Restaurar datos incluidos</span></span></button></li>
        </ul></div>
        <div class="section"><div class="card offline-dl${done ? " is-done" : ""}">
          <div class="offline-dl__top"><h3>Imágenes sin conexión</h3><span class="num">${count} de ${totalN}</span></div>
          <div class="bar" style="--p:${Math.min(100, p)};--cat:var(--tint)" role="img" aria-label="${esc(status)}"><span class="bar__fill"></span></div>
          <p class="offline-dl__meta offline-dl__status" aria-live="polite">${esc(status)}</p>
          ${btn}
          <p class="t-footnote c-2" style="margin:8px 0 0">${esc(note)}</p>
        </div></div>
        <div class="section-header"><span>Acerca de</span></div>
        <div class="section" style="margin-top:0"><ul class="list"><li><div class="row"><span class="row__main"><span class="row__title">Versión</span></span><span class="row__trail">1.1.0</span></div></li></ul></div>
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
  const paste = ui.mode !== "file";
  const body = ui.reviewed ? importReview() : importEdit(paste);
  return `<div class="sheet-backdrop" data-close="1"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="im-title">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><button class="btn-text" data-go="#/roster">Cancelar</button><h2 id="im-title">Importar</h2><span></span></div>
      <div class="sheet__body">${body}${LEGAL}</div>
      <div class="sheet__actions">${importActions()}</div>
    </div>`;
}

function importEdit(paste) {
  return `<div class="seg-wrap"><div class="seg" role="tablist">
      <button role="tab" data-im="paste" aria-selected="${paste}">Pegar</button>
      <button role="tab" data-im="file" aria-selected="${!paste}">Archivo</button>
    </div></div>
    ${paste ? `<div class="section"><div class="card"><textarea class="import-text" data-paste placeholder="Pega aquí el JSON exportado" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(state.importUi.text)}</textarea></div>
      <button class="btn btn--small btn--secondary" data-clip style="margin-top:8px">Pegar del portapapeles</button></div>`
      : `<div class="section"><button class="btn btn--secondary btn--block" data-pick>Elegir archivos…</button>
        <input class="file-input" data-files type="file" accept=".json,application/json" multiple>
        <p class="t-footnote c-2">${state.importUi.items.length ? state.importUi.items.length + " archivos elegidos" : "Puedes elegir las 11 cuentas a la vez."}</p></div>`}
    <p class="section-footer">Los datos se guardan solo en este iPhone.</p>`;
}

function importActions() {
  const ui = state.importUi;
  if (!ui.reviewed) {
    const ready = ui.mode === "file" ? ui.items.length > 0 : ui.text.trim().length > 0;
    return `<button class="btn btn--primary btn--block" data-review ${ready ? "" : "disabled"}>Revisar</button>`;
  }
  const ok = ui.items.filter((it) => it.level !== "error" && !it.skip);
  return `<button class="btn btn--primary btn--block" data-commit ${ok.length ? "" : "disabled"}>Importar${ok.length ? ` ${ok.length} ${ok.length === 1 ? "cuenta" : "cuentas"}` : ""}</button>`;
}

function validateExport(value, name) {
  const issues = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { name, level: "error", issues: [{ level: "error", msg: "No es un JSON de cuenta." }], value: null };
  }
  if (typeof value.tag !== "string" || !value.tag.startsWith("#")) issues.push({ level: "error", msg: "Falta el tag de la cuenta." });
  if (!Number.isInteger(value.timestamp)) issues.push({ level: "error", msg: "Falta la fecha de exportación." });
  const th = (value.buildings || []).find((b) => b.data === 1000001);
  if (!th) issues.push({ level: "error", msg: "No se encuentra el ayuntamiento." });
  if (issues.some((i) => i.level === "error")) return { name, level: "error", issues, value };
  const known = rosterByTag(value.tag);
  if (!known) issues.push({ level: "warn", msg: `${value.tag} no es una de tus 11 cuentas.`, foreign: true });
  const prev = (state.rows || []).filter((r) => r.tag === value.tag);
  const same = prev.find((r) => r.timestamp === value.timestamp);
  const newest = prev.reduce((m, r) => Math.max(m, r.timestamp), 0);
  if (same) {
    issues.push({ level: "info", msg: `Ya importada (${fmtWhen(value.timestamp * 1000)}).` });
    return { name, level: "info", issues, value, skip: true, known };
  }
  if (newest && value.timestamp < newest) issues.push({ level: "warn", msg: "Es más antigua que la actual: solo se añadirá al histórico." });
  const unk = (value.equipment || []).filter((e) => {
    const it = state.index.items[String(e.data)];
    return it && it.estado === "sin_identificar";
  }).length;
  if (unk) issues.push({ level: "info", msg: `${unk} ítems sin identificar` });
  const level = issues.some((i) => i.level === "error") ? "error" : issues.some((i) => i.level === "warn") ? "warn" : "ok";
  return { name, level, issues, value, known, skip: false };
}

function importReview() {
  const items = state.importUi.items;
  const ready = items.filter((i) => i.level !== "error" && !i.skip).length;
  const bad = items.filter((i) => i.level === "error").length;
  const head = items.length > 1 ? `<p class="t-subhead" style="margin:0 var(--margin-l) 8px">${items.length} archivos · ${ready} listos · ${bad} con error</p>` : "";
  const cards = items.map((it, idx) => reviewCard(it, idx)).join("");
  return head + `<div class="section stack">${cards}</div>`;
}

function reviewCard(it, idx) {
  if (it.parseError) {
    const p = it.parseError;
    const msg = p.preview
      ? esc(p.msg).replace(esc(p.preview), `<span class="tag">${esc(p.preview)}</span>`)
      : esc(p.msg);
    return `<div class="card"><p class="t-headline">${esc(p.title)}</p><p class="t-subhead msg-err" role="alert">${msg}</p><p class="t-footnote c-2">${esc(p.help || "")}</p></div>`;
  }
  const issues = (it.issues || []).map((iss) => {
    const cls = iss.level === "error" ? "msg-err" : iss.level === "warn" ? "msg-warn" : "c-2";
    return `<p class="t-subhead ${cls}" role="${iss.level === "error" ? "alert" : "status"}">${iss.level === "error" ? `<span class="dot-err"></span> ` : ""}${esc(iss.msg)}</p>`;
  }).join("");
  if (it.level === "error" || !it.value || !it.value.tag) {
    const structural = it.level === "error" && it.value;
    const title = structural ? "No es una exportación de Clash of Clans" : (it.name || "JSON");
    const help = structural ? `<p class="t-footnote c-2">Vuelve a Clash of Clans y toca Copiar otra vez en Exportar datos.</p>` : "";
    return `<div class="card"><p class="t-headline">${esc(title)}</p>${issues}${help}</div>`;
  }
  const exp = it.value;
  const a = analyze(exp, state.index);
  const meta = it.known;
  const title = meta ? meta.nombre : exp.tag;
  const prev = viewOf(exp.tag);
  let delta = "";
  if (prev && a.media != null && prev.media != null) {
    const d = Math.round((a.media - prev.media) * 10) / 10;
    const sign = d > 0 ? "+" : "";
    delta = `<span class="${d < 0 ? "c-2" : ""}" style="${d > 0 ? "color:var(--green-text)" : ""}">${sign}${fmtNum(d)}</span>`;
  }
  const ups = upgradesOf(exp).filter((u) => (exp.timestamp + u.timer) * 1000 > Date.now());
  const eqN = (exp.equipment || []).length;
  const allow = (it.issues || []).some((i) => i.foreign)
    ? `<button class="btn btn--small btn--secondary" data-anyway="${idx}">Importar igualmente</button>` : "";
  return `<div class="card">
    <div class="account-card">
      ${thumb(1000001, { size: 96, th: a.th })}
      <div>
        <div class="account-card__title">${esc(title)} ${meta && meta.role ? `<span class="chip ${meta.roleClass}">${esc(meta.role)}</span>` : ""}</div>
        <p class="t-footnote c-2 tag">${esc(exp.tag)} · TH${a.th}${meta ? ` → objetivo TH${meta.objetivo}` : ""}</p>
        <p class="t-footnote c-2">Exportado ${esc(fmtWhen(exp.timestamp * 1000))}</p>
      </div>
    </div>
    ${issues}
    <div class="row"><span class="row__main">Media</span><span class="row__trail num">${fmtPct(a.media)} ${delta}</span></div>
    <div class="row"><span class="row__main">Equipamiento</span><span class="row__trail num">${eqN} piezas</span></div>
    <div class="row"><span class="row__main">Mejoras en curso</span><span class="row__trail num">${ups.length}${ups[0] ? " · próxima " + esc(fmtWhen((exp.timestamp + ups[0].timer) * 1000)) : ""}</span></div>
    ${allow}
  </div>`;
}

function fichaFrame(inner) {
  return `<div class="sheet-backdrop" data-close-ficha="1"></div>
    <div class="sheet sheet--half" role="dialog" aria-modal="true">
      <div class="sheet__grabber"></div>
      <div class="sheet__bar"><span></span><h2>Ficha</h2><button class="btn-text btn-text--bold" data-close-ficha="1">OK</button></div>
      <div class="sheet__body" style="text-align:center">${inner}</div>
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
  return fichaFrame(`
        <div style="display:flex;justify-content:center">${thumb(f.id, { size: 96, ficha: true })}</div>
        <p class="t-title3">${esc(title)} ${badges.join(" ")}</p>
        <p class="t-title2 num">${esc(line.text)}</p>
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
  const buttons = a.buttons.map((b, i) => `<button class="${b.cls || ""}" data-alert="${i}">${esc(b.label)}</button>`).join("");
  return `<div class="alert-backdrop"><div class="alert material-float" role="alertdialog" aria-modal="true">
    <div class="alert__body"><p class="alert__title">${esc(a.title)}</p><p class="alert__msg">${esc(a.msg)}</p></div>
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
  if (r.name === "evolucion") return renderEvolucion();
  return renderRoster();
}

function render() {
  const r = route();
  if (r.name === "progreso" && r.tag) {
    state.selected = r.tag;
    localStorage.setItem("cp-account", r.tag);
  }
  const root = document.getElementById("app");
  root.innerHTML = `${navbar(r)}<main class="screen" id="screen">${screenFor(r)}</main>${tabbar(r)}${r.name === "ajustes" ? renderAjustes() : ""}${r.name === "importar" ? renderImport() : ""}${fichaSheet()}${renderAlert()}${renderToast()}`;
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
}

function bind(r) {
  document.getElementById("app").onclick = async (ev) => {
    const go = ev.target.closest("[data-go]");
    if (go) { location.hash = go.dataset.go; return; }
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
    const ficha = ev.target.closest("[data-ficha]");
    if (ficha) {
      const lvl = Number(ficha.dataset.lvl);
      const max = ficha.dataset.max ? Number(ficha.dataset.max) : null;
      const unlockTh = ficha.dataset.unlock ? Number(ficha.dataset.unlock) : null;
      state.ficha = ficha.dataset.capsName
        ? { capsOnly: true, name: ficha.dataset.capsName, lvl, max, unlockTh }
        : { id: ficha.dataset.ficha, lvl, max, unlockTh };
      render();
      return;
    }
    if (ev.target.closest("[data-close-ficha]")) { state.ficha = null; render(); return; }
    if (ev.target.closest("[data-close]")) { location.hash = "#/roster"; return; }
    if (ev.target.closest("[data-restore]")) {
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
      if (act === "wipe") { await clearExports(); state.rows = []; state.latest = new Map(); showToast("ok", "Datos borrados"); }
      if (act === "restore") {
        state.rows = await restoreBundled(state.bundlePaths || []);
        state.latest = latestByTag(state.rows);
        showToast("ok", "Datos incluidos restaurados");
      }
      if (act === "anyway") await commitOne(payload);
      if (act === "purge") await purgeImages();
      render();
      return;
    }
    const dl = ev.target.closest("[data-dl]");
    if (dl) {
      if (dl.dataset.dl === "start") downloadAll();
      if (dl.dataset.dl === "stop" && state.dlAbort) state.dlAbort.abort();
      if (dl.dataset.dl === "purge") {
        state.alert = {
          title: "¿Borrar imágenes guardadas?",
          msg: "Se quitarán las imágenes descargadas. Los ayuntamientos y los héroes se pueden volver a guardar.",
          buttons: [{ label: "Cancelar" }, { label: "Borrar", cls: "is-destructive", act: "purge" }],
        };
        render();
      }
      return;
    }
    const im = ev.target.closest("[data-im]");
    if (im) { state.importUi.mode = im.dataset.im; state.importUi.reviewed = false; render(); return; }
    if (ev.target.closest("[data-pick]")) { document.querySelector("[data-files]")?.click(); return; }
    if (ev.target.closest("[data-clip]")) {
      try {
        const text = await navigator.clipboard.readText();
        state.importUi.text = text;
        render();
      } catch { /* pegado manual */ }
      return;
    }
    if (ev.target.closest("[data-review]")) { reviewImport(); return; }
    if (ev.target.closest("[data-commit]")) { await commitImport(); return; }
    const anyway = ev.target.closest("[data-anyway]");
    if (anyway) {
      const item = state.importUi.items[Number(anyway.dataset.anyway)];
      state.alert = {
        title: "Importar igualmente",
        msg: `${item.value.tag} no es una de tus 11 cuentas.`,
        buttons: [{ label: "Cancelar" }, { label: "Importar", cls: "is-default", act: "anyway", payload: item }],
      };
      render();
    }
    const tab = ev.target.closest(".tabbar a[aria-current='page']");
    if (tab) { ev.preventDefault(); document.getElementById("screen")?.scrollTo?.({ top: 0 }); window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  };
  const sel = document.querySelector("[data-account]");
  if (sel) sel.onchange = () => { location.hash = "#/progreso/" + sel.value.slice(1); };
  const evo = document.querySelector("[data-evo]");
  if (evo) evo.onchange = () => { state.evo = evo.value; localStorage.setItem("cp-evo", state.evo); render(); };
  const paste = document.querySelector("[data-paste]");
  if (paste) paste.oninput = () => { state.importUi.text = paste.value; state.importUi.reviewed = false; const btn = document.querySelector("[data-review]"); if (btn) btn.disabled = !paste.value.trim(); };
  const files = document.querySelector("[data-files]");
  if (files) files.onchange = async () => {
    const items = [];
    for (const file of files.files) {
      items.push({ name: file.name, text: await file.text() });
    }
    state.importUi.items = items;
    state.importUi.reviewed = false;
    render();
  };
}

function parseFail(parsed, name) {
  return { name, level: "error", issues: [{ level: "error", msg: parsed.msg }], value: null, parseError: parsed };
}

function reviewImport() {
  const ui = state.importUi;
  let items = [];
  if (ui.mode === "file") {
    items = ui.items.map((it) => {
      const parsed = parseLoose(it.text, "file");
      if (!parsed.ok) return parseFail(parsed, it.name);
      return validateExport(parsed.value, it.name);
    });
  } else {
    const parsed = parseLoose(ui.text, "clipboard");
    if (!parsed.ok) items = [parseFail(parsed, "Pegado")];
    else items = [validateExport(parsed.value, "Pegado")];
  }
  ui.items = items;
  ui.reviewed = true;
  render();
}

async function commitOne(item) {
  if (!item || !item.value) return;
  await putExport(item.value);
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  state.flash = item.value.tag;
  showToast("ok", `${rosterByTag(item.value.tag)?.nombre || item.value.tag} actualizada`);
  location.hash = "#/roster";
}

async function commitImport() {
  const ok = state.importUi.items.filter((it) => it.level !== "error" && !it.skip && !(it.issues || []).some((i) => i.foreign));
  if (!ok.length) return;
  for (const it of ok) await putExport(it.value);
  state.rows = await allExports();
  state.latest = latestByTag(state.rows);
  state.flash = ok.length === 1 ? ok[0].value.tag : null;
  showToast("ok", ok.length === 1 ? `${rosterByTag(ok[0].value.tag)?.nombre || ok[0].value.tag} actualizada` : `${ok.length} cuentas actualizadas`);
  state.importUi = { mode: "paste", text: "", items: [], reviewed: false };
  location.hash = "#/roster";
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
  if (route().name === "ajustes" && state.dl.phase !== "downloading") render();
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
      if (count % 4 === 0) render();
    } catch (err) {
      if (ctrl.signal.aborted) break;
      if (err && (err.name === "QuotaExceededError" || err.code === 22)) {
        state.dl.phase = "space";
        state.cacheBytes = bytes;
        state.cacheCount = count;
        render();
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

window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { state.now = Date.now(); if (route().name === "mejoras") render(); }
});
setInterval(() => {
  state.now = Date.now();
  if (route().name === "mejoras") render();
}, 60000);
window.addEventListener("online", () => {
  retryOfflineThumbs();
  if (route().name === "ajustes") render();
});
window.addEventListener("offline", () => {
  if (route().name === "ajustes") render();
  else paintOfflineThumbs();
});

boot();
