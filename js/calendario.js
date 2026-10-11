/**
 * Archivo de calendario (.ics) con el fin real de cada mejora.
 * No pide permiso de avisos y no incluye alarma: el Calendario del iPhone
 * solo recibe el archivo si la persona lo guarda.
 */

const MINUTOS = 5 * 60 * 1000;

function dos(n) {
  return String(n).padStart(2, "0");
}

/** Instante UTC en forma de iCalendar, sin zona inventada. */
export function instanteUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}T${dos(d.getUTCHours())}${dos(d.getUTCMinutes())}${dos(d.getUTCSeconds())}Z`;
}

function escapar(text) {
  return String(text ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

/** Parte una línea a 75 octetos, como pide el formato. */
function plegar(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end > start && (bytes[end - 1] & 0xc0) === 0x80) end -= 1;
    if (end === start) end = Math.min(start + limit, bytes.length);
    out.push(new TextDecoder().decode(bytes.slice(start, end)));
    start = end;
    limit = 74;
  }
  return out.join("\r\n ");
}

/**
 * `eventos` son { uid, titulo, fin } con `fin` en milisegundos.
 * El evento empieza en ese fin y dura cinco minutos, para que el Calendario lo muestre.
 * Un fin que no es un número no entra.
 */
export function textoIcs(eventos, opts = {}) {
  const ahora = Number.isFinite(opts.ahora) ? opts.ahora : Date.now();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clash Progreso//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const ev of eventos || []) {
    if (!ev || !Number.isFinite(ev.fin)) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapar(ev.uid)}`);
    lines.push(`DTSTAMP:${instanteUtc(ahora)}`);
    lines.push(`DTSTART:${instanteUtc(ev.fin)}`);
    lines.push(`DTEND:${instanteUtc(ev.fin + MINUTOS)}`);
    lines.push(`SUMMARY:${escapar(ev.titulo)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(plegar).join("\r\n") + "\r\n";
}
