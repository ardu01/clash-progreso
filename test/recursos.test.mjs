import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildBackup, mergeBackup } from "../js/backup.js";
import { cubrir, normalizarRecursos, recursosDeCuenta } from "../js/recursos.js";
import { normalizeAccount, setRecursos } from "../js/roster.js";

test("4.1.9: la ficha no pinta el bloque Recursos y la copia conserva las cifras", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("data-recursos"), false);
  assert.equal(app.includes("recursosCard"), false);
  assert.equal(app.includes(">Al día<"), false);
  assert.match(app, /recursosDeCuenta/);
  const vieja = {
    tag: "#A", alias: "Mia", principal: false, addedAt: 1, chip: "A", objetivo: 18,
    recursos: { oro: 1500, elixir: 200, oscuro: 10, brillante: 3, glowy: 1, starry: 0, manual: true, actualizado: 40 },
  };
  const file = buildBackup({ accounts: [vieja], exports: [], now: Date.parse("2026-10-12T10:00:00Z") });
  assert.equal(file.accounts[0].recursos.oro, 1500);
  assert.equal(file.accounts[0].recursos.starry, 0);
  const merged = mergeBackup({ accounts: [], exports: [] }, file);
  assert.equal(merged.accounts[0].recursos.elixir, 200);
  assert.equal(merged.accounts[0].alias, "Mia");
});

test("sin cifras no hay recursos y una copia antigua sigue importándose", () => {
  assert.equal(recursosDeCuenta(null), null);
  assert.equal(recursosDeCuenta({ tag: "#A" }), null);
  assert.equal(normalizarRecursos({ oro: "", elixir: null, ingresos: { oro: 0 } }), null);
  const vieja = { tag: "#A", alias: "Mia", principal: false, addedAt: 1, chip: "A", objetivo: 18 };
  const acc = normalizeAccount(vieja);
  assert.equal(acc.recursos, undefined);
  assert.equal(acc.alias, "Mia");
  const file = buildBackup({ accounts: [vieja], exports: [], now: Date.parse("2026-10-08T10:00:00Z") });
  assert.equal("recursos" in file.accounts[0], false);
  const merged = mergeBackup({
    accounts: [{ ...vieja, recursos: { oro: 500, manual: true, actualizado: 10 } }],
    exports: [],
  }, file);
  assert.equal(merged.accounts.find((a) => a.tag === "#A").recursos.oro, 500);
  const redonda = mergeBackup({ accounts: [], exports: [] }, buildBackup({
    accounts: [{ tag: "#B", alias: "Sin", principal: false, addedAt: 0, chip: "B", objetivo: null }],
    exports: [],
  }));
  assert.equal(redonda.accounts[0].recursos, undefined);
});

test("los recursos manuales se normalizan, se guardan y no pisan una cifra más nueva", () => {
  const cuenta = { tag: "#A", alias: "Mia", recursos: { oro: "1.500", elixir: -3, glowy: "2", starry: "", actualizado: 20 } };
  const rec = recursosDeCuenta(cuenta);
  assert.equal(rec.oro, 1500);
  assert.equal(rec.elixir, null);
  assert.equal(rec.glowy, 2);
  assert.equal(rec.starry, null);
  assert.equal(rec.manual, true);
  assert.equal(rec.actualizado, 20);
  const guardado = setRecursos([normalizeAccount({ tag: "#A", alias: "Mia" })], "#A", {
    oro: 10,
    ingresos: { oro: 5 },
  }, 40);
  assert.equal(guardado[0].recursos.oro, 10);
  assert.equal(guardado[0].recursos.ingresos.oro, 5);
  assert.equal(guardado[0].recursos.manual, true);
  assert.equal(guardado[0].alias, "Mia");
  const copia = buildBackup({ accounts: guardado, exports: [] });
  assert.equal(copia.accounts[0].recursos.oro, 10);
  const local = mergeBackup({
    accounts: [{ tag: "#A", alias: "Mia", principal: false, addedAt: 0, chip: "A", objetivo: null, recursos: { oro: 99, actualizado: 80, manual: true } }],
    exports: [],
  }, copia);
  assert.equal(local.accounts[0].recursos.oro, 99);
  const vacio = setRecursos(guardado, "#A", { oro: "" }, 90);
  assert.equal(vacio[0].recursos, undefined);
});

test("cubrir dice si alcanza, cuánto falta y los días con el ingreso", () => {
  const rec = normalizarRecursos({
    oro: 1000,
    elixir: 100,
    oscuro: null,
    actualizado: 1,
    ingresos: { oro: 100, elixir: 50 },
  });
  const justo = cubrir(rec, { oro: 1000, elixir: 100 });
  assert.equal(justo.alcanza, true);
  assert.deepEqual(justo.falta, {});
  const corto = cubrir(rec, { oro: 2500, elixir: 100, oscuro: 40, resplandeciente: 3 });
  assert.equal(corto.alcanza, false);
  assert.equal(corto.falta.oro, 1500);
  assert.equal(corto.falta.oscuro, null);
  assert.equal(corto.falta.glowy, null);
  assert.equal(corto.dias, null);
  const muros = cubrir(rec, { oro: 800, elixir: 50, muros: 550 });
  assert.equal(muros.alcanza, false);
  assert.equal(muros.falta.muros, 300);
  assert.equal(muros.dias, 2);
  assert.equal(cubrir(null, { oro: 1 }), null);
});
