/**
 * WebKit 375×812. Anula la navegación nativa de los <a href="#/…">
 * (en el icono de inicio del iPhone ese toque no cambia el hash por sí solo)
 * y exige que cada control cambie la vista, sin error de JS.
 *
 *   node test/controles.e2e.mjs
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";

const PORT = await freePort();
const root = new URL("..", import.meta.url).pathname;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
  cwd: root,
  stdio: "ignore",
});
const base = `http://127.0.0.1:${PORT}/`;

let webkit;
try {
  ({ webkit } = await import("playwright"));
} catch {
  ({ webkit } = await import("/tmp/node_modules/playwright/index.mjs"));
}

const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

const browser = await webkit.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 375, height: 812 });
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (err) => errors.push(String(err && err.stack || err).split("\n")[0]));

await page.addInitScript(() => {
  document.addEventListener("click", (ev) => {
    const t = ev.target && ev.target.nodeType === 1 ? ev.target : ev.target && ev.target.parentElement;
    const a = t && t.closest && t.closest("a[href^='#']");
    if (a) ev.preventDefault();
  }, true);
});

try {
  await waitServer(base);
  await page.goto(base + "#/inicio", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("h1.large-title")?.textContent?.trim() === "Inicio");
  const inicio = await page.evaluate(() => document.querySelector("#screen")?.textContent || "");
  check(inicio.includes("Centro de mando"), "falta la cabecera");
  check(inicio.includes("Constructores libres"), "falta la cifra de constructores");
  check(inicio.includes("Próximas finalizaciones"), "faltan las próximas finalizaciones");

  await paso("Qué hacer ahora", "#screen a.row--accion", "#/ahora", "Ahora");
  await en("#/inicio", "Inicio");
  await paso("icono de Qué hacer ahora", "#screen a.row--accion .accion__ico", "#/ahora", "Ahora", { punto: true });
  await en("#/inicio", "Inicio");
  await paso("objetivos", "#screen a.row--accion >> nth=1", "#/roster", "Cuentas");
  await en("#/inicio", "Inicio");
  await paso("Abrir hoy", "#screen .orden-list a", /#\/progreso\/[^/]+\/plan$/, "Plan");
  await en("#/inicio", "Inicio");
  await paso("tarjeta de Inicio", "#screen a.row--inicio", /#\/progreso\/[^/]+$/, "Progreso");
  await en("#/inicio", "Inicio");
  await paso("Actualizar todas", "#screen [data-actualizar]", "#/actualizar", "Actualizar todas");
  await paso("Dejar para luego", "#screen button[data-go='#/inicio']", "#/inicio", "Inicio");

  for (const tab of ["Cuentas", "Mejoras", "Análisis", "Agenda"]) {
    await en("#/inicio", "Inicio");
    await paso("pestaña " + tab, ".tabbar a >> text=" + tab, null, null, { tab });
  }
  await en("#/agenda", "Agenda");
  await paso("pestaña Inicio", ".tabbar a >> text=Inicio", "#/inicio", "Inicio");

  await en("#/roster", "Cuentas");
  await paso("Qué hacer ahora en Cuentas", "#screen .link-row a >> text=Qué hacer ahora", "#/ahora", "Ahora");
  await en("#/roster", "Cuentas");
  await paso("tarjeta de Cuentas", "#screen a.row__main", /#\/progreso\/[^/]+$/, "Progreso");
  await en("#/roster", "Cuentas");
  await paso("miniatura de Cuentas", "#screen .row--account > .thumb", /#\/progreso\/[^/]+$/, "Progreso", { punto: true });

  await page.evaluate(() => {
    localStorage.setItem("cp-actualizar", JSON.stringify({
      v: 1, status: "open", startedAt: 1, order: ["#28PLGP0G2", "#R00C8CPQC"], done: {}, pending: "",
    }));
  });
  await en("#/inicio", "Inicio");
  await paso("Qué hacer ahora con la sesión abierta", "#screen a.row--accion", "#/ahora", "Ahora");
  check(!(await page.evaluate(() => location.hash)).startsWith("#/actualizar"), "la sesión se llevó Ahora a Actualizar todas");
  await en("#/roster", "Cuentas");
  await paso("Qué hacer ahora de Cuentas con la sesión", "#screen .link-row a >> text=Qué hacer ahora", "#/ahora", "Ahora");
  await en("#/actualizar", "Actualizar todas");
  await paso("Inicio con la sesión abierta", ".tabbar a >> text=Inicio", "#/inicio", "Inicio");
  for (const tab of ["Cuentas", "Mejoras", "Análisis", "Agenda"]) {
    await paso("pestaña " + tab + " con sesión", ".tabbar a >> text=" + tab, null, null, { tab });
    await paso("Inicio desde " + tab + " con sesión", ".tabbar a >> text=Inicio", "#/inicio", "Inicio");
  }

  await page.screenshot({ path: "/opt/cursor/artifacts/319-controles.png" });
} finally {
  console.log(JSON.stringify({ ok: fails.length === 0, fails }, null, 2));
  await browser.close();
  server.kill();
}
if (fails.length) process.exit(1);

async function paso(label, sel, hash, title, opts = {}) {
  errors.length = 0;
  const before = await page.evaluate(() => location.hash);
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: "visible" });
  if (opts.punto) {
    const box = await loc.boundingBox();
    check(!!box, label + " sin caja");
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await loc.click();
  }
  await page.waitForFunction((prev) => location.hash !== prev, before).catch(() => {});
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    hash: location.hash,
    title: (document.querySelector("h1.large-title")?.textContent || "").trim(),
    errCard: (document.querySelector("#screen")?.textContent || "").includes("No se pudo pintar"),
    tab: (document.querySelector(".tabbar a[aria-current='page'] span")?.textContent || "").trim(),
  }));
  if (opts.tab) {
    check(after.tab === opts.tab, `${label}: pestaña ${after.tab} hash ${after.hash}`);
    check(after.hash !== before, `${label}: la vista no cambió (${after.hash})`);
  } else if (hash instanceof RegExp) {
    check(hash.test(after.hash), `${label}: hash ${after.hash} no cumple ${hash}`);
    check(after.title === title, `${label}: título «${after.title}»`);
  } else {
    check(after.hash === hash, `${label}: hash ${after.hash} ≠ ${hash}`);
    check(after.title === title, `${label}: título «${after.title}»`);
  }
  check(!after.errCard, `${label}: error al pintar`);
  check(errors.length === 0, `${label}: ${errors.join(" | ")}`);
}

async function en(hash, title) {
  errors.length = 0;
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForFunction((t) => (document.querySelector("h1.large-title")?.textContent || "").includes(t), title);
  check(errors.length === 0, `abrir ${hash}: ${errors.join(" | ")}`);
  check(!(await page.locator("#screen").textContent()).includes("No se pudo pintar"), `abrir ${hash} no se pintó`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitServer(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("el servidor no arrancó");
}
