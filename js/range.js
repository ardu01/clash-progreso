import { madridDayKey } from "./format.js";

const DAYS = { "7": 7, "30": 30, "90": 90 };

/** Día de Madrid (YYYY-MM-DD) dentro del filtro. `ahora` es ms. */
export function dayInRange(day, filtro, ahora = Date.now()) {
  const preset = (filtro && filtro.tiempo) || "todo";
  if (preset === "todo") return true;
  if (preset === "rango") {
    const desde = filtro.desde || "";
    const hasta = filtro.hasta || "";
    if (!desde || !hasta) return true;
    return day >= desde && day <= hasta;
  }
  const n = DAYS[preset];
  if (!n) return true;
  const end = madridDayKey(ahora);
  const start = madridDayKey(ahora - (n - 1) * 86400000);
  return day >= start && day <= end;
}

export function accountVisible(meta, filtro) {
  if (!filtro) return true;
  if (filtro.th && String(meta.th) !== String(filtro.th)) return false;
  const grupo = filtro.grupo || "";
  if (!grupo) return true;
  if (grupo === "principal") return !!meta.principal;
  return (meta.grupos || []).includes(grupo);
}
