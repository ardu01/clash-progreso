import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexCaps, analyze, equipmentView, categoryItems, townHallLevel, pct, builderStatus, itemName, ROSTER, capsMaxFor, levelLine, categoryUnlock, catFoot, capsFichaLines, presentItem, outsidePct, overMaxLabel, CATEGORIES } from "../js/progress.js";
import { parseLoose } from "../js/parse.js";
import { fmtBytes, fmtFin, fmtPct } from "../js/format.js";
import { APP_VERSION, SHELL_CACHE, IMAGE_CACHE } from "../js/caches.js";
import { classifyEntries, acceptedExports, foreignMsg, trailingLabel, mediaLine, unknownMsg, omitSubtitle, omitReason, BAD_FOOT, DUP_FOOT } from "../js/import.js";

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
// Laboratorio: 4000109, 26000123 y 4000188 no entran en el máximo (siguen sin identificar).
// Defensas frente a otro TH: instancias colocadas contra el máximo de ese TH; las que faltan
// son el cupo de ClashRecord menos las colocadas (nunca negativo). Incluye Inferno Artillery,
// que no tiene ficha en el manifiesto.
const KNOWN = new Set([
  "#28PLGP0G2 pct_laboratorio",
  "#28PLGP0G2 pct_media",
  "#28PLGP0G2 pct_equipamiento",
  "#R00C8CPQC pct_sig_defensas",
  "#R00C8CPQC pct_laboratorio",
  "#R00C8CPQC pct_sig_laboratorio",
  "#R00C8CPQC pct_media",
  "#R00C8CPQC pct_sig_media",
  "#R00C8CPQC pct_equipamiento",
  "#R00C8CPQC pct_sig_equipamiento",
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
  assert.equal(itemName(manifest.items["1000068"]), "Pet House");
  assert.equal(itemName(manifest.items["1000007"]), "Laboratorio");
});

test("las piezas id_deducido siguen en el recuento y salen de sin identificar", () => {
  const pieces = equipmentView(exportsByTag.get("#28PLGP0G2"), index, 18);
  assert.equal(pieces.length, 43);
  for (const id of ["90000052", "90000053", "90000059"]) {
    const piece = pieces.find((p) => p.id === id);
    assert.ok(piece, id);
    assert.equal(piece.unknown, false, id);
    assert.equal(piece.meta.estado, "id_deducido");
    assert.equal(piece.heroe, "Dragon Duke");
    assert.equal(piece.meta.nombre_pendiente, false);
  }
  assert.equal(pieces.filter((p) => p.unknown).length, 5);
  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.cats.equipamiento.pct, 61.6);
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.cats.equipamiento.pct, 58.6);
  assert.equal(c2.cats.equipamiento.sigPct, 58.6);
});

test("Inferno Artillery solo en el detalle, sin id inventado", () => {
  const c2 = categoryItems(exportsByTag.get("#R00C8CPQC"), index, "defensas", 16);
  const row = c2.find((r) => r.capsOnly);
  assert.ok(row);
  assert.equal(row.capsName, "Inferno Artillery");
  assert.equal(row.id, null);
  assert.equal(row.lvl, 0);
  assert.equal(row.max, null);
  assert.equal(row.maxNext, 5);
  assert.equal(row.unlockTh, 17);
  assert.deepEqual(levelLine(row), { text: "Disponible en TH17", bar: false });
  assert.deepEqual(capsFichaLines(row), [
    "Disponible en TH17",
    "Sin imagen",
    "Nombre en español sin confirmar",
  ]);
  const view = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(view.cats.defensas.pct, 66.9);
  assert.equal(view.cats.defensas.sigPct, 61.3);
  const c1 = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "defensas", 18);
  assert.equal(c1.some((r) => r.capsOnly), false);
  const lab = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "laboratorio", 18);
  const ids = new Set(lab.map((r) => r.id));
  for (const unit of exportsByTag.get("#28PLGP0G2").units2) {
    assert.equal(ids.has(String(unit.data)), false, String(unit.data));
  }
});

