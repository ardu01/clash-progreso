/**
 * Cinco pestañas, claro y oscuro, a 375×812.
 *   node test/capturas.e2e.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
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

const tabs = [
  ["inicio", "#/inicio", "Inicio"],
  ["cuentas", "#/roster", "Cuentas"],
  ["mejoras", "#/mejoras", "Mejoras"],
  ["analisis", "#/ranking", "Ranking"],
  ["agenda", "#/agenda", "Agenda"],
];
const dir = new URL("../docs/capturas/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const browser = await webkit.launch();
const fails = [];
try {
  await waitServer(base);
  for (const theme of ["dark", "light"]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    page.setDefaultTimeout(20000);
    await page.addInitScript((modo) => {
      localStorage.setItem("cp-theme", modo);
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise(() => {});
    }, theme);
    await page.goto(base + "#/inicio", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.querySelector(".large-sub")?.textContent || "").includes("Centro de mando"));
    for (const [name, hash, title] of tabs) {
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForFunction((t) => (document.querySelector("h1.large-title")?.textContent || "").includes(t), title);
      const box = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      if (box.w !== 375 || box.h !== 812) fails.push(`${theme} ${name} ${box.w}x${box.h}`);
      const shot = theme === "dark" ? "oscuro" : "claro";
      await page.screenshot({ path: `${dir}313-${name}-${shot}.png` });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (fails.length) {
  console.log(fails.join("\n"));
  process.exit(1);
}
console.log("capturas 375×812");

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

function waitServer(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      fetch(url).then(() => resolve()).catch(() => {
        if (Date.now() - start > 8000) reject(new Error("sin servidor"));
        else setTimeout(tick, 80);
      });
    };
    tick();
  });
}
