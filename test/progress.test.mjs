import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexCaps, analyze, equipmentView, categoryItems, townHallLevel, pct, builderStatus, upgradesOf, itemName, ROSTER, capsMaxFor, levelLine, categoryUnlock, catFoot, capsFichaLines, presentItem, outsidePct, overMaxLabel, CATEGORIES, VILLAGE_KEYS } from "../js/progress.js";
import { parseLoose } from "../js/parse.js";
import { fmtBytes, fmtFin, fmtPct } from "../js/format.js";
import { APP_VERSION, SHELL_CACHE, IMAGE_CACHE } from "../js/caches.js";
import { DEVICE_SCALE, DRAW_TARGET, HEAVY_BYTES, THUMB_PAD, UPSCALE_MAX, ajusteOf, cajaAlfa, catalog, containOf, imageChoice, isHeavy, precacheUrls, thumbInterior } from "../js/images.js";
import { classifyEntries, acceptedExports, foreignMsg, trailingLabel, mediaLine, unknownMsg, omitSubtitle, omitReason, BAD_FOOT, DUP_FOOT, planBatch } from "../js/import.js";
import { migrateRoster, addAccount, removeAccount, renameAccount, setPrincipal, featuredTag, orderAccounts, ROSTER_VERSION } from "../js/roster.js";
import { progressRows, applyFilter, chipCounts, isAtMax } from "../js/filters.js";
import { buildBackup, mergeBackup, backupFilename, isShareCancel } from "../js/backup.js";
import { averagePct } from "../js/progress.js";
import { levelCost, sumLevels } from "../js/costs.js";
import { estadoColas, fraseConstructores, resumenFlota } from "../js/colas.js";
import { rankAccounts } from "../js/fleet.js";
import { buildRoadmap, defaultPlan } from "../js/roadmap.js";
import { addOre, applyEqFilter, equipmentRows, fleetOre, groupByHero, oreTotal } from "../js/equipo.js";
import { casaConstructorOf, clanOf, exportFacts } from "../js/perfil.js";

const root = fileURLToPath(new URL("..", import.meta.url));

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
// Laboratorio: 4000109, 26000123 y 4000188 ya están identificados y el % coincide con el CSV.
// El equipamiento no entra en la media, así que pct_media y pct_sig_media se apartan del CSV.
// Defensas frente a otro TH: instancias colocadas contra el máximo de ese TH; las que faltan
// son el cupo de ClashRecord menos las colocadas (nunca negativo). Incluye Inferno Artillery,
// que no tiene ficha en el manifiesto.
const KNOWN = new Set([
  "#28PLGP0G2 pct_media",
  "#28PLGP0G2 pct_equipamiento",
  "#R00C8CPQC pct_sig_defensas",
  "#R00C8CPQC pct_media",
  "#R00C8CPQC pct_sig_media",
  "#R00C8CPQC pct_equipamiento",
  "#R00C8CPQC pct_sig_equipamiento",
  "#R02YUVC0J pct_defensas",
  "#R02YUVC0J pct_sig_defensas",
  "#R02YUVC0J pct_media",
  "#R02YUVC0J pct_sig_media",
  "#GUQUV98JG pct_media",
  "#GUQUV98JG pct_sig_media",
  "#GVG9GCYUV pct_media",
  "#GVG9GCYUV pct_sig_media",
  "#R02YVYLJ8 pct_media",
  "#R02YVYLJ8 pct_sig_media",
  "#GJPJP9JP0 pct_media",
  "#GJPJP9JP0 pct_sig_media",
  "#GVPU80R80 pct_media",
  "#GVPU80R80 pct_sig_media",
  "#GVUQ2C2VC pct_media",
  "#GVUQ2C2VC pct_sig_media",
  "#GVVYVU802 pct_media",
  "#GVVYVU802 pct_sig_media",
  "#GVPU2CJR8 pct_media",
  "#GVPU2CJR8 pct_sig_media",
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
  assert.equal(c1.chozas, 5);
  assert.equal(c1.bob, 1);
  assert.equal(c1.total, 6);
  assert.equal(c1.occupied, 6);
  assert.equal(c1.over, false);
  assert.equal(c1.free, 0);
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
  assert.equal(c2.cats.defensas.sigPct, 61.1);
  const r = analyze(exportsByTag.get("#R02YUVC0J"), index);
  assert.equal(r.cats.defensas.pct, 54.4);
});

test("nombres visibles salen de nombre o nombre_en", () => {
  for (const item of Object.values(manifest.items)) {
    const shown = itemName(item);
    if (item.estado === "sin_identificar") {
      assert.equal(shown, null);
      continue;
    }
    if (item.nombre_pendiente) assert.equal(shown, item.nombre_en, String(item.id));
    else assert.equal(shown, item.nombre, String(item.id));
    assert.equal(shown.toLowerCase().includes("render"), false, shown);
    if (item.nota_interna) assert.equal(shown.includes(item.nota_interna), false, String(item.id));
    if (item.nombre_propuesto) assert.notEqual(shown, item.nombre_propuesto, String(item.id));
  }
  assert.equal(itemName(manifest.items["28000006"]), "Príncipe Esbirro");
  assert.equal(itemName(manifest.items["1000068"]), "Caseta de animales");
  assert.equal(itemName(manifest.items["1000067"]), "Catapulta");
  assert.equal(itemName(manifest.items["1000019"]), "Torre Tesla");
  assert.equal(itemName(manifest.items["73000017"]), "Cuervo avaricioso");
  assert.equal(itemName(manifest.items["90000043"]), "Orbe oscuro");
  assert.equal(itemName(manifest.items["90000042"]), "Escolta títere");
  assert.equal(itemName(manifest.items["90000050"]), "Copo de escarcha");
  assert.equal(itemName(manifest.items["90000056"]), "Pistola aturdidora");
  assert.equal(itemName(manifest.items["1000064"]), "Cabaña de B.O.B.");
  assert.equal(itemName(manifest.items["1000012"]), "Cohetes de defensa");
  assert.equal(itemName(manifest.items["73000000"]), "L.A.S.S.I.");
  assert.equal(itemName(manifest.items["1000007"]), "Laboratorio");
  const bb = Object.values(manifest.items).filter((it) => it.categoria === "builder_base_troop" || it.categoria === "builder_base_hero");
  assert.equal(bb.length, 14);
});

test("las piezas id_deducido siguen en el recuento y salen de sin identificar", () => {
  const pieces = equipmentView(exportsByTag.get("#28PLGP0G2"), index, 18);
  assert.equal(pieces.length, 43);
  for (const id of ["90000052", "90000053"]) {
    const piece = pieces.find((p) => p.id === id);
    assert.ok(piece, id);
    assert.equal(piece.unknown, false, id);
    assert.equal(piece.meta.estado, "ok");
    assert.equal(piece.heroe, "Dragon Duke");
    assert.equal(piece.meta.nombre_pendiente, false);
  }
  const arrow = pieces.find((p) => p.id === "90000016");
  assert.equal(arrow.unknown, false);
  assert.equal(arrow.meta.estado, "ok");
  assert.equal(arrow.meta.nombre, "Flecha monolítica");
  assert.equal(arrow.heroe, "Archer Queen");
  const fangs = pieces.find((p) => p.id === "90000059");
  assert.equal(fangs.unknown, false);
  assert.equal(fangs.meta.estado, "ok");
  assert.equal(fangs.heroe, "Dragon Duke");
  assert.equal(fangs.meta.nombre, "Colmillos eléctricos");
  assert.equal(pieces.filter((p) => p.unknown).length, 0);
  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.cats.equipamiento.pct, 61.4);
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.cats.equipamiento.pct, 58.9);
  assert.equal(c2.cats.equipamiento.sigPct, 58.9);
});

test("Artillería infernal solo en el detalle, sin id inventado", () => {
  const c2 = categoryItems(exportsByTag.get("#R00C8CPQC"), index, "defensas", 16);
  const row = c2.find((r) => r.capsOnly);
  assert.ok(row);
  assert.equal(row.capsName, "Artillería infernal");
  assert.equal(row.id, null);
  assert.equal(row.lvl, 0);
  assert.equal(row.max, null);
  assert.equal(row.maxNext, 5);
  assert.equal(row.unlockTh, 17);
  assert.deepEqual(levelLine(row), { text: "Disponible en TH17", bar: false });
  assert.deepEqual(capsFichaLines(row), [
    "Disponible en TH17",
    "Sin imagen",
  ]);
  const view = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(view.cats.defensas.pct, 66.9);
  assert.equal(view.cats.defensas.sigPct, 61.1);
  const c1 = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "defensas", 18);
  assert.equal(c1.some((r) => r.capsOnly), false);
  const lab = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "laboratorio", 18);
  const ids = new Set(lab.map((r) => r.id));
  for (const unit of exportsByTag.get("#28PLGP0G2").units2) {
    assert.equal(ids.has(String(unit.data)), false, String(unit.data));
  }
});

test("672 sha256 coinciden con el manifiesto v3.1.18", () => {
  assert.equal(manifest.version_set_imagenes, "v3.1.18");
  assert.equal(manifest.peso_imagenes.total_archivos, 672);
  assert.equal(manifest.peso_imagenes.total_bytes, 107868055);
  assert.equal(manifest.peso_imagenes.precache_instalacion_archivos, 220);
  assert.equal(manifest.peso_imagenes.precache_instalacion_bytes, 21579962);
  assert.equal(manifest.peso_imagenes.umbral_pesado_bytes, 3000000);
  assert.deepEqual(manifest.peso_imagenes.pesados, []);
  const want = new Map();
  for (const item of Object.values(manifest.items)) {
    const images = [];
    if (item.imagen) images.push(item.imagen);
    for (const im of Object.values(item.imagenes_por_nivel || {})) images.push(im);
    for (const im of images) {
      if (im && im.ruta) want.set(im.ruta, im);
    }
  }
  assert.equal(want.size, 672);
  const dir = join(root, "assets/images");
  const files = [];
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel))) {
      const next = rel ? rel + "/" + name : name;
      if (statSync(join(dir, next)).isDirectory()) walk(next);
      else files.push("images/" + next);
    }
  };
  walk("");
  assert.equal(files.length, 672);
  for (const rel of files) {
    const im = want.get(rel);
    assert.ok(im, rel);
    const buf = readFileSync(join(root, "assets", rel));
    assert.equal(buf.length, im.bytes, rel);
    assert.equal(createHash("sha256").update(buf).digest("hex"), im.sha256_copia, rel);
  }
});

test("parseLoose no menciona línea ni columna", () => {
  const empty = parseLoose("   ");
  assert.equal(empty.ok, false);
  assert.equal(empty.title, "No hay nada que pegar");
  assert.equal(empty.msg, "El portapapeles está vacío.");
  const other = parseLoose("https://link.clashofclans.com/x");
  assert.equal(other.title, "No se pudo leer la exportación");
  assert.equal(other.preview, "https://link.cla…");
  assert.match(other.msg, /Empieza por «https:\/\/link\.cla…»/);
  const exact = parseLoose("https://link.clashof");
  assert.equal(exact.preview, "https://link.clashof");
  const cut = parseLoose('{"tag":"#28PLGP0G2"');
  assert.equal(cut.msg, "El texto está incompleto: parece cortado al copiar.");
  const ok = parseLoose('{"tag":"#28PLGP0G2","timestamp":1}');
  assert.equal(ok.ok, true);
  for (const result of [empty, other, cut]) {
    assert.equal(/línea|columna|position/i.test(result.msg + result.title), false);
  }
  const emptyFile = parseLoose("   ", "file");
  assert.equal(emptyFile.msg, "El archivo está vacío.");
  assert.equal(/portapapeles|Copiar|Pegar/i.test(emptyFile.msg + emptyFile.help + emptyFile.title), false);
  const otherFile = parseLoose("https://link.clashofclans.com/x", "file");
  assert.equal(otherFile.msg, "El archivo no es una exportación. Empieza por «https://link.cla…».");
  assert.equal(/portapapeles/i.test(otherFile.msg + otherFile.help), false);
  const cutFile = parseLoose('{"tag":"#28PLGP0G2"', "file");
  assert.equal(cutFile.msg, "El archivo está incompleto.");
  assert.equal(/línea|columna|position/i.test(cutFile.msg), false);
  const spaced = parseLoose("abcdefghijklmnopqrs xyz");
  assert.equal(spaced.preview, "abcdefghijklmnop…");
  assert.equal(spaced.msg, "Lo que hay en el portapapeles no es una exportación. Empieza por «abcdefghijklmnop…».");
  const gap = parseLoose("abcdefghijklmno  xyzzzz");
  assert.equal(gap.preview, "abcdefghijklmno…");
  const trimmed = parseLoose("abcdefghijklmnopqrs ");
  assert.equal(trimmed.preview, "abcdefghijklmnopqrs");
});

const CAT_KEYS = ["defensas", "laboratorio", "ejercito_edif", "equipamiento", "mascotas", "heroes", "trampas", "recursos"];

test("el máximo de cada fila sale de caps por nombre_en", () => {
  const misses = [];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    const a = analyze(exp, index);
    for (const key of CAT_KEYS) {
      for (const it of categoryItems(exp, index, key, a.th)) {
        const line = levelLine(it);
        assert.equal(/\bnull\b|\bundefined\b/.test(line.text), false, `${roster.tag} ${key} ${it.id || it.capsName}: ${line.text}`);
        if (it.max == null) assert.equal(line.bar, false, `${roster.tag} ${key} ${it.id}`);
        if (!it.id) continue;
        const want = capsMaxFor(index, it.id, a.th);
        if (want != null && it.max == null) {
          misses.push(`${roster.tag} ${key} ${it.id} ${itemName(index.items[it.id]) || ""}: caps ${want}`);
        }
        if (want != null) assert.equal(it.max, want, `${roster.tag} ${key} ${it.id}`);
      }
    }
    for (const it of [...(exp.heroes2 || []), ...(exp.units2 || [])]) {
      const want = capsMaxFor(index, it.data, a.th);
      if (want != null) misses.push(`${roster.tag} aldea ${it.data}: caps ${want}`);
    }
    const pets = categoryItems(exp, index, "mascotas", a.th);
    if (a.cats.mascotas.pct == null) {
      const phrase = categoryUnlock(pets);
      assert.equal(phrase, 14, roster.tag);
      assert.equal(/\bnull\b|\bundefined\b/.test(`Se desbloquea en TH${phrase}`), false);
    }
  }
  assert.deepEqual(misses, []);

  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  const hero = (id) => c2.heroes.find((h) => h.id === id);
  assert.deepEqual([hero("28000004").lvl, hero("28000004").max], [11, 45]);
  assert.equal(levelLine(hero("28000004")).text, "Nv 11 / 45");
  assert.deepEqual([hero("28000006").lvl, hero("28000006").max], [12, 80]);
  assert.equal(levelLine(hero("28000006")).text, "Nv 12 / 80");
  assert.deepEqual([hero("28000007").lvl, hero("28000007").max], [10, 15]);
  assert.equal(levelLine(hero("28000007")).text, "Nv 10 / 15");
  assert.equal(c2.cats.heroes.pct, 23.5);
  assert.equal(c2.cats.equipamiento.pct, 58.9);
  assert.equal(c2.offense, 34.2);

  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.cats.equipamiento.pct, 61.4);
  assert.equal(c1.cats.heroes.pct, Number(byTag.get("#28PLGP0G2").pct_heroes));
  const raven = c1.pets.find((p) => p.id === "73000017");
  assert.equal(raven.lvl, 0);
  assert.equal(raven.max, 10);
  assert.equal(levelLine(raven).text, "Nv 0 / 10");

  const th13 = analyze(exportsByTag.get("#GUQUV98JG"), index);
  const rc = th13.heroes.find((h) => h.id === "28000004");
  assert.equal(rc.lvl, 0);
  assert.equal(rc.max, 25);
  assert.deepEqual(levelLine(rc), { text: "Nv 0 / 25", bar: true });

  const th11 = analyze(exportsByTag.get("#R02YUVC0J"), index);
  const pets = categoryItems(exportsByTag.get("#R02YUVC0J"), index, "mascotas", th11.th);
  const petLine = (id) => levelLine(pets.find((p) => p.id === id));
  assert.deepEqual(petLine("73000000"), { text: "Disponible en TH14", bar: false });
  assert.deepEqual(petLine("73000004"), { text: "Disponible en TH15", bar: false });
  assert.deepEqual(petLine("73000016"), { text: "Disponible en TH17", bar: false });
  assert.equal(categoryUnlock(pets), 14);
  assert.equal(capsMaxFor(index, "1000007", 16) != null, true);
  assert.equal(capsMaxFor(index, "1000015", 16) != null, true);

  const bare = levelLine({ lvl: 4, max: null, unlockTh: null });
  assert.deepEqual(bare, { text: "Nv 4", bar: false });
});

test("muros de C1 y de una cuenta TH11", () => {
  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.walls.max, 19);
  assert.deepEqual(c1.walls.hist, [
    { lvl: 13, cnt: 273 },
    { lvl: 14, cnt: 47 },
    { lvl: 16, cnt: 2 },
    { lvl: 17, cnt: 2 },
    { lvl: 18, cnt: 1 },
  ]);
  const gap = c1.walls.hist.reduce((s, h) => s + (c1.walls.max - h.lvl) * h.cnt, 0);
  assert.equal(gap, 1884);
  assert.equal(catFoot(c1, c1.cats.muros), "Faltan 1884 niveles");
  const r = analyze(exportsByTag.get("#R02YUVC0J"), index);
  assert.equal(r.walls.max, 12);
  assert.deepEqual(r.walls.hist, [
    { lvl: 1, cnt: 50 },
    { lvl: 6, cnt: 211 },
    { lvl: 7, cnt: 39 },
  ]);
  assert.equal(r.walls.hist.reduce((s, h) => s + (r.walls.max - h.lvl) * h.cnt, 0), 2011);
  assert.equal(catFoot(r, r.cats.muros), "TH12: 40,7\u00A0% · faltan 2011 niveles");
});

test("missing.json coincide con el archivo publicado", () => {
  const buf = readFileSync(new URL("../assets/missing.json", import.meta.url));
  assert.equal(createHash("sha256").update(buf).digest("hex"), "73e51a606ac3e4d966968d2616be0fa5b3c471c84866a2e3b60a6c6d61e9f124");
});

test("manifest.json coincide con la v3.1.18", () => {
  const buf = readFileSync(new URL("../assets/manifest.json", import.meta.url));
  assert.equal(createHash("sha256").update(buf).digest("hex"), "04aea283569232829681c6fc8aaf990206bb91667b60846cdff036dc8701119f");
  assert.equal(manifest.version_set_imagenes, "v3.1.18");
});

/** Una función real de js/app.js, sin ejecutar el arranque del navegador. */
function fnFromApp(signature, name, deps = {}) {
  // 1.1.5: ayudantes nuevos de settleSheetFocus/rememberSheetFocus; los tests que no los usan reciben una versión neutra.
  deps = { sheetViewOf: (key) => key, keepVisible: () => {}, ...deps };
  const src = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const start = src.indexOf(signature);
  assert.ok(start >= 0, signature);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return new Function(...Object.keys(deps), `${src.slice(start, i + 1)}\nreturn ${name};`)(...Object.values(deps));
    }
  }
  throw new Error(name + " sin cierre");
}

