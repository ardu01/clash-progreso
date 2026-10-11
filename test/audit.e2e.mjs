import { webkit } from "/tmp/node_modules/playwright/index.mjs";

const base = process.env.AUDIT_BASE || "http://127.0.0.1:8842/";
const browser = await webkit.launch();
const fails = [];
const bad = (msg) => fails.push(msg);

async function preparar(page, standalone) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (err) => bad("pageerror: " + String(err).split("\n")[0]));
  page.on("popup", (popup) => popup.close().catch(() => {}));
  await page.addInitScript((solo) => {
    localStorage.setItem("cp-theme", "dark");
    localStorage.removeItem("cp-actualizar");
    if (solo) {
      try { Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get() { return true; } }); } catch { /* ya está */ }
      const orig = window.matchMedia.bind(window);
      window.matchMedia = (q) => String(q).includes("display-mode")
        ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
        : orig(q);
    }
    window.__errs = [];
    window.addEventListener("error", (e) => {
      if (e.target && e.target !== window) return;
      window.__errs.push(String(e.message || e.error));
    });
    window.addEventListener("unhandledrejection", (e) => window.__errs.push("reject " + (e.reason && e.reason.message || e.reason)));
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
    try { Object.defineProperty(window, "Notification", { configurable: true, value: undefined }); } catch { /* el motor no deja quitarlo */ }
    const clip = { readText: () => Promise.reject(new Error("portapapeles")), writeText: () => Promise.reject(new Error("portapapeles")) };
    try { Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => clip }); } catch { navigator.clipboard = clip; }
  }, standalone);
}

const ACTIONS = "data-go,data-actualizar,data-actualizar-listo,data-edit,data-ficha,data-paste-now,data-pegar-cuenta,data-pegar-campo,data-pegar-mano,data-plan-modo,data-plan-flag,data-prov,data-theme,data-notify,data-clear-filters,data-sueno-clear,data-tiempo,data-recurso,data-th,data-grupo,data-chart-kind,data-level-kind,data-rank,data-compare,data-grupo-add,data-grupo-del,data-seg,data-mej,data-pcat,data-pstatus,data-close-editor,data-principal,data-delete,data-backup,data-close-ficha,data-close,data-restore,data-wipe,data-alert,data-dl,data-quitar,data-im,data-im-back,data-im-row,data-act,data-eq-vista,data-eq-cuenta,data-eq-rareza,data-eq-bloqueados,data-eq-ocultar,data-eq-elegir".split(",");

function enumerar(page) {
  return page.evaluate((names) => {
    const capa = document.querySelector(".alert, .sheet");
    const scope = capa || document;
    const set = new Set();
    for (const el of scope.querySelectorAll("a[href], button, [onclick]")) set.add(el);
    for (const name of names) for (const el of scope.querySelectorAll("[" + name + "]")) set.add(el.closest("a, button") || el);
    const out = [];
    let i = 0;
    for (const el of set) {
      if (el === document.documentElement || el === document.body || el === document.head) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || st.display === "none" || st.visibility === "hidden") continue;
      const href = el.getAttribute("href") || el.getAttribute("data-go") || "";
      if (/^https?:/i.test(href)) continue;
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48);
      const key = el.tagName + "|" + href + "|" + text + "|" + (el.getAttribute("data-alert") || "") + "|" + (el.getAttribute("data-theme") || "") + "|" + (el.getAttribute("data-dl") || "");
      el.setAttribute("data-audit", String(i));
      out.push({
        i, key, text, href,
        picker: el.hasAttribute("data-backup-pick") || el.getAttribute("data-act") === "pick",
      });
      i += 1;
    }
    return out;
  }, ACTIONS);
}

async function ir(page, hash) {
  const info = await page.evaluate((h) => new Promise((resolve) => {
    window.__errs.splice(0);
    const finish = (t0) => resolve({
      dt: Math.round(performance.now() - t0),
      title: (document.querySelector("h1.large-title")?.textContent || "").trim(),
      err: (document.querySelector("#screen")?.textContent || "").includes("No se pudo pintar"),
      errs: window.__errs.splice(0),
    });
    if (location.hash === h) { finish(performance.now()); return; }
    const t0 = performance.now();
    window.addEventListener("hashchange", () => finish(t0), { once: true });
    location.hash = h;
  }), hash);
  if (info.dt > 200) bad("pintar " + hash + " bloqueó " + info.dt + " ms");
  if (info.err) bad("pintar " + hash + " mostró el aviso de error");
  if (info.errs.length) bad("pintar " + hash + ": " + info.errs.join(" | "));
  return info;
}

