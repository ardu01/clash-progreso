import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { levelCost } from "../js/costs.js";
import { fijarDesbloqueos, libroDesbloqueos } from "../js/desbloqueos.js";
import { reducir } from "../js/operaciones.js";
import { indexCaps } from "../js/progress.js";
import {
  aplicarDesbloqueos, avisoCastillo, buildRoadmap, costeDePaso, requisitosAyuntamiento,
} from "../js/roadmap.js";
import { ayudantesDe, simular } from "../js/simulacion.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const reglas = JSON.parse(readFileSync(new URL("../data/ref/desbloqueos.json", import.meta.url)));
const index = indexCaps(caps, manifest);
fijarDesbloqueos(reglas, manifest.items);
const now = Date.parse("2026-10-11T12:00:00Z");

function porNombre(nameEn) {
  for (const [id, item] of Object.entries(manifest.items)) {
    const sec = item.seccion_exportacion || "";
    if (sec.endsWith("2") || sec.includes("builder")) continue;
    if (item.nombre_en === nameEn) return libroDesbloqueos().porId.get(String(id));
  }
  return null;
}

function reglaDe(tipo) {
  return [...libroDesbloqueos().porId.values()].find((r) => r.tipo === tipo);
}

function pasoCero(id, title, queue) {
  return {
    id, fromLvl: 0, toLvl: 1, seconds: 0, instance: `${id}#0`,
    queue, categoryKey: queue === "constructor" ? "heroes" : queue, title,
  };
}

test("4.2.4 auditoría: un héroe espera el nivel del Consejo y no sale gratis", () => {
  const reina = reglas.heroes.find((h) => h.key === "archer_queen");
  const heroe = porNombre("Archer Queen");
  assert.equal(heroe.nivel, reina.hero_hall_level);
  assert.equal(heroe.prerrequisito, "1000071");
  assert.equal(reina.level1_cost, null);
  const steps = [pasoCero(heroe.id, "Reina arquera", "constructor")];
  const exp = { tag: "#H", buildings: [{ data: 1000001, lvl: 8 }, { data: 1000071, lvl: reina.hero_hall_level - 1 }] };
  aplicarDesbloqueos(steps, exp, index, exp.tag);
  assert.equal(steps.some((s) => s.id === heroe.id && s.fromLvl === 0), false);
  assert.equal(steps.some((s) => s.fromLvl === 0 && s.toLvl === 1 && s.seconds === 0), false);
  const consejo = steps.find((s) => s.id === "1000071" && s.toLvl === reina.hero_hall_level);
  assert.ok(consejo);
  assert.equal(consejo.abreDesbloqueo, true);
  assert.equal(consejo.queue, "constructor");
  assert.ok(consejo.seconds > 0);
  assert.ok(consejo.desbloquea.includes("Reina arquera"));
});

test("4.2.4 auditoría: tropa, hechizo y máquina esperan cuartel, fábrica o taller", () => {
  for (const tipo of ["tropa", "hechizo", "asedio"]) {
    const regla = reglaDe(tipo);
    assert.ok(regla.prerrequisito);
    assert.ok(regla.nivel >= 1);
    const queue = "laboratorio";
    const steps = [
      pasoCero(regla.id, regla.nombre, queue),
      { ...pasoCero(regla.id, regla.nombre, queue), fromLvl: 1, toLvl: 2, seconds: 3600 },
    ];
    const exp = { tag: "#E", buildings: [{ data: 1000001, lvl: 12 }, { data: Number(regla.prerrequisito), lvl: regla.nivel - 1 }] };
    aplicarDesbloqueos(steps, exp, index, exp.tag);
    assert.equal(steps.some((s) => s.id === regla.id && s.fromLvl === 0 && s.seconds === 0), false, tipo);
    const edificio = steps.find((s) => s.id === regla.prerrequisito && s.toLvl === regla.nivel);
    assert.ok(edificio, tipo);
    assert.equal(edificio.queue, "constructor");
    assert.equal(edificio.abreDesbloqueo, true);
    assert.ok(edificio.desbloquea.includes(regla.nombre));
    const siguiente = steps.find((s) => s.id === regla.id && s.fromLvl === 1);
    assert.equal(siguiente.esperaEdificio.instance, edificio.instance);
    assert.equal(siguiente.esperaEdificio.nivel, regla.nivel);
  }
});

test("4.2.4 auditoría: la mascota espera el nivel de la Caseta que la abre", () => {
  const lassi = reglas.pets.find((p) => p.key === "lassi");
  const regla = porNombre(lassi.name_en);
  assert.equal(regla.prerrequisito, "1000068");
  assert.equal(regla.nivel, lassi.pet_house_level);
  const steps = [pasoCero(regla.id, "L.A.S.S.I.", "mascotas")];
  aplicarDesbloqueos(steps, { tag: "#P", buildings: [{ data: 1000001, lvl: 14 }] }, index, "#P");
  assert.equal(steps.some((s) => s.id === regla.id && s.fromLvl === 0), false);
  const caseta = steps.find((s) => s.id === "1000068" && s.toLvl === lassi.pet_house_level);
  assert.ok(caseta);
  assert.equal(caseta.queue, "constructor");
  assert.equal(caseta.seconds, lassi.pet_house_level_build_time_seconds);
  assert.ok(caseta.desbloquea.includes("L.A.S.S.I."));
});

