import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { indexCaps } from "../js/progress.js";
import { toggleProvisional } from "../js/provisional.js";
import { buildRoadmap } from "../js/roadmap.js";
import { horaMadrid, recomendar } from "../js/recomendador.js";
import { semanaPlan } from "../js/schedule.js";

const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);
const c1 = JSON.parse(readFileSync(new URL("../data/2026-10-07/c1_principal_2026-10-07_e53a.json", import.meta.url)));
const th11 = JSON.parse(readFileSync(new URL("../data/2026-10-07/th11_R02YUVC0J_2026-10-07_a45e.json", import.meta.url)));
const now = Date.parse("2026-10-11T12:00:00Z");
const sesion1900 = Date.parse("2026-10-11T17:00:00Z");

function sinReloj(exp) {
  const copia = structuredClone(exp);
  for (const sec of ["buildings", "traps", "heroes", "guardians", "units", "spells", "siege_machines", "pets"]) {
    for (const it of copia[sec] || []) delete it.timer;
  }
  return copia;
}

function road(exp, plan, provisionals, sleep) {
  return buildRoadmap({ exp, index, tag: exp.tag, plan: plan || null, provisionals: provisionals || [], sleep: sleep === undefined ? null : sleep, now });
}

test("4.2.0: la hora de Madrid de la sesión es las 19:00", () => {
  assert.equal(horaMadrid(sesion1900), "19:00");
  assert.equal(horaMadrid(Date.parse("2026-10-11T19:00:00Z")), "21:00");
});

test("4.2.0: con los huecos libres, Ahora sigue el orden del plan y empieza a las 19:00", () => {
  const built = road(sinReloj(c1));
  const ctor = built.lanes.filter((lane) => lane.cola === "constructor");
  assert.equal(ctor.length, 6);
  assert.ok(ctor.every((lane) => lane.libreEn === now));
  assert.ok(ctor.every((lane) => lane.freeAt > lane.libreEn));
  const rec = recomendar(built, semanaPlan(), now);
  assert.equal(rec.sesion.start, sesion1900);
  assert.equal(rec.sesion.end, sesion1900 + 2 * 3600000);
  const cartas = rec.ahora.filter((p) => p.cola === "constructor");
  assert.equal(cartas.length, 6);
  assert.equal(cartas.some((p) => p.categoryKey === "heroes"), false);
  assert.equal(cartas.some((p) => p.categoryKey === "muros"), false);
  for (const carta of cartas) {
    assert.equal(carta.inicio, sesion1900);
    const primero = built.orden.filter((s) => s.laneId === carta.laneId && !s.provisional).sort((a, b) => a.inicio - b.inicio)[0];
    assert.equal(carta.id, primero.id);
    assert.equal(carta.fromLvl, primero.fromLvl);
    assert.equal(carta.instance, primero.instance);
  }
  assert.equal(rec.ahora.some((p) => p.cola === "laboratorio"), true);
  assert.equal(rec.ahora.some((p) => p.cola === "mascotas"), true);
  assert.equal(rec.sesiones[0].dia, "Hoy");
  assert.equal(rec.sesiones[0].hora, "19:00–21:00");
  assert.ok(rec.sesiones[0].huecos.length >= 6);
  assert.ok(rec.sesiones.every((ses) => ses.huecos.length > 0));
  assert.ok(rec.sesiones.length <= 7);
});

test("4.2.0: un domingo sin sesión pasa la recomendación al lunes", () => {
  const week = semanaPlan().map((dia, i) => (i === 6 ? [] : dia));
  const built = road(sinReloj(th11), null, [], week);
  const rec = recomendar(built, week, now);
  assert.equal(rec.sesion.start, Date.parse("2026-10-12T17:00:00Z"));
  assert.equal(horaMadrid(rec.sesion.start), "19:00");
  assert.equal(rec.sesiones[0].dia, "Mañana");
  assert.equal(rec.sesiones[0].hora, "19:00–21:00");
  assert.ok(rec.ahora.length > 0);
  assert.ok(rec.ahora.every((p) => p.inicio >= rec.sesion.start && p.inicio < rec.sesion.end));
  assert.equal(rec.ahora.some((p) => p.categoryKey === "muros"), false);
});

