import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyze, indexCaps } from "../js/progress.js";
import { HEROES_FUERA } from "../js/plan.js";
import { reconcileMessage, reconcileProvisionals, toggleProvisional } from "../js/provisional.js";
import {
  ahoraDe, buildRoadmap, capTownHall, effectivePlan, planIsConfigured, planLabel, rushGaps,
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
  const late = first.orden.find((s) => s.queue === "constructor" && s.id !== pasos[0].id);
  assert.ok(late);
  const marks = toggleProvisional([], late, exp.tag, now);
  const again = road(exp, null, marks);
  const next = ahoraDe(again).find((p) => p.cola === "constructor");
  assert.equal(next.provisional, true);
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
