import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { armaDe, supercargasDe, ARMAS_FUENTE, SUPER_FUENTE } from "../js/juego-datos.js";
import { levelCost } from "../js/costs.js";
import { indexCaps, capsMaxFor } from "../js/progress.js";

const manifest = JSON.parse(readFileSync(new URL("../assets/manifest.json", import.meta.url), "utf8"));
const caps = JSON.parse(readFileSync(new URL("../data/caps_clashrecord.json", import.meta.url), "utf8"));
const book = JSON.parse(readFileSync(new URL("../data/costes.json", import.meta.url), "utf8"));
const index = indexCaps(caps, manifest);

test("4.2.3: armas TH12–16 a coste 0 y artillería TH17 igual que el plan", () => {
  assert.match(ARMAS_FUENTE, /aaa517aa/);
  for (const th of [12, 13, 14, 15, 16]) {
    const arma = armaDe(th);
    assert.equal(arma.unico, true, "TH" + th);
    assert.equal(arma.niveles.length, 1);
    assert.equal(arma.niveles[0].n, 0);
    assert.equal(arma.niveles[0].s, 0);
  }
  assert.equal(armaDe(12).nombre, "Giga Tesla");
  assert.equal(armaDe(13).nombre, "Giga torre infernal");
  assert.equal(armaDe(16).nombre, "Giga torre infernal");
  const art = armaDe(17);
  assert.equal(art.nombre, "Artillería infernal");
  assert.deepEqual(art.niveles.filter((row) => row.nivel >= 2).map((row) => [row.n, row.s]), [
    [10000000, 518400],
    [12000000, 604800],
    [14000000, 691200],
    [18000000, 864000],
  ]);
  assert.equal(armaDe(18).sin_arma, true);
  assert.equal(armaDe(11), null);
  const app = readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const ay = app.slice(app.indexOf("function ayuntamientoLine("), app.indexOf("function resourceAllowsItem("));
  assert.match(ay, /textoArma\(th\)/);
});

test("4.2.3: supercargas de TH18 aparte del nivel normal", () => {
  assert.match(SUPER_FUENTE, /aaa517aa/);
  assert.match(SUPER_FUENTE, /supercharge: true/);
  const ids = Object.keys(JSON.parse(readFileSync(new URL("../data/supercargas.json", import.meta.url), "utf8")).items);
  assert.equal(ids.length, 18);
  const tesla = supercargasDe("1000019");
  assert.deepEqual(tesla.map((row) => [row.nivel, row.r, row.n, row.s, row.th]), [
    [1, "oro", 12000000, 388800, 18],
    [2, "oro", 8000000, 561600, 18],
  ]);
  const mina = supercargasDe("1000004");
  assert.equal(mina[0].r, "elixir");
  assert.equal(mina.length, 3);
  assert.deepEqual(supercargasDe("1000011"), []);
  assert.equal(levelCost("1000019", 1).n !== 12000000, true);
});

test("4.2.3: muros TH18 verificados y sin cambio", () => {
  const wall = book.items["1000010"];
  assert.equal(wall["18"].n, 7000000);
  assert.equal(wall["18"].r, "oro_o_elixir");
  assert.equal(wall["18"].s, 0);
  assert.equal(wall["19"].n, 10000000);
  assert.equal(wall["19"].s, 0);
  assert.deepEqual(caps["18"].Wall, { max: 19, count: 325 });
});

test("4.2.3: Portal portátil con la curva épica y el tope del bastón", () => {
  assert.deepEqual(book.items["90000061"], book.items["90000016"]);
  assert.match(book.portal_pendant.fuente, /90000016/);
  assert.match(book.portal_pendant.fuente, /ClashRecord/);
  assert.equal(levelCost("90000061", 2).b, 120);
  assert.equal(levelCost("90000061", 9).e, 10);
  assert.equal(levelCost("90000061", 27).b, 3600);
  assert.equal(levelCost("90000061", 27).e, 150);
  assert.equal(levelCost("90000061", 27).s, 0);
  const curva = [15, 18, 18, 21, 24, 27, 27, 27];
  [11, 12, 13, 14, 15, 16, 17, 18].forEach((th, i) => {
    assert.equal(capsMaxFor(index, "90000061", th), curva[i], "TH" + th);
    assert.equal(capsMaxFor(index, "90000061", th), capsMaxFor(index, "90000049", th));
  });
});

test("4.2.3: los nombres visibles ya no llevan el paréntesis en inglés", () => {
  const ingles = /\((Hitpoints|Damage|Seconds Active|Poison Level|Explosion Damage)\)/;
  for (const item of Object.values(manifest.items)) {
    assert.equal(ingles.test(item.nombre || ""), false, item.nombre);
  }
  assert.equal(manifest.items["4000053"].nombre, "Yeti");
  assert.equal(manifest.items["1000019"].nombre, "Torre Tesla");
  assert.equal(manifest.items["102000035"].nombre, "Vela incandescente (Segundos en activo)");
  assert.equal(manifest.items["102000038"].nombre, "Cazahéroes (Nivel de veneno)");
  assert.equal(manifest.items["102000040"].nombre, "Catapulta explosiva (Daño)");
});
