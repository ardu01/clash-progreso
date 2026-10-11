import { HEROES_FUERA } from "./plan.js";

export const PLANTILLAS = [
  { id: "th", nombre: "Subir de TH" },
  { id: "heroes", nombre: "Héroes al máximo" },
  { id: "guerra", nombre: "Guerra / CWL" },
  { id: "rush", nombre: "Rush esencial" },
  { id: "muros", nombre: "Muros" },
  { id: "lab", nombre: "Laboratorio" },
];

/** Devuelve un parche de plan. En C1, héroes al máximo no los mete en el plan. */
export function aplicarPlantilla(id, { tag, th } = {}) {
  if (id === "th") {
    return { plan: { modo: "rushear", rush: "esencial", th: th == null ? null : th + 1 }, nota: "Rush esencial hasta el ayuntamiento siguiente." };
  }
  if (id === "heroes") {
    if (tag === HEROES_FUERA) {
      return { plan: { modo: "maxear", heroes: false }, nota: "En C1 los héroes quedan fuera del plan." };
    }
    return { plan: { modo: "maxear", heroes: true }, nota: "" };
  }
  if (id === "guerra") return { plan: { modo: "maxear", ataque: true }, nota: "" };
  if (id === "rush") return { plan: { modo: "rushear", rush: "esencial" }, nota: "" };
  if (id === "muros") return { plan: { modo: "maxear", muros: true }, nota: "" };
  if (id === "lab") return { plan: { modo: "maxear", categoria: "laboratorio" }, nota: "" };
  return null;
}
