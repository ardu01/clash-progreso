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

test("Qué hacer ahora, objetivos, Abrir hoy y las tarjetas cambian de ruta", () => {
  assert.equal(accionTab("#/inicio", "#/ahora").hash, "#/ahora");
  assert.equal(accionTab("#/inicio", "#/roster").hash, "#/roster");
  assert.equal(accionTab("#/inicio", "#/agenda").hash, "#/agenda");
  assert.equal(accionTab("#/roster", "#/ahora").hash, "#/ahora");
  assert.equal(accionTab("#/inicio", "#/progreso/GJPJP9JP0").hash, "#/progreso/GJPJP9JP0");
  assert.equal(accionTab("#/inicio", "#/progreso/GJPJP9JP0/plan").hash, "#/progreso/GJPJP9JP0/plan");
  assert.equal(accionTab("#/actualizar", "#/ahora").hash, "#/ahora");
  assert.equal(accionTab("#/ahora", "#/ahora").type, "scroll");
});

test("el toque de un enlace lo abre la app, no el navegador", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /accionTab/);
  assert.match(app, /a\[href\^='#'\]/);
  assert.match(app, /destinoDelToque/);
  assert.equal(app.includes(".tabbar a[aria-current='page']"), false);
  assert.equal(app.includes('closest(".tabbar a")'), false);
  assert.equal(app.includes("titles[tab]"), false);
  const boot = app.slice(app.indexOf("async function boot"), app.indexOf("window.addEventListener"));
  assert.match(boot, /abierta !== "inicio"/);
});
