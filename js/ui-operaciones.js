import { esc } from "./format.js";
import { fraseOrigen } from "./origen.js";
import { indiceEquilibrio } from "./equilibrio.js";
import { cuentaRezagada, nombreCat } from "./gemelo.js";
import { alinear, textoNumero } from "./guerra.js";
import { PLANTILLAS } from "./plantillas.js";
import { enHorizonte, HORIZONTES, metaFlota, predecirNiveles } from "./prediccion.js";
import {
  etiquetaEstrategia, estrategiaPorDefecto, MINUTOS_SESION, ordenarCuentas, planMantenimiento, SUEÑO_DEFECTO,
} from "./prioridades.js";
import { eficiencia, siguientePaso } from "./sesion.js";
import { hayCosteTh, hayRecursosManuales } from "./fuentes.js";

function info(texto) {
  if (!texto) return "";
  return `<button type="button" class="info" data-info aria-expanded="false" aria-pressed="false" aria-label="Más información">ⓘ</button><p class="info-pop" hidden>${esc(texto)}</p>`;
}

function head(titulo, texto) {
  return `<div class="section-head"><div class="section-header"><span>${titulo}</span></div>${info(texto)}</div>`;
}

function chips(op, actual, valores, etiqueta) {
  return `<div class="chip-row" role="toolbar" aria-label="${esc(etiqueta)}">${valores.map((valor) => {
    const on = String(actual) === String(valor);
    return `<button type="button" data-op="${op}" data-arg="${valor}" aria-pressed="${on ? "true" : "false"}">${esc(String(valor))}</button>`;
  }).join("")}</div>`;
}

function fila(href, titulo, sub) {
  return `<li><a class="row" href="${href}"><span class="row__main"><span class="row__title">${esc(titulo)}</span><span class="row__sub">${esc(sub)}</span></span></a></li>`;
}

function hub(m) {
  const cuentas = m.cuentas || [];
  const rezagada = cuentaRezagada(cuentas);
  const aviso = m.doc.aviso;
  const c1 = cuentas.find((cuenta) => cuenta.tag === "#28PLGP0G2");
  const lente = c1 ? `${c1.nombre}: ${etiquetaEstrategia(estrategiaPorDefecto(c1))}` : "Sin cuentas";
  const sueno = m.sueno && m.sueno.desde && m.sueno.hasta ? m.sueno : SUEÑO_DEFECTO;
  return `<h1 class="large-title">Operaciones</h1>
    <p class="large-sub">1–2 h al día · sueño ${esc(sueno.desde)}–${esc(sueno.hasta)}</p>
    ${aviso ? `<div class="section"><div class="card"><p class="t-body">${esc(aviso.texto)}</p><button type="button" class="btn btn--plain btn--block" data-op="aviso-cerrar">Entendido</button></div></div>` : ""}
    <div class="section">${head("Sesión inteligente", "Te guía cuenta por cuenta. C1 va primero y, dentro de cada aldea, el constructor libre. Lo marcado no queda confirmado hasta una exportación.")}
      <ul class="list">${fila("#/operaciones/sesion", "Empezar la sesión", `${m.doc.minutos} min · ${lente}`)}</ul>
    </div>
    <div class="section"><ul class="list">
      ${fila("#/operaciones/mantenimiento", "Mantenimiento", "Lo justo para que un constructor no quede parado")}
      ${fila("#/operaciones/simulador", "Simulador", "Constructores, horas y descuentos")}
      ${fila("#/operaciones/gemelos", "Gemelos", rezagada ? `${rezagada.nombre} va por detrás` : "Ninguna cuenta con datos")}
      ${fila("#/operaciones/equilibrio", "Equilibrio", "Ataque frente a defensa")}
      ${fila("#/operaciones/prediccion", "Predicción", "Probable, mejor y peor")}
      ${fila("#/operaciones/guerras", "Guerras y CWL", "Anotadas a mano")}
      ${fila("#/operaciones/diario", "Diario", `${(m.doc.diario || []).length} apuntes`)}
      ${fila("#/operaciones/plantillas", "Plantillas", "TH, héroes, guerra, rush, muros, laboratorio")}
      ${fila("#/operaciones/prioridades", "Prioridades", "Si no caben en los minutos, C1 conserva su sitio")}
      ${fila("#/operaciones/estrategias", "Explorar estrategias", "Simulación. No cambia el plan hasta que la pases.")}
    </ul></div>`;
}

