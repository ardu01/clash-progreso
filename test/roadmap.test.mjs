import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { levelCost, sumLevels } from "../js/costs.js";
import { analyze, builderStatus, indexCaps } from "../js/progress.js";
import { HEROES_FUERA } from "../js/plan.js";
import { reconcileMessage, reconcileProvisionals, toggleProvisional } from "../js/provisional.js";
import {
  ahoraDe, buildRoadmap, capTownHall, constructoresParaPlan, effectivePlan, planIsConfigured, planLabel,
  requisitosAyuntamiento, rushGaps,
} from "../js/roadmap.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);
const c1 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c1_principal_2026-10-07_e53a.json", import.meta.url)));
const c2 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c2_secundaria_2026-10-07_43a4.json", import.meta.url)));
const now = Date.parse("2026-10-11T12:00:00Z");

function road(exp, plan, provisionals) {
  return buildRoadmap({ exp, index, tag: exp.tag, plan, provisionals, sleep: null, now });
}

test("sin plan guardado el criterio es maxear el TH actual", () => {
  assert.equal(planIsConfigured(undefined), false);
  assert.equal(planIsConfigured(null), false);
  assert.deepEqual(effectivePlan(undefined), effectivePlan(null));
  assert.equal(effectivePlan(undefined).modo, "maxear");
  assert.equal(effectivePlan(undefined).th, null);
  assert.equal(planLabel(effectivePlan(undefined), 16), "Maxear TH actual");
});

test("la timeline no mete héroes de C1 ni equipamiento", () => {
  const built = road(c1, null, []);
  assert.equal(built.heroesFuera, true);
  assert.equal(built.orden.some((s) => s.categoryKey === "heroes"), false);
  assert.equal(built.orden.some((s) => s.categoryKey === "equipamiento" || String(s.id).startsWith("900")), false);
  assert.equal(built.configured, false);
  assert.equal(built.plan.modo, "maxear");
});

test("rushear solo usa almacenes, ejército y laboratorio", () => {
  const built = road(c2, { modo: "rushear", th: null }, []);
  const ok = new Set(["laboratorio", "ejercito_edif", "recursos"]);
  assert.ok(built.orden.length > 0);
  for (const step of built.orden) {
    assert.equal(ok.has(step.categoryKey), true, step.categoryKey + " " + step.id);
    if (step.categoryKey === "recursos") assert.equal(["1000005", "1000003", "1000024"].includes(step.id), true);
  }
});

test("el TH objetivo usa el máximo del TH anterior", () => {
  assert.deepEqual(capTownHall(16, 18, 18), { target: 18, capTh: 17, current: 16 });
  const built = road(c2, { modo: "maxear", th: 18 }, []);
  assert.equal(built.capTh, 17);
  assert.equal(built.targetTh, 18);
  const storage = built.orden.find((s) => s.id === "1000005");
  assert.ok(storage);
  assert.ok(storage.goal <= (index.byId.get("1000005").get(17).max));
});

test("con una cola libre, ahora enseña el siguiente paso y una marca lo adelanta", () => {
  const exp = structuredClone(c2);
  for (const sec of ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets"]) {
    for (const it of exp[sec] || []) delete it.timer;
  }
  const first = road(exp, null, []);
  const pasos = ahoraDe(first);
  assert.ok(pasos.some((p) => p.cola === "constructor"), "hace falta un constructor libre");
  const libre = pasos.find((p) => p.cola === "constructor");
  assert.equal(libre.clase, "real");
  assert.equal(libre.origen, "recomendado");
  const late = first.orden.find((s) => s.queue === "constructor" && s.id !== pasos[0].id);
  assert.ok(late);
  const marks = toggleProvisional([], late, exp.tag, now);
  const again = road(exp, null, marks);
  const next = ahoraDe(again).find((p) => p.cola === "constructor");
  assert.equal(next.provisional, true);
  assert.equal(next.origen, "provisional");
  assert.equal(next.id, late.id);
  assert.equal(next.fromLvl, late.fromLvl);
  const media = analyze(exp, index).media;
  assert.equal(analyze(exp, index).media, media);
});

