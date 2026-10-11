import { buscar, compararConBase } from "./evolucion/nsga.js";

let seguir = true;

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.tipo === "parar") {
    seguir = false;
    return;
  }
  if (msg.tipo !== "buscar") return;
  seguir = true;
  try {
    const resultado = compararConBase(buscar(msg, {
      seguir: () => seguir,
      progreso: (p) => self.postMessage({ tipo: "progreso", ...p }),
    }));
    self.postMessage({ tipo: "fin", resultado });
  } catch (err) {
    self.postMessage({ tipo: "error", texto: String(err && err.message || err) });
  }
};