function vistaSesion(m) {
  const doc = m.doc;
  const sesion = doc.sesion;
  const paso = siguientePaso(sesion);
  const eff = eficiencia(sesion);
  const cuerpo = !sesion
    ? `<button type="button" class="btn btn--primary btn--block" data-op="sesion-empezar">Empezar</button>`
    : paso
      ? `<p class="t-title3">${paso.estado === "pospuesto" ? "Pospuesto · " : ""}${esc(paso.nombre)}</p><p class="t-body">${esc(paso.titulo)} · ${paso.minutos} min</p><p class="t-footnote c-2">${esc(fraseOrigen({ origen: "provisional" }))}</p>
        <div class="chip-row">
          <button type="button" data-op="sesion-hecho" data-arg="${esc(paso.id)}">Hecho</button>
          <button type="button" data-op="sesion-saltar" data-arg="${esc(paso.id)}">Saltar</button>
          <button type="button" data-op="sesion-posponer" data-arg="${esc(paso.id)}">Después</button>
        </div>`
      : `<p class="t-body">Sesión al día.</p><button type="button" class="btn btn--primary btn--block" data-op="sesion-empezar">Otra</button><button type="button" class="btn btn--plain btn--block" data-op="sesion-cerrar">Cerrar</button>`;
  return `<h1 class="large-title">Sesión</h1>
    <p class="large-sub">${cuentasOrden(m)}</p>
    <div class="section"><div class="card">
      ${head("Minutos", "De 10 a 120. El día de juego cabe entre 1 y 2 horas.")}
      ${chips("min", doc.minutos, MINUTOS_SESION, "Minutos de la sesión")}
      ${cuerpo}
      <p class="t-footnote c-2">${eff.hechos} marcados · ${esc(eff.frase)}</p>
    </div></div>`;
}

function cuentasOrden(m) {
  const nombres = ordenarCuentas(m.cuentas).slice(0, 4).map((cuenta) => cuenta.nombre || cuenta.tag);
  return nombres.length ? nombres.join(" · ") : "Sin cuentas";
}

function vistaMantenimiento(m) {
  const plan = planMantenimiento(m.cuentas, { minutos: m.doc.mantenimientoMin, dias: m.doc.mantenimientoDias });
  const filas = plan.obligatorias.length
    ? `<ul class="list">${plan.obligatorias.map((paso) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(paso.nombre)}</span><span class="row__sub">${esc(paso.titulo)} · ${paso.minutos} min</span></span></div></li>`).join("")}</ul>`
    : `<p class="t-body">Ningún constructor libre con datos al día.</p>`;
  return `<h1 class="large-title">Mantenimiento</h1>
    <div class="section"><div class="card">
      ${head("Presupuesto", plan.frase)}
      ${chips("mant-min", plan.minutos, [10, 20, 30], "Minutos")}
      ${chips("mant-dias", plan.dias, ["todos", "finde"], "Días")}
      ${plan.aviso ? `<p class="t-body">${esc(plan.aviso)}</p>` : `<p class="t-footnote c-2">${plan.necesario} min de lo obligatorio.</p>`}
    </div></div>
    <div class="section">${filas}</div>`;
}

function lineaAyudantes(resultado) {
  if (!resultado) return "";
  const bits = [];
  if (resultado.constructorAprendiz) bits.push(`Constructor aprendiz Nv ${resultado.constructorAprendiz.lvl}`);
  if (resultado.asistenteLaboratorio) bits.push(`Asistente de laboratorio Nv ${resultado.asistenteLaboratorio.lvl}`);
  if (!bits.length) return "Esta cuenta no trae Constructor aprendiz ni Asistente de laboratorio.";
  return `${bits.join(" · ")}. Entran en la simulación. El ahorro de tiempo no está en la fuente y no se resta.`;
}

function vistaSimulador(m) {
  const sim = m.doc.sim || {};
  const resultado = sim.resultado;
  const recursos = hayRecursosManuales() ? "Hay recursos anotados." : "Sin oro en la exportación.";
  const th = hayCosteTh() ? "Hay coste de ayuntamiento." : "El coste de subir el ayuntamiento no está en los datos.";
  const linea = resultado
    ? `${resultado.dias} días de constructor · ${resultado.lanzamientosDia} lanzamientos al día. ${fraseOrigen(resultado)}`
    : "Pulsa Calcular. No cambia la aldea.";
  const ayudantes = lineaAyudantes(resultado);
  return `<h1 class="large-title">Simulador</h1>
    <div class="section"><div class="card">
      ${head("Escenario", `${recursos} ${th} Sin objetos mágicos.`)}
      <p class="t-footnote c-2">Constructores</p>
      ${chips("sim-ctor", sim.constructores, [4, 5, 6], "Constructores")}
      <p class="t-footnote c-2">Horas de juego</p>
      ${chips("sim-horas", sim.horas, [60, 90, 120], "Horas")}
      <p class="t-footnote c-2">Descuento de recursos</p>
      ${chips("sim-recurso", sim.descuentoRecurso, [0, 0.1, 0.2], "Descuento de recursos")}
      <p class="t-footnote c-2">Descuento de tiempo</p>
      ${chips("sim-tiempo", sim.descuentoTiempo, [0, 0.1, 0.2], "Descuento de tiempo")}
      <button type="button" class="btn btn--primary btn--block" data-op="sim-calc">Calcular</button>
      <button type="button" class="btn btn--secondary btn--block" data-op="evento">Guardar como evento</button>
      <p class="t-body">${esc(linea)}</p>
      ${ayudantes ? `<p class="t-footnote c-2">${esc(ayudantes)}</p>` : ""}
      <p class="t-footnote c-2">${(m.doc.eventos || []).length} eventos</p>
    </div></div>`;
}

function vistaGemelos(m) {
  const rezagada = cuentaRezagada(m.cuentas);
  const falta = rezagada && rezagada.faltas.length
    ? rezagada.faltas.map((item) => `${item.label} ${item.pct}%`).join(" · ")
    : "Nada por debajo del 80 %.";
  const lista = (m.doc.gemelos || []).map((gemelo) => {
    const pide = m.doc.confirmar === gemelo.id;
    const accion = gemelo.convertidoEnPlan
      ? `<span class="row__sub">Ya está en el plan</span>`
      : pide
        ? `<button type="button" data-op="gemelo-ok" data-arg="${esc(gemelo.id)}">Confirmar</button><button type="button" data-op="gemelo-no">Ahora no</button>`
        : `<button type="button" data-op="gemelo-pedir" data-arg="${esc(gemelo.id)}">Pasar al plan</button>`;
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(gemelo.tag)}</span><span class="row__sub">${esc(etiquetaEstrategia(gemelo.estrategia))} · ${esc(fraseOrigen(gemelo))}</span>${accion}</span></div></li>`;
  }).join("");
  return `<h1 class="large-title">Gemelos</h1>
    <div class="section"><div class="card">
      ${head("Rezagada", "La media más baja con datos al día. En C1 los héroes no cuentan como lo que falta.")}
      <p class="t-body">${rezagada ? `${esc(rezagada.nombre)} · ${rezagada.media}%` : "Sin datos"}</p>
      <p class="t-footnote c-2">${esc(falta)}</p>
      <button type="button" class="btn btn--primary btn--block" data-op="gemelo">Crear gemelo de la cuenta en foco</button>
      <button type="button" class="btn btn--plain btn--block" data-op="foco">Cuenta: ${esc((focoNombre(m)) || "—")}</button>
    </div></div>
    ${lista ? `<div class="section"><ul class="list">${lista}</ul></div>` : ""}`;
}

