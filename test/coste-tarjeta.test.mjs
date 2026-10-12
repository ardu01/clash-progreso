import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { APP_VERSION } from "../js/caches.js";
import { fmtMiles, htmlCoste, htmlCuerpoMejorar, htmlMartillo, iconoRecurso, partesDeBolsa } from "../js/coste-tarjeta.js";

const ORIGEN = {
  oro: "https://media.ffycdn.net/eu/supercell/9YH5NnM3Ycxvi2wThWCt.png",
  elixir: "https://media.ffycdn.net/eu/supercell/BV54prjNWJCcjemWQH4G.png",
  oscuro: "https://media.ffycdn.net/eu/supercell/n6j4KEJdcJqJurrkvrtU.png",
  gemas: "https://media.ffycdn.net/eu/supercell/u7pauwgAjgRLZUNKg3jT.png",
  brillante: "https://media.ffycdn.net/eu/supercell/vcy22P2s3SfB91tUm6HV.png",
  resplandeciente: "https://media.ffycdn.net/eu/supercell/54BRhBgyLWvGDsg2UCsj.png",
  estelar: "https://media.ffycdn.net/eu/supercell/zaS6mtw1tiftumPVcgPY.png",
  martillo: "https://media.ffycdn.net/eu/supercell/DCSL74ufhRaBWF5XuoB7.png",
};

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
  assert.match(muros, /oficial\/resources\/oro\.png/);
  assert.match(muros, /oficial\/resources\/elixir\.png/);
  assert.match(muros, /1\u00a0000/);
  assert.match(htmlCoste({ gemas: 500 }), /oficial\/resources\/gemas\.png/);
  assert.match(htmlCoste({}), /mejora__vacio/);
  assert.match(iconoRecurso("elixir"), /<img /);
  assert.match(iconoRecurso("oro"), /recurso--oro/);
  assert.match(htmlMartillo(), /oficial\/resources\/martillo\.png/);
  assert.match(htmlMartillo(), /btn-mejorar__icono/);
  assert.match(htmlMartillo(40, "plan-fab__icono"), /<img [^>]*draggable="false"/);
  assert.match(iconoRecurso("oro"), /draggable="false"/);
  assert.match(htmlCuerpoMejorar(), /btn-mejorar__cuerpo/);
  assert.match(htmlCuerpoMejorar(), />Mejorar</);
  assert.equal(htmlCoste({ oro: 1000 }).includes("martillo"), false);
  const src = readFileSync(new URL("../js/coste-tarjeta.js", import.meta.url), "utf8");
  assert.equal(/<svg/.test(src), false);
  assert.equal(/https?:/.test(src), false);
});

test("4.2.1: los iconos de recurso son los PNG oficiales del Fan Kit", () => {
  const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf8"));
  const cajas = JSON.parse(readFileSync(new URL("../assets/cajas-alfa.json", import.meta.url), "utf8"));
  const iconos = manifest.iconos_recurso;
  assert.deepEqual(Object.keys(iconos).sort(), Object.keys(ORIGEN).sort());
  for (const [id, url] of Object.entries(ORIGEN)) {
    const im = iconos[id];
    assert.equal(im.official, true, id);
    assert.equal(im.copia_identica, true, id);
    assert.equal(im.precarga, true, id);
    assert.equal(im.url_origen, url, id);
    assert.equal(im.sha256, im.sha256_original, id);
    assert.equal(im.sha256_copia, im.sha256, id);
    const buf = readFileSync(new URL("../assets/" + im.ruta, import.meta.url));
    assert.equal(buf.length, im.bytes, id);
    assert.equal(createHash("sha256").update(buf).digest("hex"), im.sha256, id);
    assert.ok(cajas[im.ruta], id);
  }
  const noOficiales = manifest.unofficial_images.filter((im) => im && im.official === false);
  assert.equal(noOficiales.every((im) => !String(im.ruta || "").includes("oficial/resources/")), true);
});

test("4.2.1: Plan, Hoy y Mejoras pintan la tarjeta cuadrada", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const cartas = app.slice(app.indexOf("function fichaMejora("), app.indexOf("function renderPlan("));
  assert.match(cartas, /class="mejora"/);
  assert.match(cartas, /htmlCoste/);
  assert.match(cartas, /htmlCuerpoMejorar/);
  assert.match(cartas, /btn-mejorar/);
  assert.equal(cartas.includes("htmlMartillo"), false);
  assert.equal(cartas.includes("mejora__martillo"), false);
  assert.match(cartas, /mejora-grid/);
  assert.match(cartas, />Hecho</);
  assert.equal(cartas.includes("fmtRes"), false);
  assert.equal(cartas.includes("costBits"), false);
  const plan = app.slice(app.indexOf("function renderPlanHub("), app.indexOf("function renderPlan("));
  assert.match(plan, /fichaMejora/);
  assert.match(plan, /mejora-grid/);
  assert.equal(plan.includes("mejorar:"), false);
  assert.equal(plan.includes("htmlCuerpoMejorar"), false);
  const costes = app.slice(app.indexOf("function costCard("), app.indexOf("function etiquetaPaso("));
  assert.match(costes, /lineaCoste/);
  const ay = app.slice(app.indexOf("function ayuntamientoLine("), app.indexOf("function resourceAllowsItem("));
  assert.match(ay, /htmlCoste/);
  assert.equal(ay.includes("fmtRes"), false);
  const curso = app.slice(app.indexOf("function upRow("), app.indexOf("function helpersBlock("));
  assert.match(curso, /fichaMejora/);
  assert.equal(curso.includes("mejorar:"), false);
  assert.match(html, new RegExp("js/coste-tarjeta\\.js\\?v=" + APP_VERSION.replaceAll(".", "\\.")));
  assert.match(sw, /js\/coste-tarjeta\.js/);
  assert.equal(app.includes("cuello de botella"), false);
});

test("4.2.1: los botones tienen margen vertical y la i no se pega al texto", () => {
  const css = readFileSync(new URL("../css/estilo-3.1.css", import.meta.url), "utf8");
  assert.match(css, /button:not\(\.navbar \*\)/);
  assert.match(css, /:not\(\.section-head > \*\)/);
  assert.match(css, /\.section-head > button\.info,\s*\n\.title-line > button\.info \{ margin: 0; align-self: center; \}/);
  assert.match(css, /margin-top: 12px;/);
  assert.match(css, /margin-bottom: 12px;/);
  assert.match(css, /\.mejora-hecho \{ margin-top: 12px; margin-bottom: 12px; \}/);
  assert.match(css, /\.btn-mejorar,\s*\n\.btn-mejorar__cuerpo \{\s*\n  display: flex;\s*\n  align-items: center;\s*\n  justify-content: center;\s*\n\}/);
  assert.equal(css.includes(".mejora__fig > .mejora__martillo"), false);
});
