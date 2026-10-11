import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clipboardImportPlan } from "../js/paste.js";
import {
  SESSION_KEY, blankSession, clearSession, isStandalone, mensajePegado, nextOf, ordenDeSesion,
  progressOf, readSession, recordPaste, summaryOf, withPending, writeSession,
} from "../js/actualizar.js";

function mem() {
  const box = new Map();
  return {
    getItem: (key) => (box.has(key) ? box.get(key) : null),
    setItem: (key, value) => { box.set(key, String(value)); },
    removeItem: (key) => { box.delete(key); },
  };
}

test("el orden de Abrir hoy pone la hora antes y no se reordena al pegar", () => {
  const order = ordenDeSesion([
    { tag: "#C", tier: 1, sortWhen: Infinity, principal: false, nombre: "zeta" },
    { tag: "#A", tier: 0, sortWhen: 20, principal: false, nombre: "beta" },
    { tag: "#B", tier: 0, sortWhen: 10, principal: false, nombre: "alfa" },
    { tag: "#D", tier: 0, sortWhen: 20, principal: true, nombre: "zeta" },
  ]);
  assert.deepEqual(order, ["#B", "#D", "#A", "#C"]);
  const ses = blankSession(order, 1);
  const result = recordPaste(ses, [{ kind: "duplicate", value: { tag: "#A", timestamp: 4 } }], 2);
  assert.deepEqual(result.session.order, order);
  assert.equal(nextOf(result.session), "#B");
  assert.equal(result.session.done["#A"].kind, "duplicate");
  assert.equal(result.session.done["#A"].changed, false);
});

test("el progreso 4/11 cuenta la lista entera y la siguiente es la primera sin hacer", () => {
  const order = Array.from({ length: 11 }, (_, i) => `#T${i}`);
  let ses = blankSession(order, 1);
  for (let i = 0; i < 4; i += 1) {
    ses = recordPaste(ses, [{ kind: "ready", value: { tag: order[i], timestamp: 100 + i } }], 10 + i).session;
  }
  assert.equal(progressOf(ses).label, "4/11");
  assert.equal(nextOf(ses), "#T4");
  assert.equal(ses.status, "open");
  const sum = summaryOf(ses);
  assert.equal(sum.changed.length, 4);
  assert.equal(sum.missing.length, 7);
});

test("detecta por la etiqueta: un duplicado no cambia, una más antigua va al histórico y la lista se cierra", () => {
  const a = { tag: "#A", timestamp: 10, buildings: [{ data: 1000001, lvl: 15 }] };
  const b = { tag: "#B", timestamp: 11, buildings: [{ data: 1000001, lvl: 12 }] };
  const ctx = { rows: [a, b], accounts: [{ tag: "#A" }, { tag: "#B" }], index: {}, now: 0 };
  const pegado = clipboardImportPlan(`${JSON.stringify(b)}\n${JSON.stringify(a)}`, ctx);
  assert.equal(pegado.items[0].value.tag, "#B");
  assert.equal(pegado.items[0].kind, "duplicate");
  let ses = blankSession(["#A", "#B"], 1);
  const primero = recordPaste(ses, [pegado.items[0]], 2);
  assert.equal(primero.session.done["#B"].changed, false);
  assert.equal(primero.session.done["#A"], undefined);
  assert.equal(nextOf(primero.session), "#A");
  assert.equal(primero.save.length, 0);
  const vieja = recordPaste(primero.session, [{ kind: "older", value: { tag: "#A", timestamp: 3 } }], 3);
  assert.equal(vieja.session.done["#A"].kind, "older");
  assert.equal(vieja.session.done["#A"].changed, false);
  assert.equal(vieja.save.length, 1);
  assert.equal(vieja.session.status, "done");
  assert.deepEqual(summaryOf(vieja.session).history, ["#A"]);
  assert.deepEqual(summaryOf(vieja.session).same, ["#B"]);
  assert.equal(mensajePegado(vieja.notes, (tag) => (tag === "#A" ? "Alfa" : tag)), "Alfa al histórico");
});

test("una etiqueta de fuera y un texto inválido no marcan ni amplían la lista", () => {
  const ses = blankSession(["#A"], 1);
  const fuera = recordPaste(ses, [{ kind: "new", value: { tag: "#ZZ", timestamp: 9 } }], 2);
  assert.deepEqual(fuera.session.order, ["#A"]);
  assert.equal(fuera.session.done["#ZZ"], undefined);
  assert.equal(fuera.session.done["#A"], undefined);
  assert.equal(fuera.save.length, 0);
  assert.equal(fuera.notes[0].kind, "refused");
  assert.match(mensajePegado(fuera.notes, (tag) => tag), /No se añade/);
  const malo = recordPaste(ses, [{ kind: "invalid", value: null }], 2);
  assert.equal(malo.session.status, "open");
  assert.equal(malo.session.done["#A"], undefined);
  assert.match(mensajePegado(malo.notes, (tag) => tag), /no es una exportación/);
});