const V110 = {
  "#28PLGP0G2": { media: 64.2, sigMedia: null, cats: { defensas: [70.1, null], laboratorio: [62.3, null], ejercito_edif: [96.1, null], equipamiento: [61.4, null], mascotas: [41.9, null], heroes: [46, null], trampas: [39.8, null], recursos: [88.1, null], muros: [69.5, null] } },
  "#R00C8CPQC": { media: 47.7, sigMedia: 44.4, cats: { defensas: [66.9, 61.1], laboratorio: [44.9, 40.9], ejercito_edif: [86.2, 80.6], equipamiento: [58.9, 58.9], mascotas: [13, 10.7], heroes: [23.5, 21.6], trampas: [13.9, 12.2], recursos: [66.5, 65.1], muros: [67, 63.3] } },
  "#GUQUV98JG": { media: 62.2, sigMedia: 48.3, cats: { defensas: [69.2, 62.6], laboratorio: [53.7, 47.9], ejercito_edif: [83.3, 75.8], equipamiento: [67.9, 57.3], mascotas: [null, 0], heroes: [32.7, 28.1], trampas: [48.9, 39.6], recursos: [72.3, 67.4], muros: [75.3, 64.9] } },
  "#GVG9GCYUV": { media: 57, sigMedia: 44.4, cats: { defensas: [68.6, 62], laboratorio: [45.6, 40.6], ejercito_edif: [81.7, 74.2], equipamiento: [80.8, 68.4], mascotas: [null, 0], heroes: [33.1, 28.4], trampas: [26.5, 21.5], recursos: [68.1, 63.4], muros: [75.4, 65] } },
  "#R02YVYLJ8": { media: 56.4, sigMedia: 43.8, cats: { defensas: [65.9, 59.6], laboratorio: [44.1, 39.3], ejercito_edif: [78.3, 71.2], equipamiento: [73.5, 62.2], mascotas: [null, 0], heroes: [30.9, 26.6], trampas: [38.8, 31.4], recursos: [61.1, 56.9], muros: [75.9, 65.4] } },
  "#GJPJP9JP0": { media: 40, sigMedia: 31.2, cats: { defensas: [42.5, 38.7], laboratorio: [34.1, 30.4], ejercito_edif: [68.3, 62.1], equipamiento: [54.5, 46.2], mascotas: [null, 0], heroes: [17.5, 15], trampas: [22, 17.8], recursos: [52.7, 49.1], muros: [42.9, 36.9] } },
  "#GVPU80R80": { media: 50.7, sigMedia: 43.3, cats: { defensas: [55.5, 46.8], laboratorio: [48.1, 38.4], ejercito_edif: [79.6, 69.2], equipamiento: [59.4, 48.8], mascotas: [null, null], heroes: [34.7, 24.8], trampas: [24.5, 19.7], recursos: [61.2, 56.6], muros: [51.3, 47.3] } },
  "#GVUQ2C2VC": { media: 55.9, sigMedia: 47.8, cats: { defensas: [68.3, 57.5], laboratorio: [55.7, 44.5], ejercito_edif: [82.8, 72], equipamiento: [66.7, 55.6], mascotas: [null, null], heroes: [37.3, 26.7], trampas: [18.4, 14.8], recursos: [67.7, 62.6], muros: [61.2, 56.5] } },
  "#GVVYVU802": { media: 55.4, sigMedia: 47.2, cats: { defensas: [66.3, 55.8], laboratorio: [55.2, 44.1], ejercito_edif: [81.7, 71], equipamiento: [77.2, 63.8], mascotas: [null, null], heroes: [37.3, 26.7], trampas: [28.2, 22.7], recursos: [58.4, 54], muros: [60.5, 55.9] } },
  "#GVPU2CJR8": { media: 50.1, sigMedia: 42.6, cats: { defensas: [57.3, 48.2], laboratorio: [49.7, 39.7], ejercito_edif: [80.6, 70.1], equipamiento: [59.4, 48.8], mascotas: [null, null], heroes: [38, 27.1], trampas: [19, 15.3], recursos: [55.9, 51.7], muros: [50, 46.2] } },
  "#R02YUVC0J": { media: 48.1, sigMedia: 41, cats: { defensas: [54.4, 45.8], laboratorio: [47, 37.6], ejercito_edif: [77.4, 67.3], equipamiento: [57.4, 47], mascotas: [null, null], heroes: [35.3, 25.2], trampas: [19, 15.3], recursos: [59.3, 54.9], muros: [44.1, 40.7] } },
};

function latestOf(rows, tag) {
  return rows.filter((r) => r.tag === tag).sort((a, b) => b.timestamp - a.timestamp)[0];
}

function importCtx(rows) {
  return { rows, accounts: ROSTER, index, now: Date.parse("2026-10-08T12:00:00Z") };
}

test("los porcentajes de las 11 cuentas: defensas como en 1.1.0; equipamiento de C1 y C2 sube al identificar piezas", () => {
  for (const roster of ROSTER) {
    const a = analyze(exportsByTag.get(roster.tag), index);
    const want = V110[roster.tag];
    assert.equal(a.media, want.media, roster.tag + " media");
    assert.equal(a.sigMedia, want.sigMedia, roster.tag + " sig");
    for (const c of CATEGORIES) {
      const pair = want.cats[c.key];
      assert.equal(a.cats[c.key].pct, pair[0], roster.tag + " " + c.key);
      assert.equal(a.cats[c.key].sigPct, pair[1], roster.tag + " sig " + c.key);
    }
  }
  assert.equal(analyze(exportsByTag.get("#28PLGP0G2"), index).cats.equipamiento.pct, 61.4);
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.cats.defensas.pct, 66.9);
  assert.equal(c2.cats.defensas.sigPct, 61.1);
  assert.equal(catFoot(analyze(exportsByTag.get("#28PLGP0G2"), index), analyze(exportsByTag.get("#28PLGP0G2"), index).cats.muros), "Faltan 1884 niveles");
});

test("reimportar la misma exportación no añade punto ni cambia porcentajes", () => {
  const rows = [...exportsByTag.values()];
  const c1 = exportsByTag.get("#28PLGP0G2");
  const before = {};
  for (const roster of ROSTER) {
    const a = analyze(latestOf(rows, roster.tag), index);
    before[roster.tag] = { media: a.media, eq: a.cats.equipamiento.pct, def: a.cats.defensas.pct };
  }
  const item = classifyEntries([{ name: "c1.json", text: JSON.stringify(c1), source: "file" }], importCtx(rows))[0];
  assert.equal(item.kind, "duplicate");
  assert.equal(item.skip, true);
  assert.equal(item.changes, null);
  assert.match(item.kind, /duplicate/);
  const next = acceptedExports(rows, [item]);
  assert.equal(next.length, rows.length);
  for (const roster of ROSTER) {
    const a = analyze(latestOf(next, roster.tag), index);
    assert.equal(a.media, before[roster.tag].media, roster.tag);
    assert.equal(a.cats.equipamiento.pct, before[roster.tag].eq, roster.tag);
    assert.equal(a.cats.defensas.pct, before[roster.tag].def, roster.tag);
  }
});

test("un id desconocido con timestamp posterior sale como ? y queda fuera del %", () => {
  const base = exportsByTag.get("#28PLGP0G2");
  const exp = structuredClone(base);
  exp.timestamp = base.timestamp + 30;
  exp.equipment = exp.equipment.concat([{ data: 424242424, lvl: 8 }]);
  const rows = [...exportsByTag.values()];
  const item = classifyEntries([{ name: "nuevo.json", text: JSON.stringify(exp) }], importCtx(rows))[0];
  assert.equal(item.kind, "ready");
  assert.notEqual(item.kind, "duplicate");
  const before = analyze(base, index);
  const after = analyze(exp, index);
  assert.equal(after.cats.equipamiento.pct, before.cats.equipamiento.pct);
  assert.equal(after.media, before.media);
  const piece = equipmentView(exp, index, after.th).find((p) => p.id === "424242424");
  assert.ok(piece);
  assert.equal(piece.unknown, true);
  const pres = presentItem(index, piece.id);
  assert.equal(pres.mark, "?");
  assert.equal(pres.id, "424242424");
  assert.equal(pres.title, "Sin identificar");
  assert.equal(pres.outsidePercent, true);
  const same = structuredClone(exp);
  same.timestamp = base.timestamp;
  const discarded = classifyEntries([{ name: "dup.json", text: JSON.stringify(same) }], importCtx(rows))[0];
  assert.equal(discarded.kind, "duplicate");
  assert.equal(discarded.changes, null);
});

test("un nivel por encima del máximo cuenta como el máximo y lleva el chip", () => {
  const base = exportsByTag.get("#28PLGP0G2");
  const cap = capsMaxFor(index, "1000009", 18);
  assert.ok(cap > 1);
  const over = structuredClone(base);
  over.timestamp = base.timestamp + 90;
  const cannon = over.buildings.find((e) => String(e.data) === "1000009");
  assert.ok(cannon, "C1 trae la torre de arqueras 1000009");
  cannon.lvl = cap + 1;
  const atMax = structuredClone(base);
  atMax.buildings.find((e) => String(e.data) === "1000009").lvl = cap;
  const overView = analyze(over, index);
  const maxView = analyze(atMax, index);
  assert.equal(overView.cats.defensas.pct, maxView.cats.defensas.pct);
  assert.ok(overView.cats.defensas.pct <= 100);
  const piece = categoryItems(over, index, "defensas", 18).find((p) => p.id === "1000009" && p.lvl === cap + 1);
  assert.ok(piece);
  assert.equal(piece.lvl, cap + 1);
  assert.equal(piece.max, cap);
  assert.equal(piece.lvl > piece.max, true);
  assert.equal(overMaxLabel(piece.lvl, piece.max), "Máximo desactualizado");
  assert.equal(levelLine(piece).text, `Nv ${cap + 1} / ${cap}`);
  const rows = [...exportsByTag.values()];
  const later = classifyEntries([{ name: "sobre.json", text: JSON.stringify(over) }], importCtx(rows))[0];
  assert.equal(later.kind, "ready");
  assert.ok(later.changes.overMaxCount >= 1);
  assert.equal(trailingLabel(later).startsWith("+"), true);
  const same = structuredClone(over);
  same.timestamp = base.timestamp;
  const discarded = classifyEntries([{ name: "dup.json", text: JSON.stringify(same) }], importCtx(rows))[0];
  assert.equal(discarded.kind, "duplicate");
  assert.equal(discarded.changes, null);
  assert.equal(overMaxLabel(piece.lvl, piece.max) === "Máximo desactualizado" && discarded.changes === null, true);
});

test("validar una exportación: tag ajeno, más antigua y textos sin línea", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const rows = [...exportsByTag.values()];
  const ctx = importCtx(rows);
  const foreign = structuredClone(base);
  foreign.tag = "#QL0Y2P8CU";
  foreign.timestamp = base.timestamp + 5;
  const neu = classifyEntries([{ name: "ajena", text: JSON.stringify(foreign) }], ctx)[0];
  assert.equal(neu.kind, "new");
  assert.equal(foreignMsg(foreign.tag), "#QL0Y2P8CU no es una de tus cuentas.");
  assert.equal(/11 cuentas/.test(foreignMsg(foreign.tag)), false);
  const older = structuredClone(base);
  older.timestamp = base.timestamp - 100;
  const old = classifyEntries([{ name: "vieja", text: JSON.stringify(older) }], ctx)[0];
  assert.equal(old.kind, "older");
  assert.equal(trailingLabel(old), "Más antigua");
  const broken = classifyEntries([{ name: "rota", text: '{"timestamp":1}', source: "clipboard" }], ctx)[0];
  assert.equal(broken.kind, "invalid");
  assert.equal(broken.structural, true);
  assert.deepEqual(broken.issues, ["Falta el tag de la cuenta.", "No se encuentra el ayuntamiento."]);
  assert.equal(/línea|columna|position/i.test(broken.issues.join(" ")), false);
  const fresh = structuredClone(base);
  fresh.timestamp = base.timestamp + 8;
  const again = classifyEntries([{ name: "igual", text: JSON.stringify(fresh) }], ctx)[0];
  assert.equal(again.kind, "ready");
  assert.equal(again.changes.noChanges, true);
  assert.equal(trailingLabel(again), "Sin cambios");
  assert.equal(old.changes.mediaFrom, analyze(older, index).media);
  assert.equal(old.changes.mediaTo, analyze(base, index).media);
});

test("si solo sube el ayuntamiento no hay lista de cambios", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const exp = structuredClone(base);
  exp.timestamp = base.timestamp + 70;
  const th = exp.buildings.find((b) => b.data === 1000001);
  th.lvl += 1;
  const item = classifyEntries([{ name: "th.json", text: JSON.stringify(exp) }], importCtx([...exportsByTag.values()]))[0];
  assert.equal(item.kind, "ready");
  assert.equal(item.changes.thUp, true);
  assert.equal(item.changes.rows.length, 0);
  assert.equal(item.changes.totalChanges, 0);
  assert.equal(item.changes.itemChanges, false);
  assert.equal(item.changes.noChanges, false);
});

test("C2 no cuenta sin identificar fuera del porcentaje", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const exp = structuredClone(base);
  exp.timestamp = base.timestamp + 40;
  const item = classifyEntries([{ name: "c2.json", text: JSON.stringify(exp) }], importCtx([...exportsByTag.values()]))[0];
  assert.equal(item.kind, "ready");
  assert.equal(item.changes.unknownCount, 0);
});

test("datos 3.1.3: menas, bomba aérea, supercargas y topes", () => {
  const arrow = manifest.items["90000016"];
  const fangs = manifest.items["90000059"];
  assert.equal(arrow.nombre_en, "Monolith Arrow");
  assert.equal(arrow.nombre, "Flecha monolítica");
  assert.equal(arrow.heroe, "Archer Queen");
  assert.equal(arrow.rareza, "Epic");
  assert.equal(fangs.nombre_en, "Electro Fangs");
  assert.equal(fangs.nombre, "Colmillos eléctricos");
  assert.equal(fangs.heroe, "Dragon Duke");
  assert.equal(fangs.rareza, "Common");
  assert.equal(arrow.imagen.ruta, "images/hero-equipment/monolith-arrow.png");
  assert.equal(fangs.imagen.ruta, "images/hero-equipment/electro-fangs.png");
  assert.equal(manifest.indice_por_key["hero-equipment/monolith-arrow"], "90000016");
  assert.equal(manifest.indice_por_key["hero-equipment/electro-fangs"], "90000059");

  assert.equal(capsMaxFor(index, "90000016", 11), 15);
  assert.equal(capsMaxFor(index, "90000016", 13), 18);
  assert.equal(capsMaxFor(index, "90000016", 18), 27);
  assert.equal(capsMaxFor(index, "90000059", 15), null);
  assert.equal(capsMaxFor(index, "90000059", 16), null);
  assert.equal(capsMaxFor(index, "90000059", 17), 18);
  assert.equal(capsMaxFor(index, "90000059", 18), 18);
  const gone = [
    [11, "90000020"], [11, "90000047"], [11, "90000034"],
    [12, "90000034"],
    [13, "90000009"], [13, "90000012"],
    [14, "90000012"],
    [15, "90000056"], [15, "90000059"],
    [16, "90000059"],
  ];
  for (const [th, id] of gone) assert.equal(capsMaxFor(index, id, th), null, id + " TH" + th);
  assert.equal(capsMaxFor(index, "90000020", 12), 15);
  assert.equal(capsMaxFor(index, "90000047", 12), 15);
  assert.equal(capsMaxFor(index, "90000034", 13), 15);
  assert.equal(capsMaxFor(index, "90000009", 14), 18);
  assert.equal(capsMaxFor(index, "90000012", 15), 18);
  assert.equal(capsMaxFor(index, "90000056", 16), 18);

  assert.deepEqual(caps["18"]["Air Bomb"], { max: 13, count: 8 });
  assert.equal(caps["11"]["Air Bomb"].count, 5);
  assert.equal(caps["13"]["Air Bomb"].count, 6);
  assert.equal(caps["16"]["Air Bomb"].count, 7);
  assert.equal(caps["17"]["Air Bomb"].count, 7);

  const book = JSON.parse(readFileSync(new URL("../data/costes.json", import.meta.url)));
  const epic = book.items["90000016"];
  const common = book.items["90000059"];
  assert.deepEqual(Object.keys(epic).map(Number).sort((a, b) => a - b), Array.from({ length: 26 }, (_, i) => i + 2));
  assert.deepEqual(Object.keys(common).map(Number).sort((a, b) => a - b), Array.from({ length: 17 }, (_, i) => i + 2));
  assert.equal(epic["9"].e, 10);
  assert.equal(epic["18"].b, 2700);
  assert.equal(epic["18"].e, 50);
  assert.equal(epic["27"].b, 3600);
  assert.equal(epic["27"].g, 600);
  assert.equal(epic["27"].e, 150);
  for (const row of Object.values(common)) assert.equal(row.e, 0);
  assert.equal(common["18"].b, 2700);
  assert.equal(common["18"].g, 600);

  const fixed = [
    ["1000002", "1", "n", 150], ["1000002", "1", "s", 5],
    ["1000002", "2", "n", 300], ["1000002", "2", "s", 15],
    ["1000002", "3", "n", 700], ["1000002", "3", "s", 60],
    ["1000004", "1", "n", 150], ["1000004", "1", "s", 5],
    ["1000004", "2", "n", 300], ["1000004", "2", "s", 15],
    ["1000004", "3", "n", 700], ["1000004", "3", "s", 60],
    ["1000012", "1", "n", 22000], ["1000012", "1", "s", 3600],
    ["1000012", "2", "n", 90000], ["1000012", "2", "s", 7200],
    ["1000013", "1", "n", 5000], ["1000013", "1", "s", 1800],
    ["1000013", "2", "n", 25000], ["1000013", "2", "s", 3600],
    ["1000015", "1", "n", 0], ["1000015", "1", "s", 0],
    ["1000015", "2", "n", 3000000], ["1000015", "2", "s", 172800],
    ["1000019", "1", "n", 250000], ["1000019", "1", "s", 7200],
    ["1000019", "2", "n", 350000], ["1000019", "2", "s", 10800],
    ["1000021", "1", "n", 1000000], ["1000021", "1", "s", 43200],
    ["1000021", "2", "n", 1200000], ["1000021", "2", "s", 86400],
    ["1000023", "1", "n", 180000], ["1000023", "1", "s", 14400],
    ["1000023", "2", "n", 270000], ["1000023", "2", "s", 21600],
    ["1000023", "3", "n", 540000], ["1000023", "3", "s", 43200],
    ["1000027", "1", "n", 1000000], ["1000027", "1", "s", 43200],
    ["1000027", "2", "n", 1200000], ["1000027", "2", "s", 86400],
    ["1000032", "1", "n", 700000], ["1000032", "1", "s", 43200],
    ["1000032", "2", "n", 1000000], ["1000032", "2", "s", 64800],
    ["1000067", "1", "n", 8000000],
    ["1000067", "2", "n", 9000000],
    ["1000077", "1", "n", 200000], ["1000077", "1", "s", 604800],
    ["1000077", "2", "n", 250000], ["1000077", "2", "s", 691200],
    ["1000079", "1", "n", 17000000], ["1000079", "1", "s", 691200],
    ["1000079", "2", "n", 18000000], ["1000079", "2", "s", 777600],
    ["1000084", "1", "s", 604800],
    ["1000084", "2", "n", 13000000], ["1000084", "2", "s", 691200],
    ["1000085", "1", "s", 604800],
    ["1000085", "2", "n", 13000000], ["1000085", "2", "s", 691200],
    ["1000086", "1", "n", 430000], ["1000086", "1", "s", 1123205],
    ["1000086", "2", "n", 460000], ["1000086", "2", "s", 1209600],
    ["1000089", "1", "n", 17000000], ["1000089", "1", "s", 734400],
    ["1000089", "2", "n", 18000000], ["1000089", "2", "s", 864000],
    ["1000102", "1", "n", 29000000], ["1000102", "1", "s", 1123200],
    ["1000102", "2", "n", 30000000], ["1000102", "2", "s", 1209600],
    ["1000071", "1", "n", 30000], ["1000071", "1", "s", 3600],
    ["4000135", "3", "s", 691200],
  ];
  assert.equal(fixed.length, 77);
  for (const [id, lv, field, val] of fixed) {
    assert.equal(levelCost(id, Number(lv))[field], val, id + " Nv" + lv + " " + field);
  }
  assert.equal(levelCost("1000002", 1).r, "oro");
  assert.equal(levelCost("1000004", 1).r, "elixir");
  assert.equal(levelCost("1000023", 1).r, "elixir");
  assert.equal(levelCost("1000071", 1).r, "elixir");
  assert.equal(levelCost("1000077", 1).r, "oscuro");
  assert.equal(levelCost("1000086", 1).r, "oscuro");
  assert.equal(levelCost("1000015", 1).r, "oro");
  assert.equal(levelCost("1000067", 1).s, 432000);
  assert.equal(levelCost("1000067", 2).s, 604800);
  assert.equal(levelCost("1000084", 1).n, 12000000);
  assert.equal(levelCost("1000085", 1).n, 12000000);
  assert.equal(levelCost("4000135", 3).n, 10000000);
  assert.equal(levelCost("1000027", 5).n, 4200000);
  assert.equal(levelCost("4000000", 2).s, 1800);
  assert.equal(levelCost("12000000", 4).s, 2400);
  assert.equal(levelCost("12000006", 3).s, 86400);
  assert.equal(levelCost("12000016", 1).n, 1800000);
  assert.equal(levelCost("28000000", 83).n, 195000);
  assert.equal(levelCost("28000000", 84).n, 205000);
  assert.equal(levelCost("28000000", 85).n, 215000);
  assert.equal(levelCost("28000000", 86).n, 220000);
  assert.equal(levelCost("28000000", 87).n, 230000);
  assert.equal(levelCost("28000000", 88).n, 240000);
  assert.equal(levelCost("28000000", 89).n, 250000);
  assert.equal(levelCost("28000002", 76).n, 23500000);
  assert.equal(levelCost("28000002", 77).n, 24500000);
  assert.equal(levelCost("28000002", 78).n, 25500000);
  assert.equal(levelCost("28000002", 79).n, 26500000);
  assert.equal(levelCost("28000002", 80).n, 27500000);
  assert.equal(levelCost("90000056", 6).b, 940);
  assert.equal(levelCost("90000056", 6).g, 100);
  assert.equal(levelCost("90000056", 6).e, 0);

  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.media, 64.2);
  assert.equal(c1.cats.trampas.pct, 39.8);
  assert.equal(c1.cats.equipamiento.pct, 61.4);
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.media, 47.7);
  assert.equal(c2.sigMedia, 44.4);
  assert.equal(c2.cats.equipamiento.pct, 58.9);
});

