import assert from "node:assert/strict";
import test from "node:test";
import { buildBackup, mergeBackup } from "../js/backup.js";
import { claveRoadmap, trasImportar } from "../js/gancho.js";
import { prepararMigracion, verificarDocumentos, volcadoLiteral } from "../js/migracion.js";
import { fraseOrigen, marcarOrigen, mismoOrigen } from "../js/origen.js";

function memoria(map) {
  const box = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
    setItem(k, v) { map[k] = String(v); },
    key(i) { return Object.keys(map)[i]; },
    get length() { return Object.keys(map).length; },
  };
  return box;
}

test("4.0.0: el origen no mezcla fuentes y no calcula", () => {
  assert.equal(marcarOrigen("inventado"), null);
  assert.deepEqual(marcarOrigen("importado"), { origen: "importado" });
  assert.equal(fraseOrigen(marcarOrigen("simulacion")), "Simulación. No cambia la aldea.");
  assert.equal(fraseOrigen(marcarOrigen("provisional")), "Marcado por ti. La exportación aún no lo confirma.");
  assert.equal(mismoOrigen([marcarOrigen("importado"), marcarOrigen("manual")]), null);
  assert.equal(mismoOrigen([marcarOrigen("plan"), marcarOrigen("plan")]), "plan");
});

test("4.0.0: una cuenta borrada no vuelve y un JSON roto no se da por migrado", () => {
  const roster = {
    version: 2,
    accounts: [{ tag: "#AAA", alias: "Queda", principal: false, addedAt: 1, chip: "Q" }],
  };
  const claves = {
    "cp-roster": JSON.stringify(roster),
    "cp-planes": JSON.stringify({ "#AAA": { modo: "rushear", th: 16 } }),
    "cp-provisional": JSON.stringify([{ tag: "#AAA", id: "1000001", fromLvl: 1, toLvl: 2, title: "Cañón" }]),
    "cp-sueno": JSON.stringify({ desde: "23:00", hasta: "07:00" }),
    "cp-theme": "dark",
  };
  const plan = prepararMigracion({
    schema: null,
    claves,
    added: [{ tag: "#BBB", alias: "No vuelve" }],
    exportTags: ["#CCC"],
    seeded: "1",
  });
  assert.equal(plan.migrado, true);
  assert.deepEqual(plan.documentos.find((d) => d.id === "roster").accounts.map((a) => a.tag), ["#AAA"]);
  assert.equal(plan.planes, 1);
  assert.equal(plan.marcas, 1);
  assert.equal(plan.documentos.find((d) => d.id === "sueno").desde, "23:00");
  assert.equal(plan.recuperacion.claves["cp-theme"], "dark");
  assert.equal(verificarDocumentos(plan.documentos, plan), true);
  assert.equal(verificarDocumentos(plan.documentos.filter((d) => d.id !== "roster"), plan), false);
  const roto = prepararMigracion({
    schema: null,
    claves: { ...claves, "cp-roster": "{" },
    added: [],
    exportTags: [],
    seeded: "1",
  });
  assert.equal(roto.migrado, false);
  assert.deepEqual(roto.rotos, ["cp-roster"]);
  assert.equal(roto.documentos, undefined);
  assert.deepEqual(prepararMigracion({ schema: { version: 3, migrado: true }, claves }), { repetir: false });
  const box = memoria({ "cp-roster": claves["cp-roster"], "cp-theme": "dark" });
  assert.equal(volcadoLiteral(box).claves["cp-theme"], "dark");
  assert.equal(volcadoLiteral(null).ok, false);
});

test("4.0.0: una copia vieja entra y el sueño del iPhone gana", () => {
  const vieja = {
    app: "clash-progreso",
    version: "3.1.16",
    accounts: [{ tag: "#A", alias: "Archivo", principal: false, addedAt: 1, chip: "A" }],
    exports: [{ tag: "#A", timestamp: 1, buildings: [] }],
    planes: { "#A": { modo: "maxear" } },
    provisionales: [],
  };
  const local = {
    accounts: [{ tag: "#B", alias: "Local", principal: true, addedAt: 2, chip: "B" }],
    exports: [{ tag: "#B", timestamp: 2, buildings: [] }],
    planes: { "#B": { modo: "rushear" } },
    provisionales: [],
    sueno: { desde: "23:00", hasta: "07:00" },
    documentos: [{ id: "nota-1", tipo: "nota", tag: "#B", texto: "en el iPhone" }],
  };
  const merged = mergeBackup(local, vieja);
  assert.equal(merged.sueno.desde, "23:00");
  assert.equal(merged.sueno.hasta, "07:00");
  assert.equal(merged.documentos.length, 1);
  assert.equal(merged.documentos[0].texto, "en el iPhone");
  assert.equal(merged.accounts.find((a) => a.tag === "#B").alias, "Local");
  assert.ok(merged.accounts.some((a) => a.tag === "#A"));
  assert.equal(merged.planes["#B"].modo, "rushear");
  const nueva = buildBackup({
    accounts: [{ tag: "#C", alias: "C", principal: false }],
    exports: [],
    planes: {},
    provisionales: [],
    sueno: { desde: "22:00", hasta: "06:30" },
    documentos: [{ id: "nota-2", tipo: "nota", texto: "archivo" }],
    version: "4.0.0",
  });
  assert.equal(nueva.schema, 4);
  assert.equal(nueva.sueno.desde, "22:00");
  const vacio = mergeBackup({
    accounts: [], exports: [], planes: {}, provisionales: [],
    sueno: { desde: "", hasta: "" }, documentos: [],
  }, nueva);
  assert.equal(vacio.sueno.desde, "22:00");
  const otra = mergeBackup(vacio, {
    schema: 4,
    sueno: { desde: "01:00", hasta: "02:00" },
    documentos: [
      { id: "nota-2", tipo: "nota", texto: "pisa" },
      { id: "nota-3", tipo: "nota", texto: "nueva" },
    ],
    accounts: [],
    exports: [],
  });
  assert.equal(otra.sueno.desde, "22:00");
  assert.equal(otra.documentos.find((d) => d.id === "nota-2").texto, "archivo");
  assert.equal(otra.documentos.length, 2);
});

test("4.0.0: importar marca la sesión y no confirma un paso declarado", () => {
  const docs = [{
    id: "s1",
    tipo: "sesion",
    orden: ["#A"],
    pasos: [
      { tag: "#A", estado: "hecho" },
      { tag: "#B", estado: "pendiente" },
    ],
  }, {
    id: "cerrada",
    tipo: "sesion",
    cerrada: true,
    orden: ["#A"],
    pasos: [{ tag: "#A", estado: "hecho" }],
  }];
  const out = trasImportar({ tag: "#A", documentos: docs, now: 50 });
  assert.equal(out.cambiados, 1);
  assert.equal(out.documentos[0].recalcular, 50);
  assert.equal(out.documentos[0].pasos[0].estado, "hecho");
  assert.equal(out.documentos[0].pasos[0].confirmado, undefined);
  assert.equal(out.documentos[1].recalcular, undefined);
  const key = claveRoadmap({ tag: "#A", timestamp: 3, plan: { modo: "maxear" }, sueno: { desde: "", hasta: "" }, now: 60_000 });
  const misma = claveRoadmap({ tag: "#A", timestamp: 3, plan: { modo: "maxear" }, sueno: { desde: "", hasta: "" }, now: 90_000 });
  const otro = claveRoadmap({ tag: "#A", timestamp: 3, plan: { modo: "rushear" }, sueno: { desde: "", hasta: "" }, now: 90_000 });
  assert.equal(key, misma);
  assert.notEqual(key, otro);
});