test("4.2.4 auditoría: el nivel 1 del Centinela y de la choza salen de desbloqueos", () => {
  const centinela = reglas.heroes.find((h) => h.key === "grand_warden");
  const heroe = porNombre("Grand Warden");
  assert.equal(centinela.level1_cost.amount, 1000000);
  assert.equal(centinela.level1_cost.resource, "Elixir");
  assert.equal(levelCost(heroe.id, 1).s, 0);
  const steps = [pasoCero(heroe.id, "Gran centinela", "constructor")];
  const exp = { tag: "#W", buildings: [{ data: 1000001, lvl: 11 }, { data: 1000071, lvl: centinela.hero_hall_level - 1 }] };
  aplicarDesbloqueos(steps, exp, index, exp.tag);
  assert.equal(steps.some((s) => s.id === heroe.id && s.fromLvl === 0 && s.seconds === 0), false);
  const consejo = steps.find((s) => s.id === "1000071" && s.toLvl === centinela.hero_hall_level);
  assert.equal(consejo.costeExtra.n, centinela.level1_cost.amount);
  assert.equal(consejo.costeExtra.r, "elixir");
  assert.equal(costeDePaso(consejo).elixir, levelCost("1000071", centinela.hero_hall_level).n + centinela.level1_cost.amount);

  const chozaRegla = reglas.buildings.find((b) => b.key === "builders_hut");
  assert.equal(chozaRegla.level1_cost, null);
  assert.equal(chozaRegla.level1_build_time_seconds, null);
  const choza = libroDesbloqueos().edificioPorClave.get("builders_hut");
  assert.equal(levelCost(choza, 1).n, 0);
  assert.equal(levelCost(choza, 1).s, 0);
  const hut = [pasoCero(choza, "Choza de constructor", "constructor")];
  aplicarDesbloqueos(hut, { tag: "#C", buildings: [{ data: 1000001, lvl: 2 }] }, index, "#C");
  assert.equal(hut[0].seconds, null);
  assert.equal(hut[0].sinConfirmar, true);
  assert.equal(hut[0].fueraDeCola, true);
  assert.equal(costeDePaso(hut[0]).sinCoste, 1);
  assert.equal(costeDePaso(hut[0]).oro, 0);
});

test("4.2.4 auditoría: aprendiz y asistente entran en la simulación solo si la cuenta los tiene", () => {
  const con = simular({
    segConstructor: 86400,
    constructores: 1,
    exp: { helpers: [{ data: 93000000, lvl: 4 }, { data: 93000001, lvl: 1 }] },
  });
  const sin = simular({ segConstructor: 86400, constructores: 1, exp: { helpers: [] } });
  assert.equal(con.constructorAprendiz.lvl, 4);
  assert.equal(con.asistenteLaboratorio.lvl, 1);
  assert.equal(sin.constructorAprendiz, null);
  assert.equal(sin.asistenteLaboratorio, null);
  assert.equal(con.dias, sin.dias);
  assert.equal(con.dias, 1);
  const c1 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c1_principal_2026-10-07_e53a.json", import.meta.url)));
  const road = buildRoadmap({ exp: c1, index, tag: c1.tag, plan: null, provisionals: [], sleep: null, now });
  assert.deepEqual(road.ayudantes, ayudantesDe(c1));
  assert.equal(road.ayudantes.constructorAprendiz.lvl, 4);
  assert.equal(road.ayudantes.asistenteLaboratorio.lvl, 1);
  const th11 = JSON.parse(readFileSync(new URL("../data/2026-10-07/th11_R02YUVC0J_2026-10-07_a45e.json", import.meta.url)));
  const otra = buildRoadmap({ exp: th11, index, tag: th11.tag, plan: null, provisionals: [], sleep: null, now });
  assert.equal(otra.ayudantes.constructorAprendiz, null);
  assert.equal(otra.ayudantes.asistenteLaboratorio.lvl, 1);
  const calc = reducir({ id: "operaciones" }, "sim-calc", "", {
    cuentas: [{ tag: "#T", helpers: [{ id: "93000000", lvl: 2 }], segConstructor: 0 }],
  });
  assert.equal(calc.doc.sim.resultado.constructorAprendiz.lvl, 2);
  assert.equal(calc.doc.sim.resultado.asistenteLaboratorio, null);
});

test("4.2.4 auditoría: el castillo no es requisito del ayuntamiento y solo avisa", () => {
  const tabla = index.byId.get("1000014");
  let th = 10;
  let cap = tabla.get(th);
  while (th < 17 && (!cap || cap.max == null || cap.max < 1)) {
    th += 1;
    cap = tabla.get(th);
  }
  assert.ok(cap && cap.max >= 1);
  const corto = {
    tag: "#K",
    buildings: [{ data: 1000001, lvl: th }, { data: 1000014, lvl: cap.max - 1 }],
  };
  const req = requisitosAyuntamiento(corto, index, th + 1);
  for (const paso of req.pasos) {
    assert.equal(paso.filas.some((f) => f.id === "1000014"), false);
  }
  assert.equal(req.avisos.length, 1);
  assert.match(req.avisos[0].texto, /no se exige/);
  assert.match(req.avisos[0].texto, /no está confirmado/);
  assert.equal(req.avisos[0].actual, cap.max - 1);
  const alDia = {
    tag: "#K",
    buildings: [{ data: 1000001, lvl: th }, { data: 1000014, lvl: cap.max }],
  };
  assert.equal(avisoCastillo(alDia, index), null);
  assert.equal(requisitosAyuntamiento(alDia, index, th + 1).avisos.length, 0);
  const road = buildRoadmap({
    exp: corto, index, tag: corto.tag,
    plan: { modo: "rushear", rush: "esencial", th: th + 1 },
    provisionals: [], sleep: null, now,
  });
  assert.equal(road.orden.some((s) => s.id === "1000014"), false);
  assert.match(road.avisoCastillo.texto, /Aviso/);
});
