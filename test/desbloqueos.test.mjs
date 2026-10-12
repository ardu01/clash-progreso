import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fijarDesbloqueos, libroDesbloqueos } from "../js/desbloqueos.js";
import { levelCost } from "../js/costs.js";
import { HEROES_FUERA } from "../js/plan.js";
import { indexCaps } from "../js/progress.js";
import { aplicarDesbloqueos, buildRoadmap, costeDePaso, requisitosAyuntamiento } from "../js/roadmap.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const reglas = JSON.parse(readFileSync(new URL("../data/ref/desbloqueos.json", import.meta.url)));
const index = indexCaps(caps, manifest);
fijarDesbloqueos(reglas, manifest.items);
const now = Date.parse("2026-10-11T12:00:00Z");
const dir = new URL("../data/2026-10-07/", import.meta.url);

function ceroAUno(orden) {
  return (orden || []).filter((s) => s.fromLvl === 0 && s.toLvl === 1 && s.seconds === 0);
}

test("4.2.4: ningún paso de 0 a 1 lleva tiempo 0", () => {
  const libro = libroDesbloqueos();
  assert.ok(libro.porId.size > 100);
  assert.equal(libro.hallId, "1000071");
  assert.equal(libro.petId, "1000068");
  assert.equal(libro.edificioPorClave.get("barracks"), "1000006");
  assert.equal(libro.edificioPorClave.get("spell_factory"), "1000020");
  assert.equal(libro.edificioPorClave.get("workshop"), "1000059");
  const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
  assert.equal(files.length, 11);
  for (const name of files) {
    const exp = JSON.parse(readFileSync(new URL(name, dir)));
    for (const plan of [null, { modo: "rushear", rush: "estrategico", th: 18 }]) {
      const road = buildRoadmap({ exp, index, tag: exp.tag, plan, provisionals: [], sleep: null, now });
      const mal = ceroAUno(road.orden);
      assert.deepEqual(mal.map((s) => `${s.title} ${s.id}`), [], `${exp.tag} ${plan && plan.modo || "maxear"}`);
    }
  }
});

test("4.2.4: la construcción nueva usa el tiempo de la fuente y ocupa un constructor", () => {
  const canon = reglas.buildings.find((b) => b.key === "cannon");
  const steps = [{
    id: "1000008", fromLvl: 0, toLvl: 1, seconds: 0, instance: "1000008#1",
    queue: "constructor", categoryKey: "defensas", title: "Cañón", goal: 2,
  }];
  const exp = { tag: "#TEST", buildings: [{ data: 1000001, lvl: 2 }, { data: 1000008, lvl: 1 }] };
  aplicarDesbloqueos(steps, exp, index, exp.tag);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].seconds, canon.level1_build_time_seconds);
  assert.ok(steps[0].seconds > 0);
  assert.equal(steps[0].queue, "constructor");
  assert.equal(steps[0].sinConfirmar, false);
  assert.equal(costeDePaso(steps[0]).oro, canon.level1_cost.amount);
});

