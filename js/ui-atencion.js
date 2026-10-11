import {
  bandeja, conflictos, detector, DIAS_HIBERNAR, excepciones, hibernacionDe, presupuestoSemanal, rescate, ventanas,
} from "./atencion.js";
import { esc } from "./format.js";

const BOTONES = [
  ["bandeja", "#/inicio/bandeja", "Bandeja", "M"],
  ["excepciones", "#/inicio/excepciones", "Excepciones", "E"],
  ["presupuesto", "#/agenda/presupuesto", "Presupuesto", "P"],
  ["ventanas", "#/agenda/ventanas", "Ventanas", "V"],
  ["hibernar", "#/roster/hibernar", "Hibernación", "H"],
  ["detector", "#/roster/detector", "Cuellos de botella", "C"],
  ["prioridades", "#/operaciones/prioridades", "Prioridades", "R"],
];

function info(texto) {
  if (!texto) return "";
  return `<button type="button" class="info" data-info aria-expanded="false" aria-pressed="false" aria-label="Más información">ⓘ</button><p class="info-pop" hidden>${esc(texto)}</p>`;
}

function head(titulo, texto) {
  return `<div class="section-head"><div class="section-header"><span>${titulo}</span></div>${info(texto)}</div>`;
}

function origen(id) {
  const texto = id === "manual" ? "Manual" : id === "estimado" ? "Estimado" : "Confirmado";
  return `<span class="chip chip--muted">${texto}</span>`;
}

function fila(item) {
  const sub = [item.frase, item.titulo].filter(Boolean).join(" · ");
  return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(item.nombre || item.tag)}</span><span class="row__sub">${esc(sub)}</span></span>${origen(item.origen)}</div></li>`;
}

export function htmlMotor() {
  const botones = BOTONES.map(([, href, label, letra]) => `<a class="motor-btn" href="${href}"><span class="motor-btn__ico" aria-hidden="true">${letra}</span><span>${esc(label)}</span></a>`).join("");
  return `<div class="section"><div class="card motor-card">
    ${head("Motor de atención multicuenta", "Decide qué necesita intervención y cuándo. Confirmado sale de la exportación. Manual es lo que anotas. Estimado es una comparación.")}
    <p class="t-footnote c-2">Decide qué necesita intervención y cuándo</p>
    <div class="motor-grid">${botones}</div>
    <p class="section-footer"><a href="#/roster/rescate">Rescatar flota</a></p>
  </div></div>`;
}

function pagina(titulo, cuerpo) {
  return `<h1 class="large-title">${titulo}</h1>${cuerpo}`;
}

export function htmlAtencion(modelo) {
  const sub = modelo.sub;
  if (sub === "bandeja") return vistaBandeja(modelo);
  if (sub === "excepciones") return vistaExcepciones(modelo);
  if (sub === "presupuesto") return vistaPresupuesto(modelo);
  if (sub === "ventanas") return vistaVentanas(modelo);
  if (sub === "hibernar") return vistaHibernar(modelo);
  if (sub === "detector") return vistaDetector(modelo);
  if (sub === "prioridades") return vistaPrioridades(modelo);
  if (sub === "rescate") return vistaRescate(modelo);
  return pagina("Atención", "");
}

function vistaBandeja(m) {
  const items = bandeja(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas });
  const lista = items.length
    ? `<ul class="list">${items.map(fila).join("")}</ul>`
    : `<div class="card empty"><p class="t-title3">Nada pendiente</p></div>`;
  return pagina("Bandeja", `<div class="section">${head("Universal", "Una fila por cuenta que pide algo. Hibernadas fuera. Sin duplicados.")}${lista}</div>`);
}

function vistaExcepciones(m) {
  const vista = excepciones(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas, mostrarTodas: !!m.doc.mostrarTodas });
  const solo = !m.doc.mostrarTodas;
  const lista = vista.items.length
    ? `<ul class="list">${vista.items.map(fila).join("")}</ul>`
    : `<div class="card empty"><p class="t-title3">${solo ? "Nadie requiere atención" : "Sin cuentas"}</p></div>`;
  return pagina("Excepciones", `<div class="section"><div class="card">
    ${head("Revisión por excepciones", "Solo las que piden intervención. Mostrar todas incluye las que están al día y las hibernadas.")}
    <div class="chip-row" role="toolbar" aria-label="Filtro">
      <button type="button" data-op="excepciones" data-arg="solo" aria-pressed="${solo ? "true" : "false"}">Solo requieren atención</button>
      <button type="button" data-op="excepciones" data-arg="todas" aria-pressed="${solo ? "false" : "true"}">Mostrar todas</button>
    </div>
  </div></div><div class="section">${lista}</div>`);
}

function vistaPresupuesto(m) {
  const p = presupuestoSemanal(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas, horasDia: m.doc.horasDia });
  return pagina("Presupuesto", `<div class="section"><div class="card">
    ${head("Semanal", p.frase)}
    <p class="t-title2 num">${p.necesario} min</p>
    <p class="t-footnote c-2">${p.alDia} min al día · ${p.semana} en la semana${p.cabe ? " · Cabe" : ` · ${p.fuera} fuera`}</p>
  </div></div>`);
}

function vistaVentanas(m) {
  const v = ventanas(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas, sueno: m.sueno });
  const bloque = (titulo, items) => items.length
    ? `<div class="section"><div class="section-header"><span>${titulo}</span></div><ul class="list">${items.map(fila).join("")}</ul></div>`
    : "";
  return pagina("Ventanas", `<div class="section"><div class="card">${head("Sincronizador", v.frase)}</div></div>
    ${bloque("Misma sesión", v.juntas)}
    ${bloque("Sin hora fiable", v.sinHora)}
    ${bloque("Hibernadas", v.fuera)}`);
}

function vistaHibernar(m) {
  const cuentas = m.cuentas || [];
  const foco = cuentas.find((cuenta) => cuenta.tag === m.doc.tagFoco) || cuentas[0];
  const actual = foco ? hibernacionDe(m.doc.hibernadas, foco.tag, m.now) : null;
  const chips = DIAS_HIBERNAR.map((dias) => {
    const on = actual && String(actual.modo) === String(dias);
    return `<button type="button" data-op="hibernar" data-arg="${dias}|${foco ? esc(foco.tag) : ""}" aria-pressed="${on ? "true" : "false"}">${dias} días</button>`;
  }).join("");
  const indef = actual && actual.modo === "indef";
  const cuerpo = foco
    ? `<p class="t-title3">${esc(foco.nombre || foco.tag)}</p>
      <button type="button" class="btn btn--plain btn--block" data-op="foco">Otra cuenta</button>
      <div class="chip-row" role="toolbar" aria-label="Plazo">${chips}
        <button type="button" data-op="hibernar" data-arg="indef|${esc(foco.tag)}" aria-pressed="${indef ? "true" : "false"}">Indefinida</button>
      </div>
      <label class="t-footnote" for="dias-hibernar">Días a medida</label>
      <input id="dias-hibernar" data-op-dias type="number" min="1" max="365" inputmode="numeric" aria-label="Días a medida">
      <button type="button" class="btn btn--secondary btn--block" data-op="hibernar" data-arg="custom|${esc(foco.tag)}">Guardar plazo</button>
      ${actual ? `<button type="button" class="btn btn--plain btn--block" data-op="despertar" data-arg="${esc(foco.tag)}">Despertar</button>` : ""}`
    : `<p class="t-body">Sin cuentas</p>`;
  return pagina("Hibernación", `<div class="section"><div class="card">
    ${head("Plazo", "7, 14, 30 días, indefinida o los días que escribas. Es una anotación manual.")}
    ${cuerpo}
    <p class="section-footer"><a href="#/roster/rescate">Rescatar flota</a></p>
  </div></div>`);
}

function vistaDetector(m) {
  const filas = detector(m.cuentas);
  const lista = filas.length
    ? `<ul class="list">${filas.map((filaCuenta) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(filaCuenta.nombre)}</span><span class="row__sub">${esc(filaCuenta.categorias.map((cat) => `${cat.label} ${Math.round(cat.pct)} %`).join(" · "))}</span></span>${origen(filaCuenta.origen)}</div></li>`).join("")}</ul>`
    : `<div class="card empty"><p class="t-title3">Ninguna categoría por debajo del peso</p></div>`;
  return pagina("Cuellos de botella", `<div class="section">${head("Por categoría", "Por debajo del 50 %. En C1 los héroes no se señalan. Es una comparación, no un temporizador.")}${lista}</div>`);
}

