import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { entradaImportacion } from "../js/diario.js";
import { indiceEquilibrio } from "../js/equilibrio.js";
import { compararEvento, crearEvento } from "../js/evento.js";
import { cargarFuentes, costeSubirTh, hayCosteTh, hayRecursosManuales, recursosDe } from "../js/fuentes.js";
import { convertirEnPlan, cuentaRezagada, crearGemelo } from "../js/gemelo.js";
import { alinear, crearGuerra, textoNumero } from "../js/guerra.js";
import { docVacio, reducir } from "../js/operaciones.js";
import { aplicarPlantilla } from "../js/plantillas.js";
import { enHorizonte, metaFlota, predecirNiveles } from "../js/prediccion.js";
import { C1, C2, estrategiaPorDefecto, ordenarCuentas, planMantenimiento } from "../js/prioridades.js";
import { crearSesion, eficiencia, marcarPaso, siguientePaso } from "../js/sesion.js";
import { simular } from "../js/simulacion.js";

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
    cats: parcial.cats || { laboratorio: 40, heroes: 10, ejercito_edif: 50, defensas: 80, trampas: 70 },
    heroesConTimer: !!parcial.heroesConTimer,
  };
}

test("4.0: C1 y C2 maxean, TH11 y TH13 van en equilibrada, y C1 va primero", () => {
  assert.equal(estrategiaPorDefecto(cuenta({ tag: C1, th: 17 })), "maxear");
  assert.equal(estrategiaPorDefecto(cuenta({ tag: C2, th: 16 })), "maxear");
  assert.equal(estrategiaPorDefecto(cuenta({ tag: "#T11", th: 11 })), "equilibrada");
  assert.equal(estrategiaPorDefecto(cuenta({ tag: "#T13", th: 13 })), "equilibrada");
  const muchas = [];
  for (let i = 0; i < 50; i += 1) muchas.push(cuenta({ tag: "#N" + i, media: i, nombre: "N" + i }));
  muchas.splice(20, 0, cuenta({ tag: C1, nombre: "C1", media: 90, principal: true }));
  const orden = ordenarCuentas(muchas.concat([cuenta({ tag: C1, nombre: "otra" })]));
  assert.equal(orden.length, 51);
  assert.equal(orden[0].tag, C1);
  assert.equal(new Set(orden.map((c) => c.tag)).size, 51);
  assert.deepEqual(ordenarCuentas(muchas).map((c) => c.tag), ordenarCuentas(muchas).map((c) => c.tag));
});

test("4.0: la sesión guía en orden, no confirma, y el mantenimiento avisa si no cabe", () => {
  const cuentas = [
    cuenta({ tag: "#B", nombre: "B", libreAccion: 1, media: 10 }),
    cuenta({ tag: C1, nombre: "C1", principal: true, media: 80 }),
    cuenta({ tag: "#A", nombre: "A", labLibre: true, media: 20 }),
  ];
  const sesion = crearSesion({ cuentas, minutos: 60, ahora: 5 });
  assert.equal(sesion.orden[0], C1);
  assert.equal(sesion.pasos.some((p) => p.confirmado), false);
  const marcado = marcarPaso(sesion, sesion.pasos[0].id, "hecho");
  assert.equal(marcado.pasos[0].estado, "hecho");
  assert.equal(marcado.pasos[0].confirmado, undefined);
  assert.equal(eficiencia(marcado).frase, "Sin confirmar");
  assert.ok(siguientePaso(marcado));
  const diferido = marcarPaso(sesion, sesion.pasos[0].id, "pospuesto");
  assert.notEqual(siguientePaso(diferido).id, sesion.pasos[0].id);
  const solo = marcarPaso({ ...sesion, pasos: [sesion.pasos[0]] }, sesion.pasos[0].id, "pospuesto");
  assert.equal(siguientePaso(solo).estado, "pospuesto");
  const justo = planMantenimiento([
    cuenta({ tag: "#X", libreAccion: 1 }),
    cuenta({ tag: "#Y", libreAccion: 1, desactualizada: true }),
  ], { minutos: 2 });
  assert.equal(justo.obligatorias.length, 1);
  assert.equal(justo.cabe, false);
  assert.match(justo.aviso, /presupuesto/);
  assert.match(justo.frase, /Estimación/);
});

test("4.0: simular no muta, no usa objetos mágicos y el evento es el descuento escrito", () => {
  const entrada = { oro: 100, elixir: 50, oscuro: 10, segConstructor: 86400, constructores: 2, horasJuego: 90, descuentoRecurso: 0.2, objetosMagicos: true };
  const copia = JSON.parse(JSON.stringify(entrada));
  const out = simular(entrada);
  assert.deepEqual(entrada, copia);
  assert.equal(out.objetosMagicos, false);
  assert.equal(out.origen, "simulacion");
  assert.equal(out.coste.oro, 80);
  assert.equal(out.lanzamientosDia, 2700);
  const evento = crearEvento({ descuentoRecurso: 0.5, descuentoTiempo: 2, ahora: 1 });
  assert.equal(evento.descuentoTiempo, 0.9);
  assert.match(evento.hipotesis, /Supercell/);
  const cmp = compararEvento({ oro: 100, elixir: 0, oscuro: 0 }, evento);
  assert.equal(cmp.con.oro, 50);
  assert.equal(cmp.sin.oro, 100);
});

