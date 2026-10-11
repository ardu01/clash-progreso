/** Qué hace un toque en un enlace interno (#/…).
 *  Subir arriba solo si esa ruta ya está en la barra de direcciones.
 *  Inicio marcado durante Actualizar todas, Ahora o Copia no cuenta como «ya estás ahí».
 */
export function accionTab(hash, href) {
  const dest = String(href || "#/inicio");
  const here = String(hash || "");
  const mismo = here === dest || ((here === "" || here === "#" || here === "#/") && dest === "#/inicio");
  if (mismo) return { type: "scroll" };
  return { type: "go", hash: dest };
}