test("ready marca el cambio y, si hay varias, se queda la que sí actualiza", () => {
  const ses = blankSession(["#A"], 1);
  const result = recordPaste(ses, [
    { kind: "older", value: { tag: "#A", timestamp: 1 } },
    { kind: "ready", value: { tag: "#A", timestamp: 8 } },
  ], 4);
  assert.equal(result.session.done["#A"].kind, "ready");
  assert.equal(result.session.done["#A"].changed, true);
  assert.equal(result.save.length, 2);
  assert.deepEqual(summaryOf(result.session).changed, ["#A"]);
  assert.equal(mensajePegado([{ kind: "ready", tag: "#A" }], () => "C1"), "C1 actualizada");
});

test("el texto pendiente se escribe en localStorage antes de poder guardar y la sesión se retoma", () => {
  const storage = mem();
  writeSession(storage, blankSession(["#A", "#B"], 1));
  const pending = withPending(readSession(storage), "{\"tag\":\"#B\"}");
  writeSession(storage, pending);
  const killed = readSession(storage);
  assert.equal(killed.pending.includes("#B"), true);
  const mid = recordPaste(killed, [{ kind: "ready", value: { tag: "#B", timestamp: 5 } }], 9);
  assert.equal(mid.session.pending.includes("#B"), true);
  writeSession(storage, mid.session);
  const resumed = readSession(storage);
  assert.equal(resumed.status, "open");
  assert.equal(resumed.done["#B"].changed, true);
  assert.equal(nextOf(resumed), "#A");
  assert.equal(resumed.pending.includes("#B"), true);
  clearSession(storage);
  assert.equal(readSession(storage), null);
  storage.setItem(SESSION_KEY, "no-json");
  assert.equal(readSession(storage), null);
});

test("Safari y el icono usan la misma detección, y la app no pide Atajos para pegar", () => {
  assert.equal(isStandalone({ standalone: true }, () => ({ matches: false })), true);
  assert.equal(isStandalone({ standalone: false }, (q) => ({ matches: q === "(display-mode: standalone)" })), true);
  assert.equal(isStandalone({}, () => ({ matches: false })), false);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const doc = readFileSync(new URL("../docs/atajo.md", import.meta.url), "utf8");
  assert.match(app, /Actualizar todas/);
  assert.match(app, /Pegar esta cuenta/);
  assert.match(app, /Hace tiempo sin datos/);
  assert.match(app, /navigator\.clipboard\.readText/);
  assert.equal(app.includes("cuello de botella"), false);
  assert.equal(app.includes("ID deducido"), false);
  assert.equal(app.includes("Taller de fabricación"), false);
  assert.equal(app.includes("Puesto de artesanía"), false);
  const pegar = app.slice(app.indexOf("async function pegarCuenta"), app.indexOf("async function aplicarPegado"));
  assert.equal(pegar.indexOf("await"), pegar.indexOf("await navigator.clipboard.readText"));
  const aplicar = app.slice(app.indexOf("async function aplicarPegado"), app.indexOf("async function persistirPegado"));
  assert.ok(aplicar.indexOf("writeSession") < aplicar.indexOf("persistirPegado"));
  assert.equal(aplicar.includes("addAccount"), false);
  assert.equal(aplicar.includes("#/roster"), false);
  const guardar = app.slice(app.indexOf("async function persistirPegado"), app.indexOf("async function savePlan"));
  assert.equal(guardar.includes("location.hash"), false);
  assert.equal(guardar.includes("addAccount"), false);
  const abrir = app.slice(app.indexOf("function abrirActualizar"), app.indexOf("function botonActualizar"));
  assert.match(abrir, /ordenDeSesion/);
  assert.match(abrir, /if \(!ses\)/);
  const boot = app.slice(app.indexOf("async function boot"), app.indexOf("window.addEventListener"));
  assert.match(boot, /readSession/);
  assert.match(boot, /#\/actualizar/);
  assert.equal(boot.includes("aplicarPegado"), false);
  assert.match(doc, /Actualizar todas/);
  assert.match(doc, /Pegar esta cuenta/);
  assert.match(doc, /Settings → More Settings → Data Export → Copy/);
  assert.match(doc, /Ajustes → Más ajustes → Exportar datos → Copiar/);
  assert.match(doc, /no comparten/);
  assert.match(doc, /No hace falta la app Atajos/);
});
