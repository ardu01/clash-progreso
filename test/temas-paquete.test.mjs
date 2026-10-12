import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { PAQUETE_TEMAS } from "../js/caches.js";
import { cargarPaquete, hayPaquete, resolverAuto } from "../js/temas-paquete.js";

const leer = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("4.1.8: PAQUETE_TEMAS dice la verdad sobre paquete-estetico/", () => {
  assert.equal(typeof PAQUETE_TEMAS, "boolean");
  assert.equal(PAQUETE_TEMAS, existsSync(new URL("../paquete-estetico/paquete.json", import.meta.url)));
  if (PAQUETE_TEMAS) assert.equal(JSON.parse(leer("../paquete-estetico/paquete.json")).version, "1.1.0");
});

test("4.1.8: sin paquete en la compilación no se pide paquete.json (sin 404)", async () => {
  let pedidos = 0;
  const p = await cargarPaquete({ incluido: false, pedir: () => { pedidos++; return Promise.reject(new Error("no debe pedir")); } });
  assert.equal(p, null);
  assert.equal(pedidos, 0);
  assert.equal(hayPaquete(), false);
  assert.match(leer("../js/temas-paquete.js"), /if \(!incluido\) \{ paquete = null; return Promise\.resolve\(null\); \}/);
});

test("4.1.8: «Automático» resuelve por TH aunque haya otro tema elegido", () => {
  const temas = PAQUETE_TEMAS
    ? JSON.parse(leer("../paquete-estetico/paquete.json")).temas
    : [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((n) => ({ id: "th" + n, th_auto: n })).concat([{ id: "rey", th_auto: null }]);
  assert.equal(resolverAuto(temas, 18).id, "th18");
  assert.equal(resolverAuto(temas, 16).id, "th16");
  assert.equal(resolverAuto(temas, 13).id, "th13");
  assert.equal(resolverAuto(temas, 11).id, "th11");
  assert.equal(resolverAuto(temas, 5).id, "th8");
  assert.equal(resolverAuto(temas, null), null);
  assert.equal(resolverAuto(temas.filter((t) => t.th_auto == null), 18), null);
  const app = leer("../js/app.js");
  assert.match(app, /btn\("auto", "Automático", temaImg\(temaAutomatico\(thDeAhora\(\)\), 40\)\)/);
  assert.equal(app.includes('btn("auto", "Automático", temaImg(temaDeAhora()'), false);
});

test("4.2.2: paquete 1.1.0 con 38 temas, grupos y Automático solo con ayuntamientos", () => {
  if (!PAQUETE_TEMAS) return;
  const p = JSON.parse(leer("../paquete-estetico/paquete.json"));
  assert.equal(p.version, "1.1.0");
  assert.equal(p.temas.length, 38);
  const grupos = p.grupos.map((g) => g.id);
  assert.deepEqual(grupos, ["ayuntamiento", "especial", "heroe", "mascota", "hechizo", "supertropa", "asedio", "constructor", "ayudante", "guardian"]);
  for (const t of p.temas) {
    assert.ok(grupos.includes(t.grupo), t.id);
    assert.equal(t.css, `temas/${t.id}.css`);
    assert.ok(existsSync(new URL("../paquete-estetico/" + t.css, import.meta.url)), t.id);
    if (t.grupo !== "ayuntamiento") assert.equal(t.th_auto, null, t.id);
  }
  assert.equal(resolverAuto(p.temas, 18).id, "th18");
  const app = leer("../js/app.js");
  assert.match(app, /<span class="swatch" data-sw=/);
});

test("4.2.8: el radar no corta las etiquetas y el tema no hereda el margen de los botones", () => {
  const app = leer("../js/app.js");
  const radar = app.slice(app.indexOf("function radarSvg("), app.indexOf("function paceBlock("));
  assert.match(radar, /text-anchor/);
  assert.match(radar, /viewBox="-24 0 368 250"/);
  const css = leer("../css/estilo-3.1.css");
  assert.match(css, /\.chart\.radar text \{ fill: var\(--label-2\)/);
  assert.match(css, /:not\(\.temas \*\)/);
});