test("4.0: la predicción calla sin historial y a 180 días no afirma el día", () => {
  const vacia = predecirNiveles({ ritmo: null, muestra: 1, restante: 10, ahora: 0 });
  assert.equal(vacia.pocosDatos, true);
  assert.equal(vacia.probable, null);
  assert.match(vacia.frase, /Pocos datos/);
  const llena = predecirNiveles({ ritmo: 10, muestra: 2, restante: 10, ahora: 0 });
  assert.ok(llena.mejor < llena.probable);
  assert.ok(llena.probable < llena.peor);
  assert.match(enHorizonte(llena.probable, 0, 365), /comparar/);
  const meta = metaFlota([{ th: 16 }, { th: 14 }, { th: 15 }], { n: 5, th: 15 });
  assert.equal(meta.ya, 2);
  assert.equal(meta.faltan, 3);
});

test("4.0: el gemelo señala lo que falta, C1 no usa héroes, y pasar al plan no toca un temporizador", () => {
  const rez = cuentaRezagada([
    cuenta({ tag: C1, nombre: "C1", media: 70, cats: { heroes: 5, defensas: 90, laboratorio: 80 } }),
    cuenta({ tag: "#Z", nombre: "Z", media: 30, cats: { laboratorio: 20, defensas: 40, heroes: 10 } }),
  ]);
  assert.equal(rez.tag, "#Z");
  assert.equal(rez.faltas.some((f) => f.key === "heroes"), true);
  const c1 = cuentaRezagada([
    cuenta({ tag: C1, nombre: "C1", media: 40, cats: { heroes: 5, laboratorio: 30, defensas: 90 } }),
  ]);
  assert.equal(c1.faltas.some((f) => f.key === "heroes"), false);
  const indice = indiceEquilibrio({ tag: C1, cats: { heroes: 5, laboratorio: 80, ejercito_edif: 80, defensas: 80, trampas: 80 }, estrategia: "equilibrada" });
  assert.equal(indice.bajos.some((b) => b.key === "heroes"), false);
  assert.match(indice.frase, /C1/);
  const gemelo = crearGemelo({ tag: "#Z", th: 15, estrategia: "rush", ahora: 3 });
  assert.equal(gemelo.origen, "simulacion");
  const paso = convertirEnPlan({ ...gemelo, pisaTimer: true });
  assert.equal(paso.ok, false);
  const bien = convertirEnPlan(gemelo);
  assert.equal(bien.ok, true);
  assert.equal(bien.plan.modo, "rushear");
  const c1plan = convertirEnPlan(crearGemelo({ tag: C1, estrategia: "maxear", ahora: 4 }));
  assert.equal(c1plan.plan.heroes, false);
});

test("4.0: guerra y CWL no rellenan estrellas, y la plantilla de héroes no entra en C1", () => {
  const guerra = crearGuerra({ tipo: "cwl", ahora: 8, participantes: [{ tag: "#A" }] });
  assert.equal(guerra.tipo, "cwl");
  assert.equal(textoNumero(guerra.participantes[0].estrellas), "Sin anotar");
  assert.equal(textoNumero(0), "0");
  const alineacion = alinear([
    cuenta({ tag: C1, nombre: "C1", heroesConTimer: true, cats: { laboratorio: 90, heroes: 1, ejercito_edif: 90 } }),
    cuenta({ tag: "#B", nombre: "B", heroesConTimer: true, cats: { laboratorio: 10, heroes: 10, ejercito_edif: 10 } }),
  ]);
  assert.equal(alineacion[0].tag, C1);
  assert.equal(alineacion[0].avisoHeroe, "");
  assert.match(alineacion[1].avisoHeroe, /temporizador/);
  const heroes = aplicarPlantilla("heroes", { tag: C1, th: 17 });
  assert.equal(heroes.plan.heroes, false);
  assert.match(heroes.nota, /fuera del plan/);
  const th = aplicarPlantilla("th", { tag: "#B", th: 13 });
  assert.equal(th.plan.th, 14);
  assert.equal(th.plan.modo, "rushear");
});

test("4.0: el diario no afirma la hora y reducir no escribe la exportación", () => {
  const entrada = entradaImportacion({ tag: "#A", nombre: "Aldea", at: 10, niveles: 2, thAntes: 12, thDespues: 13, mejoras: 1 });
  assert.match(entrada.texto, /Visto en la importación/);
  assert.match(entrada.texto, /No se afirma la hora/);
  assert.equal(entrada.origen, "importado");
  const doc = docVacio();
  const next = reducir(doc, "sesion-empezar", "", {
    now: 10,
    cuentas: [cuenta({ tag: C1, nombre: "C1", principal: true })],
  });
  assert.equal(next.plan, null);
  assert.equal(next.doc.sesion.pasos[0].confirmado, undefined);
  const src = readFileSync(new URL("../js/operaciones.js", import.meta.url), "utf8");
  assert.equal(src.includes("putExport"), false);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.equal(app.includes("cuello de botella"), false);
  const store = readFileSync(new URL("../js/store.js", import.meta.url), "utf8");
  assert.match(store, /indexedDB\.open\(DB, 4\)/);
  assert.match(store, /evolucion/);
  assert.match(store, /documentos/);
  assert.match(store, /recuperacion/);
  assert.equal(store.includes("deleteDatabase"), false);
});

test("4.0: sin los módulos de la 3.1.17 no se inventan recursos ni el coste del ayuntamiento", async () => {
  await cargarFuentes();
  assert.equal(hayRecursosManuales(), false);
  assert.equal(hayCosteTh(), false);
  assert.equal(recursosDe("#A"), null);
  assert.equal(costeSubirTh(15), null);
});
