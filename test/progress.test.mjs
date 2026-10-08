import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { indexCaps, analyze, equipmentView, townHallLevel, pct, builderStatus, ROSTER } from "../js/progress.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);

function parseCsv(text) {
  const lines = text.trim().split(/\n/);
  const head = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    const row = {};
    head.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

const snaps = parseCsv(readFileSync(new URL("../data/snapshots.csv", import.meta.url), "utf8"));
const byTag = new Map(snaps.map((r) => [r.tag, r]));
const files = readdirSync(new URL("../data/2026-10-07/", import.meta.url)).filter((f) => f.endsWith(".json"));
const exportsByTag = new Map();
for (const f of files) {
  const exp = JSON.parse(readFileSync(new URL("../data/2026-10-07/" + f, import.meta.url)));
  exportsByTag.set(exp.tag, exp);
}

const EXPECTED_EQ = {
  "#28PLGP0G2": 43,
  "#R00C8CPQC": 39,
  "#GUQUV98JG": 38,
  "#GVG9GCYUV": 38,
  "#R02YVYLJ8": 38,
  "#GJPJP9JP0": 35,
  "#GVPU80R80": 33,
  "#GVUQ2C2VC": 35,
  "#GVVYVU802": 33,
  "#GVPU2CJR8": 33,
  "#R02YUVC0J": 33,
};

const CATS = ["defensas", "ejercito_edif", "laboratorio", "heroes", "mascotas", "equipamiento", "trampas", "recursos", "muros"];

// Desvíos conocidos frente a snapshots.csv.
// Laboratorio: 4000109, 26000123 y 4000188 no entran en el máximo (siguen sin identificar).
// Defensas frente a otro TH: instancias colocadas contra el máximo de ese TH; las que faltan
// son el cupo de ClashRecord menos las colocadas (nunca negativo). Incluye Inferno Artillery,
// que no tiene ficha en el manifiesto.
const KNOWN = new Set([
  "#28PLGP0G2 pct_laboratorio",
  "#28PLGP0G2 pct_media",
  "#R00C8CPQC pct_sig_defensas",
  "#R00C8CPQC pct_laboratorio",
  "#R00C8CPQC pct_sig_laboratorio",
  "#R00C8CPQC pct_media",
  "#R00C8CPQC pct_sig_media",
  "#R02YUVC0J pct_defensas",
  "#R02YUVC0J pct_sig_defensas",
  "#R02YUVC0J pct_media",
  "#R02YUVC0J pct_sig_media",
]);

test("el equipamiento mostrado es el de la exportación, sin filtrar", () => {
  for (const [tag, exp] of exportsByTag) {
    const th = townHallLevel(exp);
    const pieces = equipmentView(exp, index, th);
    assert.equal(pieces.length, exp.equipment.length, tag);
    assert.equal(pieces.length, EXPECTED_EQ[tag], tag);
  }
});

test("porcentajes frente a snapshots.csv", () => {
  const diffs = [];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    const snap = byTag.get(roster.tag);
    assert.ok(exp, roster.tag);
    const a = analyze(exp, index);
    assert.equal(a.th, Number(snap.th), roster.tag);
    const check = (label, got, expRaw) => {
      const expected = expRaw === "" ? null : Number(expRaw);
      if (got !== expected) diffs.push(`${roster.tag} ${label}: ${got} vs ${expected}`);
    };
    for (const c of CATS) {
      const blankOk = c === "mascotas" && a.th < 14;
      if (blankOk) {
        assert.equal(a.cats[c].pct, null, roster.tag);
        assert.equal(snap["pct_" + c], "");
      } else {
        check("pct_" + c, a.cats[c].pct, snap["pct_" + c]);
      }
      if (a.th < 18) check("pct_sig_" + c, a.cats[c].sigPct, snap["pct_sig_" + c]);
    }
    check("pct_media", a.media, snap.pct_media);
    if (a.th < 18) check("pct_sig_media", a.sigMedia, snap.pct_sig_media);
    assert.equal(a.heroes.reduce((s, h) => s + (h.unlocked ? h.lvl : 0), 0), Number(snap.heroes_suma), roster.tag + " heroes");
  }
  const unexpected = diffs.filter((d) => !KNOWN.has(d.split(":")[0]));
  assert.deepEqual(unexpected, [], unexpected.join("\n"));
  for (const key of KNOWN) {
    assert.ok(diffs.some((d) => d.startsWith(key + ":")), "se esperaba desvío documentado " + key + "\n" + diffs.join("\n"));
  }
});

test("redondeo par del muro 61,25", () => {
  assert.equal(pct(2205, 3600), 61.2);
  assert.equal(pct(4291, 6175), 69.5);
});

test("constructores: sin extra, con guardianes; nunca libres negativos", () => {
  const c1 = builderStatus(exportsByTag.get("#28PLGP0G2"));
  assert.equal(c1.total, 5);
  assert.equal(c1.occupied, 6);
  assert.equal(c1.over, true);
  assert.equal(c1.free, null);
  for (const roster of ROSTER) {
    const b = builderStatus(exportsByTag.get(roster.tag));
    assert.equal(b.known, true, roster.tag);
    assert.ok(b.free == null || b.free >= 0, roster.tag);
    if (roster.tag === "#28PLGP0G2") continue;
    assert.equal(b.occupied, b.total, roster.tag);
    assert.equal(b.over, false, roster.tag);
  }
  const v = builderStatus(exportsByTag.get("#GVUQ2C2VC"));
  assert.equal(v.occupied, 4);
  assert.equal(v.total, 4);
  const r = builderStatus(exportsByTag.get("#R02YUVC0J"));
  assert.equal(r.occupied, 3);
  assert.equal(r.total, 3);
});

test("defensas frente a otro TH y al TH actual", () => {
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.cats.defensas.sigPct, 61.3);
  const r = analyze(exportsByTag.get("#R02YUVC0J"), index);
  assert.equal(r.cats.defensas.pct, 54.4);
});

test("ofensiva: media de laboratorio y héroes", () => {
  const got = (tag) => analyze(exportsByTag.get(tag), index).offense;
  assert.equal(got("#GUQUV98JG"), 43.2);
  assert.equal(got("#R02YUVC0J"), 41.1);
  assert.equal(got("#GUQUV98JG"), Number(byTag.get("#GUQUV98JG").pct_ofensiva));
  assert.equal(got("#R02YUVC0J"), Number(byTag.get("#R02YUVC0J").pct_ofensiva));
  // El CSV de C2 (34,2) aún cuenta Ruin Witch y Angry Spell. Sin esos máximos el laboratorio
  // sube a 45,4 y la media con héroes (23,5) es 34,5.
  assert.equal(got("#R00C8CPQC"), 34.5);
});