test("4.2.0: B.O.B entra en Ahora y los héroes de C1 no", () => {
  const rec = recomendar(road(sinReloj(c1)), semanaPlan(), now);
  assert.equal(rec.ahora.filter((p) => p.cola === "constructor").length, 6);
  assert.equal(rec.ahora.some((p) => p.categoryKey === "heroes"), false);
  assert.equal(rec.sesiones.some((ses) => ses.huecos.some((h) => h.title && /héroe|reina|rey|alcaide|campeona/i.test(h.title))), false);
});

test("4.2.0: sin cifras de recursos, un paso que no cabe en el almacén sigue recomendado", () => {
  const inicio = sesion1900;
  const rec = recomendar({
    now,
    lanes: [{ id: "c0", cola: "constructor", titulo: "Constructor 1", libreEn: now, libreYa: true, blocked: false }],
    orden: [{
      laneId: "c0", id: "1000008", title: "Cañón", fromLvl: 20, toLvl: 21, instance: "1000008#0",
      queue: "constructor", seconds: 3600, inicio, fin: inicio + 3600000, noCabe: true, categoryKey: "defensas",
    }],
  }, semanaPlan(), now);
  assert.equal(rec.ahora.length, 1);
  assert.equal(rec.ahora[0].title, "Cañón");
  assert.equal(rec.ahora[0].noCabe, true);
  assert.equal(rec.ahora[0].fromLvl, 20);
  assert.equal(rec.ahora[0].toLvl, 21);
});

test("4.2.0: Hecho ocupa el hueco y Ahora pasa a la siguiente que aún cabe en la sesión", () => {
  const exp = sinReloj(th11);
  const built = road(exp);
  const rec = recomendar(built, semanaPlan(), now);
  const carta = rec.ahora.find((p) => p.cola === "constructor");
  assert.ok(carta);
  const marks = toggleProvisional([], carta, exp.tag, now);
  const after = road(exp, null, marks);
  const rec2 = recomendar(after, semanaPlan(), now);
  assert.equal(rec2.ahora.some((p) => p.id === carta.id && p.fromLvl === carta.fromLvl && p.instance === carta.instance), false);
  const ocupada = after.orden.find((s) => s.provisional && s.id === carta.id && s.instance === carta.instance);
  assert.ok(ocupada);
  if (ocupada.fin != null && ocupada.fin <= rec.sesion.end) {
    const sigue = rec2.ahora.find((p) => p.laneId === ocupada.laneId);
    assert.ok(sigue);
    assert.equal(sigue.provisional, undefined);
    assert.ok(sigue.inicio < rec.sesion.end);
  }
});

test("4.2.0: la pantalla Plan decide y no pide configuración ni recursos", () => {
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const plan = app.slice(app.indexOf("function renderPlan("), app.indexOf("function criterioHtml("));
  const inicio = app.slice(app.indexOf("function renderInicio("), app.indexOf("function renderAhora("));
  assert.match(plan, /data-plan-ahora/);
  assert.match(plan, /data-plan-sesiones/);
  assert.match(plan, /data-plan-objetivo="maxear"/);
  assert.match(plan, /Maxear TH actual/);
  assert.match(plan, /Subir TH/);
  assert.match(plan, /tarjetaAhora/);
  assert.match(app, /data-hecho/);
  assert.match(app, />Hecho</);
  assert.equal(plan.includes("planControls"), false);
  assert.equal(plan.includes("coberturaCard"), false);
  assert.equal(plan.includes("data-plan-modo"), false);
  assert.equal(plan.includes("recursosDeCuenta"), false);
  assert.match(inicio, /hoyEnCuentas/);
  assert.match(app, /data-hoy-cuentas/);
  assert.match(app, /Hoy en tus cuentas/);
  assert.equal(app.includes("cuello de botella"), false);
  const rec = readFileSync(new URL("../js/recomendador.js", import.meta.url), "utf8");
  assert.equal(rec.includes("recursos"), false);
});
