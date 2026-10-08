import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexCaps, analyze, equipmentView, categoryItems, townHallLevel, pct, builderStatus, itemName, ROSTER, capsMaxFor, levelLine, categoryUnlock, catFoot, capsFichaLines, presentItem, outsidePct, overMaxLabel, CATEGORIES } from "../js/progress.js";
import { parseLoose } from "../js/parse.js";
import { fmtPct } from "../js/format.js";
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

test("manifest.json coincide con la v1.3.2", () => {
  const buf = readFileSync(new URL("../assets/manifest.json", import.meta.url));
  assert.equal(createHash("sha256").update(buf).digest("hex"), "cec90f014ab914a11cb05a9c33c86a371c3ac11f10bbde376671763b0cd16c31");
  assert.equal(manifest.version_set_imagenes, "v1.3.2");
});

/** Una función real de js/app.js, sin ejecutar el arranque del navegador. */
function fnFromApp(signature, name, deps = {}) {
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

test("versión 1.1.3 y cachés cp-shell-v7 / cp-img-v4", () => {
  assert.equal(APP_VERSION, "1.1.3");
  assert.equal(SHELL_CACHE, "cp-shell-v7");
  assert.equal(IMAGE_CACHE, "cp-img-v4");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const caches = readFileSync(new URL("../js/caches.js", import.meta.url), "utf8");
  assert.match(sw, /SHELL_CACHE/);
  assert.match(sw, /IMAGE_CACHE/);
  assert.equal(sw.includes("cp-shell-v5"), false);
  assert.equal(sw.includes("cp-shell-v6"), false);
  assert.equal(sw.includes("cp-shell-v7"), false);
  assert.equal(sw.includes("cp-img-v4"), false);
  assert.equal(sw.includes("cp-img-v5"), false);
  assert.match(caches, /cp-shell-v7/);
  assert.match(caches, /cp-img-v4/);
  assert.equal(caches.includes("cp-shell-v5"), false);
  assert.equal(caches.includes("cp-shell-v6"), false);
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
