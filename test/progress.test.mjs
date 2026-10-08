import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexCaps, analyze, equipmentView, categoryItems, townHallLevel, pct, builderStatus, itemName, ROSTER, capsMaxFor, levelLine, categoryUnlock } from "../js/progress.js";
import { parseLoose } from "../js/parse.js";

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
  assert.equal(row.max, 5);
  const c1 = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "defensas", 18);
  assert.equal(c1.some((r) => r.capsOnly), false);
  const lab = categoryItems(exportsByTag.get("#28PLGP0G2"), index, "laboratorio", 18);
  const ids = new Set(lab.map((r) => r.id));
  for (const unit of exportsByTag.get("#28PLGP0G2").units2) {
    assert.equal(ids.has(String(unit.data)), false, String(unit.data));
  }
});

test("184 sha256 coinciden con el manifiesto", () => {
  assert.equal(manifest.peso_imagenes.total_archivos, 184);
  assert.equal(manifest.peso_imagenes.total_bytes, 60458372);
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
  assert.equal(want.size, 184);
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
  assert.equal(files.length, 184);
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
  assert.equal(other.preview, "https://link.clashof");
  assert.match(other.msg, /Empieza por «https:\/\/link\.clashof»/);
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
  assert.equal(otherFile.msg, "El archivo no es una exportación. Empieza por «https://link.clashof».");
  assert.equal(/portapapeles/i.test(otherFile.msg + otherFile.help), false);
  const cutFile = parseLoose('{"tag":"#28PLGP0G2"', "file");
  assert.equal(cutFile.msg, "El archivo está incompleto.");
  assert.equal(/línea|columna|position/i.test(cutFile.msg), false);
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
  const r = analyze(exportsByTag.get("#R02YUVC0J"), index);
  assert.equal(r.walls.max, 12);
  assert.deepEqual(r.walls.hist, [
    { lvl: 1, cnt: 50 },
    { lvl: 6, cnt: 211 },
    { lvl: 7, cnt: 39 },
  ]);
  assert.equal(r.walls.hist.reduce((s, h) => s + (r.walls.max - h.lvl) * h.cnt, 0), 2011);
});

test("missing.json coincide con el archivo publicado", () => {
  const buf = readFileSync(new URL("../assets/missing.json", import.meta.url));
  assert.equal(createHash("sha256").update(buf).digest("hex"), "53b293a3160900e693a3e950de291167ce7ec73e7ab14b5ec9535e61aa7e1fef");
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
