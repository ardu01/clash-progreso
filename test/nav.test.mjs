import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accionTab } from "../js/nav.js";

const pestanas = ["#/roster", "#/mejoras", "#/ranking", "#/agenda"];

test("Inicio se abre desde cada pestaña", () => {
  for (const hash of pestanas) {
    const act = accionTab(hash, "#/inicio");
    assert.equal(act.type, "go", hash);
    assert.equal(act.hash, "#/inicio");
  }
  assert.equal(accionTab("#/inicio", "#/inicio").type, "scroll");
  assert.equal(accionTab("", "#/inicio").type, "scroll");
  assert.equal(accionTab("#/", "#/inicio").type, "scroll");
});

test("con Actualizar todas abierta, Inicio sale de la sesión", () => {
  for (const hash of ["#/actualizar", "#/ahora", "#/copia", ...pestanas]) {
    const act = accionTab(hash, "#/inicio");
    assert.equal(act.type, "go", hash);
    assert.equal(act.hash, "#/inicio");
  }
  assert.equal(accionTab("#/actualizar", "#/roster").hash, "#/roster");
  assert.equal(accionTab("#/roster", "#/roster").type, "scroll");
});

test("el toque de Inicio no se cancela por la pestaña marcada", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /accionTab/);
  assert.equal(app.includes(".tabbar a[aria-current='page']"), false);
  assert.equal(app.includes("titles[tab]"), false);
  const boot = app.slice(app.indexOf("async function boot"), app.indexOf("window.addEventListener"));
  assert.match(boot, /abierta !== "inicio"/);
});