test("185 sha256 coinciden con el manifiesto", () => {
  assert.equal(manifest.peso_imagenes.total_archivos, 185);
  assert.equal(manifest.peso_imagenes.total_bytes, 60950695);
  assert.equal(manifest.peso_imagenes.precache_instalacion_archivos, 14);
  assert.equal(manifest.peso_imagenes.precache_instalacion_bytes, 9624126);
  const want = new Map();
  for (const item of Object.values(manifest.items)) {
    const images = [];
    if (item.imagen) images.push(item.imagen);
    for (const im of Object.values(item.imagenes_por_nivel || {})) images.push(im);
    for (const im of images) {
      if (im && im.ruta) want.set(im.ruta, im);
    }
  }
  assert.equal(want.size, 185);
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
  assert.equal(files.length, 185);
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
  assert.equal(c2.cats.equipamiento.pct, 58.6);
  assert.equal(c2.offense, 34.5);

  const c1 = analyze(exportsByTag.get("#28PLGP0G2"), index);
  assert.equal(c1.cats.equipamiento.pct, 61.6);
  assert.equal(c1.cats.heroes.pct, Number(byTag.get("#28PLGP0G2").pct_heroes));

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
  assert.equal(createHash("sha256").update(buf).digest("hex"), "42d7be7c0ad7df5499170a251c9b092d10cdfba6ba0d1ebd268a6a9ad983af70");
});

