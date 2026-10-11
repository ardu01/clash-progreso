import { classifyEntries, planBatch } from "./import.js";

/** Parte un texto en exportaciones JSON. Acepta un objeto, varios seguidos o un array. */
export function extractExports(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const value = JSON.parse(trimmed);
      if (Array.isArray(value)) {
        return value
          .filter((item) => item && typeof item === "object")
          .map((item) => JSON.stringify(item));
      }
    } catch {
      /* se parte por llaves */
    }
  }
  const parts = splitObjects(trimmed);
  return parts.length ? parts : [trimmed];
}

function splitObjects(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && text[i] !== "{") i += 1;
    if (i >= text.length) break;
    const start = i;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (; i < text.length; i += 1) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === "\"") inStr = false;
        continue;
      }
      if (c === "\"") inStr = true;
      else if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) {
          out.push(text.slice(start, i + 1));
          i += 1;
          break;
        }
      }
    }
    if (depth !== 0) {
      out.push(text.slice(start));
      break;
    }
  }
  return out;
}

/** Texto de `#lote=` o `?lote=` (también `datos`). Vacío si no viene. */
export function loteTextFromUrl(href) {
  try {
    const url = new URL(String(href || ""), "https://ardu01.github.io/clash-progreso/");
    const fromQuery = url.searchParams.get("lote") || url.searchParams.get("datos");
    if (fromQuery) return fromQuery;
    let hash = url.hash.replace(/^#/, "");
    if (hash.startsWith("/")) hash = hash.slice(1);
    const hp = new URLSearchParams(hash);
    return hp.get("lote") || hp.get("datos") || "";
  } catch {
    return "";
  }
}

/** Clasifica lo pegado. Guardar es decisión de quien llama: `plan.save`. */
export function clipboardImportPlan(text, ctx) {
  const chunks = extractExports(text);
  const entries = chunks.map((chunk, i) => ({
    name: chunks.length > 1 ? `Pegado ${i + 1}` : "Pegado",
    text: chunk,
    source: "clipboard",
  }));
  const items = classifyEntries(entries, ctx);
  return { items, plan: planBatch(items), chunks: chunks.length };
}