test("3.1.5: menas del equipamiento con la tabla corregida de 16 y 59", () => {
  const c1exp = exportsByTag.get("#28PLGP0G2");
  const c1 = equipmentRows(c1exp, index, 18);
  const puppet = c1.find((p) => p.id === "90000000");
  assert.equal(puppet.nombre, "Bárbaro títere");
  assert.equal(puppet.bloqueado, false);
  assert.equal(puppet.lvl, 12);
  assert.equal(puppet.max, 18);
  assert.equal(puppet.pendientes[0].nivel, 13);
  assert.deepEqual(puppet.pendientes[0].mena, { brillante: 2200, reluciente: 0, estrellada: 0 });

  const arrow = c1.find((p) => p.id === "90000016");
  const fangs = c1.find((p) => p.id === "90000059");
  assert.equal(arrow.nombre, "Flecha monolítica");
  assert.equal(arrow.rareza, "Epic");
  assert.equal(fangs.nombre, "Colmillos eléctricos");
  assert.equal(fangs.rareza, "Common");
  assert.ok(arrow.pendientes.some((step) => step.mena && step.mena.estrellada > 0));
  assert.ok(fangs.pendientes.every((step) => step.mena && step.mena.estrellada === 0));
  assert.equal(arrow.pendientes.find((step) => step.nivel === 18).mena.estrellada, 50);
  assert.equal(fangs.pendientes.find((step) => step.nivel === 18).mena.estrellada, 0);

  const total = oreTotal(c1);
  assert.equal(total.estrellada > 0, true);
  const sinTope = c1.filter((p) => p.bloqueado);
  assert.deepEqual(sinTope.map((p) => p.id), ["90000061"]);
  assert.equal(sinTope[0].nombre, "Portal portátil");
  assert.equal(oreTotal(sinTope).brillante, 0);

  const c2 = equipmentRows(exportsByTag.get("#R00C8CPQC"), index, 16);
  const locked = c2.filter((p) => p.bloqueado);
  assert.ok(locked.length >= 4);
  for (const row of locked) assert.equal(row.pendientes.length, 0);
  assert.equal(oreTotal(locked).brillante, 0);
  assert.equal(oreTotal(locked).estrellada, 0);

  const epic = applyEqFilter(c1, { rareza: "Epic", heroe: "todos", bloqueados: false, ocultar: true }, []);
  assert.ok(epic.some((p) => p.id === "90000016"));
  assert.equal(epic.some((p) => p.id === "90000059"), false);
  const king = applyEqFilter(c1, { rareza: "todos", heroe: "Barbarian King", bloqueados: false, ocultar: false }, []);
  assert.ok(king.length > 0);
  assert.ok(king.every((p) => p.heroe === "Barbarian King"));
  const hidden = applyEqFilter(c1, { rareza: "todos", heroe: "todos", bloqueados: false, ocultar: true }, ["90000000"]);
  assert.equal(hidden.some((p) => p.id === "90000000"), false);
  const shown = applyEqFilter(c2, { rareza: "todos", heroe: "todos", bloqueados: false, ocultar: false }, []);
  assert.equal(shown.some((p) => p.bloqueado), false);
  const withLocked = applyEqFilter(c2, { rareza: "todos", heroe: "todos", bloqueados: true, ocultar: false }, []);
  assert.ok(withLocked.some((p) => p.bloqueado));

  const groups = groupByHero(king, [{ id: "28000000", nombreEn: "Barbarian King", nombre: "Rey Bárbaro" }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].nombre, "Rey Bárbaro");

  const fleet = fleetOre([
    { tag: "#28PLGP0G2", nombre: "C1", th: 18, piezas: c1 },
    { tag: "#R00C8CPQC", nombre: "C2", th: 16, piezas: c2 },
  ]);
  const expected = addOre(oreTotal(c1), oreTotal(c2));
  assert.equal(fleet.total.estrellada, expected.estrellada);
  assert.equal(fleet.total.brillante, expected.brillante);
  assert.equal(fleet.total.reluciente, expected.reluciente);
  assert.equal(fleet.filas.length, 2);

  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /Total para maxear todo el equipamiento/);
  assert.match(app, /Mostrar bloqueados/);
  assert.match(app, /Ocultar elegidos/);
  assert.match(app, /Reluciente/);
  assert.match(app, /Estrellada/);
  assert.equal(app.includes("resplandeciente"), true);
});

test("3.1.6: el perfil muestra solo lo que trae el JSON", () => {
  const c1 = exportsByTag.get("#28PLGP0G2");
  const c2 = exportsByTag.get("#R00C8CPQC");
  const sinAyuda = exportsByTag.get("#GVPU2CJR8");
  const facts = exportFacts(c1);
  assert.equal(facts.tag, "#28PLGP0G2");
  assert.equal(facts.th, 18);
  assert.equal(facts.casaConstructor, null);
  assert.equal(casaConstructorOf(c1), null);
  assert.equal(facts.clan, null);
  assert.equal(clanOf(c1), null);
  assert.equal(facts.constructores.known, true);
  assert.equal(facts.constructores.total, 5);
  assert.deepEqual(facts.constructores.grupos, [{ lvl: 6, cnt: 5 }]);
  assert.equal(facts.bob.cnt, 1);
  assert.equal(facts.bob.lvl, 1);
  assert.deepEqual(facts.helpers.map((h) => `${h.id}:${h.lvl}`), [
    "93000000:4", "93000001:1", "93000002:1", "93000003:1",
  ]);
  assert.equal(JSON.stringify(facts).includes("64753"), false);
  assert.equal(JSON.stringify(facts).includes("28000003"), false);
  assert.equal("trofeos" in facts, false);
  assert.equal("liga" in facts, false);
  assert.equal("estrellasGuerra" in facts, false);

  const secundaria = exportFacts(c2);
  assert.equal(secundaria.constructores.total, 5);
  assert.deepEqual(secundaria.constructores.grupos, [{ lvl: 1, cnt: 4 }, { lvl: 3, cnt: 1 }]);
  assert.equal(secundaria.bob, null);
  assert.deepEqual(secundaria.helpers.map((h) => h.id), ["93000000", "93000001", "93000002"]);
  assert.equal(secundaria.clan, null);

  const vacia = exportFacts(sinAyuda);
  assert.equal(vacia.helpers.length, 0);
  assert.equal(vacia.constructores.total, 4);
  assert.equal(vacia.clan, null);
  assert.equal(vacia.casaConstructor, null);

  for (const exp of exportsByTag.values()) {
    assert.equal(exportFacts(exp).clan, null);
    assert.equal(exportFacts(exp).casaConstructor, null);
  }

  const conClan = exportFacts({
    tag: "#X",
    timestamp: 1,
    buildings: [{ data: 1000001, lvl: 12 }],
    builderHallLevel: 9,
    clan: { name: "A.R.D.U", tag: "#2CYV9RRR8", level: 8, badgeUrls: { small: "https://ejemplo" } },
  });
  assert.equal(conClan.casaConstructor, 9);
  assert.equal(conClan.th, 12);
  assert.deepEqual(conClan.clan.map((row) => row.etiqueta), ["Nombre", "Etiqueta", "Nivel"]);
  assert.equal(conClan.clan.some((row) => row.clave === "members"), false);
  assert.equal(clanOf({ clan: {} }), null);
  assert.equal(clanOf({ clan: { name: "  " } }), null);
  assert.equal(clanOf({ boosts: { clocktower_cooldown: 10 } }), null);

  const heroes = analyze(c1, index).heroes;
  assert.deepEqual(heroes.map((h) => [h.id, h.lvl, h.max]), [
    ["28000000", 61, 110],
    ["28000001", 57, 110],
    ["28000002", 34, 85],
    ["28000004", 18, 55],
    ["28000006", 31, 95],
    ["28000007", 20, 25],
  ]);
  assert.equal(analyze(c1, index).media, 64.2);

  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /Ajustes de perfil/);
  assert.match(app, /Niveles de héroes/);
  assert.match(app, /De la exportación/);
  assert.match(app, /fuera del plan/);
  assert.match(app, /#\/perfil\//);
  assert.equal(app.includes("data-perfil"), false);
  assert.equal(app.includes("Trofeos"), false);
  assert.equal(app.includes("Estrellas de guerra"), false);
  assert.equal(app.includes("cuello de botella"), false);
});

test("versión 4.2.0 y cachés cp-shell-v47 / cp-img-v10", () => {
  assert.equal(APP_VERSION, "4.2.0");
  assert.equal(SHELL_CACHE, "cp-shell-v47");
  assert.equal(IMAGE_CACHE, "cp-img-v10");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const caches = readFileSync(new URL("../js/caches.js", import.meta.url), "utf8");
  assert.match(sw, /SHELL_CACHE/);
  assert.match(sw, /IMAGE_CACHE/);
  assert.match(sw, /precacheUrls/);
  assert.equal(sw.includes("categoria !== \"townhall\""), false);
  assert.equal(sw.includes("cp-shell-v5"), false);
  assert.equal(sw.includes("cp-shell-v6"), false);
  assert.equal(sw.includes("cp-shell-v7"), false);
  assert.equal(sw.includes("cp-shell-v8"), false);
  assert.equal(sw.includes("cp-shell-v9"), false);
  assert.equal(sw.includes("cp-shell-v10"), false);
  assert.equal(sw.includes("cp-shell-v11"), false);
  assert.equal(sw.includes("cp-shell-v12"), false);
  assert.equal(sw.includes("cp-shell-v13"), false);
  assert.equal(sw.includes("cp-shell-v14"), false);
  assert.equal(sw.includes("cp-shell-v15"), false);
  assert.equal(sw.includes("cp-shell-v16"), false);
  assert.equal(sw.includes("cp-shell-v17"), false);
  assert.equal(sw.includes("cp-shell-v18"), false);
  assert.equal(sw.includes("cp-shell-v19"), false);
  assert.equal(sw.includes("cp-shell-v20"), false);
  assert.equal(sw.includes("cp-shell-v21"), false);
  assert.equal(sw.includes("cp-shell-v22"), false);
  assert.equal(sw.includes("cp-shell-v23"), false);
  assert.equal(sw.includes("cp-shell-v24"), false);
  assert.equal(sw.includes("cp-shell-v25"), false);
  assert.equal(sw.includes("cp-shell-v26"), false);
  assert.equal(sw.includes("cp-shell-v27"), false);
  assert.equal(sw.includes("cp-shell-v28"), false);
  assert.equal(sw.includes("cp-shell-v29"), false);
  assert.equal(sw.includes("cp-shell-v30"), false);
  assert.equal(sw.includes("cp-shell-v31"), false);
  assert.equal(sw.includes("cp-shell-v32"), false);
  assert.equal(sw.includes("cp-shell-v33"), false);
  assert.equal(sw.includes("cp-shell-v34"), false);
  assert.equal(sw.includes("cp-shell-v35"), false);
  assert.equal(sw.includes("cp-shell-v36"), false);
  assert.equal(sw.includes("cp-shell-v37"), false);
  assert.equal(sw.includes("cp-shell-v38"), false);
  assert.equal(sw.includes("cp-shell-v39"), false);
  assert.equal(sw.includes("cp-shell-v40"), false);
  assert.equal(sw.includes("cp-shell-v41"), false);
  assert.equal(sw.includes("cp-shell-v42"), false);
  assert.equal(sw.includes("cp-shell-v43"), false);
  assert.equal(sw.includes("cp-shell-v44"), false);
  assert.equal(sw.includes("cp-shell-v45"), false);
  assert.equal(sw.includes("cp-shell-v46"), false);
  assert.equal(sw.includes("cp-img-v8"), false);
  assert.equal(sw.includes("cp-img-v9"), false);
  assert.equal(sw.includes("cp-img-v4"), false);
  assert.equal(sw.includes("cp-img-v5"), false);
  assert.equal(sw.includes("cp-img-v6"), false);
  assert.equal(sw.includes("cp-img-v7"), false);
  assert.match(sw, /cajas-alfa\.json/);
  assert.match(caches, /cp-shell-v47/);
  assert.equal(caches.includes("cp-shell-v46"), false);
  assert.equal(caches.includes("cp-shell-v45"), false);
  assert.equal(caches.includes("cp-shell-v44"), false);
  assert.equal(caches.includes("cp-shell-v43"), false);
  assert.equal(caches.includes("cp-shell-v42"), false);
  assert.equal(caches.includes("cp-shell-v41"), false);
  assert.equal(caches.includes("cp-shell-v40"), false);
  assert.equal(caches.includes("cp-shell-v39"), false);
  assert.equal(caches.includes("cp-shell-v38"), false);
  assert.equal(caches.includes("cp-shell-v37"), false);
  assert.equal(caches.includes("cp-shell-v36"), false);
  assert.equal(caches.includes("cp-shell-v35"), false);
  assert.equal(caches.includes("cp-shell-v33"), false);
  assert.equal(caches.includes("cp-shell-v34"), false);
  assert.equal(caches.includes("cp-shell-v29"), false);
  assert.equal(caches.includes("cp-shell-v30"), false);
  assert.equal(caches.includes("cp-shell-v31"), false);
  assert.equal(caches.includes("cp-shell-v32"), false);
  assert.equal(caches.includes("cp-shell-v21"), false);
  assert.equal(caches.includes("cp-shell-v22"), false);
  assert.equal(caches.includes("cp-shell-v23"), false);
  assert.equal(caches.includes("cp-shell-v24"), false);
  assert.equal(caches.includes("cp-shell-v25"), false);
  assert.equal(caches.includes("cp-shell-v26"), false);
  assert.equal(caches.includes("cp-shell-v27"), false);
  assert.equal(caches.includes("cp-shell-v28"), false);
  assert.match(sw, /estilo-3\.1\.css/);
  assert.match(sw, /js\/equipo\.js/);
  assert.match(sw, /js\/perfil\.js/);
  assert.match(sw, /js\/actualizar\.js/);
  assert.match(sw, /js\/nav\.js/);
  assert.match(caches, /cp-img-v10/);
  assert.equal(caches.includes("cp-img-v7"), false);
  assert.equal(caches.includes("cp-img-v8"), false);
  assert.equal(caches.includes("cp-img-v9"), false);
  assert.equal(caches.includes("cp-shell-v11"), false);
  assert.equal(caches.includes("cp-shell-v12"), false);
  assert.equal(caches.includes("cp-shell-v13"), false);
  assert.equal(caches.includes("cp-shell-v14"), false);
  assert.equal(caches.includes("cp-shell-v15"), false);
  assert.equal(caches.includes("cp-shell-v16"), false);
  assert.equal(caches.includes("cp-img-v4"), false);
  assert.match(app, /APP_VERSION/);
  assert.match(app, /imageChoice/);
  assert.equal(app.includes("1.1.0"), false);
  assert.equal(app.includes("salvo cuando"), false);
  assert.match(app, /js\/import\.js|from "\.\/import\.js"/);
});