test("4.2.4: la tropa espera al cuartel y el héroe al Consejo", () => {
  const dragon = libroDesbloqueos().porId.get("4000008");
  assert.equal(dragon.prerrequisito, "1000006");
  assert.equal(dragon.nivel, 9);
  const steps = [
    { id: "4000008", fromLvl: 0, toLvl: 1, seconds: 0, instance: "4000008#0", queue: "laboratorio", categoryKey: "laboratorio", title: "Dragón" },
    { id: "4000008", fromLvl: 1, toLvl: 2, seconds: levelCost("4000008", 2).s, instance: "4000008#0", queue: "laboratorio", categoryKey: "laboratorio", title: "Dragón" },
  ];
  const exp = {
    tag: "#T",
    buildings: [{ data: 1000001, lvl: 8 }, { data: 1000006, lvl: 7 }],
  };
  aplicarDesbloqueos(steps, exp, index, exp.tag);
  assert.equal(steps.some((s) => s.id === "4000008" && s.fromLvl === 0), false);
  const cuartel = steps.find((s) => s.id === "1000006" && s.toLvl === 9);
  assert.ok(cuartel);
  assert.equal(cuartel.abreDesbloqueo, true);
  assert.equal(cuartel.queue, "constructor");
  assert.ok(cuartel.seconds > 0);
  assert.ok(cuartel.desbloquea.includes("Dragón"));
  const subida = steps.find((s) => s.id === "4000008" && s.fromLvl === 1);
  assert.equal(subida.esperaEdificio.instance, cuartel.instance);
  assert.equal(subida.esperaEdificio.nivel, 9);

  const warden = reglas.heroes.find((h) => h.key === "grand_warden");
  const heroes = [{
    id: "28000002", fromLvl: 0, toLvl: 1, seconds: 0, instance: "28000002#0",
    queue: "constructor", categoryKey: "heroes", title: "Gran centinela",
  }];
  const aldea = { tag: "#H", buildings: [{ data: 1000001, lvl: 11 }, { data: 1000071, lvl: 4 }] };
  aplicarDesbloqueos(heroes, aldea, index, aldea.tag);
  assert.equal(heroes.some((s) => s.id === "28000002" && s.fromLvl === 0 && s.seconds === 0), false);
  const consejo = heroes.find((s) => s.id === "1000071" && s.toLvl === warden.hero_hall_level);
  assert.ok(consejo);
  assert.equal(consejo.abreDesbloqueo, true);
  assert.equal(consejo.costeExtra.n, 1000000);
  assert.equal(consejo.costeExtra.r, "elixir");
  assert.equal(costeDePaso(consejo).elixir, levelCost("1000071", warden.hero_hall_level).n + 1000000);
  assert.ok(consejo.desbloquea.includes("Gran centinela"));
});

test("4.2.4: la mascota espera la caseta y lo sin confirmar no ocupa cola", () => {
  const steps = [{
    id: "73000000", fromLvl: 0, toLvl: 1, seconds: 0, instance: "73000000#0",
    queue: "mascotas", categoryKey: "mascotas", title: "L.A.S.S.I.",
  }];
  const exp = { tag: "#P", buildings: [{ data: 1000001, lvl: 14 }] };
  aplicarDesbloqueos(steps, exp, index, exp.tag);
  assert.equal(steps.some((s) => s.id === "73000000" && s.fromLvl === 0), false);
  const caseta = steps.find((s) => s.id === "1000068" && s.toLvl === 1);
  assert.ok(caseta);
  assert.equal(caseta.queue, "constructor");
  assert.ok(caseta.seconds > 0);
  assert.ok(caseta.desbloquea.includes("L.A.S.S.I."));

  const trampa = [{
    id: "12000016", fromLvl: 0, toLvl: 1, seconds: 0, instance: "12000016#0",
    queue: "constructor", categoryKey: "trampas", title: "Trampa tornado",
  }];
  aplicarDesbloqueos(trampa, { tag: "#X", buildings: [{ data: 1000001, lvl: 11 }] }, index, "#X");
  assert.equal(trampa[0].seconds, null);
  assert.equal(trampa[0].sinConfirmar, true);
  assert.equal(trampa[0].fueraDeCola, true);
  assert.notEqual(trampa[0].seconds, 0);
  const tornado = reglas.buildings.find((b) => b.key === "tornado_trap");
  assert.equal(costeDePaso(trampa[0]).oro, tornado.level1_cost.amount);
  assert.equal(costeDePaso(trampa[0]).sinCoste, 0);
});

