import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fmtMiles, htmlCoste, iconoRecurso, partesDeBolsa } from "../js/coste-tarjeta.js";

test("4.2.1: los miles van con espacio y no con punto", () => {
  assert.equal(fmtMiles(5500000), "5\u00a0500\u00a0000");
  assert.equal(fmtMiles(1000), "1\u00a0000");
  assert.equal(fmtMiles(12), "12");
  assert.equal(fmtMiles(0), "0");
  assert.equal(fmtMiles(-1500), "−1\u00a0500");
  assert.equal(fmtMiles(5500000).includes("."), false);
});

test("4.2.1: la bolsa separa oro, elixir, oscuro, gemas, muros y menas", () => {
  const partes = partesDeBolsa({
    oro: 5500000,
    elixir: 0,
    oscuro: 1200,
    gemas: 50,
    muros: 8000,
    brillante: 10,
    reluciente: 3,
    starry: 1,
  });
  assert.deepEqual(partes.map((p) => p.id), ["oro", "oscuro", "gemas", "muros", "brillante", "resplandeciente", "estelar"]);
});

test("4.2.1: el muro muestra las dos marcas y las gemas su dibujo", () => {
  const muros = htmlCoste({ muros: 1000 });
  assert.match(muros, /recurso--oro/);
  assert.match(muros, /recurso--elixir/);
  assert.match(muros, /1\u00a0000/);
  assert.match(htmlCoste({ gemas: 500 }), /recurso--gemas/);
  assert.match(htmlCoste({}), /mejora__vacio/);
  assert.match(iconoRecurso("elixir"), /<svg /);
  assert.match(iconoRecurso("oro"), /recurso--oro/);
  const src = readFileSync(new URL("../js/coste-tarjeta.js", import.meta.url), "utf8");
  assert.equal(/https?:/.test(src), false);
  assert.equal(/\.png/i.test(src), false);
});

test("4.2.1: Plan, Hoy y Mejoras pintan la tarjeta cuadrada", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const cartas = app.slice(app.indexOf("function fichaMejora("), app.indexOf("function renderPlan("));
  assert.match(cartas, /class="mejora"/);
  assert.match(cartas, /htmlCoste/);
  assert.match(cartas, /mejora-grid/);
  assert.match(cartas, />Hecho</);
  assert.equal(cartas.includes("fmtRes"), false);
  assert.equal(cartas.includes("costBits"), false);
  const plan = app.slice(app.indexOf("function mejorasPlan("), app.indexOf("function mejorasEquipo("));
  assert.match(plan, /fichaMejora/);
  assert.match(plan, /mejora-grid/);
  const costes = app.slice(app.indexOf("function costCard("), app.indexOf("function etiquetaPaso("));
  assert.match(costes, /lineaCoste/);
  const ay = app.slice(app.indexOf("function ayuntamientoLine("), app.indexOf("function resourceAllowsItem("));
  assert.match(ay, /htmlCoste/);
  assert.equal(ay.includes("fmtRes"), false);
  const curso = app.slice(app.indexOf("function upRow("), app.indexOf("function helpersBlock("));
  assert.match(curso, /fichaMejora/);
  assert.match(html, /js\/coste-tarjeta\.js\?v=4\.2\.1/);
  assert.match(sw, /js\/coste-tarjeta\.js/);
  assert.equal(app.includes("cuello de botella"), false);
});