test("4.1.5: la barra tiene cinco pestañas y Operaciones se abre desde Agenda", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const tab = app.slice(app.indexOf("function tabbar("), app.indexOf("function subImported("));
  assert.equal(tab.includes("Operaciones"), false);
  assert.equal(tab.includes("#/operaciones"), false);
  assert.match(tab, /Inicio/);
  assert.match(tab, /Cuentas/);
  assert.match(tab, /Mejoras/);
  assert.match(tab, /Análisis/);
  assert.match(tab, /Agenda/);
  const agenda = app.slice(app.indexOf("function renderAgenda("), app.indexOf("function renderHistorial("));
  assert.match(agenda, /href="#\/operaciones"/);
  assert.match(agenda, />Operaciones</);
  const base = app.slice(app.indexOf("function baseTab("), app.indexOf("function infoBtn("));
  assert.match(base, /r\.name === "agenda" \|\| r\.name === "operaciones"/);
  assert.match(base, /return "agenda"/);
  const ui = readFileSync(new URL("../js/ui-operaciones.js", import.meta.url), "utf8");
  for (const vista of ["sesion", "mantenimiento", "simulador", "gemelos", "equilibrio", "prediccion", "guerras", "diario", "plantillas", "prioridades", "estrategias"]) {
    assert.match(ui, new RegExp("#/operaciones/" + vista));
  }
  const motor = readFileSync(new URL("../js/ui-atencion.js", import.meta.url), "utf8");
  assert.match(motor, /#\/operaciones\/prioridades/);
});

function unidentifiedSplit(exp) {
  const th = townHallLevel(exp);
  const notices = {};
  let noticeSum = 0;
  let equipment = 0;
  for (const cat of CATEGORIES) {
    if (cat.key === "muros") continue;
    const items = categoryItems(exp, index, cat.key, th);
    let n = 0;
    for (const it of items) {
      if (!it.id || !outsidePct(index, it.id, th)) continue;
      n += cat.key === "equipamiento" ? 1 : (it.cnt > 0 ? it.cnt : 1);
    }
    if (cat.key === "equipamiento") equipment = n;
    else {
      notices[cat.key] = n;
      noticeSum += n;
    }
  }
  return { noticeSum, equipment, total: noticeSum + equipment, notices };
}

test("sin identificar: las once cuentas dan 0 en la importación y en los avisos", () => {
  const rows = [...exportsByTag.values()];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    const fresh = structuredClone(exp);
    fresh.timestamp = exp.timestamp + 40;
    const item = classifyEntries([{ name: "nueva.json", text: JSON.stringify(fresh) }], importCtx(rows))[0];
    const split = unidentifiedSplit(exp);
    assert.equal(item.changes.unknownCount, 0, roster.tag);
    assert.equal(split.total, 0, roster.tag + " avisos");
    assert.equal(split.noticeSum, 0, roster.tag);
    assert.equal(split.equipment, 0, roster.tag);
    assert.equal(split.notices.laboratorio || 0, 0, roster.tag);
    assert.equal(split.notices.defensas || 0, 0, roster.tag + " defensas");
    assert.equal(outsidePct(index, "107000008", townHallLevel(exp)), false, roster.tag);
    assert.equal(outsidePct(index, "90000061", townHallLevel(exp)), false, roster.tag);
  }
  assert.equal(unknownMsg(1), "1 ítem sin identificar: se guarda igual.");
  assert.equal(unknownMsg(0), "0 ítems sin identificar: se guardan igual.");
  const helper = presentItem(index, "93000003");
  assert.equal(helper.unknown, false);
  assert.equal(helper.title, "Picador");
  const pendant = presentItem(index, "90000061");
  assert.equal(pendant.unknown, false);
  assert.equal(pendant.title, "Portal portátil");
  assert.equal(unidentifiedSplit(exportsByTag.get("#28PLGP0G2")).total, 0);
});

test("107000008 se muestra como Arrojatroncos, sin marca de ID deducido, y no entra en el aviso", () => {
  const item = manifest.items["107000008"];
  assert.equal(item.estado, "ok");
  assert.equal(item.nombre_pendiente, false);
  assert.equal(item.nombre_en, "Logger");
  assert.equal(itemName(item), "Arrojatroncos");
  const shown = presentItem(index, "107000008");
  assert.equal(shown.unknown, false);
  assert.equal(shown.title, "Arrojatroncos");
  assert.equal(shown.mark, null);
  assert.equal(capsMaxFor(index, "107000008", 18), 5);
  assert.equal(outsidePct(index, "107000008", 18), false);
  const row = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "defensas", 18).find((r) => r.id === "107000008");
  assert.ok(row);
  assert.equal(levelLine(row).text, "Nv 1 / 5");
  assert.equal(row.max, 5);
  assert.equal(item.imagen.ruta, "images/guardians/logger.png");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("ID deducido"), false);
  assert.match(app, /Nombre en español sin confirmar/);
  const heroes = categoryItems(exportsByTag.get("#R00C8CPQC"), index, "heroes", 16);
  const line = (name) => levelLine(heroes.find((h) => itemName(index.items[h.id]) === name)).text;
  assert.equal(line("Luchadora real"), "Nv 11 / 45");
  assert.equal(line("Príncipe Esbirro"), "Nv 12 / 80");
  assert.equal(line("Duque Dragón"), "Nv 10 / 15");
});

