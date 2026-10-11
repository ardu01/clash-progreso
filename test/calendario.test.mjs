import assert from "node:assert/strict";
import test from "node:test";
import { instanteUtc, textoIcs } from "../js/calendario.js";

test("el calendario solo anota fines que son un número", () => {
  const ahora = Date.UTC(2026, 9, 11, 15, 0, 0);
  const fin = Date.UTC(2026, 9, 12, 8, 30, 0);
  const text = textoIcs([
    { uid: "cp-uno@clash-progreso", titulo: "C2: Cañón", fin },
    { uid: "mal", titulo: "Sin hora", fin: null },
    { uid: "nan", titulo: "Roto", fin: Number.NaN },
  ], { ahora });
  assert.equal(text.includes("BEGIN:VCALENDAR"), true);
  assert.equal(text.includes("VALARM"), false);
  assert.equal(text.includes("Sin hora"), false);
  assert.equal(text.includes("Roto"), false);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.equal(text.includes(`DTSTART:${instanteUtc(fin)}`), true);
  assert.equal(text.includes(`DTEND:${instanteUtc(fin + 5 * 60 * 1000)}`), true);
  assert.equal(text.includes(`DTSTAMP:${instanteUtc(ahora)}`), true);
  assert.equal(text.includes("SUMMARY:C2: Cañón"), true);
  assert.equal(text.endsWith("\r\n"), true);
  assert.equal(text.replace(/\r\n/g, "").includes("\n"), false);
});

test("un título largo se parte y los signos del formato se escapan", () => {
  const fin = Date.UTC(2026, 9, 11, 18, 0, 0);
  const titulo = "C1: Torre de arqueras múltiple, nivel; siguiente del plan de esta cuenta";
  const text = textoIcs([{ uid: "cp-largo@clash-progreso", titulo, fin }], { ahora: fin });
  const unfolded = text.replace(/\r\n /g, "");
  assert.equal(unfolded.includes("múltiple\\, nivel\\; siguiente"), true);
  assert.equal(text.includes("\r\n "), true);
});