async function barrer(page, donde) {
  const vistos = new Set();
  for (let n = 0; n < 80; n += 1) {
    if (await page.locator(".alert").count()) {
      await page.evaluate(() => document.querySelector("[data-alert-cancel]")?.click());
      continue;
    }
    const items = await enumerar(page);
    const item = items.find((it) => !vistos.has(it.key));
    if (!item) break;
    vistos.add(item.key);
    let res;
    try {
      res = await page.evaluate(async (i) => {
        const firma = () => {
          const screen = document.querySelector("#screen");
          const capa = document.querySelector(".sheet, .alert");
          const text = ((screen?.textContent || "") + "\n" + (capa?.textContent || "")).replace(/\s+/g, " ");
          let sig = 0;
          for (let n = 0; n < text.length; n += 1) sig = (Math.imul(sig, 31) + text.charCodeAt(n)) | 0;
          return {
            hash: location.hash,
            title: (document.querySelector("h1.large-title")?.textContent || "").trim(),
            sig, len: text.length,
            sheets: document.querySelectorAll(".sheet, .alert").length,
            toast: (document.querySelector(".toast, #aviso-discreto")?.textContent || "").trim(),
            pressed: [...document.querySelectorAll("[aria-pressed], [aria-selected]")].map((el) => (el.getAttribute("aria-pressed") || "") + (el.getAttribute("aria-selected") || "")).join(""),
            theme: document.documentElement.getAttribute("data-theme") || "",
          };
        };
        const el = document.querySelector(`[data-audit="${i}"]`);
        if (!el) return { missing: true };
        const nav = document.querySelector(".navbar");
        const tab = document.querySelector(".tabbar");
        const top = (nav ? nav.getBoundingClientRect().bottom : 0) + 8;
        const bottom = (tab ? tab.getBoundingClientRect().top : innerHeight) - 8;
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        const x = Math.min(Math.max(r.left + r.width / 2, 4), innerWidth - 4);
        const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), top), Math.max(top + 1, bottom - 2));
        const hit = document.elementFromPoint(x, y);
        const propio = !!(hit && (hit === el || el.contains(hit) || (hit.closest && hit.closest("a, button") === el)));
        const backdrop = !!(hit && hit.closest && hit.closest(".sheet-backdrop, .alert-backdrop"));
        const antes = firma();
        antes.pressedEl = el.getAttribute("aria-pressed") || "";
        antes.selectedEl = el.getAttribute("aria-selected") || "";
        window.__errs.splice(0);
        const t0 = performance.now();
        el.click();
        const dt = Math.round(performance.now() - t0);
        await new Promise((ok) => setTimeout(ok, 80));
        const despues = firma();
        const b = getComputedStyle(document.body);
        const h = getComputedStyle(document.documentElement);
        const abierta = document.querySelector(".sheet, .alert");
        const overflow = (b.overflowY === "hidden" || h.overflowY === "hidden") && !abierta ? "overflow" : "";
        const huerfano = document.querySelector(".sheet-backdrop, .alert-backdrop") && !abierta ? "backdrop" : "";
        return { dt, propio, backdrop, antes, despues, tapa: overflow || huerfano, errs: window.__errs.splice(0) };
      }, item.i);
    } catch (err) {
      bad(donde + " navegación rota en «" + item.text + "»: " + String(err.message || err).split("\n")[0]);
      break;
    }
    if (res.missing) continue;
    const cambio = res.antes.hash !== res.despues.hash || res.antes.title !== res.despues.title || res.antes.sig !== res.despues.sig || res.antes.len !== res.despues.len || res.antes.sheets !== res.despues.sheets || res.antes.toast !== res.despues.toast || res.antes.pressed !== res.despues.pressed || res.antes.theme !== res.despues.theme;
    const mismo = item.href && (item.href === res.antes.hash || (item.href === "#/inicio" && (res.antes.hash === "" || res.antes.hash === "#/inicio")));
    const yaActivo = res.antes.pressedEl === "true" || res.antes.selectedEl === "true";
    if (res.backdrop && !res.propio) bad(donde + " tapado «" + item.text + "» por un velo");
    if (res.dt > 200) bad(donde + " hilo " + res.dt + " ms «" + item.text + "»");
    if (res.errs.length) bad(donde + " «" + item.text + "»: " + res.errs.join(" | "));
    if (res.tapa && res.despues.sheets === 0) bad(donde + " bloqueo «" + item.text + "»: " + res.tapa);
    if (!cambio && !mismo && !yaActivo && !item.picker) bad(donde + " sin efecto «" + item.text + "» " + item.href);
    if (res.despues.hash !== res.antes.hash) await page.evaluate((h) => { location.hash = h; }, res.antes.hash || "#/inicio");
  }
  for (let i = 0; i < 4; i += 1) {
    const closed = await page.evaluate(() => {
      const btn = document.querySelector(".alert [data-alert-cancel], .sheet [data-close-editor], .sheet [data-close-ficha], .sheet [data-close]");
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!closed) break;
  }
}