test("el Logger se muestra entero, sin recortar la caja; el nivel 5 tiene su PNG del Fan Kit", () => {
  const im = manifest.items["107000008"].imagen;
  assert.deepEqual(im.caja_visible, { x: 268, y: 335, w: 611, h: 555 });
  assert.equal(im.ocupacion, 0.3234);
  const fit = containOf(im, 40);
  const lado = thumbInterior(40, false);
  assert.equal(fit.escala, Math.min(1, lado / im.ancho, lado / im.alto));
  assert.ok(fit.dw <= im.ancho && fit.dh <= im.alto);
  assert.ok(fit.dw <= lado && fit.dh <= lado);
  const zoomed = containOf({ ...im, caja_visible: { x: 0, y: 0, w: 10, h: 10 } }, 40);
  assert.deepEqual(zoomed, fit);
  assert.equal(manifest.items["107000008"].imagenes_por_nivel["1"].ruta, im.ruta);
  assert.equal(manifest.items["107000008"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["107000008"].imagenes_por_nivel["5"].marca, null);
  assert.equal(manifest.items["107000008"].imagenes_por_nivel["5"].es_inferior, false);
  assert.equal(manifest.items["107000008"].imagenes_por_nivel["5"].ruta, "images/guardians/logger_5.png");
  assert.equal(im.precarga, false);
  assert.equal(im.pesado, false);
  assert.equal(IMAGE_CACHE, "cp-img-v10");
});

test("la media sin cambio no repite el valor ni pone flecha", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const rows = [...exportsByTag.values()];
  const same = structuredClone(base);
  same.timestamp = base.timestamp + 40;
  const flat = classifyEntries([{ name: "igual.json", text: JSON.stringify(same) }], importCtx(rows))[0];
  assert.equal(flat.kind, "ready");
  assert.equal(flat.changes.delta.dir, "flat");
  assert.equal(flat.changes.mediaTo, 47.7);
  assert.equal(mediaLine(flat.changes), fmtPct(47.7) + " · sin cambio");
  assert.equal(mediaLine(flat.changes).includes("→"), false);
  assert.equal(mediaLine(flat.changes).split(fmtPct(47.7)).length - 1, 1);
  const moved = structuredClone(base);
  moved.timestamp = base.timestamp + 80;
  const wall = moved.buildings.find((b) => b.data === 1000010);
  wall.lvl += 1;
  const up = classifyEntries([{ name: "sube.json", text: JSON.stringify(moved) }], importCtx(rows))[0];
  assert.equal(up.changes.delta.dir === "flat", false);
  assert.match(mediaLine(up.changes), /→/);
  assert.equal(mediaLine(up.changes).includes("sin cambio"), false);
  const bad = classifyEntries([{ name: "c1.json", text: "{", source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(bad), "c1.json\u00a0· El archivo está incompleto");
  const url = classifyEntries([{ name: "nota.txt", text: "https://link.clashofclans.com/x", source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(url), "nota.txt\u00a0· Empieza por «https://link.cla…»");
  const shape = classifyEntries([{ name: "foo.json", text: '{"foo":1}', source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(shape), "foo.json\u00a0· Falta el tag de la cuenta");
});

test("1.1.3: la fila «No válido» lleva solo el primer motivo, sin punto final y con nbsp antes del ·", () => {
  const rows = [...exportsByTag.values()];
  const shape = classifyEntries([{ name: "estructura.json", text: '{"foo":1}', source: "file" }], importCtx(rows))[0];
  assert.equal(shape.kind, "invalid");
  assert.ok(shape.issues.length > 1);
  assert.equal(omitReason(shape), "Falta el tag de la cuenta");
  assert.equal(omitSubtitle(shape), "estructura.json\u00a0· Falta el tag de la cuenta");
  assert.equal(omitSubtitle(shape).includes(shape.issues[1].replace(/\.$/, "")), false);
  assert.equal(omitSubtitle(shape).includes(" · "), false);
  assert.equal(omitSubtitle(shape).endsWith("."), false);
  // La tarjeta de error de Pegar sigue con todos los motivos.
  assert.equal(shape.issues[0], "Falta el tag de la cuenta.");
  const noTh = classifyEntries([{ name: "sin-th.json", text: '{"tag":"#X","timestamp":1}', source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(noTh), "sin-th.json\u00a0· No se encuentra el ayuntamiento");
  const empty = classifyEntries([{ name: "vacio.json", text: "  ", source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(empty), "vacio.json\u00a0· El archivo está vacío");
  const pasted = classifyEntries([{ name: "", text: "{", source: "clipboard" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(pasted), "Pegado\u00a0· El texto está incompleto: parece cortado al copiar");
});

test("1.1.3: un texto que no empieza por «{» dice solo «Empieza por «…»»", () => {
  const rows = [...exportsByTag.values()];
  for (const source of ["file", "clipboard"]) {
    const it = classifyEntries([{ name: "nota.txt", text: "https://link.clashofclans.com/x", source }], importCtx(rows))[0];
    assert.equal(it.kind, "invalid");
    assert.equal(omitReason(it), "Empieza por «https://link.cla…»");
    assert.equal(omitSubtitle(it), "nota.txt\u00a0· Empieza por «https://link.cla…»");
    assert.equal(omitSubtitle(it).includes("no es una exportación"), false);
    // El mensaje completo de la tarjeta de Pegar no cambia.
    assert.match(it.parseError.msg, /no es una exportación\. Empieza por «https:\/\/link\.cla…»\.$/);
  }
  const short = classifyEntries([{ name: "hola.txt", text: "hola", source: "file" }], importCtx(rows))[0];
  assert.equal(omitSubtitle(short), "hola.txt\u00a0· Empieza por «hola»");
});

test("1.1.3: clipPreview quita los espacios antes de «…»", () => {
  for (const source of ["clipboard", "file"]) {
    assert.equal(parseLoose("abcdefghijklmno  xyzzzz", source).preview, "abcdefghijklmno…");
    assert.equal(parseLoose("abcdefghijklmn\t\t  xyzzzz", source).preview, "abcdefghijklmn…");
    assert.equal(parseLoose("abcdefghijklmnopqrs xyz", source).preview, "abcdefghijklmnop…");
    assert.equal(parseLoose("abcdefghijklmnopqrs ", source).preview, "abcdefghijklmnopqrs");
  }
  const gap = parseLoose("abcdefghijklmno  xyzzzz", "file");
  assert.equal(gap.msg, "El archivo no es una exportación. Empieza por «abcdefghijklmno…».");
  assert.equal(/\s…/.test(gap.msg), false);
});

test("1.1.3: el lote ya no lleva el pie «No es una exportación válida.» y sí el de «Duplicada»", () => {
  const omitFoot = fnFromApp("function omitFoot(items)", "omitFoot", { BAD_FOOT, DUP_FOOT, omitReason });
  const rows = [...exportsByTag.values()];
  const invalid = classifyEntries([
    { name: "c1.json", text: "{", source: "file" },
    { name: "nota.txt", text: "https://link.clashofclans.com/x", source: "file" },
    { name: "estructura.json", text: '{"foo":1}', source: "file" },
    { name: "vacio.json", text: "", source: "file" },
    { name: "roto.json", text: '{"a":}', source: "file" },
  ], importCtx(rows));
  assert.ok(invalid.every((i) => i.kind === "invalid" && omitReason(i)));
  const onlyBad = omitFoot(invalid);
  assert.equal(onlyBad.includes(BAD_FOOT), false);
  assert.equal(onlyBad.includes("No es una exportación válida."), false);
  assert.equal(onlyBad, "");
  const withDup = omitFoot([...invalid, { kind: "duplicate" }]);
  assert.equal(withDup, `<p class="section-footer">${DUP_FOOT}</p>`);
  // Red de seguridad: una fila no válida sin motivo sí lo mostraría.
  assert.equal(omitFoot([{ kind: "invalid", name: "x.json" }]), `<p class="section-footer">${BAD_FOOT}</p>`);
});

test("1.1.3: los nombres de archivo largos del lote parten línea", () => {
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  assert.match(css, /\.row--account \.row__sub\s*\{\s*overflow-wrap:\s*break-word;\s*\}/);
});

test("ofensiva: media de laboratorio y héroes", () => {
  const got = (tag) => analyze(exportsByTag.get(tag), index).offense;
  assert.equal(got("#GUQUV98JG"), 43.2);
  assert.equal(got("#R02YUVC0J"), 41.1);
  assert.equal(got("#GUQUV98JG"), Number(byTag.get("#GUQUV98JG").pct_ofensiva));
  assert.equal(got("#R02YUVC0J"), Number(byTag.get("#R02YUVC0J").pct_ofensiva));
  // Con Bruja caída y Hechizo de cólera en el laboratorio, C2 vuelve al 34,2 del CSV.
  assert.equal(got("#R00C8CPQC"), 34.2);
});

test("1.1.4: fmtWhen deja la fecha y la hora con espacio de no separación", () => {
  const fmtWhen = fnFromApp("function fmtWhen(ms)", "fmtWhen", { fmtFin });
  const ms = Date.UTC(2026, 9, 7, 19, 22);
  const text = fmtWhen(ms);
  assert.equal(text.includes(" "), false);
  assert.match(text, /07\/10\u00a021:22/);
  assert.equal(fmtFin(ms), text);
  assert.equal(fmtBytes(60950695), "61,0\u00a0MB");
  assert.equal(fmtBytes(60950695).includes(" "), false);
});

test("1.1.4: la insignia y el ×N quedan fuera del nombre recortado", () => {
  const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const rowTitle = fnFromApp("function rowTitle(", "rowTitle", { esc: escHtml });
  const badge = `<span class="badge badge--soft">ID deducido</span>`;
  const deduced = rowTitle("Corazón ardiente", badge);
  assert.match(deduced, /<span class="row__name">Corazón ardiente<\/span><span class="badge badge--soft">ID deducido<\/span>/);
  assert.equal(deduced.includes(`<span class="row__name">Corazón ardiente${badge}`), false);
  const counted = rowTitle("Torre de arqueras múltiple", `<span class="num">×3</span>`);
  assert.match(counted, /<span class="row__name">Torre de arqueras múltiple<\/span><span class="num">×3<\/span>/);
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  assert.match(css, /\.row__title--meta > \.row__name \{ min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; \}/);
  assert.match(css, /\.row__title--meta > \.num, \.row__title--meta > \.badge \{ flex: none; \}/);

  const CAT_CLASS = { defensas: "defensas", heroes: "heroes" };
  const barHtml = fnFromApp("function barHtml(", "barHtml", { CAT_CLASS, esc: escHtml });
  const rowLevel = fnFromApp("function rowLevel(", "rowLevel", { levelLine, barHtml });
  const detailAria = fnFromApp("function detailAria(", "detailAria", { levelLine });
  const detailRow = fnFromApp("function detailRow(", "detailRow", {
    rowLevel,
    state: { index },
    nameOf: (id) => itemName(index.items[id]) || "Ítem",
    thumb: () => `<span class="thumb"></span>`,
    esc: escHtml,
    emptyNamedThumb: () => `<span class="thumb"></span>`,
    rowTitle,
    detailAria,
  });
  const exp = exportsByTag.get("#28PLGP0G2");
  const a = analyze(exp, index);
  const items = categoryItems(exp, index, "defensas", a.th);
  const logger = items.find((it) => it.id === "107000008");
  const multi = items.find((it) => it.cnt > 1 && it.max != null);
  assert.ok(logger);
  assert.ok(multi);
  const loggerHtml = detailRow(logger, "defensas", a);
  assert.match(loggerHtml, /<span class="row__name">Arrojatroncos<\/span>/);
  assert.doesNotMatch(loggerHtml, /ID deducido|badge--soft/);
  assert.match(loggerHtml, /aria-label="Arrojatroncos, nivel 1 de 5"/);
  const multiHtml = detailRow(multi, "defensas", a);
  const multiName = itemName(index.items[multi.id]);
  assert.match(multiHtml, new RegExp(`<span class="row__name">${multiName}</span><span class="num">×${multi.cnt}</span>`));
  assert.equal(multiHtml.includes(`<span class="row__name">${multiName}×`), false);
  assert.match(multiHtml, new RegExp(`aria-label="${multiName}, ×${multi.cnt}, nivel `));
});

test("1.1.4: la fila lleva aria-label y la barra de dentro va aria-hidden", () => {
  const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const CAT_CLASS = {
    defensas: "defensas", laboratorio: "laboratorio", ejercito_edif: "ejercito",
    equipamiento: "equipamiento", mascotas: "mascotas", heroes: "heroes",
    trampas: "trampas", recursos: "recursos", muros: "muros",
  };
  const barHtml = fnFromApp("function barHtml(", "barHtml", { CAT_CLASS, esc: escHtml });
  const decorative = barHtml("heroes", 32, null, { mini: true, decorative: true, label: "no se lee" });
  assert.match(decorative, /aria-hidden="true"/);
  assert.equal(decorative.includes("role="), false);
  assert.equal(decorative.includes("aria-label"), false);
  const alone = barHtml("defensas", 70.1, 64, { label: "Defensas: 70,1 %" });
  assert.match(alone, /role="img"/);
  assert.match(alone, /aria-label="Defensas: 70,1 %"/);

  const catAria = fnFromApp("function catAria(", "catAria", {});
  const heroAria = fnFromApp("function heroAria(", "heroAria", {});
  assert.equal(
    catAria("Defensas", fmtPct(70.1), `TH17: ${fmtPct(64)} · faltan 190 niveles`),
    `Defensas, ${fmtPct(70.1)}, TH17 ${fmtPct(64)}, faltan 190 niveles`,
  );
  assert.equal(heroAria("Príncipe Esbirro", { lvl: 31, max: 95 }, { bar: true, text: "Nv 31 / 95" }, false), "Príncipe Esbirro, nivel 31 de 95");
  assert.equal(heroAria("Duque Dragón", { lvl: 10, max: 15 }, { bar: true, text: "Nv 10 / 15" }, true), "Duque Dragón, nivel 10 de 15");

  const catRow = fnFromApp("function catRow(", "catRow", {
    CAT_CLASS,
    categoryUnlock: () => null,
    categoryItems: () => [],
    fmtPct,
    catFoot,
    barHtml,
    CHEV: "",
    esc: escHtml,
    catAria,
  });
  const a = { th: 16, thSig: 17, cats: { defensas: { pct: 70.1, sigPct: 64, num: 10, den: 20, pend: 190, mark: 80 } } };
  const html = catRow({}, { tag: "#R00C8CPQC" }, a, { key: "defensas", label: "Defensas" });
  assert.match(html, /aria-label="Defensas, 70,1\u00a0%, TH17 64,0\u00a0%, faltan 190 niveles"/);
  assert.match(html, /aria-hidden="true"/);
  assert.equal(html.includes('role="img"'), false);
});

test("1.1.4: la tabla oculta del gráfico usa la fecha visible, no ISO", () => {
  const chartDay = fnFromApp("function chartDay(", "chartDay", {});
  assert.equal(chartDay("2026-10-07"), "07/10");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /<td>\$\{esc\(chartDay\(p\.day\)\)\}<\/td>/);
  assert.equal(app.includes("<td>${esc(p.day)}</td>"), false);
});

test("1.1.4: el input de archivos oculto no entra en el tabulador ni en VoiceOver", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /<input class="file-input" data-files type="file" accept="\.json,application\/json,text\/json,text\/plain" multiple tabindex="-1" aria-hidden="true">/);
});

test("1.1.4: Esc cierra el sheet y el foco vuelve a quien lo abrió", () => {
  function matches(node, sel) {
    if (sel.startsWith("#")) return node.id === sel.slice(1);
    if (sel.startsWith(".")) return (node.className || "").split(/\s+/).includes(sel.slice(1));
    const attr = sel.match(/^\[([^\]=]+)="([^"]*)"\]$/);
    if (attr) return (node.attrs || {})[attr[1]] === attr[2];
    return node.tag === sel;
  }
  function find(list, sel) {
    for (const node of list) {
      if (matches(node, sel)) return node;
      const nested = find(node.children || [], sel);
      if (nested) return nested;
    }
    return null;
  }
  function wire(node, doc) {
    node.children = node.children || [];
    node.attrs = node.attrs || {};
    node.tabIndex = 0;
    node.setAttribute = (k, v) => { node.attrs[k] = String(v); };
    node.removeAttribute = (k) => { delete node.attrs[k]; };
    node.focus = () => { doc.active = node; };
    node.querySelector = (sel) => find(node.children, sel);
    for (const child of node.children) wire(child, doc);
  }
  const h2 = { tag: "h2", id: "aj-title" };
  const sheet = { tag: "div", className: "sheet", children: [h2] };
  const opener = { tag: "button", attrs: { "data-go": "#/ajustes" } };
  const navbar = { tag: "header", className: "navbar", children: [opener] };
  const screen = { tag: "main", id: "screen" };
  const tabbar = { tag: "nav", className: "tabbar" };
  const roots = [navbar, screen, tabbar, sheet];
  const doc = { active: null, querySelector: (sel) => find(roots, sel) };
  for (const node of roots) wire(node, doc);
  const state = { ficha: null, alert: null, focusReturn: '[data-go="#/ajustes"]', importUi: { needsFocus: false } };
  const location = { hash: "#/ajustes" };
  const where = { name: "ajustes" };
  const route = () => where;
  const render = () => {};
  const settle = fnFromApp("function settleSheetFocus()", "settleSheetFocus", { document: doc, state, route });
  const onEsc = fnFromApp("function onSheetEscape(", "onSheetEscape", { state, render, location, route });

  settle();
  assert.equal(doc.active, h2);
  assert.equal(h2.tabIndex, -1);
  assert.equal(navbar.attrs.inert, "");
  assert.equal(screen.attrs.inert, "");
  assert.equal(tabbar.attrs.inert, "");

  state.alert = { title: "¿Borrar?" };
  assert.equal(onEsc({ key: "Escape" }), false);
  assert.equal(location.hash, "#/ajustes");
  state.alert = null;

  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(location.hash, "#/roster");
  roots.pop();
  where.name = "roster";
  settle();
  assert.equal(doc.active, opener);
  assert.equal(navbar.attrs.inert, undefined);
  assert.equal(screen.attrs.inert, undefined);
  assert.equal(tabbar.attrs.inert, undefined);
  assert.equal(state.focusReturn, "");

  const fichaTitle = { tag: "h2", id: "ficha-title" };
  const fichaSheet = { tag: "div", className: "sheet sheet--half", children: [fichaTitle] };
  const row = { tag: "button", attrs: { "data-ficha": "28000006" } };
  screen.children = [row];
  wire(row, doc);
  wire(fichaSheet, doc);
  roots.push(screen.children.length ? fichaSheet : fichaSheet);
  state.ficha = { id: "28000006" };
  state.focusReturn = '[data-ficha="28000006"]';
  where.name = "detalle";
  settle();
  assert.equal(doc.active, fichaTitle);
  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(state.ficha, null);
  roots.pop();
  settle();
  assert.equal(doc.active, row);

  where.name = "importar";
  location.hash = "#/importar";
  state.ficha = null;
  state.importUi = { phase: "entry", fromBatch: false, needsFocus: false };
  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(location.hash, "#/roster");
  assert.equal(onEsc({ key: "Tab" }), false);
});

function miniMatches(node, sel) {
  if (sel.startsWith("#")) return node.id === sel.slice(1);
  if (sel.startsWith(".")) return (node.className || "").split(/\s+/).includes(sel.slice(1));
  const eq = sel.match(/^\[([^\]=]+)="([^"]*)"\]$/);
  if (eq) return (node.attrs || {})[eq[1]] === eq[2];
  const has = sel.match(/^\[([^\]=]+)\]$/);
  if (has) return Object.prototype.hasOwnProperty.call(node.attrs || {}, has[1]);
  return node.tag === sel;
}

function miniFind(list, sel) {
  for (const node of list) {
    if (miniMatches(node, sel)) return node;
    const nested = miniFind(node.children || [], sel);
    if (nested) return nested;
  }
  return null;
}

function miniFindAll(list, sel) {
  const out = [];
  for (const node of list) {
    if (miniMatches(node, sel)) out.push(node);
    out.push(...miniFindAll(node.children || [], sel));
  }
  return out;
}

function miniQuery(list, sel) {
  const parts = sel.trim().split(/\s+/);
  let nodes = list;
  let hit = null;
  for (const part of parts) {
    hit = miniFind(nodes, part);
    if (!hit) return null;
    nodes = hit.children || [];
  }
  return hit;
}

function miniWire(node, doc, parent) {
  node.children = node.children || [];
  node.attrs = node.attrs || {};
  node.dataset = Object.assign({}, node.dataset || {});
  node.parentElement = parent || null;
  node.tabIndex = 0;
  node.setAttribute = (k, v) => { node.attrs[k] = String(v); };
  node.removeAttribute = (k) => { delete node.attrs[k]; };
  node.focus = () => { doc.active = node; };
  node.contains = (other) => {
    if (!other) return false;
    if (other === node) return true;
    for (const child of node.children || []) {
      if (typeof child.contains === "function" ? child.contains(other) : child === other) return true;
    }
    return false;
  };
  node.querySelector = (sel) => miniQuery(node.children, sel);
  for (const child of node.children) miniWire(child, doc, node);
}

function miniDocument(roots) {
  const doc = {
    active: null,
    get activeElement() { return this.active; },
    querySelector: (sel) => miniQuery(roots, sel),
    querySelectorAll: (sel) => miniFindAll(roots, sel),
  };
  for (const node of roots) miniWire(node, doc, null);
  return doc;
}

test("1.1.4: al cerrar, el foco vuelve a la fila agrupada que abrió el sheet", () => {
  const low = { tag: "button", attrs: { "data-ficha": "4000008" }, dataset: { ficha: "4000008" } };
  const high = { tag: "button", attrs: { "data-ficha": "4000008" }, dataset: { ficha: "4000008" } };
  const screen = { tag: "main", id: "screen", children: [low, high] };
  const h2 = { tag: "h2", id: "ficha-title" };
  const sheet = { tag: "div", className: "sheet", children: [h2] };
  const roots = [screen, sheet];
  const doc = miniDocument(roots);
  const state = {
    ficha: { id: "4000008" },
    alert: null,
    focusReturn: "",
    sheetKey: "",
    sheetFocusMark: null,
    importUi: { needsFocus: false },
  };
  const where = { name: "detalle" };
  const route = () => where;
  const remember = fnFromApp("function rememberOpener(", "rememberOpener", { document: doc, state });
  const settle = fnFromApp("function settleSheetFocus()", "settleSheetFocus", { document: doc, state, route });

  remember(high, '[data-ficha="4000008"]');
  assert.deepEqual(state.focusReturn, { sel: '[data-ficha="4000008"]', idx: 1 });
  settle();
  assert.equal(doc.active, h2);

  state.ficha = null;
  roots.pop();
  settle();
  assert.equal(doc.active, high);

  const navBtn = { tag: "button", attrs: { "data-go": "#/ajustes" } };
  const legalBtn = { tag: "button", attrs: { "data-go": "#/ajustes" } };
  const navbar = { tag: "header", className: "navbar", children: [navBtn] };
  const roster = { tag: "main", id: "screen", children: [legalBtn] };
  const aj = { tag: "h2", id: "aj-title" };
  const ajSheet = { tag: "div", className: "sheet", children: [aj] };
  const roots2 = [navbar, roster, ajSheet];
  const doc2 = miniDocument(roots2);
  const state2 = {
    ficha: null,
    alert: null,
    focusReturn: "",
    sheetKey: "roster",
    sheetFocusMark: null,
    importUi: { needsFocus: false },
  };
  const where2 = { name: "ajustes" };
  const remember2 = fnFromApp("function rememberOpener(", "rememberOpener", { document: doc2, state: state2 });
  const settle2 = fnFromApp("function settleSheetFocus()", "settleSheetFocus", {
    document: doc2, state: state2, route: () => where2,
  });
  remember2(legalBtn, '[data-go="#/ajustes"]');
  assert.equal(state2.focusReturn.idx, 1);
  settle2();
  assert.equal(doc2.active, aj);
  roots2.pop();
  where2.name = "roster";
  settle2();
  assert.equal(doc2.active, legalBtn);

  state2.focusReturn = { sel: '[data-go="#/ajustes"]', idx: 9 };
  state2.sheetKey = "ajustes";
  settle2();
  assert.equal(doc2.active, navBtn);
});

test("1.1.4: un redibujado con el sheet abierto no devuelve el foco al título", () => {
  const h2 = { tag: "h2", id: "aj-title" };
  const stop = { tag: "button", attrs: { "data-dl": "stop" }, dataset: { dl: "stop" } };
  const sheet = { tag: "div", className: "sheet", children: [h2, stop] };
  const navbar = { tag: "header", className: "navbar" };
  const screen = { tag: "main", id: "screen" };
  const tabbar = { tag: "nav", className: "tabbar" };
  const roots = [navbar, screen, tabbar, sheet];
  const doc = miniDocument(roots);
  const state = {
    ficha: null,
    alert: null,
    focusReturn: "",
    sheetKey: "",
    sheetFocusMark: null,
    importUi: { needsFocus: false },
  };
  const where = { name: "ajustes" };
  const route = () => where;
  const cssAttr = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const mark = fnFromApp("function markFocus(", "markFocus", { document: doc });
  const fromMark = fnFromApp("function focusFromMark(", "focusFromMark", { document: doc, cssAttr });
  const remember = fnFromApp("function rememberSheetFocus()", "rememberSheetFocus", {
    document: doc, state, route, markFocus: mark,
  });
  const settle = fnFromApp("function settleSheetFocus()", "settleSheetFocus", {
    document: doc, state, route, focusFromMark: fromMark,
  });

  settle();
  assert.equal(doc.active, h2);

  doc.active = stop;
  remember();
  assert.deepEqual(state.sheetFocusMark, { dl: "stop" });
  const stop2 = { tag: "button", attrs: { "data-dl": "stop" }, dataset: { dl: "stop" } };
  sheet.children = [h2, stop2];
  miniWire(stop2, doc, sheet);
  settle();
  assert.equal(doc.active, stop2);

  settle();
  assert.equal(doc.active, stop2);
});

test("1.1.4: Esc en un subpaso de Importar no descarta el lote", () => {
  const state = { ficha: null, alert: null, importUi: { phase: "confirm", fromBatch: false } };
  const location = { hash: "#/importar" };
  const where = { name: "importar" };
  const route = () => where;
  let backs = 0;
  const goBackImport = () => { backs += 1; };
  const onEsc = fnFromApp("function onSheetEscape(", "onSheetEscape", {
    state, render: () => {}, location, route, goBackImport,
  });

  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(backs, 1);
  assert.equal(location.hash, "#/importar");

  state.importUi = { phase: "single", fromBatch: true };
  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(backs, 2);
  assert.equal(location.hash, "#/importar");

  state.importUi = { phase: "batch", fromBatch: false };
  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(backs, 2);
  assert.equal(location.hash, "#/roster");
});

test("1.1.4: si al elegir archivos no hay tarjeta, el foco va al título", () => {
  const h2 = { tag: "h2", id: "im-title" };
  const sheet = { tag: "div", className: "sheet", children: [h2] };
  const roots = [sheet];
  const doc = miniDocument(roots);
  const state = { importUi: { needsFocus: true } };
  const focusImport = fnFromApp("function focusImportTarget()", "focusImportTarget", { document: doc, state });
  focusImport();
  assert.equal(doc.active, h2);
  assert.equal(state.importUi.needsFocus, false);

  const card = { tag: "div", attrs: { "data-import-focus": "" } };
  sheet.children = [h2, card];
  miniWire(card, doc, sheet);
  state.importUi.needsFocus = true;
  doc.active = null;
  focusImport();
  assert.equal(doc.active, card);
});

test("1.1.4: el título del sheet no muestra anillo al recibir el foco", () => {
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  assert.match(css, /\.sheet__bar h2:focus\s*\{\s*outline:\s*none;\s*\}/);
});

test("1.1.4: Descargar todas y Detener dejan el foco dentro del sheet", () => {
  const h2 = { tag: "h2", id: "aj-title" };
  const start = { tag: "button", attrs: { "data-dl": "start" }, dataset: { dl: "start" } };
  const box = { tag: "div", className: "card offline-dl", children: [start] };
  const sheet = { tag: "div", className: "sheet", children: [h2, box] };
  const roots = [sheet];
  const doc = miniDocument(roots);
  doc.body = { tag: "body" };
  const state = {
    ficha: null,
    alert: null,
    focusReturn: "",
    sheetKey: "ajustes",
    sheetFocusMark: null,
    importUi: { needsFocus: false },
  };
  const route = () => ({ name: "ajustes" });
  const cssAttr = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const mark = fnFromApp("function markFocus(", "markFocus", { document: doc });
  const fromMark = fnFromApp("function focusFromMark(", "focusFromMark", { document: doc, cssAttr });
  const remember = fnFromApp("function rememberSheetFocus()", "rememberSheetFocus", {
    document: doc, state, route, markFocus: mark,
  });
  const settle = fnFromApp("function settleSheetFocus()", "settleSheetFocus", {
    document: doc, state, route, focusFromMark: fromMark,
  });
  const redraw = (next) => {
    remember();
    box.children = [next];
    miniWire(next, doc, box);
    doc.active = doc.body;
    settle();
  };

  doc.active = start;
  const stop = { tag: "button", attrs: { "data-dl": "stop" }, dataset: { dl: "stop" } };
  redraw(stop);
  assert.equal(doc.active, stop);
  assert.equal(sheet.contains(doc.active), true);

  const again = { tag: "button", attrs: { "data-dl": "start" }, dataset: { dl: "start" } };
  redraw(again);
  assert.equal(doc.active, again);
  assert.equal(sheet.contains(doc.active), true);
});

test("1.1.4: Esc en un subpaso de Importar deja el foco dentro del sheet", () => {
  const h2 = { tag: "h2", id: "im-title" };
  const add = { tag: "button", attrs: { "data-act": "add-account" }, dataset: { act: "add-account" } };
  const sheet = { tag: "div", className: "sheet", children: [h2, add] };
  const roots = [sheet];
  const doc = miniDocument(roots);
  doc.body = { tag: "body" };
  doc.active = add;
  const state = {
    ficha: null,
    alert: null,
    focusReturn: "",
    sheetKey: "importar",
    sheetFocusMark: null,
    importUi: { phase: "confirm", fromBatch: true, needsFocus: false, saveError: false, focus: 0 },
  };
  const location = { hash: "#/importar" };
  const route = () => ({ name: "importar" });
  const cssAttr = (value) => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const mark = fnFromApp("function markFocus(", "markFocus", { document: doc });
  const fromMark = fnFromApp("function focusFromMark(", "focusFromMark", { document: doc, cssAttr });
  const remember = fnFromApp("function rememberSheetFocus()", "rememberSheetFocus", {
    document: doc, state, route, markFocus: mark,
  });
  const settle = fnFromApp("function settleSheetFocus()", "settleSheetFocus", {
    document: doc, state, route, focusFromMark: fromMark,
  });
  const render = () => {
    remember();
    sheet.children = [h2];
    doc.active = doc.body;
    settle();
  };
  const goBack = fnFromApp("function goBackImport()", "goBackImport", { state, render });
  const onEsc = fnFromApp("function onSheetEscape(", "onSheetEscape", {
    state, render, location, route, goBackImport: goBack,
  });

  assert.equal(onEsc({ key: "Escape" }), true);
  assert.equal(location.hash, "#/importar");
  assert.equal(state.importUi.phase, "batch");
  assert.equal(sheet.contains(doc.active), true);
  assert.equal(doc.active, h2);
});

const esc115 = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

test("2.1.3: la celda de equipamiento no marca el ID deducido", () => {
  const eqCell = fnFromApp("function eqCell(p)", "eqCell", {
    nameOf: (id) => ({ 9: "Puño de fuego" })[id] || "", thumb: () => "<span></span>", esc: esc115,
  });
  const ded = eqCell({ id: 9, lvl: 12, max: 18, meta: { estado: "id_deducido" } });
  assert.match(ded, /aria-label="Puño de fuego, nivel 12 de 18"/);
  assert.doesNotMatch(ded, /ID deducido|eq__cap--soft/);
  const ok = eqCell({ id: 9, lvl: 12, max: 18, meta: { estado: "ok" } });
  assert.match(ok, /aria-label="Puño de fuego, nivel 12 de 18"/);
  const unk = eqCell({ id: 90000077, lvl: 3, unknown: true, meta: { estado: "sin_identificar" } });
  assert.match(unk, /aria-label="Sin identificar, ID 90000077, nivel 3"/);
});

test("1.1.5: con overMax la celda dice «nivel N, máximo desactualizado»", () => {
  const eqCell = fnFromApp("function eqCell(p)", "eqCell", {
    nameOf: (id) => ({ 9: "Puño de fuego" })[id] || "", thumb: () => "<span></span>", esc: esc115,
  });
  const over = eqCell({ lvl: 22, max: 18, overMax: true });
  assert.match(over, /nivel 22, máximo desactualizado/);
  assert.doesNotMatch(over, /de 18/);
  const ded = eqCell({ id: 9, lvl: 22, max: 18, overMax: true, meta: { estado: "id_deducido" } });
  assert.match(ded, /aria-label="Puño de fuego, nivel 22, máximo desactualizado"/);
  assert.doesNotMatch(ded, /ID deducido/);
  const plain = eqCell({ id: 9, lvl: 7 });
  assert.match(plain, /aria-label="Puño de fuego, nivel 7"/);
  const plainDed = eqCell({ id: 9, lvl: 7, meta: { estado: "id_deducido" } });
  assert.match(plainDed, /aria-label="Puño de fuego, nivel 7"/);
  assert.doesNotMatch(plainDed, /ID deducido/);
});

test("1.1.5: la alerta tiene nombre y descripción, y Cancelar es la acción segura", () => {
  const state = { alert: { title: "¿Borrar todos los datos?", msg: "Se eliminarán…", buttons: [{ label: "Cancelar" }, { label: "Borrar", cls: "is-destructive", act: "wipe" }] } };
  const renderAlert = fnFromApp("function renderAlert()", "renderAlert", { state, esc: esc115 });
  const html = renderAlert();
  assert.match(html, /role="alertdialog" aria-modal="true" aria-labelledby="alert-title" aria-describedby="alert-msg"/);
  assert.match(html, /id="alert-title">¿Borrar todos los datos\?</);
  assert.match(html, /data-alert="0" data-alert-cancel>Cancelar</);
  assert.doesNotMatch(html, /data-alert="1" data-alert-cancel/);
});

test("1.1.5: con una alerta abierta, Esc cancela y Tab no sale de la alerta", () => {
  const doc = { active: null, get activeElement() { return this.active; } };
  const mk = (i) => ({ i, focus() { doc.active = this; } });
  const btns = [mk(0), mk(1)];
  doc.querySelectorAll = (sel) => (sel === ".alert [data-alert]" ? btns : []);
  let renders = 0;
  const state = { alert: { buttons: [{}, {}] } };
  const onAlertKey = fnFromApp("function onAlertKey(ev)", "onAlertKey", { state, document: doc, render: () => { renders += 1; } });
  const ev = (key, shiftKey = false) => ({ key, shiftKey, prevented: false, preventDefault() { this.prevented = true; } });
  doc.active = btns[1];
  let e = ev("Tab");
  assert.equal(onAlertKey(e), true);
  assert.equal(e.prevented, true);
  assert.equal(doc.active, btns[0]);
  assert.equal(onAlertKey(ev("Tab", true)), true);
  assert.equal(doc.active, btns[1]);
  assert.equal(onAlertKey(ev("Escape")), true);
  assert.equal(state.alert, null);
  assert.equal(renders, 1);
  assert.equal(onAlertKey(ev("Escape")), false);
});

test("1.1.5: al abrir la alerta el foco va a Cancelar y al cerrarla vuelve al control que la abrió", () => {
  const doc = { active: null, get activeElement() { return this.active; } };
  const el = (name, extra = {}) => ({ name, attrs: {}, classList: { contains: (c) => (extra.cls || []).includes(c) }, setAttribute(k, v) { this.attrs[k] = v; }, focus() { doc.active = this; }, dataset: extra.dataset || {}, ...extra });
  const restore = el("restore");
  const wipe = el("wipe");
  const sheet = el("sheet", { cls: ["sheet"] });
  const cancel = el("cancel");
  const destr = el("destr");
  let open = true;
  const box = { querySelector: (sel) => (sel === "[data-alert-cancel]" ? cancel : destr), contains: (n) => n === cancel || n === destr };
  const backdrop = el("backdrop", { cls: ["alert-backdrop"] });
  const app = { children: [sheet, backdrop] };
  doc.getElementById = () => app;
  doc.querySelector = (sel) => (sel === ".alert" ? (open ? box : null) : sel === ".sheet h2" ? el("h2") : null);
  doc.querySelectorAll = (sel) => (sel === "[data-restore]" ? [restore] : sel === ".sheet__body button" ? [wipe, restore] : []);
  const state = { alertShown: false, alertReturn: null };
  const settleAlert = fnFromApp("function settleAlert()", "settleAlert", { document: doc, state });
  const rememberAlertOpener = fnFromApp("function rememberAlertOpener(", "rememberAlertOpener", { document: doc, state });
  doc.active = restore;
  rememberAlertOpener(restore, "[data-restore]");
  settleAlert();
  assert.equal(doc.active, cancel);
  assert.equal(sheet.attrs.inert, "");
  assert.equal(backdrop.attrs.inert, undefined);
  doc.active = destr;
  settleAlert();
  assert.equal(doc.active, destr, "un redibujado con la alerta abierta no mueve el foco");
  open = false;
  settleAlert();
  assert.equal(doc.active, restore);
  assert.equal(state.alertShown, false);
});

test("1.1.5: «Descargar todas» actualiza solo la tarjeta y el sheet no se reanima", () => {
  const src = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("async function downloadAll()"), src.indexOf("async function purgeImages()"));
  const loop = body.slice(body.indexOf("if (count % 4 === 0)"), body.indexOf("} catch (err)"));
  assert.match(loop, /patchOfflineDl\(\)/);
  assert.doesNotMatch(loop, /render\(\)/);
  assert.doesNotMatch(src, /offline-dl__status" aria-live/);
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  assert.match(css, /#app\[data-sheet-keep="true"\] \.sheet \{ animation: none; \}/);
});

test("1.1.6: con overMax la celda se marca a la vista con «máx. M» y sin el verde de is-max", () => {
  const eqCell = fnFromApp("function eqCell(p)", "eqCell", {
    nameOf: (id) => ({ 9: "Puño de fuego" })[id] || "", thumb: () => "<span></span>", esc: esc115,
  });
  const over = eqCell({ id: 9, lvl: 22, max: 18, overMax: true, meta: { estado: "ok" } });
  assert.match(over, /class="eq is-over"/);
  assert.doesNotMatch(over, /is-max/);
  assert.match(over, /<span class="eq__cap eq__cap--warn">máx\. 18<\/span>/);
  assert.match(over, /aria-label="Puño de fuego, nivel 22, máximo desactualizado"/);
  const ded = eqCell({ id: 9, lvl: 22, max: 18, overMax: true, meta: { estado: "id_deducido" } });
  assert.match(ded, /eq__cap--warn">máx\. 18<\/span>/);
  assert.doesNotMatch(ded, /ID deducido|eq__cap--soft/);
  const at = eqCell({ id: 9, lvl: 18, max: 18, meta: { estado: "ok" } });
  assert.match(at, /class="eq is-max"/);
  for (const html of [at, eqCell({ id: 9, lvl: 12, max: 18 }), eqCell({ id: 9, lvl: 7 }), eqCell({ id: 90000077, lvl: 3, unknown: true })]) {
    assert.doesNotMatch(html, /is-over|eq__cap--warn|máx\./);
  }
});

test("1.1.6: la marca overMax usa los colores de .chip--warn, no el verde, y llega a 4,5:1", () => {
  const css = readFileSync(new URL("../css/views.css", import.meta.url), "utf8");
  const badge = css.match(/\.eq\.is-over \.eq__lvl \{([^}]*)\}/);
  assert.ok(badge, "falta .eq.is-over .eq__lvl");
  assert.match(badge[1], /background: color-mix\(in srgb, var\(--orange\) 16%, var\(--bg-2\)\)/);
  assert.match(badge[1], /color: var\(--orange-text\)/);
  assert.doesNotMatch(badge[1], /green|red/);
  const cap = css.match(/\.eq__cap--warn \{([^}]*)\}/);
  assert.ok(cap, "falta .eq__cap--warn");
  assert.match(cap[1], /color: var\(--orange-text\)/);
  assert.match(cap[1], /font-style: normal/);
  const tokens = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
  const dark = tokens.slice(tokens.indexOf("prefers-color-scheme: dark"));
  const hex = (src, name) => {
    const m = src.match(new RegExp(`--${name}:\\s*#([0-9A-Fa-f]{6})`));
    return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  };
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, k) => a.map((v, i) => v * k + b[i] * (1 - k));
  for (const src of [tokens, dark]) {
    const bg2 = hex(src, "bg-2");
    const text = hex(src, "orange-text");
    assert.ok(ratio(text, mix(hex(src, "orange"), bg2, 0.16)) >= 4.5, "badge");
    assert.ok(ratio(text, bg2) >= 4.5, "etiqueta");
  }
});

test("1.1.6 (O1): el badge .eq.is-max es opaco, como pide §7b.2, porque pisa la miniatura", () => {
  const css = readFileSync(new URL("../css/views.css", import.meta.url), "utf8");
  const rule = css.match(/\.eq\.is-max \.eq__lvl \{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /background: color-mix\(in srgb, var\(--green\) 16%, var\(--bg-2\)\)/);
  assert.doesNotMatch(rule[1], /--green-soft/);
});

test("2.1.2: la miniatura muestra el PNG entero con contain y sin zoom", () => {
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  const thumb = css.slice(css.indexOf(".thumb {"), css.indexOf(".thumb--40"));
  assert.match(thumb, /padding: calc\(var\(--size\) \* 0\.08\)/);
  assert.match(thumb, /grid-template: 100% \/ 100%/);
  assert.match(thumb, /place-items:\s*center/);
  assert.match(thumb, /object-fit:\s*contain/);
  assert.match(thumb, /object-position:\s*center/);
  assert.match(thumb, /width:\s*auto;\s*height:\s*auto/);
  assert.match(thumb, /max-width:\s*100%/);
  assert.match(thumb, /max-height:\s*100%/);
  assert.equal(thumb.includes("scale(var(--z))"), false);
  assert.equal(thumb.includes("is-fit"), false);
  assert.equal(thumb.includes("--dw"), false);
  assert.equal(thumb.includes("thumb--encuadre"), false);
  assert.equal(THUMB_PAD, 0.08);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("fitOf"), false);
  assert.equal(app.includes("is-fit"), false);
  assert.equal(app.includes("thumb--encuadre"), false);
  assert.equal(app.includes("caja_visible"), false);
});

test("2.0.0: la migración 1.x trae alias y Principal y no resucita una cuenta borrada", () => {
  const exportTags = ["#28PLGP0G2", "#SOLOIDB01"];
  const added = [
    { tag: "#28PLGP0G2", alias: "Casa", añadida: true, chip: "C1" },
    { tag: "#NUEVA0001", alias: "Taller", añadida: 1700000000000, chip: "001" },
  ];
  const before = exportTags.slice();
  const first = migrateRoster({ stored: null, added, exportTags, seeded: "1" });
  assert.deepEqual(exportTags, before);
  assert.equal(first.version, ROSTER_VERSION);
  assert.equal(first.accounts.length, ROSTER.length + 2);
  const c1 = first.accounts.find((a) => a.tag === "#28PLGP0G2");
  assert.equal(c1.principal, true);
  assert.equal(c1.alias, "Casa");
  assert.equal(first.accounts.filter((a) => a.principal).length, 1);
  assert.equal(first.accounts.find((a) => a.tag === "#NUEVA0001").alias, "Taller");
  assert.equal(first.accounts.find((a) => a.tag === "#SOLOIDB01").alias, "#SOLOIDB01");
  const kept = removeAccount(first.accounts, "#R02YUVC0J");
  const stored = { version: ROSTER_VERSION, accounts: kept };
  const again = migrateRoster({ stored, added, exportTags: exportTags.concat("#R02YUVC0J"), seeded: "1" });
  assert.equal(again.accounts.some((a) => a.tag === "#R02YUVC0J"), false);
  assert.equal(again.accounts.length, kept.length);
  assert.deepEqual(migrateRoster({ stored: again, added, exportTags, seeded: "1" }), again);
});

test("2.0.0: alta, alias, Principal y borrado no duplican tags", () => {
  let accounts = [];
  accounts = addAccount(accounts, { tag: "#AAA111", alias: "Uno" });
  accounts = addAccount(accounts, { tag: "#AAA111", alias: "Otro" });
  accounts = addAccount(accounts, { tag: "sin-almohadilla", alias: "No" });
  assert.equal(accounts.length, 1);
  accounts = renameAccount(accounts, "#AAA111", "  Dos  ");
  assert.equal(accounts[0].alias, "Dos");
  accounts = renameAccount(accounts, "#AAA111", "   ");
  assert.equal(accounts[0].alias, "#AAA111");
  accounts = setPrincipal(accounts, "#AAA111", true);
  assert.equal(accounts[0].principal, true);
  accounts = addAccount(accounts, { tag: "#BBB222", alias: "Beta", principal: true });
  assert.equal(accounts.filter((a) => a.principal).length, 2);
  accounts = removeAccount(accounts, "#AAA111");
  assert.deepEqual(accounts.map((a) => a.tag), ["#BBB222"]);
});

test("2.0.0: sin Principal, la destacada es el TH más alto y el empate lo rompe el alias", () => {
  const accounts = [
    { tag: "#A", alias: "Zeta", principal: false },
    { tag: "#C", alias: "Beta", principal: false },
    { tag: "#B", alias: "Alfa", principal: false },
  ];
  const views = { "#A": { th: 11, media: 10 }, "#B": { th: 16, media: 40 }, "#C": { th: 16, media: 90 } };
  assert.equal(featuredTag(accounts, views), "#B");
  assert.deepEqual(orderAccounts(accounts, views, "th").map((a) => a.tag), ["#B", "#C", "#A"]);
  assert.deepEqual(orderAccounts(accounts, views, "nombre").map((a) => a.tag), ["#B", "#C", "#A"]);
  assert.deepEqual(orderAccounts(accounts, views, "pct").map((a) => a.tag), ["#C", "#B", "#A"]);
  accounts[0].principal = true;
  assert.equal(featuredTag(accounts, views), null);
  assert.equal(featuredTag([], views), null);
});

test("2.0.0: los contadores de los chips son las mismas filas que pinta el filtro", () => {
  for (const tag of ["#28PLGP0G2", "#GVPU80R80"]) {
    const exp = exportsByTag.get(tag);
    const view = analyze(exp, index);
    const rows = progressRows(exp, index);
    assert.ok(rows.some((r) => r.categoryKey === "muros" && r.cnt > 0), tag);
    const unlocked = VILLAGE_KEYS.map((key) => view.cats[key].pct).filter((v) => v != null);
    assert.equal(view.media, averagePct(unlocked), tag);
    if (view.th < 14) assert.equal(view.cats.mascotas.pct, null, tag);
    for (const status of ["todos", "pendientes", "maximo"]) {
      for (const query of ["", "muro", "cañón"]) {
        const opts = { status, query, index };
        const counts = chipCounts(rows, opts);
        assert.equal(counts.todas, applyFilter(rows, { ...opts, category: "todas" }).length, `${tag} ${status} ${query}`);
        let sum = 0;
        for (const cat of CATEGORIES) {
          const n = applyFilter(rows, { ...opts, category: cat.key }).length;
          assert.equal(counts[cat.key], n, `${tag} ${cat.key}`);
          sum += n;
        }
        assert.equal(counts.todas, sum);
      }
    }
  }
  assert.equal(isAtMax({ lvl: 22, max: 18, overMax: true }), true);
  assert.equal(isAtMax({ lvl: 17, max: 18 }), false);
  assert.equal(isAtMax({ lvl: 3, max: null }), false);
});

test("2.0.0: importar varias mezcla nuevas, antiguas, duplicadas e inválidas y N es de tags", () => {
  const c1 = exportsByTag.get("#28PLGP0G2");
  const c2 = exportsByTag.get("#R00C8CPQC");
  const rows = [...exportsByTag.values()];
  const ready = structuredClone(c1);
  ready.timestamp = c1.timestamp + 50;
  const older = structuredClone(c2);
  older.timestamp = c2.timestamp - 80;
  const neu = structuredClone(c2);
  neu.tag = "#QL0Y2P8CU";
  neu.timestamp = c2.timestamp + 9;
  const neuAgain = structuredClone(neu);
  neuAgain.timestamp = neu.timestamp + 3;
  const dup = structuredClone(c1);
  const entries = [
    { name: "lista.json", text: JSON.stringify(ready), source: "file" },
    { name: "vieja.json", text: JSON.stringify(older), source: "file" },
    { name: "nueva.json", text: JSON.stringify(neu), source: "file" },
    { name: "nueva-2.json", text: JSON.stringify(neuAgain), source: "file" },
    { name: "dup.json", text: JSON.stringify(dup), source: "file" },
    { name: "rota.json", text: "{", source: "file" },
  ];
  const items = classifyEntries(entries, importCtx(rows));
  assert.deepEqual(items.map((it) => it.kind), ["ready", "older", "new", "new", "duplicate", "invalid"]);
  const plan = planBatch(items);
  assert.equal(plan.count, 3);
  assert.deepEqual(plan.tags.sort(), ["#28PLGP0G2", "#QL0Y2P8CU", "#R00C8CPQC"].sort());
  assert.equal(plan.save.length, 4);
  assert.equal(plan.errors.length, 1);
  assert.equal(plan.duplicates.length, 1);
  assert.equal(plan.save.some((it) => it.kind === "invalid" || it.kind === "duplicate"), false);
});

test("2.0.0: la copia fusiona por tag y fecha y no borra lo que solo está en el iPhone", () => {
  const noon = Date.parse("2026-10-08T10:00:00Z");
  const late = Date.parse("2026-10-08T22:30:00Z");
  assert.equal(backupFilename(noon), "clash-progreso-copia-2026-10-08.json");
  assert.equal(backupFilename(late), "clash-progreso-copia-2026-10-09.json");
  const localAccounts = [
    { tag: "#A", alias: "Mia", principal: false, addedAt: 5, chip: "A", objetivo: 18 },
    { tag: "#C", alias: "Solo local", principal: true, addedAt: 1, chip: "C", objetivo: null },
  ];
  const localExports = [
    { tag: "#A", timestamp: 10, buildings: [{ data: 1000001, lvl: 16 }] },
    { tag: "#C", timestamp: 3, buildings: [{ data: 1000001, lvl: 11 }] },
  ];
  const file = buildBackup({
    accounts: [
      { tag: "#A", alias: "Otra", principal: true, addedAt: 1, chip: "X", objetivo: null },
      { tag: "#B", alias: "Forastera", principal: false, addedAt: 2, chip: "B", objetivo: null },
    ],
    exports: [
      { tag: "#A", timestamp: 10, buildings: [{ data: 1000001, lvl: 15 }] },
      { tag: "#A", timestamp: 11, buildings: [{ data: 1000001, lvl: 16 }] },
      { tag: "#B", timestamp: 4, buildings: [{ data: 1000001, lvl: 12 }] },
    ],
    now: noon,
  });
  assert.equal(file.app, "clash-progreso");
  assert.equal(file.version, "3.0.0");
  const merged = mergeBackup({ accounts: localAccounts, exports: localExports }, file);
  const a = merged.accounts.find((x) => x.tag === "#A");
  assert.equal(a.alias, "Mia");
  assert.equal(a.principal, true);
  assert.equal(a.objetivo, 18);
  const c = merged.accounts.find((x) => x.tag === "#C");
  assert.equal(c.alias, "Solo local");
  assert.equal(c.principal, true);
  assert.equal(merged.accounts.find((x) => x.tag === "#B").alias, "Forastera");
  const keys = merged.exports.map((e) => e.tag + "@" + e.timestamp).sort();
  assert.deepEqual(keys, ["#A@10", "#A@11", "#B@4", "#C@3"]);
  assert.equal(merged.exports.find((e) => e.tag === "#A" && e.timestamp === 10).buildings[0].lvl, 16);
  assert.equal(merged.addedExports, 2);
  const round = mergeBackup({ accounts: [], exports: [] }, buildBackup({ accounts: merged.accounts, exports: merged.exports, now: noon }));
  assert.equal(round.accounts.length, merged.accounts.length);
  assert.equal(round.exports.length, merged.exports.length);
  const again = mergeBackup(round, file);
  assert.equal(again.exports.length, round.exports.length);
  assert.equal(again.addedExports, 0);
  const filled = mergeBackup(
    { accounts: [{ tag: "#B", alias: "#B", principal: false, chip: "", objetivo: null }], exports: [] },
    { accounts: [{ tag: "#B", alias: "Puesta", principal: true }], exports: [] },
  );
  assert.equal(filled.accounts[0].alias, "Puesta");
  assert.equal(filled.accounts[0].principal, true);
  assert.equal(isShareCancel({ name: "AbortError" }), true);
  assert.equal(isShareCancel({ name: "NotAllowedError" }), false);
  assert.equal(isShareCancel(null), false);
});

test("2.0.0: el selector de cuentas de la maqueta no entra en la app", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(app.includes("Solo maqueta"), false);
  assert.equal(app.includes("número de cuentas"), false);
  assert.equal(html.includes("Solo maqueta"), false);
});

test("2.0.0: el título de categoría lleva la píldora junto al nombre y el % en su línea", () => {
  const catHead = fnFromApp("function catHead(", "catHead", { esc: esc115 });
  const html = catHead("Defensas", 45, "66,9 %");
  assert.match(html, /<h2 class="cat-head__title"><span class="cat-head__name">Defensas<\/span><span class="chip num">45<\/span><\/h2>/);
  assert.match(html, /<p class="cat-head__pct num">66,9 %<\/p>/);
  assert.equal(html.includes("·"), false);
  const css = readFileSync(new URL("../css/views.css", import.meta.url), "utf8");
  assert.match(css, /\.cat-head__title \{[^}]*flex-wrap: nowrap/);
  assert.match(css, /\.cat-head__pct \{[^}]*display: block/);
});

test("2.0.0: el toast de la copia queda encima de la tab bar y no recibe toques", () => {
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  const rule = css.match(/\.toast \{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /pointer-events: none/);
  assert.match(rule[1], /bottom: calc\(var\(--tabbar-h\) \+ env\(safe-area-inset-bottom\) \+ 8px\)/);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const body = app.slice(app.indexOf("async function exportBackup()"), app.indexOf("async function restoreBackupText("));
  const cancel = body.slice(body.indexOf("catch (err)"), body.indexOf("const url"));
  assert.match(cancel, /isShareCancel\(err\)\) return/);
  assert.equal(cancel.includes("Copia guardada"), false);
  assert.match(body, /Copia guardada/);
});

test("2.0.0: C1 muestra 5 chozas, 6 mejoras de constructor y 1 de B.O.B por separado", () => {
  const exp = exportsByTag.get("#28PLGP0G2");
  const status = builderStatus(exp);
  const bob = upgradesOf(exp).filter((u) => u.extra && u.queue === "constructor").length;
  assert.equal(status.chozas, 5);
  assert.equal(status.total, 6);
  assert.equal(status.occupied, 6);
  assert.equal(status.over, false);
  assert.equal(bob, 1);
  const builderCaption = fnFromApp("function builderCaption(", "builderCaption", {});
  const builderHead = fnFromApp("function builderHead(", "builderHead", { builderCaption });
  const cap = builderCaption(status, bob);
  assert.deepEqual(cap, { chozas: 5, occupied: 6, over: false, bob: 1 });
  const html = builderHead(status, bob);
  assert.match(html, /5 chozas/);
  assert.match(html, /6 mejoras de constructor/);
  assert.doesNotMatch(html, /Revisar constructores/);
  assert.match(html, /1 de B\.O\.B/);
  assert.doesNotMatch(html, /5 \+ 1|1 extra|\(5/);
});

test("2.1.0: la imagen es la del nivel y, si no hay, el PNG del edificio sin marca", () => {
  const exp = exportsByTag.get("#28PLGP0G2");
  let withLevel = 0;
  let plain = 0;
  for (const b of exp.buildings) {
    const item = manifest.items[String(b.data)];
    if (!item || item.estado === "sin_identificar") continue;
    const choice = imageChoice(item, b.lvl);
    const por = item.imagenes_por_nivel && item.imagenes_por_nivel[String(b.lvl)];
    if (por) {
      assert.equal(choice.im.ruta, por.ruta, item.id + " nv " + b.lvl);
      withLevel += 1;
      if (por.es_inferior) assert.equal(choice.marca, por.marca);
      else assert.equal(choice.marca, null);
      if (item.imagen && item.imagen.ruta !== por.ruta) assert.equal(choice.fallback.ruta, item.imagen.ruta);
      else assert.equal(choice.fallback, null);
    } else if (item.imagen) {
      assert.equal(choice.im.ruta, item.imagen.ruta, item.id);
      assert.equal(choice.marca, null);
      assert.equal(choice.fallback, null);
      plain += 1;
    }
  }
  assert.ok(withLevel > 20, String(withLevel));
  assert.ok(plain > 0, String(plain));
  const th = exp.buildings.find((b) => b.data === 1000001);
  const hall = imageChoice(manifest.items["1000001"], th.lvl);
  assert.equal(hall.im.ruta, manifest.items["1000001"].imagenes_por_nivel[String(th.lvl)].ruta);
  assert.equal(hall.marca, null);
});

test("2.1.4: cada nivel de estructura tiene imagen propia o la del nivel más cercano", () => {
  let borrowed = 0;
  for (const item of Object.values(manifest.items)) {
    for (const [lvl, im] of Object.entries(item.imagenes_por_nivel || {})) {
      if (!/^\d+$/.test(lvl)) {
        assert.equal(im.es_inferior, false, item.id + " " + lvl);
        assert.equal(im.marca, null, item.id + " " + lvl);
        assert.equal(im.official, false, item.id + " " + lvl);
        continue;
      }
      if (!im.es_inferior) {
        assert.equal(im.marca, null, item.id + " " + lvl);
        assert.equal(im.nivel_mostrado, Number(lvl), item.id + " " + lvl);
        assert.equal(imageChoice(item, lvl).marca, null);
        continue;
      }
      borrowed += 1;
      const text = `Imagen del nivel ${im.nivel_mostrado} (no hay oficial del ${lvl})`;
      assert.equal(im.marca, text, item.id + " " + lvl);
      assert.equal(imageChoice(item, lvl).marca, text);
      assert.equal(imageChoice(item, lvl).im.ruta, im.ruta);
      const own = item.imagenes_por_nivel[String(im.nivel_mostrado)];
      assert.ok(own && own.es_inferior === false, item.id + " muestra " + im.nivel_mostrado);
      assert.equal(own.ruta, im.ruta, item.id + " " + lvl);
    }
  }
  assert.equal(borrowed, 4);
  assert.equal(manifest.items["1000021"].imagenes_por_nivel["12"].marca, null);
  assert.equal(manifest.items["1000021"].imagenes_por_nivel["12"].es_inferior, false);
  assert.equal(manifest.items["1000021"].imagenes_por_nivel["12"].ruta, "images/levels/x-bow_12.png");
  assert.equal(manifest.items["1000021"].imagenes_por_nivel["11"].es_inferior, false);
  assert.equal(manifest.items["1000020"].imagenes_por_nivel["8"].marca, null);
  assert.equal(manifest.items["1000020"].imagenes_por_nivel["8"].es_inferior, false);
  assert.equal(manifest.items["1000020"].imagenes_por_nivel["8"].official, false);
  assert.equal(manifest.items["1000020"].imagenes_por_nivel["8"].ruta, "images/levels/spell-factory_8.png");
  assert.equal(manifest.items["1000067"].imagenes_por_nivel["6"].marca, null);
  assert.equal(manifest.items["1000067"].imagenes_por_nivel["6"].ruta, "images/levels/scattershot_6.png");
  assert.equal(manifest.items["1000077"].imagenes_por_nivel["5"].marca, null);
  assert.equal(manifest.items["1000077"].imagenes_por_nivel["5"].official, false);
  assert.equal(manifest.items["1000077"].imagenes_por_nivel["5"].ruta, "images/levels/monolith_5.png");
  assert.equal(manifest.items["1000001"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["1000001"].imagenes_por_nivel["1"].nivel_mostrado, 1);
  assert.equal(manifest.items["1000001"].imagenes_por_nivel["18"].es_inferior, false);
  assert.equal(manifest.items["1000010"].imagenes_por_nivel["19"].es_inferior, false);
  assert.equal(manifest.items["1000010"].imagenes_por_nivel["19"].nivel_mostrado, 19);
  assert.equal(manifest.items["1000008"].imagenes_por_nivel["21"].es_inferior, false);
  assert.equal(manifest.items["1000015"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["1000015"].imagenes_por_nivel["1"].nivel_mostrado, 1);
  assert.equal(manifest.items["1000000"].imagenes_por_nivel["1"].marca, null);
  assert.equal(manifest.items["1000000"].imagenes_por_nivel["1"].ruta, "images/levels/army-camp_1.png");
  {
    const item = manifest.items["1000079"];
    assert.equal(item.estado, "faltante");
    assert.equal(item.imagen.official, false);
    assert.equal(item.imagen.ruta, "images/levels/multi-gear-tower_1_long-range.png");
    assert.equal(item.imagenes_por_nivel["1"].es_inferior, false);
    assert.equal(item.imagenes_por_nivel["2"].ruta, "images/levels/multi-gear-tower_2_long-range.png");
    assert.equal(item.imagenes_por_nivel["2"].marca, null);
    assert.equal(item.imagenes_por_nivel["1-fast-attack"].ruta, "images/levels/multi-gear-tower_1_fast-attack.png");
    assert.equal(item.imagenes_por_nivel["2-fast-attack"].official, false);
  }
  {
    const wiz = manifest.items["1000102"];
    assert.equal(wiz.estado, "ok");
    assert.equal(wiz.imagen.ruta, "images/levels/super-wizard-tower_1.png");
    assert.equal(wiz.imagenes_por_nivel["1"].es_inferior, false);
    assert.equal(wiz.imagenes_por_nivel["2"].ruta, "images/levels/super-wizard-tower_2.png");
    assert.equal(wiz.imagenes_por_nivel["2"].marca, null);
  }
  assert.equal(manifest.items["1000086"].imagenes_por_nivel["2"].es_inferior, false);
  assert.equal(manifest.items["1000086"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["1000086"].imagenes_por_nivel["1"].nivel_mostrado, 1);
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["2"].marca, null);
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["2"].ruta, "images/levels/giga-bomb_2.png");
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["3"].ruta, "images/levels/giga-bomb_3.png");
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["4"].es_inferior, false);
  assert.equal(manifest.items["12000020"].imagenes_por_nivel["4"].nivel_mostrado, 4);
  assert.equal(manifest.items["1000070"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["1000070"].imagenes_por_nivel["1"].marca, null);
  assert.equal(manifest.items["1000070"].imagenes_por_nivel["4"].es_inferior, false);
  assert.equal(manifest.items["12000000"].imagenes_por_nivel["8"].es_inferior, false);
  assert.equal(manifest.items["12000002"].imagenes_por_nivel["2"].es_inferior, false);
  assert.equal(manifest.items["12000002"].imagenes_por_nivel["8"].es_inferior, false);
  assert.equal(manifest.items["12000006"].imagenes_por_nivel["4"].es_inferior, false);
  assert.equal(manifest.items["12000008"].imagenes_por_nivel["3"].es_inferior, false);
  assert.equal(manifest.items["107000001"].imagenes_por_nivel["1"].es_inferior, false);
  assert.equal(manifest.items["107000001"].imagenes_por_nivel["3"].marca, null);
  assert.equal(manifest.items["107000001"].imagenes_por_nivel["3"].ruta, "images/guardians/smasher_3.png");
  assert.equal(manifest.items["107000001"].imagenes_por_nivel["5"].marca, "Imagen del nivel 1 (no hay oficial del 5)");
  assert.equal(manifest.items["107000000"].imagenes_por_nivel, undefined);
  assert.equal(manifest.items["102000033"].nombre, "Vela incandescente (Hitpoints)");
  assert.equal(manifest.items["102000041"].nombre, "Catapulta explosiva (Explosion Damage)");
  assert.equal(manifest.items["90000060"].nombre, "Mazo de la venganza");
  assert.equal(manifest.items["90000061"].nombre, "Portal portátil");
  assert.equal(manifest.items["90000061"].estado, "faltante");
  assert.equal(manifest.items["90000061"].imagen.ruta, "images/levels/portal-pendant.png");
  assert.equal(manifest.items["90000061"].imagen.official, false);
  assert.equal(manifest.items["93000003"].nombre, "Picador");
  assert.equal(manifest.items["93000003"].estado, "ok");
});

test("3.1.7: imágenes no oficiales solo donde no hay oficial", () => {
  assert.equal(manifest.unofficial_images.length, 73);
  assert.equal(manifest.unofficial_images.every((row) => row.official === false), true);
  assert.equal(manifest.unofficial_images.filter((row) => row.publicado).length, 29);
  assert.equal(manifest.unofficial_images.filter((row) => row.village === "builderBase" && row.publicado).length, 0);
  for (const row of manifest.unofficial_images) {
    assert.equal(typeof row.source_url, "string");
    assert.equal(typeof row.license_note, "string");
    assert.equal(typeof row.sha256, "string");
    if (row.publicado) {
      assert.equal(row.ruta.startsWith("images/"), true, row.file);
      assert.equal(row.ruta.includes("builder-base"), false, row.file);
      assert.equal(existsSync(join(root, "assets", row.ruta)), true, row.ruta);
      assert.equal(typeof row.sha256_copia, "string");
    } else {
      assert.equal(row.ruta, null, row.file);
    }
  }
  const air = manifest.items["12000005"].imagenes_por_nivel;
  assert.equal(air["12"].ruta, "images/levels/air-bomb_11.png");
  assert.equal(air["12"].official, true);
  assert.equal(air["12"].es_inferior, true);
  assert.equal(air["12"].nivel_mostrado, 11);
  assert.equal(air["13"].official, false);
  assert.equal(air["13"].es_inferior, false);
  assert.equal(air["13"].ruta, "images/levels/air-bomb_13.png");
  assert.equal(existsSync(join(root, "assets/images/levels/air-bomb_12.png")), false);
  const bomb = manifest.items["12000000"].imagenes_por_nivel["12"];
  assert.equal(bomb.ruta, "images/traps/bomb.png");
  assert.equal(bomb.official, true);
  assert.equal(bomb.es_inferior, true);
  assert.equal(existsSync(join(root, "assets/images/levels/bomb_12.png")), false);
  const smith = manifest.items["1000070"].imagenes_por_nivel["10"];
  assert.equal(smith.ruta, "images/buildings/blacksmith.png");
  assert.equal(smith.official, true);
  assert.equal(smith.nivel_mostrado, 9);
  const seek = manifest.items["12000006"].imagenes_por_nivel;
  assert.equal(seek["7"].official, false);
  assert.equal(seek["7"].low_res, true);
  assert.equal(seek["7"].es_inferior, false);
  assert.equal(seek["8"].ruta, seek["7"].ruta);
  assert.equal(seek["8"].es_inferior, false);
  assert.equal(seek["8"].nivel_mostrado, 8);
  for (const lvl of ["6", "7", "8", "9", "10", "11", "12", "13"]) {
    const im = manifest.items["12000001"].imagenes_por_nivel[lvl];
    assert.equal(im.official, false, lvl);
    assert.equal(im.es_inferior, false, lvl);
    assert.equal(im.low_res, true, lvl);
    assert.equal(im.precarga, false, lvl);
  }
  assert.equal(manifest.items["1000097"].estado, "faltante");
  assert.equal(manifest.items["1000097"].nombre, "Defensa artesanal");
  const station = manifest.unofficial_images.find((row) => row.file === "unofficial/crafting-station_all.png");
  assert.equal(station.name_es, "Defensa artesanal");
  assert.equal(station.ruta, "images/levels/crafting-station.png");
  assert.equal(JSON.stringify(manifest).includes("Puesto de artesanía"), false);
  assert.equal(JSON.stringify(manifest).includes("Taller de fabricación"), false);
  assert.equal(manifest.items["1000097"].imagen.official, false);
  assert.equal(manifest.items["1000097"].imagen.ruta, "images/levels/crafting-station.png");
  assert.ok(manifest.items["1000097"].imagen.bytes < 3000000);
  assert.equal(manifest.items["102000033"].imagen.ruta, "images/crafting/hot-candle-1.png");
  assert.equal(manifest.items["102000036"].imagen.ruta, "images/crafting/hero-hunter-1.png");
  assert.equal(manifest.items["102000039"].imagen.ruta, "images/crafting/cake-a-pult-1.png");
  assert.equal(manifest.items["103000011"].imagen.ruta, "images/crafting/hot-candle-1.png");
  assert.match(manifest.unofficial_notes.builder_base, /base del constructor/);
  assert.match(manifest.unofficial_notes.crafting_modules, /oficial/);
  const urls = precacheUrls(manifest);
  assert.equal(urls.length, 220);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const copia = app.slice(app.indexOf("function renderCopia("), app.indexOf("function lastImportLabel("));
  assert.match(copia, /Arte © Supercell bajo la Fan Content Policy/);
  assert.match(copia, /imágenes no oficiales: ClashKing y Fandom \(autores en el manifiesto\)/);
  assert.match(app, /Imagen no oficial/);
  assert.match(app, /Ataque rápido/);
  assert.match(app, /Largo alcance/);
  const gear = imageChoice(manifest.items["1000079"], 2);
  assert.equal(gear.im.ruta, "images/levels/multi-gear-tower_2_long-range.png");
  assert.equal(gear.im.official, false);
  assert.equal(gear.marca, null);
});

test("2.1.0: sin entrada de nivel se usa el PNG base; Tiradora no tiene niveles publicados", () => {
  const hut = manifest.items["1000015"];
  const choice = imageChoice(hut, 1);
  assert.equal(choice.im.ruta, "images/levels/builder-s-hut_1.png");
  assert.equal(choice.marca, null);
  assert.equal(choice.fallback.ruta, hut.imagen.ruta);
  const camp = manifest.items["1000000"];
  const propio = imageChoice(camp, 1);
  assert.equal(propio.im.ruta, "images/levels/army-camp_1.png");
  assert.equal(propio.marca, null);
  assert.equal(propio.fallback.ruta, "images/buildings/army-camp.png");
  const sample = {
    imagen: { ruta: "images/defenses/cannon.png", bytes: 10, pesado: false },
    imagenes_por_nivel: {
      7: { ruta: "images/defenses/cannon-7.png", es_inferior: false, marca: null, precarga: true },
    },
  };
  const hit = imageChoice(sample, 7);
  assert.equal(hit.im.ruta, "images/defenses/cannon-7.png");
  assert.equal(hit.fallback.ruta, "images/defenses/cannon.png");
  assert.equal(hit.marca, null);
  const miss = imageChoice(sample, 3);
  assert.equal(miss.im.ruta, "images/defenses/cannon.png");
  assert.equal(miss.fallback, null);
  assert.equal(miss.marca, null);
  for (const id of ["107000000"]) {
    const item = manifest.items[id];
    assert.equal(item.imagenes_por_nivel, undefined, id);
    assert.equal(item.imagen.precarga, false, id);
    assert.equal(isHeavy(item.imagen, item), false, id);
    const g = imageChoice(item, 1);
    assert.equal(g.im.ruta, item.imagen.ruta);
    assert.equal(g.marca, null);
    assert.equal(precacheUrls({ items: { [id]: item } }).includes("./assets/" + item.imagen.ruta), false);
  }
});

test("2.1.2: ninguna miniatura recorta ni escala por encima del tamaño natural", () => {
  const sizes = [22, 28, 40, 44, 52, 72, 96];
  let shrunk = 0;
  for (const item of Object.values(manifest.items)) {
    const images = [item.imagen, ...Object.values(item.imagenes_por_nivel || {})].filter(Boolean);
    for (const im of images) {
      for (const size of sizes) {
        const fit = containOf(im, size);
        assert.ok(fit, im.ruta + " " + size);
        const lado = thumbInterior(size, im.tipo_visual === "tile_fondo_opaco");
        assert.equal(fit.escala, Math.min(1, lado / im.ancho, lado / im.alto));
        assert.ok(fit.escala <= 1 + 1e-12, im.ruta);
        assert.ok(fit.dw <= im.ancho + 1e-9 && fit.dh <= im.alto + 1e-9, im.ruta);
        assert.ok(fit.dw <= lado + 1e-9 && fit.dh <= lado + 1e-9, im.ruta);
        assert.equal(fit.dw, im.ancho * fit.escala);
        assert.equal(fit.dh, im.alto * fit.escala);
        assert.ok(Math.abs(fit.dw / im.ancho - fit.dh / im.alto) < 1e-12, im.ruta);
        const cropped = containOf({ ...im, caja_visible: { x: 1, y: 1, w: 2, h: 2 } }, size);
        assert.deepEqual(cropped, fit, im.ruta);
        if (fit.escala < 1) shrunk += 1;
      }
    }
  }
  assert.ok(shrunk > 0);
  const wall = containOf({ ancho: 80, alto: 90, caja_visible: { x: 2, y: 8, w: 75, h: 71 } }, 40);
  const lado = 40 * (1 - 2 * THUMB_PAD);
  assert.equal(wall.escala, lado / 90);
  assert.ok(wall.escala < 1);
  assert.ok(wall.dw < 80 && wall.dh <= lado + 1e-9);
  assert.ok(Math.abs(wall.dw / 80 - wall.dh / 90) < 1e-12);
  const tiny = containOf({ ancho: 20, alto: 18 }, 96);
  assert.equal(tiny.escala, 1);
  assert.equal(tiny.dw, 20);
  assert.equal(tiny.dh, 18);
});

test("2.1.4: el dibujo ocupa el 85 % del lado, con tope 1,5× y sin object-view-box", () => {
  const css = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(css.includes("object-view-box"), false);
  assert.match(css, /\.thumb\.is-ajuste > img \{[^}]*position:\s*absolute/);
  assert.match(css, /left:\s*calc\(var\(--x\)/);
  assert.match(css, /top:\s*calc\(var\(--y\)/);
  assert.match(app, /--dw:/);
  assert.equal(app.includes("--vw:"), false);
  assert.equal(app.includes("object-view-box"), false);
  const tesla = manifest.items["1000019"].imagenes_por_nivel["10"];
  const caja = cajaAlfa(tesla);
  assert.deepEqual(caja, { x: 108, y: 90, w: 74, h: 111 });
  const aj = ajusteOf(tesla, 40);
  const largo = Math.max(caja.w, caja.h);
  const escala = Math.min((DRAW_TARGET * 40) / largo, UPSCALE_MAX / DEVICE_SCALE);
  assert.equal(aj.escala, escala);
  assert.ok(aj.escala <= UPSCALE_MAX / DEVICE_SCALE + 1e-12);
  assert.ok(largo * aj.escala <= DRAW_TARGET * 40 + 1e-6);
  assert.ok(tesla.ancho * aj.escala * DEVICE_SCALE <= tesla.ancho * UPSCALE_MAX + 1e-6);
  assert.ok(Math.abs(aj.dw / tesla.ancho - aj.dh / tesla.alto) < 1e-12);
  assert.ok(Math.abs(aj.left + (caja.x + caja.w / 2) * aj.escala - 20) < 1e-9);
  assert.ok(Math.abs(aj.top + (caja.y + caja.h / 2) * aj.escala - 20) < 1e-9);
  assert.ok(ajusteOf(manifest.items["107000001"].imagen, 40), "Destructor también se encuadra");
  assert.ok(ajusteOf(manifest.items["1000089"].imagen, 40), "Escupellamas también se encuadra");
  const sizes = [22, 28, 40, 44, 52, 72, 96];
  let seen = 0;
  for (const item of Object.values(manifest.items)) {
    const images = [item.imagen, ...Object.values(item.imagenes_por_nivel || {})].filter(Boolean);
    for (const im of images) {
      const box = cajaAlfa(im);
      assert.ok(box, im.ruta);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= im.ancho && box.y + box.h <= im.alto, im.ruta);
      for (const size of sizes) {
        const fit = ajusteOf(im, size);
        assert.ok(fit, im.ruta + " " + size);
        seen += 1;
        assert.ok(fit.escala <= UPSCALE_MAX / DEVICE_SCALE + 1e-12, im.ruta);
        assert.ok(im.ancho * fit.escala * DEVICE_SCALE <= im.ancho * UPSCALE_MAX + 1e-6, im.ruta);
        assert.ok(im.alto * fit.escala * DEVICE_SCALE <= im.alto * UPSCALE_MAX + 1e-6, im.ruta);
        assert.ok(Math.abs(fit.dw / im.ancho - fit.dh / im.alto) < 1e-12, im.ruta);
        const dibujo = Math.max(box.w, box.h) * fit.escala;
        const objetivo = Math.min(DRAW_TARGET * size, Math.max(box.w, box.h) * (UPSCALE_MAX / DEVICE_SCALE));
        assert.ok(Math.abs(dibujo - objetivo) < 1e-6, im.ruta + " " + size);
        assert.ok(Math.abs(fit.left + (box.x + box.w / 2) * fit.escala - size / 2) < 1e-6, im.ruta);
        assert.ok(Math.abs(fit.top + (box.y + box.h / 2) * fit.escala - size / 2) < 1e-6, im.ruta);
      }
    }
  }
  assert.ok(seen > 0);
});

test("2.1.1: el aviso de Supercell está solo en Copia, apartado Acerca de", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const format = readFileSync(new URL("../js/format.js", import.meta.url), "utf8");
  const notice = "This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: ";
  assert.equal(format.includes("footer class=\"legal\""), false);
  assert.equal(format.includes(notice), false);
  assert.equal(app.includes("footer class=\"legal\""), false);
  assert.equal(app.includes("${LEGAL}"), false);
  assert.equal(app.includes("LEGAL"), false);
  const copia = app.slice(app.indexOf("function renderCopia("), app.indexOf("function lastImportLabel("));
  assert.match(copia, /Acerca de/);
  assert.match(copia, /APP_VERSION/);
  assert.match(copia, /class="t-body" lang="en"/);
  assert.ok(copia.includes(notice + "<a href=\"https://www.supercell.com/fan-content-policy\""));
  assert.match(copia, /www\.supercell\.com\/fan-content-policy/);
  assert.match(copia, /Material no oficial, no respaldado por Supercell/);
  const before = app.slice(0, app.indexOf("function renderCopia("));
  const after = app.slice(app.indexOf("function lastImportLabel("));
  assert.equal(before.includes(notice), false);
  assert.equal(after.includes(notice), false);
  const web = readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8");
  assert.match(web, /no oficial/);
});

test("2.1.0: la precarga son 220 rutas con precarga true y catalog no duplica", () => {
  const urls = precacheUrls(manifest);
  assert.equal(urls.length, 220);
  assert.equal(new Set(urls).size, 220);
  assert.equal(urls.length, manifest.peso_imagenes.precache_instalacion_archivos);
  const list = catalog(manifest);
  assert.equal(list.length, 672);
  assert.equal(new Set(list.map((im) => im.url)).size, 672);
  assert.equal(list.reduce((s, im) => s + im.bytes, 0), manifest.peso_imagenes.total_bytes);
  assert.equal(list.filter((im) => im.precache).length, 220);
  for (const id of ["107000000", "107000001", "107000008"]) {
    const url = "./assets/" + manifest.items[id].imagen.ruta;
    assert.equal(urls.includes(url), false, id);
    assert.equal(list.some((im) => im.url === url && im.precache === false), true, id);
  }
  const dup = {
    items: {
      a: {
        imagen: { ruta: "images/defenses/cannon.png", bytes: 400000, pesado: false, precarga: false },
        imagenes_por_nivel: {
          2: { ruta: "images/defenses/cannon.png", bytes: 400000, pesado: false, precarga: false },
          7: { ruta: "images/defenses/cannon-7.png", bytes: 1200, pesado: false, precarga: true },
        },
      },
      b: {
        pesado: true,
        imagen: { ruta: "images/defenses/huge.png", bytes: 10, pesado: false, precarga: false },
      },
    },
  };
  const cat = catalog(dup);
  assert.deepEqual(cat.map((im) => im.url).sort(), ["./assets/images/defenses/cannon-7.png", "./assets/images/defenses/cannon.png"]);
  assert.equal(cat.find((im) => im.url.endsWith("cannon-7.png")).precache, true);
  assert.equal(isHeavy({ ruta: "x.png", bytes: HEAVY_BYTES, pesado: false }), false);
  assert.equal(isHeavy({ ruta: "x.png", bytes: HEAVY_BYTES + 1, pesado: false }), true);
  assert.equal(isHeavy({ ruta: "x.png", bytes: 400000, pesado: false }), false);
  const heavy = catalog({
    items: { a: { imagen: { ruta: "images/big.png", bytes: HEAVY_BYTES + 1, pesado: false, precarga: false } } },
  });
  assert.deepEqual(heavy, []);
  assert.deepEqual(precacheUrls(dup), ["./assets/images/defenses/cannon-7.png"]);
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /precacheUrls\(man\)/);
  assert.match(sw, /\.\/js\/images\.js/);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /data-level-note/);
  assert.match(app, /data-fallback/);
  assert.match(app, /applyFallback/);
  assert.equal(app.includes("1000001") && app.includes("imagenes_por_nivel[String(th)]"), false);
});

test("3.1.10: módulos versionados, aviso si un toque falla y enlaces externos fuera", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const v = APP_VERSION;
  assert.match(html, new RegExp("js/app.js\\?v=" + v.replaceAll(".", "\\.")));
  assert.match(html, /type="importmap"/);
  assert.match(html, new RegExp("js/nav.js\\?v=" + v.replaceAll(".", "\\.")));
  assert.match(sw, new RegExp("js/caches.js\\?v=" + v.replaceAll(".", "\\.")));
  assert.match(sw, /ignoreSearch: true/);
  assert.match(app, /unhandledrejection/);
  assert.match(app, /aviso-discreto/);
  assert.match(app, /tituloObserver/);
  assert.match(app, /sw\.js\?v=/);
  assert.match(app, /window\.open\(enlace\.href, "_blank", "noopener,noreferrer"\)/);
  assert.equal(app.includes("target=\"_blank\""), true);
});

test("3.1.10: Inicio y Cuentas usan el mismo cálculo y no tratan un temporizador vencido como libre confirmado", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const estados = [];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    estados.push(estadoColas(exp, now, { staleMs: 7 * 86400000, th: townHallLevel(exp) }));
  }
  const resumen = resumenFlota(estados);
  assert.equal(resumen.libresReales, 0);
  assert.equal(resumen.ocupadosReales, 50);
  assert.equal(resumen.vencidos, 31);
  assert.equal(resumen.over, 0);
  const frase = fraseConstructores(resumen);
  assert.match(frase, /0 libres en la exportación/);
  assert.match(frase, /50 ocupados en la exportación/);
  assert.match(frase, /31 ya habrían acabado \(estimado\)/);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("ctorLibres"), false);
  assert.match(app, /snap\.frase/);
  const vieja = {
    timestamp: Math.floor((now - 10 * 86400000) / 1000),
    buildings: [
      { data: "1000015", cnt: 1, lvl: 1 },
      { data: "1000008", lvl: 2, timer: 60, cnt: 1 },
    ],
  };
  const stale = estadoColas(vieja, now, { staleMs: 7 * 86400000 });
  assert.equal(stale.desactualizada, true);
  assert.equal(stale.builders.libresReales, 0);
  assert.equal(stale.builders.vencidos, 1);
  assert.equal(stale.builders.libresAccion, 0);
  assert.equal(stale.builders.confianza, "baja");
  const fresca = estadoColas({
    timestamp: Math.floor(now / 1000) - 60,
    buildings: [{ data: "1000015", cnt: 1, lvl: 1 }],
  }, now, { staleMs: 7 * 86400000 });
  assert.equal(fresca.builders.libresReales, 1);
  assert.equal(fresca.builders.libresAccion, 1);
  assert.equal(fresca.builders.confianza, "alta");
  const road = buildRoadmap({
    exp: vieja, index, tag: "#TEST", plan: defaultPlan(), provisionals: [], sleep: null, now,
  });
  assert.equal(road.lanes.find((l) => l.cola === "constructor").clase, "estimado");
  assert.equal(road.lanes.find((l) => l.cola === "laboratorio").clase, "real");
  const conLab = {
    ...vieja,
    units: [{ data: 4000000, lvl: 2, timer: 60 }],
    pets: [{ data: 73000000, lvl: 1, timer: 60 }],
  };
  const roadLab = buildRoadmap({
    exp: conLab, index, tag: "#TEST", plan: defaultPlan(), provisionals: [], sleep: null, now,
  });
  assert.equal(roadLab.lanes.find((l) => l.cola === "laboratorio").clase, "estimado");
  const roadLibre = buildRoadmap({
    exp: {
      timestamp: Math.floor(now / 1000) - 60,
      buildings: [{ data: 1000015, cnt: 1, lvl: 1 }],
    },
    index, tag: "#TEST", plan: defaultPlan(), provisionals: [], sleep: null, now,
  });
  const libre = roadLibre.lanes.find((l) => l.cola === "constructor");
  assert.equal(libre.clase, "real");
  assert.equal(libre.libreYa, true);
  assert.ok(road.orden.every((s) => s.origen === "recomendado" || s.origen === "provisional"));
});