test("importar confirma lo que está en curso o terminado y descarta el resto", () => {
  const before = structuredClone(c2);
  const after = structuredClone(c2);
  after.timestamp = before.timestamp + 100;
  const cannon = after.buildings.find((b) => String(b.data) === "1000008");
  const from = cannon.lvl || 0;
  cannon.timer = 3600;
  const other = { tag: c2.tag, id: "1000009", fromLvl: 3, toLvl: 4, instance: "1000009#0", queue: "constructor", title: "Torre", markedAt: 1 };
  const marked = [
    { tag: c2.tag, id: "1000008", fromLvl: from, toLvl: from + 1, instance: "1000008#0", queue: "constructor", title: "Cañón", markedAt: 2 },
    other,
    { tag: "#OTRA", id: "1000008", fromLvl: 1, toLvl: 2, instance: "1000008#0", queue: "constructor", title: "Cañón", markedAt: 3 },
  ];
  const snapshot = structuredClone(after);
  const rec = reconcileProvisionals(marked, { tag: c2.tag, before, after });
  assert.deepEqual(after, snapshot);
  assert.equal(analyze(after, index).media, analyze(snapshot, index).media);
  assert.equal(rec.avisos.find((a) => a.id === "1000008").tipo, "confirmada");
  assert.equal(rec.avisos.find((a) => a.id === "1000009").tipo, "descartada");
  assert.equal(rec.provisionales.length, 1);
  assert.equal(rec.provisionales[0].tag, "#OTRA");
  const done = structuredClone(before);
  done.timestamp += 50;
  const piece = done.buildings.find((b) => String(b.data) === "1000008");
  piece.lvl = from + 1;
  delete piece.timer;
  const rec2 = reconcileProvisionals(marked, { tag: c2.tag, before, after: done });
  assert.equal(rec2.avisos.find((a) => a.id === "1000008").tipo, "confirmada");
  assert.match(reconcileMessage(rec.avisos), /confirmada/);
  assert.match(reconcileMessage(rec.avisos), /descartada/);
  assert.equal(reconcileMessage(rec.avisos).includes("cuello de botella"), false);
});

test("con una sola exportación no hay aviso al subir de TH", () => {
  assert.deepEqual(rushGaps([c2], index, c2.tag), []);
});

test("Qué hacer ahora sale del plan y no de una cola ocupada", () => {
  const busy = road(c2, { modo: "maxear", th: c2.buildings.find((b) => b.data === 1000001).lvl }, []);
  const freeCtor = busy.lanes.filter((l) => l.cola === "constructor" && l.libreYa);
  const shown = ahoraDe(busy).filter((p) => p.cola === "constructor");
  assert.equal(shown.length, freeCtor.length);
});

function sinChozas(exp) {
  const copy = structuredClone(exp);
  copy.buildings = (copy.buildings || []).filter((b) => String(b.data) !== "1000015" && String(b.data) !== "1000064");
  for (const sec of ["buildings", "traps", "heroes", "guardians"]) {
    for (const it of copy[sec] || []) delete it.timer;
  }
  return copy;
}

test("rushear usa las chozas del JSON y suma B.O.B; si no vienen, el ajuste es 4, 5 o 6", () => {
  const deJson = constructoresParaPlan(c2, 4);
  assert.equal(deJson.origen, "json");
  assert.equal(deJson.chozas, builderStatus(c2).total);
  assert.equal(deJson.bob, false);
  assert.equal(deJson.total, deJson.chozas);
  assert.equal(deJson.ajuste, null);
  const conBob = constructoresParaPlan(c1, null);
  assert.equal(conBob.origen, "json");
  assert.equal(conBob.bob, true);
  assert.equal(conBob.total, builderStatus(c1).total + 1);
  const vacia = sinChozas(c2);
  assert.equal(constructoresParaPlan(vacia, 6).origen, "ajuste");
  assert.equal(constructoresParaPlan(vacia, 6).total, 6);
  assert.equal(constructoresParaPlan(vacia, 3).total, null);
  assert.equal(constructoresParaPlan(vacia, null).origen, null);
  const rush = road(c2, { modo: "rushear", th: 17 }, []);
  assert.equal(rush.constructores.total, 5);
  const max = road(c1, { modo: "maxear" }, []);
  const numerados = max.lanes.filter((l) => l.cola === "constructor" && l.titulo.startsWith("Constructor"));
  assert.equal(numerados.length, builderStatus(c1).total);
});

