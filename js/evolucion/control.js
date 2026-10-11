import { APP_VERSION } from "../caches.js";
import { compilarPasos, defaultPlan } from "../roadmap.js";
import { guardarEvolucion, leerEvolucion } from "../store.js";
import { empaquetar } from "./empaquetar.js";
import { semanaDefecto } from "./sesiones.js";

let worker = null;

export function pararExploracion() {
  if (!worker) return false;
  worker.terminate();
  worker = null;
  return true;
}

export function empaquetarCuentas(cuentas, index, ahora) {
  const hipotesis = { minutosPorAtaque: 3 };
  return (cuentas || []).filter((cuenta) => cuenta && cuenta.exp).map((cuenta) => empaquetar(compilarPasos({
    exp: cuenta.exp,
    index,
    tag: cuenta.tag,
    plan: cuenta.plan || defaultPlan(),
    provisionals: cuenta.provisionals || [],
    now: ahora,
  }), hipotesis));
}

export async function empezarExploracion(mensaje, alMensaje) {
  pararExploracion();
  let reanudar = null;
  try {
    const previo = await leerEvolucion();
    if (previo && previo.semilla === mensaje.semilla && previo.horizonte === mensaje.horizonte && Array.isArray(previo.genes)) {
      reanudar = previo.genes;
    }
  } catch { /* sin checkpoint */ }
  worker = new Worker("./js/evolucion.worker.js?v=" + APP_VERSION, { type: "module" });
  const actual = worker;
  actual.onmessage = (ev) => {
    if (actual !== worker) return;
    const data = ev.data || {};
    if (data.tipo === "progreso") {
      guardarEvolucion({
        semilla: mensaje.semilla,
        horizonte: mensaje.horizonte,
        generacion: data.generacion,
        genes: data.genes,
      }).catch(() => {});
    }
    alMensaje(data);
  };
  actual.postMessage({ ...mensaje, tipo: "buscar", reanudar, semana: mensaje.semana || semanaDefecto() });
}

export { semanaDefecto };