test("4.2.4: el coste con cifra se usa y el null marcado no se inventa", () => {
  const libro = libroDesbloqueos();
  const bomba = reglas.buildings.find((b) => b.key === "air_bomb");
  const idBomba = libro.edificioPorClave.get("air_bomb");
  const steps = [{
    id: idBomba, fromLvl: 0, toLvl: 1, seconds: 0, instance: `${idBomba}#0`,
    queue: "constructor", categoryKey: "trampas", title: "Bomba aérea",
  }];
  aplicarDesbloqueos(steps, { tag: "#B", buildings: [{ data: 1000001, lvl: 5 }] }, index, "#B");
  assert.equal(steps[0].seconds, null);
  assert.equal(steps[0].sinConfirmar, true);
  assert.equal(steps[0].fueraDeCola, true);
  assert.equal(costeDePaso(steps[0]).oro, bomba.level1_cost.amount);

  const choza = libro.edificioPorClave.get("builders_hut");
  const hut = [{
    id: choza, fromLvl: 0, toLvl: 1, seconds: 0, instance: `${choza}#0`,
    queue: "constructor", categoryKey: "recursos", title: "Choza de constructor",
  }];
  aplicarDesbloqueos(hut, { tag: "#B", buildings: [{ data: 1000001, lvl: 2 }] }, index, "#B");
  assert.equal(hut[0].seconds, null);
  assert.equal(hut[0].costeOverride, undefined);
  assert.equal(costeDePaso(hut[0]).sinCoste, 1);
  assert.equal(costeDePaso(hut[0]).oro + costeDePaso(hut[0]).elixir, 0);

  const ayuda = libro.edificioPorClave.get("helper_hut");
  const ay = [{
    id: ayuda, fromLvl: 0, toLvl: 1, seconds: 0, instance: `${ayuda}#0`,
    queue: "constructor", categoryKey: "recursos", title: "Choza de los ayudantes",
  }];
  aplicarDesbloqueos(ay, { tag: "#B", buildings: [{ data: 1000001, lvl: 9 }] }, index, "#B");
  assert.equal(ay[0].costeOverride, undefined);
  assert.notEqual(costeDePaso(ay[0]).elixir, 1000000);
  assert.equal(ay[0].sinConfirmar, true);

  assert.equal(libro.porId.get("1000010").key, "walls");
  const muros = [{
    id: "1000010", fromLvl: 0, toLvl: 1, seconds: 0, instance: "1000010#0",
    queue: "constructor", categoryKey: "muros", title: "Muro",
  }];
  aplicarDesbloqueos(muros, { tag: "#B", buildings: [{ data: 1000001, lvl: 2 }] }, index, "#B");
  assert.equal(muros[0].seconds, null);
  assert.equal(muros[0].sinConfirmar, true);
  assert.equal(costeDePaso(muros[0]).sinCoste, 1);

  const castillo = libro.edificioPorClave.get("clan_castle");
  const cc = [{
    id: castillo, fromLvl: 0, toLvl: 1, seconds: 0, instance: `${castillo}#0`,
    queue: "constructor", categoryKey: "recursos", title: "Castillo del clan",
  }];
  aplicarDesbloqueos(cc, { tag: "#B", buildings: [{ data: 1000001, lvl: 2 }] }, index, "#B");
  assert.equal(cc[0].seconds, null);
  assert.equal(cc[0].sinConfirmar, true);
  assert.equal(costeDePaso(cc[0]).elixir, 10000);
});

test("4.2.4: el JSON grande se carga aparte y la capacidad derivada no entra", () => {
  const src = readFileSync(new URL("../js/desbloqueos.js", import.meta.url), "utf8");
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(src.includes("capacity_by_th"), false);
  assert.equal(src.includes("hero_equipment"), false);
  assert.match(app, /fetch\("\.\/data\/ref\/desbloqueos\.json\?v=" \+ APP_VERSION\)/);
  const libro = libroDesbloqueos();
  assert.equal(libro.porId.has("capacity_by_th"), false);
  assert.ok(libro.porId.size > 100);
});

test("4.2.4: C1 no mete héroes y el castillo no es requisito de ayuntamiento", () => {
  const c1 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c1_principal_2026-10-07_e53a.json", import.meta.url)));
  const road = buildRoadmap({ exp: c1, index, tag: c1.tag, plan: null, provisionals: [], sleep: null, now });
  assert.equal(c1.tag, HEROES_FUERA);
  assert.equal(road.orden.some((s) => s.categoryKey === "heroes"), false);
  const c2 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c2_secundaria_2026-10-07_43a4.json", import.meta.url)));
  const req = requisitosAyuntamiento(c2, index, 14);
  for (const paso of req.pasos) {
    assert.equal(paso.filas.some((f) => f.id === "1000014"), false);
  }
});
