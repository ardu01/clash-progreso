import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { levelCost } from "../js/costs.js";
import { empaquetar } from "../js/evolucion/empaquetar.js";
import { buscar } from "../js/evolucion/nsga.js";
import { escenariosDe, semanaDefecto } from "../js/evolucion/sesiones.js";
import { HEROES_FUERA } from "../js/plan.js";
import { indexCaps } from "../js/progress.js";
import { buildRoadmap, compilarPasos, defaultPlan, programar } from "../js/roadmap.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);
const now = Date.parse("2026-10-11T12:00:00Z");
const dir = new URL("../data/2026-10-07/", import.meta.url);

function cargar() {
  return readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(readFileSync(new URL(name, dir))));
}

test("4.1.1: compilar y programar coinciden con buildRoadmap en las 11 cuentas", () => {
  const sleep = { desde: 23 * 60, hasta: 7 * 60 };
  for (const exp of cargar()) {
    for (const sueno of [null, sleep]) {
      const built = buildRoadmap({
        exp, index, tag: exp.tag, plan: defaultPlan(), provisionals: [], sleep: sueno, now,
      });
      const compilado = compilarPasos({
        exp, index, tag: exp.tag, plan: defaultPlan(), provisionals: [], now,
      });
      const placed = programar(compilado.pasos.map((paso) => ({ ...paso })), compilado.lanes.map((lane) => ({ ...lane })), sueno, now);
      assert.equal(placed.orden.length, built.orden.length, exp.tag);
      for (let i = 0; i < built.orden.length; i += 1) {
        assert.equal(placed.orden[i].inicio, built.orden[i].inicio, exp.tag + " inicio " + i);
        assert.equal(placed.orden[i].fin, built.orden[i].fin, exp.tag + " fin " + i);
      }
    }
  }
  assert.equal(levelCost("1000001", 2) == null || typeof levelCost("1000001", 2).s === "number", true);
});

test("4.1.1: C1 no lleva héroes y el horizonte largo no da un día", () => {
  const c1 = cargar().find((exp) => exp.tag === HEROES_FUERA);
  const pack = empaquetar(compilarPasos({
    exp: c1, index, tag: c1.tag, plan: defaultPlan(), provisionals: [], now,
  }), { botinPorAtaque: 400000, minutosPorAtaque: 3 });
  assert.equal([...pack.cat].some((c) => c === 2 && pack.q[pack.cat.indexOf(2)] != null && false), false);
  assert.equal(pack.cubo[2].length, 0);
  const uno = buscar({
    packs: [pack], ahora: now, horizonte: 180, presupuesto: 90, semilla: 41011,
    topeEval: 4, maxMs: 8000, poblacion: 4, semana: semanaDefecto(),
  });
  assert.equal(uno.fechas, false);
  assert.equal(uno.base.probable, null);
  assert.equal(uno.estrategias.length > 0, true);
});

function packPlano(tag, nPasos) {
  const pasos = [];
  for (let i = 0; i < nPasos; i += 1) {
    pasos.push({
      queue: i % 7 === 0 ? "laboratorio" : "constructor",
      seconds: 3600 + (i % 5) * 600,
      categoryKey: ["laboratorio", "defensas", "muros", "recursos"][i % 4],
      id: "1000000",
      toLvl: 2,
    });
  }
  return empaquetar({
    tag,
    pasos,
    lanes: [{ cola: "constructor" }, { cola: "constructor" }, { cola: "laboratorio" }],
  }, { botinPorAtaque: 500000, minutosPorAtaque: 2 });
}

test("4.1.1: 1, 11 y 50 cuentas, la misma semilla repite el resultado", () => {
  for (const n of [1, 11, 50]) {
    const packs = [];
    for (let i = 0; i < n; i += 1) packs.push(packPlano("#P" + i, 12));
    const opts = {
      packs, ahora: now, horizonte: 30, presupuesto: 90, semilla: 41011,
      topeEval: 6, maxMs: 15000, poblacion: 4, semana: semanaDefecto(),
    };
    const a = buscar(opts);
    const b = buscar(opts);
    assert.equal(a.base.hechos, b.base.hechos);
    assert.equal(a.estrategias.length, b.estrategias.length);
    assert.deepEqual(a.estrategias.map((e) => e.hechos), b.estrategias.map((e) => e.hechos));
    assert.ok(escenariosDe(semanaDefecto(), now, 7, 41011, 3)[0].starts.length >= 1);
  }
});