function focoNombre(m) {
  const tag = m.doc.tagFoco;
  const cuenta = (m.cuentas || []).find((item) => item.tag === tag) || (m.cuentas || [])[0];
  return cuenta ? cuenta.nombre : "";
}

function vistaEquilibrio(m) {
  const filas = ordenarCuentas(m.cuentas).map((cuenta) => {
    const estrategia = estrategiaPorDefecto(cuenta);
    const indice = indiceEquilibrio({ tag: cuenta.tag, cats: cuenta.cats, estrategia });
    const bajos = indice.bajos.slice(0, 2).map((item) => nombreCat(item.key)).join(", ");
    const cifra = indice.indice == null ? "—" : String(indice.indice);
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(cuenta.nombre || cuenta.tag)}</span><span class="row__sub">${esc(etiquetaEstrategia(estrategia))} · ${cifra}${bajos ? ` · ${esc(bajos)}` : ""}</span></span></div></li>`;
  }).join("");
  return `<h1 class="large-title">Equilibrio</h1>
    <div class="section">${head("Por cuenta", "0 es ataque y defensa muy separados. 100 es parejo. La media de la aldea no cambia.")}
      <ul class="list">${filas || `<li><div class="card empty"><p class="t-title3">Sin cuentas</p></div></li>`}</ul>
    </div>`;
}

function vistaPrediccion(m) {
  const meta = metaFlota(m.cuentas, m.doc.metaPred);
  const muestras = (m.cuentas || []).reduce((sum, cuenta) => sum + (cuenta.muestras || 0), 0);
  const ritmo = (m.cuentas || []).map((cuenta) => cuenta.ritmo).find((n) => n > 0) || null;
  const pred = predecirNiveles({ ritmo, muestra: muestras, restante: meta.faltan, ahora: m.now });
  const paneles = HORIZONTES.map((dias) => {
    const donde = enHorizonte(pred.probable, m.now, dias);
    return `<li><div class="row"><span class="row__main"><span class="row__title">${dias} días</span><span class="row__sub">${esc(donde)}</span></span></div></li>`;
  }).join("");
  return `<h1 class="large-title">Predicción</h1>
    <div class="section"><div class="card">
      ${head("Flota", pred.frase)}
      <p class="t-body">${esc(meta.frase)}</p>
      ${chips("pred-n", meta.n, [3, 5, 8], "Cuentas en la meta")}
      ${chips("pred-th", meta.th, [15, 16, 17], "Ayuntamiento")}
    </div></div>
    <div class="section"><ul class="list">${paneles}</ul></div>`;
}

function vistaGuerras(m) {
  const orden = alinear(m.cuentas).slice(0, 6);
  const alineacion = orden.map((cuenta) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(cuenta.nombre)}</span><span class="row__sub">${cuenta.ofensiva == null ? "Sin anotar" : `${cuenta.ofensiva}%`}${cuenta.avisoHeroe ? ` · ${esc(cuenta.avisoHeroe)}` : ""}</span></span></div></li>`).join("");
  const guerras = (m.doc.guerras || []).map((guerra) => {
    const estrellas = textoNumero(guerra.participantes && guerra.participantes[0] ? guerra.participantes[0].estrellas : null);
    return `<li><div class="row"><span class="row__main"><span class="row__title">${esc(guerra.nombre)}${guerra.cerrada ? " · cerrada" : ""}</span><span class="row__sub">Estrellas ${esc(estrellas)}</span></span>${guerra.cerrada ? "" : `<button type="button" data-op="guerra-cerrar" data-arg="${esc(guerra.id)}">Cerrar</button>`}</div></li>`;
  }).join("");
  return `<h1 class="large-title">Guerras</h1>
    <div class="section"><div class="card">
      ${head("Centro de guerra", "Clan, rival, ataques y estrellas solo si los escribes. Un hueco es «sin anotar», no un cero.")}
      <button type="button" class="btn btn--primary btn--block" data-op="guerra">Nueva guerra</button>
      <button type="button" class="btn btn--secondary btn--block" data-op="cwl">Nueva CWL</button>
    </div></div>
    ${guerras ? `<div class="section"><ul class="list">${guerras}</ul></div>` : ""}
    <div class="section">${head("Alineación", "Orden por laboratorio, héroes y ejército ya calculados. C1 no avisa de héroes.")}<ul class="list">${alineacion}</ul></div>`;
}

