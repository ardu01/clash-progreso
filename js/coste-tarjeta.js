/**
 * Cifra y marca de un coste, al estilo de la tarjeta de mejorar:
 * el número arriba y el recurso al lado.
 * El Fan Kit de esta copia trae edificios y tropas, no los contadores
 * de oro, elixir, oscuro o gemas. Estas marcas son dibujo propio.
 */

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

export function fmtMiles(n) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const s = String(Math.abs(v));
  const partes = [];
  for (let i = s.length; i > 0; i -= 3) partes.unshift(s.slice(Math.max(0, i - 3), i));
  return (neg ? "−" : "") + partes.join("\u00a0");
}

function marca(id) {
  const comun = `class="recurso recurso--${id}" viewBox="0 0 24 24" aria-hidden="true"`;
  if (id === "oro") {
    return `<svg ${comun}><circle cx="12" cy="12" r="8.5" fill="#E6B23C"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#7A5610" stroke-width="1.6"/><path d="M12 8.2v7.6M9.6 10.1h3.3a1.7 1.7 0 0 1 0 3.4H9.6" fill="none" stroke="#7A5610" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  }
  if (id === "elixir") {
    return `<svg ${comun}><path d="M12 3.2c2.6 4.2 5.4 7 5.4 10.2a5.4 5.4 0 0 1-10.8 0C6.6 10.2 9.4 7.4 12 3.2z" fill="#E85BC8"/><path d="M10.2 13.2a1.6 1.6 0 0 0 2.4 1.3" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></svg>`;
  }
  if (id === "oscuro") {
    return `<svg ${comun}><rect x="7" y="4" width="10" height="16" rx="5" fill="#3A2158"/><rect x="9" y="6" width="6" height="8" rx="3" fill="#7A4BB8"/><circle cx="12" cy="16.5" r="1.3" fill="#C9A6F0"/></svg>`;
  }
  if (id === "gemas") {
    return `<svg ${comun}><path d="M12 2.4 20.2 9.2 12 21.6 3.8 9.2Z" fill="#2FBF86"/><path d="M3.8 9.2h16.4L12 2.4Z" fill="#7DEbC0"/><path d="M8.2 9.2 12 21.6 15.8 9.2Z" fill="#14966A"/></svg>`;
  }
  if (id === "brillante") {
    return `<svg ${comun}><path d="M7 16.5 5 12l4-6h6l4 6-2 4.5Z" fill="#D5E4F2"/><path d="M9 10.5h6l-1.2 4H10.2Z" fill="#8FB4D6"/></svg>`;
  }
  if (id === "resplandeciente") {
    return `<svg ${comun}><path d="M7 16.5 5 12l4-6h6l4 6-2 4.5Z" fill="#F3A0C8"/><path d="M9 10.5h6l-1.2 4H10.2Z" fill="#C45B90"/></svg>`;
  }
  if (id === "estelar") {
    return `<svg ${comun}><path d="M7 16.5 5 12l4-6h6l4 6-2 4.5Z" fill="#6C4BD4"/><path d="M12 8.2 13.1 11h2.2l-1.8 1.4.7 2.2L12 13.4 9.8 14.6l.7-2.2L8.7 11h2.2Z" fill="#F4E7A8"/></svg>`;
  }
  return `<svg ${comun}><circle cx="8.2" cy="12" r="5" fill="#E6B23C"/><path d="M14 7.2c2.2 1.6 3.4 3.2 3.4 4.8s-1.2 3.2-3.4 4.8c-2.2-1.6-3.4-3.2-3.4-4.8s1.2-3.2 3.4-4.8z" fill="#E85BC8"/></svg>`;
}

export function iconoRecurso(id) {
  return marca(ETIQUETA[id] ? id : "muros");
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
    const marcaHtml = p.id === "muros" ? `${iconoRecurso("oro")}${iconoRecurso("elixir")}` : iconoRecurso(p.id);
    return `<span class="mejora__recurso"><span class="num">${fmtMiles(p.n)}</span>${marcaHtml}</span>`;
  });
  return `<p class="mejora__coste">${bits.join("")}</p>`;
}
