import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  bandeja, conflictos, detector, excepciones, hibernacionDe, presupuestoSemanal, repartir, rescate, unicas, ventanas,
} from "../js/atencion.js";
import { C1 } from "../js/prioridades.js";
import { docVacio, reducir } from "../js/operaciones.js";

function cuenta(parcial) {
  return {
    tag: parcial.tag,
    nombre: parcial.nombre || parcial.tag,
    th: parcial.th ?? 12,
    media: parcial.media ?? 50,
    principal: !!parcial.principal,
    libreAccion: parcial.libreAccion || 0,
    labLibre: !!parcial.labLibre,
    desactualizada: !!parcial.desactualizada,
    cats: parcial.cats || { laboratorio: 40, heroes: 10, defensas: 80 },
  };
}

function flota(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(cuenta({ tag: "#N" + i, nombre: "N" + i, media: i, libreAccion: i % 3 === 0 ? 1 : 0 }));
  }
  return out;
}

test("4.1.0: 1, 11 y 50 cuentas, sin duplicar y sin dar por libre un dato viejo", () => {
  for (const n of [1, 11, 50]) {
    const cuentas = flota(n).concat([cuenta({ tag: "#N0", nombre: "copia", libreAccion: 1 })]);
    const items = bandeja(cuentas, { now: 1 });
    const tags = items.map((item) => item.tag);
    assert.equal(new Set(tags).size, tags.length);
    assert.ok(items.length <= n);
  }
  const vieja = cuenta({ tag: "#V", desactualizada: true, libreAccion: 3, labLibre: true });
  const tareas = bandeja([vieja], { now: 1 });
  assert.equal(tareas.length, 1);
  assert.equal(tareas[0].titulo, "Traer una exportación nueva");
  assert.equal(tareas[0].origen, "confirmado");
  assert.equal(repartir([vieja], { minutos: 60, now: 1 }).asignadas.some((p) => p.cola === "constructor"), false);
});

test("4.1.0: C1 no señala héroes y la hibernación es manual", () => {
  const c1 = cuenta({ tag: C1, nombre: "C1", cats: { heroes: 5, defensas: 20 } });
  const filas = detector([c1, cuenta({ tag: "#B", cats: { heroes: 10, defensas: 90 } })]);
  assert.equal(filas.find((f) => f.tag === C1).categorias.some((c) => c.key === "heroes"), false);
  assert.equal(filas.find((f) => f.tag === C1).categorias.some((c) => c.key === "defensas"), true);
  assert.equal(filas.find((f) => f.tag === "#B").categorias[0].key, "heroes");
  const otra = reducir(docVacio(), "hibernar", "14|#B", { now: 1_000, cuentas: [cuenta({ tag: "#B" })] });
  assert.equal(otra.doc.hibernadas[0].origen, "manual");
  assert.equal(hibernacionDe(otra.doc.hibernadas, "#B", 1_000 + 13 * 86400000).modo, "14");
  assert.equal(hibernacionDe(otra.doc.hibernadas, "#B", 1_000 + 15 * 86400000), null);
  const indef = reducir(docVacio(), "hibernar", "indef|#B", { now: 5, cuentas: [] });
  assert.ok(hibernacionDe(indef.doc.hibernadas, "#B", 9e15));
  const fuera = bandeja([cuenta({ tag: "#B", libreAccion: 1 })], { now: 5, hibernadas: indef.doc.hibernadas });
  assert.equal(fuera.length, 0);
});

test("4.1.0: excepciones, presupuesto, ventanas, conflictos y rescate no tocan temporizadores", () => {
  const cuentas = [
    cuenta({ tag: C1, nombre: "C1", principal: true, libreAccion: 1 }),
    cuenta({ tag: "#B", nombre: "B", libreAccion: 1 }),
    cuenta({ tag: "#C", nombre: "C", desactualizada: true }),
  ];
  const solo = excepciones(cuentas, { now: 1 });
  assert.equal(solo.items.every((item) => item.pide), true);
  const todas = excepciones(cuentas, { now: 1, mostrarTodas: true });
  assert.ok(todas.items.length >= solo.items.length);
  const semana = presupuestoSemanal(cuentas, { now: 1, horasDia: 90 });
  assert.equal(semana.alDia, 90);
  assert.equal(semana.semana, 630);
  assert.match(semana.frase, /No cambia la agenda/);
  const v = ventanas(cuentas, { now: 1, sueno: { desde: "23:00", hasta: "07:00" } });
  assert.ok(v.juntas.some((item) => item.tag === C1));
  assert.ok(v.sinHora.some((item) => item.tag === "#C"));
  assert.match(v.frase, /Sin avisos/);
  const corto = conflictos(flota(20), { minutos: 10, now: 1 });
  assert.ok(corto.fuera.length > 0);
  assert.match(corto.frase, /C1/);
  const dormida = reducir(docVacio(), "hibernar", "7|#B", { now: 1, cuentas });
  const r = rescate(cuentas, { now: 1, hibernadas: dormida.doc.hibernadas });
  assert.deepEqual(r.dormidas.map((item) => item.tag), ["#B"]);
  assert.deepEqual(r.viejas.map((item) => item.tag), ["#C"]);
  const despierta = reducir(dormida.doc, "despertar", "#B", { now: 2, cuentas });
  assert.equal(despierta.doc.hibernadas.length, 0);
  const src = readFileSync(new URL("../js/atencion.js", import.meta.url), "utf8");
  assert.equal(src.includes("putExport"), false);
  assert.equal(src.includes("timer"), false);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("cuello de botella"), false);
  assert.equal(unicas(cuentas.concat(cuentas)).length, 3);
});
