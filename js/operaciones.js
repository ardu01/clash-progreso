import { pasosRecomendados } from "./atencion.js";
import { entradaImportacion, notaManual } from "./diario.js";
import { crearEvento } from "./evento.js";
import { convertirEnPlan, crearGemelo } from "./gemelo.js";
import { crearGuerra } from "./guerra.js";
import { aplicarPlantilla } from "./plantillas.js";
import { estrategiaPorDefecto, MINUTOS_SESION } from "./prioridades.js";
import { cerrarSesion, crearSesion, marcarPaso } from "./sesion.js";
import { simular } from "./simulacion.js";

export function docVacio() {
  return {
    id: "operaciones",
    tipo: "operaciones",
    minutos: 60,
    horasDia: 90,
    mantenimientoMin: 20,
    mantenimientoDias: "todos",
    sesion: null,
    eventos: [],
    guerras: [],
    gemelos: [],
    diario: [],
    metaPred: { n: 5, th: 15 },
    sim: { constructores: 5, descuentoRecurso: 0, descuentoTiempo: 0, horas: 90 },
    confirmar: null,
    tagFoco: "",
    aviso: null,
    hibernadas: [],
    mostrarTodas: false,
  };
}

export function docDe(raw) {
  const base = docVacio();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    id: "operaciones",
    tipo: "operaciones",
    metaPred: { ...base.metaPred, ...(raw.metaPred || {}) },
    sim: { ...base.sim, ...(raw.sim || {}) },
    eventos: Array.isArray(raw.eventos) ? raw.eventos : [],
    guerras: Array.isArray(raw.guerras) ? raw.guerras : [],
    gemelos: Array.isArray(raw.gemelos) ? raw.gemelos : [],
    diario: Array.isArray(raw.diario) ? raw.diario : [],
    hibernadas: Array.isArray(raw.hibernadas) ? raw.hibernadas : [],
    mostrarTodas: !!raw.mostrarTodas,
  };
}

function cuentaDe(cuentas, tag) {
  return (cuentas || []).find((cuenta) => cuenta.tag === tag) || cuentas[0] || null;
}

function foco(doc, cuentas) {
  return cuentaDe(cuentas, doc.tagFoco) || (cuentas || [])[0] || null;
}

/**
 * Transición pura. `plan` solo sale al confirmar un gemelo o una plantilla.
 * No toca exportaciones.
 */
