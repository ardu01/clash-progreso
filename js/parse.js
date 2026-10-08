const HELP_COPY = "Vuelve a Clash of Clans y toca Copiar otra vez en Exportar datos.";

/**
 * Safari no informa la posición del error de JSON. El mensaje sale del texto:
 * vacío, si empieza por «{» y si termina en «}». Nunca «línea» ni «columna».
 */
export function parseLoose(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      title: "No hay nada que pegar",
      msg: "El portapapeles está vacío.",
      help: "Copia la exportación en el juego y vuelve a tocar Pegar.",
    };
  }
  if (!trimmed.startsWith("{")) {
    const preview = Array.from(trimmed).slice(0, 20).join("");
    return {
      ok: false,
      title: "No se pudo leer la exportación",
      msg: `Lo que hay en el portapapeles no es una exportación. Empieza por «${preview}».`,
      help: HELP_COPY,
      preview,
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
        msg: "El texto está incompleto: parece cortado al copiar.",
        help: HELP_COPY,
      };
    }
    return {
      ok: false,
      title: "No se pudo leer la exportación",
      msg: "El texto no es una exportación válida.",
      help: HELP_COPY,
    };
  }
}