const page = await browser.newPage();
await preparar(page, true);
await page.goto(base + "#/inicio", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => (document.querySelector("h1.large-title")?.textContent || "").includes("Inicio"));
const mods = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name).filter((n) => /\/js\/[^/]+\.js/.test(n)));
if (!mods.length || mods.some((n) => !n.includes("v=3.1.13"))) bad("módulos sin versión: " + mods.filter((n) => !n.includes("v=3.1.13")).join(" "));

for (const hash of ["#/inicio", "#/roster", "#/mejoras", "#/ranking", "#/graficos", "#/agenda", "#/ahora", "#/copia", "#/actualizar"]) {
  await ir(page, hash);
  await barrer(page, hash);
}
await ir(page, "#/roster");
const tag = await page.evaluate(() => document.querySelector("a[href^='#/progreso/']")?.getAttribute("href") || "");
if (!tag) bad("no hay cuenta para abrir el progreso");
else {
  const id = tag.split("/")[2];
  for (const hash of [tag, tag + "/plan", tag + "/historial", "#/perfil/" + id, "#/equipo/" + id, "#/importar", "#/ajustes"]) {
    await ir(page, hash);
    await barrer(page, hash);
  }
}

await ir(page, "#/copia");
const seQueda = await page.evaluate(() => {
  const enlace = document.querySelector("a[href^='http']");
  if (!enlace) return "sin enlace";
  const antes = location.href;
  enlace.click();
  return location.href === antes ? "ok" : location.href;
});
if (seQueda !== "ok") bad("un enlace externo sustituyó la app: " + seQueda);

await page.evaluate(() => { document.querySelector(".navbar")?.setAttribute("inert", ""); });
await page.evaluate(() => { window.dispatchEvent(new ErrorEvent("error", { message: "fallo de prueba", error: new Error("fallo de prueba") })); });
await page.waitForFunction(() => (document.getElementById("aviso-discreto")?.textContent || "").includes("Puedes seguir"));
const pillada = await page.evaluate(() => ({
  inert: document.querySelectorAll("[inert]").length,
  backdrop: document.querySelectorAll(".sheet-backdrop, .alert-backdrop").length,
  title: document.querySelector("h1.large-title")?.textContent?.trim() || "",
}));
if (pillada.inert || pillada.backdrop) bad("tras un error la UI sigue bloqueada: " + JSON.stringify(pillada));

await page.evaluate(() => { location.hash = "#/inicio"; });
await page.waitForFunction(() => location.hash === "#/inicio");
await page.evaluate(() => { location.hash = "#/roster"; });
await page.waitForFunction(() => location.hash === "#/roster");
await page.evaluate(() => history.back());
await page.waitForFunction(() => location.hash === "#/inicio");
await page.evaluate(() => history.forward());
await page.waitForFunction(() => location.hash === "#/roster");

const tab = await browser.newPage();
await preparar(tab, false);
await tab.goto(base + "#/mejoras", { waitUntil: "domcontentloaded" });
await tab.waitForFunction(() => location.hash === "#/mejoras");
await tab.evaluate(() => { location.hash = "#/agenda"; });
await tab.waitForFunction(() => location.hash === "#/agenda");
await tab.evaluate(() => history.back());
await tab.waitForFunction(() => location.hash === "#/mejoras");

if (fails.length) {
  console.log(fails.join("\n"));
  await browser.close();
  process.exit(1);
}
console.log("auditoría limpia");
await browser.close();
