import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ACCOUNT_PALETTE, accountColor, groupedByCategory, lineSeries } from "../js/charts.js";
import { IMAGE_CACHE } from "../js/caches.js";
import { HEROES_FUERA, planQueue, upgradePlan } from "../js/plan.js";
import {
  accountTimeline, finDe, fleetAgenda, inSleep, nextAwake, scheduleNext, segundosDe, sleepFromClocks,
} from "../js/schedule.js";

test("la caché de imágenes está en cp-img-v7", () => {
  assert.equal(IMAGE_CACHE, "cp-img-v7");
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /\.\/js\/schedule\.js/);
  assert.match(sw, /\.\/js\/charts\.js/);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /Pegar exportación/);
  assert.match(app, /#\/agenda/);
  assert.equal(app.includes("cuello de botella"), false);
  assert.match(app, /Sin hora exacta/);
});

test("once colores distintos para las cuentas del roster", () => {
  const colors = Array.from({ length: 11 }, (_, i) => accountColor(i));
  assert.equal(new Set(colors).size, 11);
  assert.equal(colors[0], ACCOUNT_PALETTE[0]);
  assert.equal(accountColor(12), ACCOUNT_PALETTE[0]);
});

test("las barras agrupan por categoría y conservan el color de cada cuenta", () => {
  const rows = [
    { tag: "#A", nombre: "Una", chip: "A", color: "#111111", cats: { defensas: 10, muros: null } },
    { tag: "#B", nombre: "Otra", chip: "B", color: "#222222", cats: { defensas: 40, muros: 5 } },
  ];
  const cats = [{ key: "defensas", label: "Defensas" }, { key: "muros", label: "Muros" }];
  const groups = groupedByCategory(rows, cats);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].bars.length, 2);
  assert.equal(groups[0].bars[1].value, 40);
  assert.equal(groups[0].bars[1].color, "#222222");
  assert.equal(groups[1].bars[0].value, null);
  const series = lineSeries([
    { name: "Una", points: [{ day: "2026-10-07", v: 50 }] },
    { name: "Otra", points: [] },
  ]);
  assert.equal(series.length, 1);
  assert.equal(series[0].name, "Una");
});

test("finDe no inventa una hora si el timer no es un número", () => {
  assert.deepEqual(finDe(1791400940, 3600), { exacta: true, fin: (1791400940 + 3600) * 1000 });
  assert.equal(finDe(1791400940, "2 días").exacta, false);
  assert.equal(finDe(1791400940, null).exacta, false);
  assert.equal(finDe(undefined, 10).exacta, false);
});

test("el sueño de Madrid no deja empezar ni acabar dentro del tramo", () => {
  const sleep = sleepFromClocks("23:00", "08:00");
  assert.ok(sleep);
  assert.equal(sleepFromClocks("", "08:00"), null);
  assert.equal(sleepFromClocks("08:00", "08:00"), null);
  const night = Date.parse("2026-10-12T00:30:00Z");
  assert.equal(inSleep(night, sleep), true);
  const wake = nextAwake(night, sleep);
  assert.equal(wake, Date.parse("2026-10-12T06:00:00Z"));
  assert.equal(inSleep(wake, sleep), false);
  const evening = Date.parse("2026-10-11T18:00:00Z");
  const short = scheduleNext(evening, 2 * 3600, sleep);
  assert.equal(short.inicio, evening);
  assert.equal(short.fin, evening + 2 * 3600 * 1000);
  const late = scheduleNext(Date.parse("2026-10-11T20:00:00Z"), 3 * 3600, sleep);
  assert.equal(inSleep(late.inicio, sleep), false);
  assert.equal(inSleep(late.fin, sleep), false);
  assert.equal(late.finEnSueno, false);
  const long = scheduleNext(Date.parse("2026-10-11T08:00:00Z"), 20 * 3600, null);
  assert.equal(long.fin - long.inicio, 20 * 3600 * 1000);
  const overnight = scheduleNext(Date.parse("2026-10-11T06:00:00Z"), 20 * 3600, sleep);
  assert.equal(overnight.fin - overnight.inicio, 20 * 3600 * 1000);
  assert.equal(inSleep(overnight.inicio, sleep), false);
  assert.equal(inSleep(overnight.fin, sleep), false);
  const missing = scheduleNext(evening, null, sleep);
  assert.equal(missing.fin, null);
  assert.equal(missing.sinDuracion, true);
});