test("3.1.10: el porcentaje compara cada cuenta con el máximo de su TH", () => {
  const rows = [
    { tag: "#A", nombre: "Alta", th: 18, media: 50, builders: { free: 0 }, cats: { defensas: 50 } },
    { tag: "#B", nombre: "Baja", th: 11, media: 50, builders: { free: 0 }, cats: { defensas: 40 } },
  ];
  assert.equal(averagePct(rows.map((r) => r.media)), 50);
  const ranked = rankAccounts(rows, "media");
  assert.equal(ranked[0].media, ranked[1].media);
  const cost = levelCost("1000008", 2);
  assert.ok(cost && typeof cost.s === "number");
  const bag = sumLevels("1000008", 1, 2, 1);
  const recurso = cost.r === "oro" ? bag.oro : cost.r === "elixir" ? bag.elixir : cost.r === "oscuro" ? bag.oscuro : bag.muros;
  assert.equal(recurso, cost.n || 0);
});

test("4.1.6: el águila no tiene máximo en TH17 ni TH18 y el muro de TH18 sigue", () => {
  assert.equal(caps["17"]["Eagle Artillery"], undefined);
  assert.equal(caps["18"]["Eagle Artillery"], undefined);
  assert.equal(caps["11"]["Eagle Artillery"].max, 2);
  assert.equal(caps["11"]["Eagle Artillery"].count, 1);
  assert.equal(caps["16"]["Eagle Artillery"].count, 1);
  assert.deepEqual(caps["18"].Wall, { max: 19, count: 325 });
  assert.equal(index.byId.get("1000031").has(17), false);
  assert.equal(index.byId.get("1000031").has(18), false);
  assert.equal(index.byId.get("1000031").get(16).max, 7);
});