function vistaDiario(m) {
  const entradas = (m.doc.diario || []).slice().reverse().slice(0, 12);
  const filas = entradas.length
    ? entradas.map((entrada) => `<li><div class="row"><span class="row__main"><span class="row__title">${esc(entrada.texto)}</span></span></div></li>`).join("")
    : `<li><div class="card empty"><p class="t-title3">Aún no hay apuntes</p><p class="t-subhead c-2">Se anotan solos al importar.</p></div></li>`;
  return `<h1 class="large-title">Diario</h1>
    <div class="section"><div class="card">
      ${head("Anotación", "El diario no fecha una mejora en el minuto de la importación.")}
      <label class="sort-label">Nota<input data-op-nota type="text" maxlength="180" aria-label="Nota del diario"></label>
      <button type="button" class="btn btn--primary btn--block" data-op="nota">Anotar</button>
    </div></div>
    <div class="section"><ul class="list">${filas}</ul></div>`;
}

function vistaPlantillas(m) {
  const botones = PLANTILLAS.map((plantilla) => `<button type="button" class="btn btn--secondary btn--block" data-op="plantilla" data-arg="${plantilla.id}">${esc(plantilla.nombre)}</button>`).join("");
  return `<h1 class="large-title">Plantillas</h1>
    <div class="section"><div class="card">
      ${head("Sobre la cuenta en foco", "Escribe el plan de esa cuenta. No crea una marca encima de un temporizador.")}
      <button type="button" class="btn btn--plain btn--block" data-op="foco">Cuenta: ${esc(focoNombre(m) || "—")}</button>
      <p class="t-footnote c-2">Última: ${esc(m.doc.ultima || "ninguna")}</p>
      ${botones}
    </div></div>`;
}

const VISTAS = {
  hub,
  sesion: vistaSesion,
  mantenimiento: vistaMantenimiento,
  simulador: vistaSimulador,
  gemelos: vistaGemelos,
  equilibrio: vistaEquilibrio,
  prediccion: vistaPrediccion,
  guerras: vistaGuerras,
  diario: vistaDiario,
  plantillas: vistaPlantillas,
};

export function htmlOperaciones(modelo) {
  const sub = modelo && VISTAS[modelo.sub] ? modelo.sub : "hub";
  return VISTAS[sub](modelo || { doc: {}, cuentas: [] });
}
