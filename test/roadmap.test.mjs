import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { levelCost, sumLevels } from "../js/costs.js";
import { costeTh } from "../js/th-costes.js";
import { analyze, builderStatus, indexCaps } from "../js/progress.js";
import { HEROES_FUERA } from "../js/plan.js";
import { reconcileMessage, reconcileProvisionals, toggleProvisional } from "../js/provisional.js";
import {
  ahoraDe, buildRoadmap, capTownHall, capacidadAldea, constructoresParaPlan, costeDePaso, effectivePlan, marcarCabida, ordenarParaPlan, planIsConfigured, planLabel,
  prepararSubida, programar, requisitosAyuntamiento, rushGaps,
} from "../js/roadmap.js";
import { semanaPlan } from "../js/schedule.js";

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

test("el rush por defecto es esencial y un valor raro vuelve a esencial", () => {
  assert.equal(effectivePlan({ modo: "rushear" }).rush, "esencial");
  assert.deepEqual(effectivePlan({ modo: "rushear" }).sugerenciasOff, []);
  assert.equal(effectivePlan({ modo: "rushear", rush: "raro" }).rush, "esencial");
  assert.equal(effectivePlan({ modo: "rushear", rush: "estrategico" }).rush, "estrategico");
  assert.deepEqual(
    effectivePlan({ modo: "rushear", rush: "estrategico", sugerenciasOff: ["1000014", "1000014", "no"] }).sugerenciasOff,
    ["1000014"],
  );
  assert.equal(planLabel(effectivePlan({ modo: "rushear", th: 17 }), 16), "Rush esencial → TH17");
  assert.equal(planLabel(effectivePlan({ modo: "rushear", rush: "estrategico", th: 17 }), 16), "Rush estratégico → TH17");
  const actual = road(c2, { modo: "rushear", th: null }, []);
  assert.equal(actual.plan.rush, "esencial");
  assert.equal(actual.orden.length, 0);
  assert.equal(actual.rush.filas.length, 0);
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
  assert.equal(conBob.total, builderStatus(c1).total);
  assert.equal(conBob.chozas, 5);
  assert.equal(conBob.total, 6);
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
  const uno = road(exp, { modo: "rushear", rush: "estrategico", th: 17, constructores: 4 }, []);
  const lanes = uno.lanes.filter((l) => l.cola === "constructor" && l.titulo.startsWith("Constructor"));
  assert.equal(lanes.length, 4);
  assert.equal(lanes.every((l) => l.clase === "ajuste"), true);
  const pasos = uno.orden.filter((s) => s.queue === "constructor" && s.fin != null && s.seconds != null);
  assert.ok(pasos.length > 4);
  const minimo = Math.min(...pasos.map((s) => s.inicio));
  const aLaVez = pasos.filter((s) => s.inicio === minimo);
  assert.equal(aLaVez.length, 4);
  assert.equal(new Set(aLaVez.map((s) => s.laneId)).size, 4);
  const siguiente = pasos.find((s) => s.instance === aLaVez[0].instance && s.fromLvl === aLaVez[0].toLvl);
  if (siguiente) assert.ok(siguiente.inicio >= aLaVez[0].fin);
  assert.ok(uno.trabajoSeg > uno.calendarioSeg);
  const suma = aLaVez.reduce((n, s) => n + s.seconds, 0);
  const cal = (Math.max(...aLaVez.map((s) => s.fin)) - minimo) / 1000;
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

function sumaPasos(orden) {
  const arma = { 2: [10000000, 518400], 3: [12000000, 604800], 4: [14000000, 691200], 5: [18000000, 864000] };
  const total = { oro: 0, elixir: 0, oscuro: 0, muros: 0, segConstructor: 0 };
  for (const step of orden) {
    if (step.id === "inferno-artillery") {
      const row = arma[step.toLvl];
      total.oro += row[0];
      total.segConstructor += row[1];
      continue;
    }
    if (step.id === "town-hall") {
      const row = costeTh(step.toLvl);
      total.oro += row.oro;
      total.segConstructor += row.segundos;
      continue;
    }
    const part = sumLevels(step.id, step.fromLvl, step.toLvl, 1);
    total.oro += part.oro;
    total.elixir += part.elixir;
    total.oscuro += part.oscuro;
    total.muros += part.muros;
    total.segConstructor += part.segConstructor;
  }
  return total;
}

test("rush esencial solo programa los requisitos y rush estratégico suma sugerencias editables", () => {
  const esencial = road(c2, { modo: "rushear", th: 17 }, []);
  assert.equal(esencial.plan.rush, "esencial");
  assert.equal(esencial.orden.some((s) => s.id === "1000014"), false);
  assert.equal(esencial.orden.some((s) => s.categoryKey === "heroes"), false);
  assert.equal(esencial.orden.some((s) => s.categoryKey === "laboratorio"), false);
  assert.equal(esencial.orden.some((s) => s.id === "1000008"), false);
  assert.equal(esencial.orden.every((s) => s.rushClase === "requisito"), true);
  assert.equal(esencial.orden.some((s) => s.id !== "1000071" && s.id !== "town-hall" && s.toLvl > 1), false);
  const ayuntamiento = esencial.orden.find((s) => s.id === "town-hall");
  assert.ok(ayuntamiento);
  assert.equal(ayuntamiento.fromLvl, 16);
  assert.equal(ayuntamiento.toLvl, 17);
  assert.equal(ayuntamiento.seconds, costeTh(17).segundos);
  const fins = esencial.orden.filter((s) => s.id !== "town-hall" && s.queue === "constructor" && s.fin != null).map((s) => s.fin);
  if (fins.length) assert.ok(ayuntamiento.inicio >= Math.max(...fins));
  assert.equal(esencial.rush.filas.some((f) => f.id === "town-hall" && f.provisional === false), true);
  const sala = esencial.rush.filas.find((f) => f.id === "1000071");
  assert.equal(sala.requerido, 10);
  assert.equal(sala.clase, "requisito");
  assert.equal(sala.hecho, false);
  assert.match(esencial.rush.nota, /requisitos del juego/);

  const est = road(c2, { modo: "rushear", rush: "estrategico", th: 17 }, []);
  for (const id of ["1000007", "1000000", "1000014", "1000005", "1000003", "1000024", "1000068", "1000006", "1000059"]) {
    const fila = est.rush.filas.find((f) => f.id === id);
    assert.ok(fila, id);
    assert.equal(fila.requerido, index.byId.get(id).get(16).max, id);
    assert.equal(fila.clase, "sugerencia", id);
    assert.match(fila.razon, /sugerencia|ejército|refuerzos|oro|elixir|mascotas|tropas|asedio|hechizos|oscuro|cuarto|cuartel|laboratorio|campamento|Caseta|Fábrica|Sin sitio|Abre|No hace falta|Héroes/i, id);
  }
  assert.equal(est.orden.some((s) => s.categoryKey === "heroes" && s.rushClase === "sugerencia"), true);
  assert.match(est.orden.find((s) => s.id === "28000000").rushRazon, /héroe/i);
  assert.equal(est.orden.some((s) => s.categoryKey === "laboratorio"), false);
  assert.equal(est.orden.some((s) => s.categoryKey === "defensas" && s.toLvl > 1), false);
  assert.equal(est.orden.some((s) => s.id === "1000008"), false);
  const camp = est.orden.find((s) => s.id === "1000000");
  assert.equal(camp.rushClase, "sugerencia");
  assert.equal(est.rush.sugerencias.every((s) => s.razon.length > 20), true);
  assert.equal(est.rush.sugerencias.find((s) => s.id === "1000068").activa, true);

  const suma = sumaPasos(est.orden);
  assert.equal(est.coste.oro, suma.oro);
  assert.equal(est.coste.elixir, suma.elixir);
  assert.equal(est.coste.oscuro, suma.oscuro);
  assert.equal(est.coste.muros, suma.muros);
  assert.equal(est.coste.segConstructor, suma.segConstructor);
  assert.equal(est.rush.coste.oro, suma.oro);
  assert.equal(est.constructores.total, 5);
  assert.ok(est.trabajoSeg > est.calendarioSeg);
  assert.equal(est.fin, Math.max(...est.orden.map((s) => s.fin).filter((n) => n != null)));
  assert.equal(est.rush.fin, est.fin);
  assert.equal(est.rush.calendarioSeg, est.calendarioSeg);

  const sinCastillo = road(c2, { modo: "rushear", rush: "estrategico", th: 17, sugerenciasOff: ["1000014"] }, []);
  assert.equal(sinCastillo.rush.filas.some((f) => f.id === "1000014"), false);
  assert.equal(sinCastillo.orden.some((s) => s.id === "1000014"), false);
  assert.equal(sinCastillo.rush.filas.find((f) => f.id === "1000071").requerido, 10);
  assert.equal(sinCastillo.rush.sugerencias.find((s) => s.id === "1000014").activa, false);

  const sinLab = road(c2, { modo: "rushear", rush: "estrategico", th: 17, sugerenciasOff: ["1000007"] }, []);
  assert.equal(sinLab.orden.some((s) => s.id === "1000007"), false);
  const lab = sinLab.rush.filas.find((f) => f.id === "1000007");
  assert.equal(lab.requerido, 1);
  assert.equal(lab.hecho, true);
  assert.equal(lab.clase, "requisito");

  const th11 = JSON.parse(readFileSync(new URL("../data/2026-10-07/th11_R02YUVC0J_2026-10-07_a45e.json", import.meta.url)));
  const bajo = road(th11, { modo: "rushear", rush: "estrategico", th: 12 }, []);
  assert.equal(bajo.rush.sugerencias.find((s) => s.id === "1000068").aplica, false);
  assert.equal(bajo.rush.sugerencias.find((s) => s.id === "1000059").aplica, false);
  assert.equal(bajo.orden.some((s) => s.id === "1000068" || s.id === "1000059"), false);
  assert.equal(bajo.rush.filas.some((f) => f.id === "1000068"), false);

  const c1bajo = structuredClone(c1);
  c1bajo.buildings.find((b) => b.data === 1000001).lvl = 17;
  const fuera = road(c1bajo, { modo: "rushear", rush: "estrategico", th: 18 }, []);
  assert.equal(fuera.heroesFuera, true);
  assert.equal(fuera.orden.some((s) => s.categoryKey === "heroes"), false);
  assert.equal(fuera.rush.filas.some((f) => f.id === "28000000"), false);
  assert.equal(fuera.rush.sugerencias.find((s) => s.id === "heroes").aplica, false);
  assert.match(fuera.rush.sugerencias.find((s) => s.id === "heroes").motivo, /#28PLGP0G2/);

  const th17 = structuredClone(c2);
  const hall = th17.buildings.find((b) => b.data === 1000001);
  hall.lvl = 17;
  hall.weapon = 1;
  const arma = road(th17, { modo: "rushear", th: 18 }, []);
  assert.equal(arma.orden.some((s) => s.id === "inferno-artillery" && s.rushClase === "requisito"), true);
  const costeArma = sumaPasos(arma.orden);
  assert.equal(arma.coste.oro, costeArma.oro);
  assert.ok(arma.coste.oro >= 10000000 + 12000000 + 14000000 + 18000000);

  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /Rush esencial/);
  assert.match(app, /Rush estratégico/);
  assert.match(app, /data-rush/);
  assert.match(app, /data-sugerencia/);
  assert.match(app, /Coste total/);
  assert.match(app, /Tiempo con/);
  assert.match(app, /Fecha estimada/);
  assert.match(app, /data-cobertura/);
  assert.equal(app.includes("data-recursos"), false);
  assert.match(app, /recursosDeCuenta/);
  assert.equal(app.includes("cuello de botella"), false);
  assert.equal(app.includes("ID deducido"), false);
});

test("4.1.6: desde TH17 la subida pide las fusiones al máximo y los requisitos del ayuntamiento", () => {
  const th17 = structuredClone(c2);
  const hall = th17.buildings.find((b) => b.data === 1000001);
  hall.lvl = 17;
  hall.weapon = 1;
  const subida = requisitosAyuntamiento(th17, index, 18);
  const filas = subida.pasos.find((p) => p.desde === 17).filas;
  const fusion = (id) => filas.find((f) => f.id === id && f.fusion);
  assert.equal(fusion("1000008").requerido, 21);
  assert.equal(fusion("1000009").requerido, 21);
  assert.equal(fusion("1000011").requerido, 17);
  assert.equal(fusion("1000031").requerido, 7);
  assert.equal(fusion("1000008").provisional, true);
  assert.ok(filas.some((f) => f.id === "inferno-artillery"));
  assert.ok(filas.some((f) => f.id === "1000010"));
  const previo = requisitosAyuntamiento(c2, index, 17).pasos[0].filas;
  assert.equal(previo.some((f) => f.fusion), false);
  assert.equal(caps["18"].Wall.max, 19);
  assert.equal(caps["18"].Wall.count, 325);
});

test("4.1.6: el plan prioriza desbloqueos, almacenes, oro y elixir, y aparta muros y artesanales", () => {
  const pasos = [
    { id: "1000010", queue: "constructor", seconds: 60, instance: "m", fromLvl: 1, toLvl: 2, title: "Muro", categoryKey: "muros" },
    { id: "1000097", queue: "constructor", seconds: 60, instance: "d", fromLvl: 1, toLvl: 2, title: "Defensa artesanal", categoryKey: "defensas" },
    { id: "1000008", queue: "constructor", seconds: 60, instance: "c", fromLvl: 1, toLvl: 2, title: "Cañón", categoryKey: "defensas" },
    { id: "1000000", queue: "constructor", seconds: 60, instance: "e", fromLvl: 1, toLvl: 2, title: "Campamento", categoryKey: "ejercito_edif" },
    { id: "1000071", queue: "constructor", seconds: 60, instance: "h", fromLvl: 1, toLvl: 2, title: "Consejo heroico", categoryKey: "ejercito_edif" },
    { id: "1000070", queue: "constructor", seconds: 60, instance: "b", fromLvl: 1, toLvl: 2, title: "Herrería", categoryKey: "ejercito_edif" },
    { id: "1000068", queue: "constructor", seconds: 60, instance: "p", fromLvl: 1, toLvl: 2, title: "Caseta de animales", categoryKey: "ejercito_edif" },
    { id: "1000059", queue: "constructor", seconds: 60, instance: "t", fromLvl: 1, toLvl: 2, title: "Taller", categoryKey: "ejercito_edif" },
    { id: "1000005", queue: "constructor", seconds: 60, instance: "g", fromLvl: 1, toLvl: 2, title: "Almacén de oro", categoryKey: "recursos" },
  ];
  const caro = { id: "1000008", queue: "constructor", seconds: 60, instance: "caro", fromLvl: 11, toLvl: 12, title: "Cañón caro", categoryKey: "defensas" };
  const exp = { buildings: [{ data: 1000005, lvl: 1, cnt: 1 }] };
  marcarCabida([caro, pasos[8]], exp);
  assert.equal(caro.noCabe, true);
  assert.equal(pasos[8].antesDeNoCabe, true);
  const orden = ordenarParaPlan([...pasos, caro]);
  const ids = orden.map((s) => s.instance);
  assert.deepEqual(new Set(ids.slice(0, 4)), new Set(["h", "b", "p", "t"]));
  assert.ok(ids.indexOf("g") < ids.indexOf("caro"));
  assert.ok(ids.indexOf("caro") < ids.indexOf("m"));
  assert.equal(ids.at(-1), "d");
  const medio = orden.filter((s) => s.instance === "c" || s.instance === "e");
  assert.deepEqual(medio.map((s) => s.instance), ["c", "e"]);
  const subida = [];
  for (let i = 0; i < 10; i += 1) {
    subida.push({ id: "1000008", queue: "constructor", seconds: 3600, instance: "n" + i, rushClase: "sugerencia" });
  }
  subida.push({ id: "1000071", queue: "constructor", seconds: 100, instance: "req", rushClase: "requisito" });
  subida.push({ id: "town-hall", queue: "constructor", seconds: 4 * 3600, instance: "town-hall", rushClase: "requisito" });
  const listo = prepararSubida(subida);
  assert.equal(listo[0].instance, "req");
  const thAt = listo.findIndex((s) => s.id === "town-hall");
  const antes = listo.slice(1, thAt);
  assert.equal(antes.reduce((n, s) => n + s.seconds, 0), 6 * 3600);
  assert.equal(listo.length - thAt - 1, 4);
  const th11 = JSON.parse(readFileSync(new URL("../data/2026-10-07/th11_R02YUVC0J_2026-10-07_a45e.json", import.meta.url)));
  const plan11 = road(th11, { modo: "maxear" }, []);
  const fija = plan11.lanes.find((l) => l.reservaHeroe);
  assert.ok(fija);
  const heroes = plan11.orden.filter((s) => s.categoryKey === "heroes" && s.laneId);
  assert.ok(heroes.length > 0);
  assert.equal(heroes.every((s) => s.laneId === fija.id), true);
  const deC1 = road(c1, { modo: "maxear" }, []);
  assert.equal(deC1.orden.some((s) => s.categoryKey === "heroes"), false);
  assert.equal(deC1.lanes.some((l) => l.reservaHeroe), false);
  assert.equal(deC1.lanes.filter((l) => l.cola === "constructor").length, 6);
  const dia = [0, 1, 2, 3, 4, 5, 6].map(() => [{ inicio: 0, minutos: 1440 }]);
  const sueno = { desde: 23 * 60, hasta: 7 * 60 };
  const base = [{ id: "1000008", queue: "constructor", seconds: 3600, instance: "z", fromLvl: 1, toLvl: 2, title: "Cañón", categoryKey: "defensas" }];
  const lanes = [{ id: "c0", cola: "constructor", freeAt: now, th: 16, libreYa: true, blocked: false }];
  const conSueno = programar(base.map((s) => ({ ...s })), lanes.map((l) => ({ ...l })), sueno, now);
  const conSesion = programar(base.map((s) => ({ ...s })), lanes.map((l) => ({ ...l })), semanaPlan(), now);
  const conDia = programar(base.map((s) => ({ ...s })), lanes.map((l) => ({ ...l })), dia, now);
  assert.equal(conSueno.orden[0].inicio, conSesion.orden[0].inicio);
  assert.equal(conSesion.orden[0].inicio, Date.parse("2026-10-11T17:00:00Z"));
  assert.equal(conDia.orden[0].inicio, now);
  const noche = programar(base.map((s) => ({ ...s })), lanes.map((l) => ({ ...l })), semanaPlan(), Date.parse("2026-10-11T22:30:00Z"));
  assert.equal(noche.orden[0].inicio, Date.parse("2026-10-12T17:00:00Z"));
});

test("4.2.4: si no cabe, el almacén va antes y la mejora queda bloqueada", () => {
  const soloTh = capacidadAldea({ buildings: [{ data: 1000001, lvl: 18 }] });
  assert.equal(soloTh.oro, 5000000);
  assert.equal(soloTh.elixir, 5000000);
  assert.equal(soloTh.oscuro, 50000);
  const conAlmacen = capacidadAldea({ buildings: [{ data: 1000001, lvl: 18 }, { data: 1000005, lvl: 19, cnt: 1 }] });
  assert.equal(conAlmacen.oro, 5000000 + 6500000);
  assert.equal(capacidadAldea({ buildings: [] }).oro, 0);

  const th8 = {
    buildings: [
      { data: 1000001, lvl: 8 },
      { data: 1000005, lvl: 8, cnt: 1 },
      { data: 1000003, lvl: 8, cnt: 1 },
      { data: 1000024, lvl: 2, cnt: 1 },
    ],
  };
  const cap8 = capacidadAldea(th8);
  assert.equal(cap8.oro, 225000 + 750000);
  assert.equal(cap8.elixir, 225000 + 750000);
  assert.equal(cap8.oscuro, 17500 + 5000);
  const subida8 = { id: "town-hall", fromLvl: 8, toLvl: 9, instance: "town-hall", queue: "constructor", seconds: costeTh(9).segundos, title: "Ayuntamiento", categoryKey: "recursos" };
  const barato = { id: "1000008", fromLvl: 1, toLvl: 2, instance: "1000008#0", queue: "constructor", seconds: levelCost("1000008", 2).s, title: "Cañón", categoryKey: "defensas" };
  marcarCabida([subida8, barato], th8, index);
  assert.equal(costeTh(9).oro > cap8.oro, true);
  assert.equal(subida8.noCabe, true);
  assert.match(subida8.motivo, /No cabe en el oro/);
  assert.equal(barato.noCabe, false);

  const exp = {
    buildings: [
      { data: 1000001, lvl: 10 },
      { data: 1000005, lvl: 10, cnt: 1 },
      { data: 1000003, lvl: 10, cnt: 1 },
      { data: 1000024, lvl: 2, cnt: 1 },
    ],
  };
  const cap = capacidadAldea(exp);
  assert.equal(cap.oro, 850000 + 1500000);
  assert.equal(cap.elixir, 850000 + 1500000);
  assert.equal(cap.oscuro, 17500 + 20000);
  const th = { id: "town-hall", fromLvl: 10, toLvl: 11, instance: "town-hall", queue: "constructor", seconds: costeTh(11).segundos, title: "Ayuntamiento", categoryKey: "recursos" };
  const oro = { id: "1000005", fromLvl: 10, toLvl: 11, instance: "1000005#0", queue: "constructor", seconds: levelCost("1000005", 11).s, title: "Almacén de oro", categoryKey: "recursos" };
  const elixir = { id: "1000003", fromLvl: 10, toLvl: 11, instance: "1000003#0", queue: "constructor", seconds: levelCost("1000003", 11).s, title: "Almacén de elixir", categoryKey: "recursos" };
  const oscuro = { id: "1000024", fromLvl: 2, toLvl: 3, instance: "1000024#0", queue: "constructor", seconds: levelCost("1000024", 3).s, title: "Almacén de elixir oscuro", categoryKey: "recursos" };
  const canon = { id: "1000008", fromLvl: 1, toLvl: 2, instance: "1000008#1", queue: "constructor", seconds: levelCost("1000008", 2).s, title: "Cañón", categoryKey: "defensas" };
  const caro = { id: "1000008", fromLvl: 20, toLvl: 21, instance: "1000008#2", queue: "constructor", seconds: levelCost("1000008", 21).s, title: "Cañón", categoryKey: "defensas" };
  const muro = { id: "1000010", fromLvl: 16, toLvl: 17, instance: "1000010#0", queue: "constructor", seconds: 0, title: "Muro", categoryKey: "muros" };
  const cuartel = { id: "1000026", fromLvl: 7, toLvl: 8, instance: "1000026#0", queue: "constructor", seconds: levelCost("1000026", 8).s, title: "Cuartel oscuro", categoryKey: "ejercito_edif" };
  const tropa = { id: "4000010", fromLvl: 7, toLvl: 8, instance: "4000010#0", queue: "laboratorio", seconds: levelCost("4000010", 8).s, title: "Tropa", categoryKey: "laboratorio" };
  const pasos = [th, oro, elixir, oscuro, canon, caro, muro, cuartel, tropa];
  marcarCabida(pasos, exp, index);

  assert.equal(costeTh(11).oro > cap.oro, true);
  assert.equal(th.noCabe, true);
  assert.equal(th.motivo, "No cabe en el oro: cuesta 4\u00a0000\u00a0000 y caben 2\u00a0350\u00a0000.");
  assert.equal(oro.antesDeNoCabe, true);
  assert.equal(oro.noCabe, false);
  assert.equal(oro.seconds, levelCost("1000005", 11).s);
  const oro14 = pasos.find((s) => s.id === "1000005" && s.toLvl === 14);
  assert.ok(oro14);
  assert.equal(levelCost("1000005", 14).n > cap.elixir, true);
  assert.equal(oro14.antesDeNoCabe, true);
  assert.equal(oro14.noCabe, false);
  assert.equal(oro14.title, "Almacén de oro");
  assert.equal(pasos.some((s) => s.id === "1000005" && s.toLvl > 14), false);

  assert.equal(canon.noCabe, false);
  assert.equal(caro.noCabe, true);
  assert.match(caro.motivo, /No cabe en el oro: cuesta 3\u00a0000\u00a0000/);
  assert.equal(muro.noCabe, true);
  assert.equal(muro.motivo, "No cabe en el oro ni en el elixir: cuesta 5\u00a0000\u00a0000 y caben 2\u00a0350\u00a0000 y 2\u00a0350\u00a0000.");
  assert.equal(cuartel.noCabe, true);
  assert.match(cuartel.motivo, /No cabe en el elixir/);
  assert.equal(elixir.antesDeNoCabe, true);
  assert.equal(elixir.noCabe, false);
  assert.equal(pasos.some((s) => s.id === "1000003" && s.toLvl > 17), false);
  assert.equal(tropa.noCabe, true);
  assert.match(tropa.motivo, /elixir oscuro/);
  assert.equal(oscuro.antesDeNoCabe, true);
  assert.equal(oscuro.noCabe, false);
  assert.equal(oscuro.seconds, levelCost("1000024", 3).s);

  const arma = { id: "inferno-artillery", fromLvl: 1, toLvl: 2, instance: "inferno-artillery#0", queue: "constructor", seconds: 518400, title: "Artillería infernal", categoryKey: "defensas" };
  marcarCabida([arma], { buildings: [{ data: 1000001, lvl: 18 }] }, index);
  assert.equal(arma.noCabe, true);
  assert.match(arma.motivo, /cuesta 10\u00a0000\u00a0000 y caben 5\u00a0000\u00a0000/);

  const gratis = { id: "1000010", fromLvl: 0, toLvl: 1, instance: "1000010#1", queue: "constructor", seconds: 0, title: "Muro", categoryKey: "muros" };
  marcarCabida([gratis], { buildings: [] }, index);
  assert.equal(gratis.noCabe, false);

  const lanes = [{ id: "c0", cola: "constructor", titulo: "Constructor 1", libreEn: now, freeAt: now, libreYa: true, blocked: false }];
  const placed = programar(pasos, lanes, null, now);
  const thP = placed.orden.find((s) => s.id === "town-hall");
  const oroP = placed.orden.find((s) => s.id === "1000005" && s.fromLvl === 10);
  const oscuroP = placed.orden.find((s) => s.id === "1000024");
  assert.equal(thP.inicio, null);
  assert.equal(thP.fin, null);
  assert.equal(thP.laneId, null);
  assert.equal(thP.noCabe, true);
  assert.equal(placed.orden.find((s) => s.id === "1000008" && s.toLvl === 21).inicio, null);
  assert.equal(placed.orden.find((s) => s.id === "1000010").inicio, null);
  assert.equal(placed.orden.find((s) => s.queue === "laboratorio").inicio, null);
  assert.ok(oroP.inicio != null);
  assert.ok(oroP.fin > oroP.inicio);
  assert.equal(costeDePaso(oroP).elixir, levelCost("1000005", 11).n);
  assert.equal(oroP.seconds, levelCost("1000005", 11).s);
  assert.ok(oscuroP.inicio != null);
  assert.equal(oscuroP.seconds, levelCost("1000024", 3).s);
  assert.ok(placed.orden.find((s) => s.id === "1000008" && s.toLvl === 2).inicio != null);
  assert.ok(placed.orden.findIndex((s) => s.antesDeNoCabe && s.id === "1000005") < placed.orden.findIndex((s) => s.id === "town-hall"));
});