test("la línea sin hora no recibe un fin inventado y C1 no propone héroes", () => {
  const sleep = sleepFromClocks("23:00", "08:00");
  const now = Date.parse("2026-10-11T18:00:00Z");
  const tl = accountTimeline({
    builders: { known: true, total: 2 },
    actuales: [
      { queue: "constructor", extra: false, done: false, exacta: false, fin: null, nombre: "Cañón" },
      { queue: "constructor", extra: false, done: false, exacta: true, fin: now + 3600_000, nombre: "Mortero" },
    ],
    siguientes: [
      { queue: "constructor", id: "1000008", lvl: 1, max: 21, title: "Cañón siguiente" },
      { queue: "constructor", id: "1000009", lvl: 1, max: 21, title: "Torre de arqueras" },
      { queue: "laboratorio", id: "4000000", lvl: 1, max: 12, title: "Bárbaro" },
    ],
    sleep,
    now,
    mascotas: false,
  });
  assert.equal(tl.avisoHora, true);
  const sinHora = tl.lineas.find((line) => line.actual && line.actual.exacta === false);
  assert.equal(sinHora.siguiente.sinHora, true);
  assert.equal(sinHora.siguiente.fin, null);
  const conHora = tl.lineas.find((line) => line.actual && line.actual.nombre === "Mortero");
  assert.equal(conHora.siguiente.sinHora, false);
  assert.equal(typeof conHora.siguiente.fin, "number");
  const lab = tl.lineas.find((line) => line.cola === "laboratorio");
  assert.equal(lab.libreYa, true);
  assert.equal(lab.siguiente.title, "Bárbaro");
  assert.equal(typeof lab.siguiente.fin, "number");
  const heroes = planQueue([
    { categoryKey: "heroes", queue: "constructor", title: "Rey", lvl: 1, max: 90, upgrading: false, id: "28000000" },
    { categoryKey: "defensas", queue: "constructor", title: "Cañón", lvl: 1, max: 21, upgrading: false, id: "1000008" },
  ], { tag: HEROES_FUERA });
  assert.equal(heroes.some((item) => item.categoryKey === "heroes"), false);
  const plan = upgradePlan(heroes, { tag: HEROES_FUERA, constructoresLibres: 1, labLibre: false, mascotasLibres: false });
  assert.equal(plan.heroesFuera, true);
  assert.equal(plan.constructor[0].title, "Cañón");
  assert.equal(segundosDe("1000008", 1) > 0, true);
});

test("la agenda separa lo libre, lo fechado y lo que no tiene hora", () => {
  const now = Date.parse("2026-10-11T18:00:00Z");
  const agenda = fleetAgenda([
    {
      tag: "#A",
      nombre: "Aldea",
      chip: "A",
      lineas: [
        { titulo: "Constructor 1", libreYa: true, libreExacta: true, libreEn: now, enSueno: false },
        { titulo: "Constructor 2", libreYa: false, libreExacta: true, libreEn: now + 86_400_000, enSueno: false },
        { titulo: "Laboratorio", libreYa: false, libreExacta: false, libreEn: null, actual: { nombre: "Dragón", exacta: false } },
      ],
    },
  ], { now, dias: 21 });
  assert.equal(agenda.dias[0].eventos[0].ahora, true);
  assert.equal(agenda.dias.some((day) => day.eventos.some((ev) => ev.titulo === "Constructor 2")), true);
  assert.equal(agenda.sinHora.length, 1);
  assert.equal(agenda.sinHora[0].titulo, "Laboratorio");
  assert.equal(agenda.dias.some((day) => day.eventos.some((ev) => ev.fin == null && !ev.ahora)), false);
});