export function reducir(doc, op, arg, ctx) {
  const actual = docDe(doc);
  const cuentas = (ctx && ctx.cuentas) || [];
  const now = (ctx && ctx.now) || 0;
  const out = { doc: actual, plan: null, toast: "" };
  const set = (patch) => { out.doc = { ...actual, ...patch }; };

  if (op === "min" && MINUTOS_SESION.includes(Number(arg))) set({ minutos: Number(arg) });
  else if (op === "horas" && MINUTOS_SESION.includes(Number(arg))) set({ horasDia: Number(arg) });
  else if (op === "foco") {
    const tags = cuentas.map((cuenta) => cuenta.tag);
    const at = Math.max(0, tags.indexOf(actual.tagFoco));
    set({ tagFoco: tags.length ? tags[(at + 1) % tags.length] : "" });
  } else if (op === "sesion-empezar") {
    set({
      sesion: crearSesion({
        cuentas,
        minutos: actual.minutos,
        ahora: now,
        recomendados: pasosRecomendados(cuentas, { minutos: actual.minutos, now, hibernadas: actual.hibernadas }),
      }),
    });
  } else if (op === "hibernar") {
    const [modo, tag] = String(arg || "").split("|");
    const dias = modo === "indef" ? null : Number(modo);
    if (!tag) out.toast = "Elige una cuenta.";
    else if (modo !== "indef" && !(dias > 0)) out.toast = "Escribe los días.";
    else {
      const hasta = modo === "indef" ? null : now + dias * 86400000;
      set({
        hibernadas: actual.hibernadas.filter((item) => item.tag !== tag).concat([{
          tag,
          modo: modo === "indef" ? "indef" : String(dias),
          hasta,
          origen: "manual",
        }]),
      });
    }
  } else if (op === "despertar") {
    set({ hibernadas: actual.hibernadas.filter((item) => item.tag !== arg) });
  } else if (op === "excepciones") {
    set({ mostrarTodas: arg === "todas" });
  } else if (op === "sesion-hecho" || op === "sesion-saltar" || op === "sesion-posponer") {
    const estado = op === "sesion-hecho" ? "hecho" : op === "sesion-saltar" ? "saltado" : "pospuesto";
    set({ sesion: marcarPaso(actual.sesion, arg, estado) });
  } else if (op === "sesion-cerrar") set({ sesion: cerrarSesion(actual.sesion, now) });
  else if (op === "mant-min") set({ mantenimientoMin: Number(arg) || 20 });
  else if (op === "mant-dias") set({ mantenimientoDias: arg === "finde" ? "finde" : "todos" });
  else if (op === "sim-ctor") set({ sim: { ...actual.sim, constructores: Number(arg) || 5 } });
  else if (op === "sim-recurso") set({ sim: { ...actual.sim, descuentoRecurso: Number(arg) || 0 } });
  else if (op === "sim-tiempo") set({ sim: { ...actual.sim, descuentoTiempo: Number(arg) || 0 } });
  else if (op === "sim-horas") set({ sim: { ...actual.sim, horas: Number(arg) || 90 } });
  else if (op === "sim-calc") {
    const cuenta = foco(actual, cuentas);
    const resultado = simular({
      constructores: actual.sim.constructores,
      descuentoRecurso: actual.sim.descuentoRecurso,
      descuentoTiempo: actual.sim.descuentoTiempo,
      horasJuego: actual.sim.horas,
      segConstructor: cuenta && cuenta.segConstructor,
      oro: cuenta && cuenta.oro,
      elixir: cuenta && cuenta.elixir,
      oscuro: cuenta && cuenta.oscuro,
      costeTh: (ctx && ctx.costeTh) || null,
    });
    set({ sim: { ...actual.sim, resultado } });
  } else if (op === "evento") {
    const evento = crearEvento({
      descuentoRecurso: actual.sim.descuentoRecurso,
      descuentoTiempo: actual.sim.descuentoTiempo,
      ahora: now,
    });
    set({ eventos: actual.eventos.concat(evento) });
  } else if (op === "guerra" || op === "cwl") {
    const guerra = crearGuerra({
      tipo: op === "cwl" ? "cwl" : "guerra",
      ahora: now + actual.guerras.length,
      participantes: cuentas.map((cuenta) => ({ tag: cuenta.tag, nombre: cuenta.nombre, pct: cuenta.media })),
    });
    set({ guerras: actual.guerras.concat(guerra) });
  } else if (op === "guerra-cerrar") {
    set({
      guerras: actual.guerras.map((guerra) => (guerra.id === arg ? { ...guerra, cerrada: true } : guerra)),
    });
  } else if (op === "gemelo") {
    const cuenta = foco(actual, cuentas);
    if (cuenta) {
      const gemelo = crearGemelo({
        tag: cuenta.tag,
        th: cuenta.th,
        estrategia: estrategiaPorDefecto(cuenta),
        constructores: actual.sim.constructores,
        ahora: now + actual.gemelos.length,
      });
      set({ gemelos: actual.gemelos.concat(gemelo), confirmar: null });
    }
  } else if (op === "gemelo-pedir") set({ confirmar: arg });
  else if (op === "gemelo-ok") {
    const gemelo = actual.gemelos.find((item) => item.id === arg);
    const paso = convertirEnPlan(gemelo);
    if (paso.ok) {
      out.plan = { tag: paso.tag, patch: paso.plan };
      out.toast = "El plan de la cuenta recoge el gemelo.";
      set({
        confirmar: null,
        gemelos: actual.gemelos.map((item) => (item.id === arg ? { ...item, convertidoEnPlan: now } : item)),
      });
    } else out.toast = paso.motivo;
  } else if (op === "gemelo-no") set({ confirmar: null });
  else if (op === "plantilla") {
    const cuenta = foco(actual, cuentas);
    const aplicada = aplicarPlantilla(arg, { tag: cuenta && cuenta.tag, th: cuenta && cuenta.th });
    if (aplicada && cuenta) {
      out.plan = { tag: cuenta.tag, patch: aplicada.plan };
      out.toast = aplicada.nota || "Plantilla en el plan.";
      set({ tagFoco: cuenta.tag, ultima: arg });
    }
  } else if (op === "nota") {
    const nota = notaManual({ texto: arg, tag: actual.tagFoco || null, at: now });
    if (nota) set({ diario: actual.diario.concat(nota) });
    else out.toast = "Escribe la nota.";
  } else if (op === "aviso-cerrar") set({ aviso: null });
  else if (op === "pred-n") set({ metaPred: { ...actual.metaPred, n: Number(arg) || 5 } });
  else if (op === "pred-th") set({ metaPred: { ...actual.metaPred, th: Number(arg) || 15 } });
  return out;
}

export function sumarDiario(doc, entradas) {
  const actual = docDe(doc);
  const previas = new Set(actual.diario.map((item) => item.id));
  const nuevas = (entradas || []).filter((item) => item && !previas.has(item.id));
  if (!nuevas.length) return actual;
  return { ...actual, diario: actual.diario.concat(nuevas) };
}

export function entradaDeImportacion(datos) {
  return entradaImportacion(datos);
}
