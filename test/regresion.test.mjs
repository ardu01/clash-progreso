import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { buildBackup, mergeBackup } from "../js/backup.js";
import { parseSession, readSession } from "../js/actualizar.js";
import { classifyEntries } from "../js/import.js";
import { accionTab } from "../js/nav.js";
import { analyze, indexCaps, ROSTER, townHallLevel } from "../js/progress.js";
import { buildRoadmap, defaultPlan } from "../js/roadmap.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);
const exportsByTag = new Map();
for (const file of readdirSync(new URL("../data/2026-10-07/", import.meta.url))) {
  if (!file.endsWith(".json")) continue;
  const exp = JSON.parse(readFileSync(new URL("../data/2026-10-07/" + file, import.meta.url)));
  exportsByTag.set(exp.tag, exp);
}

test("3.1.12: las 11 cuentas conservan porcentaje, copia, plan y rutas", () => {
  assert.equal(ROSTER.length, 11);
  assert.equal(exportsByTag.size, 11);
  const medias = [];
  const accounts = [];
  const exps = [];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    assert.ok(exp, roster.tag);
    const view = analyze(exp, index);
    assert.equal(view.th, townHallLevel(exp));
    assert.equal(typeof view.media, "number");
    medias.push(view.media);
    const road = buildRoadmap({
      exp, index, tag: roster.tag, plan: defaultPlan(), provisionals: [], sleep: null,
      now: Date.parse("2026-10-11T12:00:00Z"),
    });
    assert.ok(Array.isArray(road.orden));
    assert.ok(Array.isArray(road.lanes));
    accounts.push({ tag: roster.tag, alias: roster.alias || roster.tag, principal: !!roster.principal, chip: roster.chip || "" });
    exps.push(exp);
  }
  const entries = [...exportsByTag.values()].map((exp) => ({
    name: `${exp.tag}.json`,
    text: JSON.stringify(exp),
    source: "file",
  }));
  const imported = classifyEntries(entries, { accounts, rows: [], index, now: Date.parse("2026-10-11T12:00:00Z") });
  assert.equal(imported.length, 11);
  for (const item of imported) {
    assert.equal(item.kind, "ready");
    assert.equal(item.changes.view.media, medias[accounts.findIndex((a) => a.tag === item.value.tag)]);
  }
  const again = classifyEntries(entries, { accounts, rows: exps, index, now: Date.parse("2026-10-11T12:00:00Z") });
  assert.ok(again.every((item) => item.kind === "duplicate"));
  const backup = buildBackup({ accounts, exports: exps, planes: {}, provisionales: [], version: "3.1.12" });
  const merged = mergeBackup({ accounts: [], exports: [], planes: {}, provisionales: [] }, backup);
  assert.equal(merged.exports.length, 11);
  assert.equal(merged.accounts.length, 11);
  const byTag = new Map(merged.exports.map((exp) => [exp.tag, exp]));
  for (let i = 0; i < ROSTER.length; i += 1) {
    assert.equal(analyze(byTag.get(ROSTER[i].tag), index).media, medias[i]);
  }
  for (const hash of ["#/inicio", "#/roster", "#/mejoras", "#/ranking", "#/agenda"]) {
    assert.equal(accionTab("#/copia", hash).hash, hash);
    const vuelta = accionTab(hash, "#/inicio");
    if (hash === "#/inicio") assert.equal(vuelta.type, "scroll");
    else assert.equal(vuelta.hash, "#/inicio");
  }
  assert.equal(parseSession(null), null);
  assert.equal(parseSession({ v: 1, status: "rota" }), null);
  const box = {
    getItem: () => "{",
    setItem() {},
    removeItem() {},
  };
  assert.equal(readSession(box), null);
});
