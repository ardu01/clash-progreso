/**
 * Banco reproducible. Semilla 41011, ahora 2026-10-11T12:00Z, sesión 19:00–21:00.
 *   node test/bench-evolucion.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { empaquetar } from "../js/evolucion/empaquetar.js";
import { evaluarFlota } from "../js/evolucion/evaluar.js";
import { materializar, semanaDefecto } from "../js/evolucion/sesiones.js";
import { indexCaps } from "../js/progress.js";
import { compilarPasos, defaultPlan } from "../js/roadmap.js";

const now = Date.parse("2026-10-11T12:00:00Z");
const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url)));
const index = indexCaps(caps, manifest);
const dir = new URL("../data/2026-10-07/", import.meta.url);
const reales = readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => {
  const exp = JSON.parse(readFileSync(new URL(name, dir)));
  return empaquetar(compilarPasos({
    exp, index, tag: exp.tag, plan: defaultPlan(), provisionals: [], now,
  }), { botinPorAtaque: 400000, minutosPorAtaque: 3 });
});

function percentil(muestras, p) {
  const ord = muestras.slice().sort((a, b) => a - b);
  const at = Math.min(ord.length - 1, Math.max(0, Math.ceil(p * ord.length) - 1));
  return ord[at];
}

function banco(packs, dias, vueltas) {
  const ses = materializar(semanaDefecto(), now, dias, null, null);
  const fin = now + dias * 86400000;
  const minutos = packs.map(() => 90 / packs.length);
  const orden = packs.map((_, i) => i);
  const buffers = {
    orden: packs.map((p) => new Uint32Array(p.n)),
    libre: packs.map((p) => new Float64Array(p.builders + 2)),
    pesos: packs.map(() => [1, 1, 1, 1, 1, 1, 1, 1]),
  };
  const muestras = [];
  const t0 = performance.now();
  for (let i = 0; i < vueltas; i += 1) {
    const a = performance.now();
    evaluarFlota(packs, minutos, orden, ses, now, fin, buffers);
    muestras.push(performance.now() - a);
  }
  const total = performance.now() - t0;
  return {
    cuentas: packs.length,
    dias,
    vueltas,
    totalMs: Math.round(total),
    p50: Number(percentil(muestras, 0.5).toFixed(3)),
    p95: Number(percentil(muestras, 0.95).toFixed(3)),
  };
}

function tomar(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(reales[i % reales.length]);
  return out;
}

const filas = [];
for (const n of [1, 11, 20, 50]) {
  for (const dias of [30, 90, 365]) filas.push(banco(tomar(n), dias, n === 11 && dias === 90 ? 200 : 30));
}
const grande = banco(tomar(11), 90, 10000);
filas.push({ ...grande, nota: "10000 evals, 11 cuentas, 90 días" });
console.log(JSON.stringify({ ahora: "2026-10-11T12:00:00Z", semilla: 41011, sesion: "19:00-21:00", filas }, null, 2));
if (grande.totalMs > 60000) {
  console.error("10 000 evals pasaron de 60 s: " + grande.totalMs);
  process.exit(1);
}