function vistaPrioridades(m) {
  const c = conflictos(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas, minutos: m.doc.minutos });
  const bloque = (titulo, items) => `<div class="section"><div class="section-header"><span>${titulo}</span></div>${items.length ? `<ul class="list">${items.map(fila).join("")}</ul>` : `<p class="t-footnote c-2">Ninguna</p>`}</div>`;
  return pagina("Prioridades", `<div class="section"><div class="card">${head("Conflictos", c.frase)}<p class="t-footnote c-2">${c.minutos} min de sesión</p></div></div>
    ${bloque("Entran", c.asignadas)}
    ${bloque("No caben", c.fuera)}`);
}

function vistaRescate(m) {
  const r = rescate(m.cuentas, { now: m.now, hibernadas: m.doc.hibernadas });
  const bloque = (titulo, items, despertar) => {
    if (!items.length) return "";
    const lis = items.map((item) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(item.nombre)}</span></span>${origen(item.origen)}${despertar ? `<button type="button" data-op="despertar" data-arg="${esc(item.tag)}">Despertar</button>` : ""}</div></li>`).join("");
    return `<div class="section"><div class="section-header"><span>${titulo}</span></div><ul class="list">${lis}</ul></div>`;
  };
  const vacio = !r.dormidas.length && !r.viejas.length ? `<div class="card empty"><p class="t-title3">Nadie que rescatar</p></div>` : "";
  return pagina("Rescatar flota", `<div class="section"><div class="card">${head("Vista secundaria", r.frase)}</div></div>
    ${bloque("Hibernadas", r.dormidas, true)}
    ${bloque("Sin exportación reciente", r.viejas, false)}
    ${vacio}`);
}