test("4.1.7: cargador del paquete de temas, «Ninguno» por defecto y caché propia", () => {
  const leer = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const cargador = leer("../js/temas-paquete.js");
  const sw = leer("../sw.js");
  const html = leer("../index.html");
  const app = leer("../js/app.js");
  assert.match(cargador, /localStorage\.getItem\(CLAVE\) \|\| ""/);
  assert.match(cargador, /\.\/paquete-estetico\//);
  assert.match(html, /"\.\/js\/temas-paquete\.js": "\.\/js\/temas-paquete\.js\?v=4\.2\.0"/);
  assert.match(sw, /"\.\/js\/temas-paquete\.js"/);
  assert.match(sw, /const TEMAS_CACHE = "cp-temas-"/);
  assert.match(sw, /!key\.startsWith\(TEMAS_CACHE\)/);
  assert.match(app, /btn\("", "Ninguno"/);
  assert.match(app, /btn\("auto", "Automático"/);
  if (!existsSync(new URL("../paquete-estetico/paquete.json", import.meta.url))) return;   // 4.1.8: compilación sin paquete
  const p = JSON.parse(leer("../paquete-estetico/paquete.json"));
  assert.match(p.version, /^\d+\.\d+\.\d+$/);
  assert.equal(p.formato, 1);
  assert.equal(p.requisitos.modo, "oscuro");
  const base = leer("../paquete-estetico/" + p.base).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal(/\.thumb\s*>\s*img/.test(base), false);
  for (const t of p.temas) {
    const css = leer("../paquete-estetico/" + t.css).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.equal(css.includes("/assets/wiki/"), false, t.id);
    assert.equal(/\.thumb\s*>\s*img/.test(css), false, t.id);
  }
});
