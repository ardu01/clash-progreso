/**
 * Cifra y marca de un coste, al estilo de la tarjeta de mejorar:
 * el número arriba, el recurso oficial al lado y el martillo del botón Mejorar.
 * Los PNG están en assets/oficial/resources/, copiados tal cual del Fan Kit.
 * La URL de origen vive en el manifiesto (url_origen), no aquí.
 */

import { ajusteOf } from "./images.js";

const ETIQUETA = {
  oro: "oro",
  elixir: "elixir",
  oscuro: "oscuro",
  gemas: "gemas",
  brillante: "brillante",
  resplandeciente: "resplandeciente",
  estelar: "estelar",
  muros: "oro o elixir",
};

const ICONO = {
  oro: { ruta: "oficial/resources/oro.png", ancho: 500, alto: 500 },
  elixir: { ruta: "oficial/resources/elixir.png", ancho: 500, alto: 500 },
  oscuro: { ruta: "oficial/resources/oscuro.png", ancho: 500, alto: 500 },
  gemas: { ruta: "oficial/resources/gemas.png", ancho: 100, alto: 111 },
  brillante: { ruta: "oficial/resources/brillante.png", ancho: 392, alto: 362 },
  resplandeciente: { ruta: "oficial/resources/reluciente.png", ancho: 371, alto: 381 },
  estelar: { ruta: "oficial/resources/estrellada.png", ancho: 402, alto: 423 },
  martillo: { ruta: "oficial/resources/martillo.png", ancho: 1024, alto: 1024 },
};

export function fmtMiles(n) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const s = String(Math.abs(v));
  const partes = [];
  for (let i = s.length; i > 0; i -= 3) partes.unshift(s.slice(Math.max(0, i - 3), i));
  return (neg ? "−" : "") + partes.join("\u00a0");
}

function cssNum(v) {
  return String(Math.round(Number(v) * 1000) / 1000);
}

function marcaHtml(id, size, clase) {
  const spec = ICONO[id];
  if (!spec) return "";
  const aj = ajusteOf({ ruta: spec.ruta, ancho: spec.ancho, alto: spec.alto }, size);
  const cls = ["recurso", `recurso--${id}`, aj ? "is-ajuste" : "", clase].filter(Boolean).join(" ");
  const vars = [`--size:${size}px`];
  if (aj) vars.push(`--dw:${cssNum(aj.dw)}`, `--dh:${cssNum(aj.dh)}`, `--x:${cssNum(aj.left)}`, `--y:${cssNum(aj.top)}`);
  return `<span class="${cls}" style="${vars.join(";")}"><img src="./assets/${spec.ruta}" alt="" width="${spec.ancho}" height="${spec.alto}" decoding="async"></span>`;
}

export function iconoRecurso(id) {
  return marcaHtml(ICONO[id] ? id : "oro", 18);
}

export function htmlMartillo() {
  return marcaHtml("martillo", 36, "mejora__martillo");
}

export function partesDeBolsa(bag) {
  if (!bag) return [];
  const out = [];
  const push = (id, n) => {
    const v = Math.round(Number(n) || 0);
    if (v > 0) out.push({ id, n: v, etiqueta: ETIQUETA[id] });
  };
  push("oro", bag.oro);
  push("elixir", bag.elixir);
  push("oscuro", bag.oscuro);
  push("gemas", bag.gemas);
  push("muros", bag.muros);
  push("brillante", bag.brillante);
  push("resplandeciente", bag.resplandeciente || bag.reluciente || bag.glowy);
  push("estelar", bag.estelar || bag.estrellada || bag.starry);
  return out;
}

export function htmlCoste(bag) {
  const partes = partesDeBolsa(bag);
  if (!partes.length) return `<p class="mejora__coste"><span class="mejora__vacio">—</span></p>`;
  const bits = partes.map((p) => {
    const marca = p.id === "muros" ? `${iconoRecurso("oro")}${iconoRecurso("elixir")}` : iconoRecurso(p.id);
    return `<span class="mejora__recurso"><span class="num">${fmtMiles(p.n)}</span>${marca}</span>`;
  });
  return `<p class="mejora__coste">${bits.join("")}</p>`;
}