test("rushear reparte las mejoras entre los constructores y no las encadena en serie", () => {
  const exp = sinChozas(c2);
  const uno = road(exp, { modo: "rushear", th: 17, constructores: 4 }, []);
  const lanes = uno.lanes.filter((l) => l.cola === "constructor" && l.titulo.startsWith("Constructor"));
  assert.equal(lanes.length, 4);
  assert.equal(lanes.every((l) => l.clase === "ajuste"), true);
  const pasos = uno.orden.filter((s) => s.queue === "constructor" && s.fin != null && s.seconds != null);
  assert.ok(pasos.length > 4);
  const primeros = [];
  const vistos = new Set();
  for (const step of pasos) {
    if (vistos.has(step.instance)) continue;
    vistos.add(step.instance);
    primeros.push(step);
    if (primeros.length === 4) break;
  }
  assert.equal(new Set(primeros.map((s) => s.inicio)).size, 1);
  const siguiente = pasos.find((s) => s.instance === primeros[0].instance && s.fromLvl === primeros[0].toLvl);
  if (siguiente) assert.ok(siguiente.inicio >= primeros[0].fin);
  assert.ok(uno.trabajoSeg > uno.calendarioSeg);
  const suma = primeros.reduce((n, s) => n + s.seconds, 0);
  const cal = (Math.max(...primeros.map((s) => s.fin)) - Math.min(...primeros.map((s) => s.inicio))) / 1000;
  assert.ok(cal < suma);
});

test("los requisitos para subir de TH salen de los topes y se marcan provisionales", () => {
  const req = requisitosAyuntamiento(c2, index, 17);
  assert.equal(req.provisional, true);
  assert.match(req.nota, /Provisional/);
  assert.equal(req.pasos.length, 1);
  const filas = req.pasos[0].filas;
  assert.equal(req.pasos[0].desde, 16);
  assert.equal(req.pasos[0].hacia, 17);
  assert.equal(filas.some((f) => f.id === "1000015" || f.id === "1000014" || f.id === "1000064"), false);
  const heroes = filas.find((f) => f.id === "1000071");
  assert.ok(heroes);
  assert.equal(heroes.requerido, 10);
  assert.equal(heroes.actual, 9);
  assert.equal(heroes.hecho, false);
  assert.equal(heroes.provisional, true);
  assert.equal(heroes.coste.segundos, sumLevels("1000071", 9, 10, 1).segConstructor);
  const canon = filas.find((f) => f.id === "1000008");
  assert.equal(canon.hecho, true);
  assert.equal(canon.tienen, 3);
  assert.equal(canon.requerido, 1);
  const muro = filas.find((f) => f.id === "1000010");
  assert.equal(muro.hecho, true);
  const actual = requisitosAyuntamiento(c2, index, 16);
  assert.equal(actual.pasos.length, 0);

  const th17 = structuredClone(c2);
  const hall = th17.buildings.find((b) => b.data === 1000001);
  hall.lvl = 17;
  hall.weapon = 1;
  const subida = requisitosAyuntamiento(th17, index, 18);
  const arma = subida.pasos.find((p) => p.desde === 17).filas.find((f) => f.id === "inferno-artillery");
  assert.ok(arma);
  assert.equal(arma.provisional, true);
  assert.equal(arma.actual, 1);
  assert.equal(arma.requerido, 5);
  assert.equal(arma.hecho, false);
  assert.equal(arma.coste.segundos, 518400 + 604800 + 691200 + 864000);
  assert.equal(arma.coste.oro, 10000000 + 12000000 + 14000000 + 18000000);
  delete hall.weapon;
  const sinArma = requisitosAyuntamiento(th17, index, 18);
  const hueco = sinArma.pasos.find((p) => p.desde === 17).filas.find((f) => f.id === "inferno-artillery");
  assert.equal(hueco.sinDato, true);
  assert.equal(hueco.coste, null);

  const sinCanon = structuredClone(c2);
  sinCanon.buildings = sinCanon.buildings.filter((b) => String(b.data) !== "1000008");
  const falta = requisitosAyuntamiento(sinCanon, index, 17).pasos[0].filas.find((f) => f.id === "1000008");
  assert.equal(falta.hecho, false);
  assert.equal(falta.tienen, 0);
  assert.equal(falta.cantidad, 3);
  assert.equal(falta.coste.segundos, levelCost("1000008", 1).s * 3);
  assert.equal(falta.coste.oro, levelCost("1000008", 1).n * 3);
});