test("manifest.json coincide con la v1.4.1", () => {
  const buf = readFileSync(new URL("../assets/manifest.json", import.meta.url));
  assert.equal(createHash("sha256").update(buf).digest("hex"), "19e6a40d8621d690848bdac24829ec617d1941c851b9af541a24ad9c25b38b23");
  assert.equal(manifest.version_set_imagenes, "v1.4.1");
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

/** La función real de js/app.js, sin ejecutar el arranque del navegador. */
function frameOfFromApp() {
  const src = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const start = src.indexOf("function frameOf(im, size)");
  assert.ok(start >= 0);
  let depth = 0;
  for (let i = src.indexOf("{", start); i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return new Function(`${src.slice(start, i + 1)}\nreturn frameOf;`)();
    }
  }
  throw new Error("frameOf sin cierre");
}

const V110 = {
  "#28PLGP0G2": { media: 64, sigMedia: null, cats: { defensas: [70.1, null], laboratorio: [63.1, null], ejercito_edif: [96.1, null], equipamiento: [61.6, null], mascotas: [41.9, null], heroes: [46, null], trampas: [39.8, null], recursos: [88.1, null], muros: [69.5, null] } },
  "#R00C8CPQC": { media: 49, sigMedia: 46.1, cats: { defensas: [66.9, 61.3], laboratorio: [45.4, 41.7], ejercito_edif: [86.2, 80.6], equipamiento: [58.6, 58.6], mascotas: [13, 10.7], heroes: [23.5, 21.6], trampas: [13.9, 12.2], recursos: [66.5, 65.1], muros: [67, 63.3] } },
  "#GUQUV98JG": { media: 62.9, sigMedia: 49.3, cats: { defensas: [69.2, 62.6], laboratorio: [53.7, 47.9], ejercito_edif: [83.3, 75.8], equipamiento: [67.9, 57.3], mascotas: [null, 0], heroes: [32.7, 28.1], trampas: [48.9, 39.6], recursos: [72.3, 67.4], muros: [75.3, 64.9] } },
  "#GVG9GCYUV": { media: 60, sigMedia: 47.1, cats: { defensas: [68.6, 62], laboratorio: [45.6, 40.6], ejercito_edif: [81.7, 74.2], equipamiento: [80.8, 68.4], mascotas: [null, 0], heroes: [33.1, 28.4], trampas: [26.5, 21.5], recursos: [68.1, 63.4], muros: [75.4, 65] } },
  "#R02YVYLJ8": { media: 58.6, sigMedia: 45.8, cats: { defensas: [65.9, 59.6], laboratorio: [44.1, 39.3], ejercito_edif: [78.3, 71.2], equipamiento: [73.5, 62.2], mascotas: [null, 0], heroes: [30.9, 26.6], trampas: [38.8, 31.4], recursos: [61.1, 56.9], muros: [75.9, 65.4] } },
  "#GJPJP9JP0": { media: 41.8, sigMedia: 32.9, cats: { defensas: [42.5, 38.7], laboratorio: [34.1, 30.4], ejercito_edif: [68.3, 62.1], equipamiento: [54.5, 46.2], mascotas: [null, 0], heroes: [17.5, 15], trampas: [22, 17.8], recursos: [52.7, 49.1], muros: [42.9, 36.9] } },
  "#GVPU80R80": { media: 51.8, sigMedia: 44, cats: { defensas: [55.5, 46.8], laboratorio: [48.1, 38.4], ejercito_edif: [79.6, 69.2], equipamiento: [59.4, 48.8], mascotas: [null, null], heroes: [34.7, 24.8], trampas: [24.5, 19.7], recursos: [61.2, 56.6], muros: [51.3, 47.3] } },
  "#GVUQ2C2VC": { media: 57.3, sigMedia: 48.8, cats: { defensas: [68.3, 57.5], laboratorio: [55.7, 44.5], ejercito_edif: [82.8, 72], equipamiento: [66.7, 55.6], mascotas: [null, null], heroes: [37.3, 26.7], trampas: [18.4, 14.8], recursos: [67.7, 62.6], muros: [61.2, 56.5] } },
  "#GVVYVU802": { media: 58.1, sigMedia: 49.2, cats: { defensas: [66.3, 55.8], laboratorio: [55.2, 44.1], ejercito_edif: [81.7, 71], equipamiento: [77.2, 63.8], mascotas: [null, null], heroes: [37.3, 26.7], trampas: [28.2, 22.7], recursos: [58.4, 54], muros: [60.5, 55.9] } },
  "#GVPU2CJR8": { media: 51.2, sigMedia: 43.4, cats: { defensas: [57.3, 48.2], laboratorio: [49.7, 39.7], ejercito_edif: [80.6, 70.1], equipamiento: [59.4, 48.8], mascotas: [null, null], heroes: [38, 27.1], trampas: [19, 15.3], recursos: [55.9, 51.7], muros: [50, 46.2] } },
  "#R02YUVC0J": { media: 49.2, sigMedia: 41.7, cats: { defensas: [54.4, 45.8], laboratorio: [47, 37.6], ejercito_edif: [77.4, 67.3], equipamiento: [57.4, 47], mascotas: [null, null], heroes: [35.3, 25.2], trampas: [19, 15.3], recursos: [59.3, 54.9], muros: [44.1, 40.7] } },
};

function latestOf(rows, tag) {
  return rows.filter((r) => r.tag === tag).sort((a, b) => b.timestamp - a.timestamp)[0];
}

function importCtx(rows) {
  return { rows, accounts: ROSTER, index, now: Date.parse("2026-10-08T12:00:00Z") };
}

test("los porcentajes de las 11 cuentas no cambian respecto a la 1.1.0", () => {
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
  assert.equal(analyze(exportsByTag.get("#28PLGP0G2"), index).cats.equipamiento.pct, 61.6);
  const c2 = analyze(exportsByTag.get("#R00C8CPQC"), index);
  assert.equal(c2.cats.defensas.pct, 66.9);
  assert.equal(c2.cats.defensas.sigPct, 61.3);
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
  const cap = capsMaxFor(index, "90000000", 18);
  assert.ok(cap > 1);
  const over = structuredClone(base);
  over.timestamp = base.timestamp + 90;
  over.equipment.find((e) => String(e.data) === "90000000").lvl = cap + 1;
  const atMax = structuredClone(base);
  atMax.equipment.find((e) => String(e.data) === "90000000").lvl = cap;
  const overView = analyze(over, index);
  const maxView = analyze(atMax, index);
  assert.equal(overView.cats.equipamiento.pct, maxView.cats.equipamiento.pct);
  assert.ok(overView.cats.equipamiento.pct <= 100);
  const piece = equipmentView(over, index, 18).find((p) => p.id === "90000000");
  assert.equal(piece.lvl, cap + 1);
  assert.equal(piece.max, cap);
  assert.equal(piece.overMax, true);
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

test("C2 cuenta 4 sin identificar fuera del porcentaje", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const exp = structuredClone(base);
  exp.timestamp = base.timestamp + 40;
  const item = classifyEntries([{ name: "c2.json", text: JSON.stringify(exp) }], importCtx([...exportsByTag.values()]))[0];
  assert.equal(item.kind, "ready");
  assert.equal(item.changes.unknownCount, 4);
});

test("versión 1.1.6 y cachés cp-shell-v10 / cp-img-v4", () => {
  assert.equal(APP_VERSION, "1.1.6");
  assert.equal(SHELL_CACHE, "cp-shell-v10");
  assert.equal(IMAGE_CACHE, "cp-img-v4");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const caches = readFileSync(new URL("../js/caches.js", import.meta.url), "utf8");
  assert.match(sw, /SHELL_CACHE/);
  assert.match(sw, /IMAGE_CACHE/);
  assert.equal(sw.includes("cp-shell-v5"), false);
  assert.equal(sw.includes("cp-shell-v6"), false);
  assert.equal(sw.includes("cp-shell-v7"), false);
  assert.equal(sw.includes("cp-shell-v8"), false);
  assert.equal(sw.includes("cp-shell-v9"), false);
  assert.equal(sw.includes("cp-img-v4"), false);
  assert.equal(sw.includes("cp-img-v5"), false);
  assert.match(caches, /cp-shell-v10/);
  assert.match(caches, /cp-img-v4/);
  assert.equal(caches.includes("cp-shell-v5"), false);
  assert.equal(caches.includes("cp-shell-v6"), false);
  assert.equal(caches.includes("cp-shell-v7"), false);
  assert.equal(caches.includes("cp-shell-v8"), false);
  assert.equal(caches.includes("cp-shell-v9"), false);
  assert.equal(caches.includes("cp-img-v5"), false);
  assert.match(app, /APP_VERSION/);
  assert.equal(app.includes("1.1.0"), false);
  assert.equal(app.includes("salvo cuando"), false);
  assert.match(app, /js\/import\.js|from "\.\/import\.js"/);
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

test("sin identificar: C1 da 8 y las otras diez dan 4, el mismo número en los dos sitios", () => {
  const rows = [...exportsByTag.values()];
  for (const roster of ROSTER) {
    const exp = exportsByTag.get(roster.tag);
    const fresh = structuredClone(exp);
    fresh.timestamp = exp.timestamp + 40;
    const item = classifyEntries([{ name: "nueva.json", text: JSON.stringify(fresh) }], importCtx(rows))[0];
    const split = unidentifiedSplit(exp);
    const want = roster.tag === "#28PLGP0G2" ? 8 : 4;
    assert.equal(item.changes.unknownCount, want, roster.tag);
    assert.equal(split.total, want, roster.tag + " avisos");
    assert.equal(split.notices.defensas || 0, 0, roster.tag + " defensas");
    assert.equal(outsidePct(index, "107000008", townHallLevel(exp)), false, roster.tag);
    if (roster.tag === "#28PLGP0G2") {
      assert.equal(split.notices.laboratorio, 3);
      assert.equal(split.equipment, 5);
      assert.equal(unknownMsg(item.changes.unknownCount), "8 ítems sin identificar: se guardan igual.");
    } else {
      assert.equal(split.equipment, 4);
      assert.equal(split.noticeSum, 0, roster.tag);
      const ids = categoryItems(exp, index, "equipamiento", townHallLevel(exp))
        .filter((it) => outsidePct(index, it.id, townHallLevel(exp)))
        .map((it) => it.id)
        .sort();
      assert.deepEqual(ids, ["90000016", "90000057", "90000060", "90000061"]);
    }
  }
  assert.equal(unknownMsg(1), "1 ítem sin identificar: se guarda igual.");
  const helper = presentItem(index, "93000003");
  assert.equal(helper.unknown, true);
  assert.equal(unidentifiedSplit(exportsByTag.get("#28PLGP0G2")).total, 8);
});

test("107000008 se muestra como Logger con ID deducido y no entra en el aviso", () => {
  const item = manifest.items["107000008"];
  assert.equal(item.estado, "id_deducido");
  assert.equal(item.nombre_pendiente, true);
  assert.equal(item.nombre_en, "Logger");
  assert.equal(itemName(item), "Logger");
  const shown = presentItem(index, "107000008");
  assert.equal(shown.unknown, false);
  assert.equal(shown.title, "Logger");
  assert.equal(shown.mark, null);
  assert.equal(capsMaxFor(index, "107000008", 18), 5);
  assert.equal(outsidePct(index, "107000008", 18), false);
  const row = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "defensas", 18).find((r) => r.id === "107000008");
  assert.ok(row);
  assert.equal(levelLine(row).text, "Nv 1 / 5");
  assert.equal(row.max, 5);
  assert.equal(item.imagen.ruta, "images/guardians/logger.png");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /badge--soft">ID deducido/);
  assert.match(app, /Nombre en español sin confirmar/);
  const heroes = categoryItems(exportsByTag.get("#R00C8CPQC"), index, "heroes", 16);
  const line = (name) => levelLine(heroes.find((h) => itemName(index.items[h.id]) === name)).text;
  assert.equal(line("Luchadora real"), "Nv 11 / 45");
  assert.equal(line("Príncipe Esbirro"), "Nv 12 / 80");
  assert.equal(line("Duque Dragón"), "Nv 10 / 15");
});

test("el encuadre del Logger es --cx:.56 --cy:.598 --z:1.542", () => {
  const im = manifest.items["107000008"].imagen;
  assert.deepEqual(im.caja_visible, { x: 268, y: 335, w: 611, h: 555 });
  assert.equal(im.ocupacion, 0.3234);
  const frameOf = frameOfFromApp();
  const css = (frame) => `--cx:${frame.cx.replace(/^0(?=\.)/, "")} --cy:${frame.cy.replace(/^0(?=\.)/, "")} --z:${frame.z}`;
  for (const size of [40, 96]) {
    const frame = frameOf(im, size);
    assert.deepEqual(frame, { cx: "0.56", cy: "0.598", z: "1.542" }, String(size));
    assert.equal(css(frame), "--cx:.56 --cy:.598 --z:1.542");
  }
  assert.equal(IMAGE_CACHE, "cp-img-v4");
});

test("la media sin cambio no repite el valor ni pone flecha", () => {
  const base = exportsByTag.get("#R00C8CPQC");
  const rows = [...exportsByTag.values()];
  const same = structuredClone(base);
  same.timestamp = base.timestamp + 40;
  const flat = classifyEntries([{ name: "igual.json", text: JSON.stringify(same) }], importCtx(rows))[0];
  assert.equal(flat.kind, "ready");
  assert.equal(flat.changes.delta.dir, "flat");
  assert.equal(flat.changes.mediaTo, 49);
  assert.equal(mediaLine(flat.changes), fmtPct(49) + " · sin cambio");
  assert.equal(mediaLine(flat.changes).includes("→"), false);
  assert.equal(mediaLine(flat.changes).split(fmtPct(49)).length - 1, 1);
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
  // El CSV de C2 (34,2) aún cuenta Ruin Witch y Angry Spell. Sin esos máximos el laboratorio
  // sube a 45,4 y la media con héroes (23,5) es 34,5.
  assert.equal(got("#R00C8CPQC"), 34.5);
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
  assert.match(loggerHtml, /<span class="row__name">Logger<\/span><span class="badge badge--soft">ID deducido<\/span>/);
  assert.match(loggerHtml, /aria-label="Logger, nivel 1 de 5, ID deducido"/);
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
  assert.equal(heroAria("Duque Dragón", { lvl: 10, max: 15 }, { bar: true, text: "Nv 10 / 15" }, true), "Duque Dragón, nivel 10 de 15, ID deducido");

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
  assert.match(app, /<input class="file-input" data-files type="file" accept="\.json,application\/json" multiple tabindex="-1" aria-hidden="true">/);
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

test("1.1.5: la celda de equipamiento dice «ID deducido» como las filas", () => {
  const eqCell = fnFromApp("function eqCell(p)", "eqCell", {
    nameOf: (id) => ({ 9: "Puño de fuego" })[id] || "", thumb: () => "<span></span>", esc: esc115,
  });
  const ded = eqCell({ id: 9, lvl: 12, max: 18, meta: { estado: "id_deducido" } });
  assert.match(ded, /aria-label="Puño de fuego, nivel 12 de 18, ID deducido"/);
  assert.match(ded, /eq__cap--soft">ID deducido</);
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
  assert.match(ded, /aria-label="Puño de fuego, nivel 22, máximo desactualizado, ID deducido"/);
  const plain = eqCell({ id: 9, lvl: 7 });
  assert.match(plain, /aria-label="Puño de fuego, nivel 7"/);
  const plainDed = eqCell({ id: 9, lvl: 7, meta: { estado: "id_deducido" } });
  assert.match(plainDed, /aria-label="Puño de fuego, nivel 7, ID deducido"/);
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
  // Deducido y overMax: las dos etiquetas, en el mismo orden que el aria-label.
  const ded = eqCell({ id: 9, lvl: 22, max: 18, overMax: true, meta: { estado: "id_deducido" } });
  assert.match(ded, /eq__cap--warn">máx\. 18<\/span><span class="eq__cap eq__cap--soft">ID deducido<\/span>/);
  // Sin overMax no cambia nada: al máximo, verde; por debajo o sin máximo, sin marca.
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
  // Contraste con los tokens reales, claro y oscuro.
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
