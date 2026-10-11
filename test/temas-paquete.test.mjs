import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { PAQUETE_TEMAS } from "../js/caches.js";
import { cargarPaquete, hayPaquete, resolverAuto } from "../js/temas-paquete.js";

const leer = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("4.1.8: PAQUETE_TEMAS dice la verdad sobre paquete-estetico/", () => {
  assert.equal(typeof PAQUETE_TEMAS, "boolean");
  assert.equal(PAQUETE_TEMAS, existsSync(new URL("../paquete-estetico/paquete.json", import.meta.url)));
  if (PAQUETE_TEMAS) assert.equal(JSON.parse(leer("../paquete-estetico/paquete.json")).version, "1.0.0");
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
