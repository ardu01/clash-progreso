// Cargador del paquete estético «Temas Clash Progreso» (aparte de la app, con versión propia).
// La app no trae ningún tema: si existe ./paquete-estetico/paquete.json, carga base.css y SOLO el CSS del tema elegido.
// Solo en modo oscuro. "" = Ninguno (por defecto), "auto" = Automático (TH de la cuenta). Sin paquete no hace nada.
const RAIZ = "./paquete-estetico/";
const CLAVE = "cp-tema";
let paquete = null;
let pedido = null;

export function cargarPaquete() {
  if (!pedido) {
    pedido = fetch(RAIZ + "paquete.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((p) => { paquete = p && Array.isArray(p.temas) && p.temas.length ? p : null; return paquete; });
  }
  return pedido;
}
export const hayPaquete = () => paquete != null;
export const temasDelPaquete = () => (paquete ? paquete.temas : []);
const GRUPOS = [{ id: "ayuntamiento", nombre: "Ayuntamientos" }, { id: "especial", nombre: "Especiales" }, { id: "heroe", nombre: "Héroes" }];
export const gruposDelPaquete = () => (paquete && Array.isArray(paquete.grupos) ? paquete.grupos : GRUPOS);   // 1.1.0+: grupos en paquete.json
export const temaElegido = () => localStorage.getItem(CLAVE) || "";
export function elegirTema(id) {
  if (id) localStorage.setItem(CLAVE, id); else localStorage.removeItem(CLAVE);
}
// th: TH de la cuenta abierta o de la principal (solo para «Automático»).
export function temaActivo(th) {
  const e = temaElegido();
  if (!paquete || !e) return null;
  if (e !== "auto") return paquete.temas.find((t) => t.id === e) || null;
  const auto = paquete.temas.filter((t) => t.th_auto != null).sort((a, b) => a.th_auto - b.th_auto);
  if (th == null || !auto.length) return null;
  return auto.filter((t) => t.th_auto <= th).pop() || auto[0];
}
function hoja(id, href, alCargar) {
  let l = document.getElementById(id);
  if (!href) { if (l) l.remove(); alCargar(); return; }
  const listo = () => { l.dataset.ok = "1"; alCargar(); };   // el tema se activa cuando su CSS ya está: nunca a medias
  if (l && l.getAttribute("href") === href) { if (l.dataset.ok) alCargar(); else l.onload = listo; return; }
  if (!l) { l = document.createElement("link"); l.rel = "stylesheet"; l.id = id; document.head.append(l); }
  delete l.dataset.ok;
  l.onload = listo;
  l.onerror = () => { l.remove(); alCargar(true); };
  l.setAttribute("href", href);
}
export function aplicarTema(t, oscuro) {
  const raiz = document.documentElement;
  const quitar = () => { delete raiz.dataset.tema; delete raiz.dataset.temaFigura; };
  if (!paquete) { quitar(); return; }
  const v = "?v=" + encodeURIComponent(paquete.version);
  const activo = oscuro && t ? t : null;
  hoja("cp-temas-base", RAIZ + paquete.base + v, () => {});
  hoja("cp-temas-tema", activo ? RAIZ + activo.css + v : null, (fallo) => {
    if (!activo || fallo) { quitar(); return; }
    raiz.dataset.tema = activo.id;
    raiz.dataset.temaFigura = activo.thumb ? "img" : "sin";
  });
}
export const muestra = (t) => (t && t.muestra ? ` style="--sw1:${t.muestra[0]};--sw2:${t.muestra[1]};--sw3:${t.muestra[2]}"` : "");
