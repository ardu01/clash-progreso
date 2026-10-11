import { esc } from "./format.js";

function info(texto) {
  return `<button type="button" class="info" data-info aria-expanded="false" aria-pressed="false" aria-label="Más información">ⓘ</button><p class="info-pop" hidden>${esc(texto)}</p>`;
}

function chips(nombre, actual, valores) {
  return `<div class="chip-row" role="toolbar" aria-label="${esc(nombre)}">${valores.map((valor) => {
    const on = String(actual) === String(valor);
    return `<button type="button" data-evo="${esc(nombre)}" data-arg="${esc(String(valor))}" aria-pressed="${on ? "true" : "false"}">${esc(String(valor))}</button>`;
  }).join("")}</div>`;
}

function fecha(ms) {
  if (ms == null) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

function ficha(est, fechas) {
  const cuando = fechas
    ? `Probable ${fecha(est.probable)} · mejor ${fecha(est.mejor)} · peor ${fecha(est.peor)}`
    : "Solo para comparar. A este horizonte no se afirma un día.";
  const pros = (est.pros || []).map((t) => `<li>${esc(t)}</li>`).join("");
  const contras = (est.contras || []).map((t) => `<li>${esc(t)}</li>`).join("");
  const adoptar = est.id === "base"
    ? ""
    : `<button type="button" class="btn btn--secondary btn--block" data-evo-adoptar="${esc(est.id)}">Pasar al plan</button>`;
  return `<div class="card">
    <p class="t-title3">${esc(est.nombre)}</p>
    <p class="t-footnote c-2">${esc(cuando)}</p>
    <p class="t-body">${est.hechos} de ${est.total} pasos · ${Math.round(est.esfuerzo)} min de media por sesión</p>
    ${pros ? `<ul class="list">${pros}</ul>` : ""}
    ${contras ? `<ul class="list">${contras}</ul>` : ""}
    ${adoptar}
  </div>`;
}

export function htmlEstrategias(modelo) {
  const cfg = modelo.cfg || { horizonte: 90, presupuesto: 90 };
  const res = modelo.resultado;
  const estado = modelo.estado || "Sin buscar. Simulación.";
  const cuerpo = res
    ? `<div class="section">${ficha(res.base, res.fechas)}${(res.estrategias || []).map((est) => ficha(est, res.fechas)).join("")}</div>`
    : "";
  return `<h1 class="large-title">Estrategias</h1>
    <p class="large-sub">Simulación · las 11 cuentas juntas</p>
    <div class="section"><div class="card">
      <div class="section-head"><div class="section-header"><span>Explorar</span></div>${info("No usa el sueño de 23 a 07. Cada día, por defecto, una sesión de 19:00 a 21:00. Las colas pueden terminar fuera; el siguiente paso espera a la próxima sesión. El farmeo es una hipótesis.")}</div>
      <p class="t-footnote c-2">Horizonte</p>
      ${chips("horizonte", cfg.horizonte, [30, 90, 180, 365])}
      <p class="t-footnote c-2">Minutos al día</p>
      ${chips("presupuesto", cfg.presupuesto, [60, 90, 120])}
      <p class="t-body" data-evo-estado>${esc(estado)}</p>
      <button type="button" class="btn btn--primary btn--block" data-evo-empezar>Explorar</button>
      <button type="button" class="btn btn--plain btn--block" data-evo-parar>Parar</button>
    </div></div>
    ${cuerpo}`;
}
