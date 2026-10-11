import { ordenarCuentas, tareasDe } from "./prioridades.js";

/**
 * Itinerario de una visita. El estado de un paso es una declaración.
 * `confirmado` no se rellena aquí: solo lo cubre una exportación posterior.
 */
export function crearSesion({ cuentas, minutos, ahora }) {
  const tope = Number(minutos) > 0 ? Number(minutos) : 60;
  const orden = ordenarCuentas(cuentas);
  const pasos = [];
  let usados = 0;
  for (const cuenta of orden) {
    for (const paso of tareasDe(cuenta)) {
      if (pasos.length && usados + paso.minutos > tope) continue;
      pasos.push({ ...paso });
      usados += paso.minutos;
    }
  }
  if (!pasos.length) {
    for (const cuenta of orden) {
      if (pasos.length && usados + 2 > tope) break;
      pasos.push({
        id: `${cuenta.tag}:abrir`,
        tag: cuenta.tag,
        nombre: cuenta.nombre || cuenta.tag,
        cola: "visita",
        titulo: "Abrir la cuenta",
        minutos: 2,
        obligatoria: false,
        estado: "pendiente",
      });
      usados += 2;
    }
  }
  return {
    id: "sesion-" + (ahora || 0),
    tipo: "sesion",
    creada: ahora || 0,
    minutos: tope,
    orden: orden.map((cuenta) => cuenta.tag),
    pasos,
    cerrada: false,
  };
}

export function marcarPaso(sesion, id, estado) {
  if (!sesion) return sesion;
  const permitido = estado === "hecho" || estado === "saltado" || estado === "pospuesto" || estado === "pendiente";
  if (!permitido) return sesion;
  return {
    ...sesion,
    pasos: (sesion.pasos || []).map((paso) => {
      if (paso.id !== id) return paso;
      const next = { ...paso, estado };
      delete next.confirmado;
      return next;
    }),
  };
}

/** La pregunta siguiente. Si no queda ninguna, la sesión pide otra vuelta. */
export function siguientePaso(sesion) {
  if (!sesion || sesion.cerrada) return null;
  return (sesion.pasos || []).find((paso) => paso.estado === "pendiente" || paso.estado === "pospuesto") || null;
}

export function eficiencia(sesion) {
  if (!sesion) return { previstos: 0, hechos: 0, confirmados: 0, frase: "Sin confirmar" };
  const hechos = (sesion.pasos || []).filter((paso) => paso.estado === "hecho").length;
  const confirmados = (sesion.pasos || []).filter((paso) => paso.confirmado).length;
  return {
    previstos: sesion.minutos || 0,
    hechos,
    confirmados,
    frase: confirmados ? `${confirmados} confirmados por una exportación` : "Sin confirmar",
  };
}

export function cerrarSesion(sesion, ahora) {
  if (!sesion) return sesion;
  return { ...sesion, cerrada: true, cerradaEn: ahora || 0 };
}
