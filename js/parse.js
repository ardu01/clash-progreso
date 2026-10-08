const HELP_COPY = "Vuelve a Clash of Clans y toca Copiar otra vez en Exportar datos.";
const HELP_FILE = "Elige el JSON que exporta Clash of Clans.";

/** Hasta 20 caracteres. Si el texto es más largo, la muestra acaba en «…». */
function clipPreview(text) {
  const chars = Array.from(text);
  if (chars.length > 20) return chars.slice(0, 16).join("") + "…";
  return chars.join("").trimEnd();
}

/**
 * Safari no informa la posición del error de JSON. El mensaje sale del texto:
 * vacío, si empieza por «{» y si termina en «}». Nunca «línea» ni «columna».
 * `source` es "clipboard" (por defecto) o "file": el texto habla del origen.
 */
export function parseLoose(text, source = "clipboard") {
  const file = source === "file";
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return file
      ? {
        ok: false,
        title: "No hay nada que leer",
        msg: "El archivo está vacío.",
        help: "Elige otra exportación JSON.",
        source,
      }
      : {
        ok: false,
        title: "No hay nada que pegar",
        msg: "El portapapeles está vacío.",
        help: "Copia la exportación en el juego y vuelve a tocar Pegar.",
        source,
      };
  }
  if (!trimmed.startsWith("{")) {
    const preview = clipPreview(trimmed);
    const where = file ? "El archivo" : "Lo que hay en el portapapeles";
    return {
      ok: false,
      title: "No se pudo leer la exportación",
      msg: `${where} no es una exportación. Empieza por «${preview}».`,
      help: file ? HELP_FILE : HELP_COPY,
      preview,
      source,
    };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (e) {
    const message = String(e && e.message || "");
    const endOfText = /end of (?:data|json|input|text)|unexpected end|unterminated/i.test(message);
    if (!trimmed.endsWith("}") || endOfText) {
      return {
        ok: false,
        title: "No se pudo leer la exportación",
        msg: file ? "El archivo está incompleto." : "El texto está incompleto: parece cortado al copiar.",
        help: file ? HELP_FILE : HELP_COPY,
        source,
      };
    }
    return {
      ok: false,
      title: "No se pudo leer la exportación",
      msg: file ? "El archivo no es una exportación válida." : "El texto no es una exportación válida.",
      help: file ? HELP_FILE : HELP_COPY,
      source,
    };
  }
}
