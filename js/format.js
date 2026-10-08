const finFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "short",
});

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n) + "\u00A0%";
}

export function fmtNum(n, digits = 1) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtFin(ms) {
  return finFmt.format(new Date(ms)).replace(/,/g, "").replace(/ /g, "\u00a0");
}

export function madridDayKey(ms) {
  return dayKeyFmt.format(new Date(ms));
}

export function dayHeading(ms, now = Date.now()) {
  const key = madridDayKey(ms);
  const today = madridDayKey(now);
  const tomorrow = madridDayKey(now + 86400000);
  if (key === today) return "Hoy";
  if (key === tomorrow) return "Mañana";
  const label = dayLabelFmt.format(new Date(ms)).replace(",", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function fmtRemain(end, now = Date.now()) {
  if (end <= now) return null;
  const s = Math.round((end - now) / 1000);
  if (s < 60) return "en < 1 min";
  const min = Math.floor(s / 60);
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `en ${h} h ${m} min` : `en ${h} h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `en ${d} d ${rh} h` : `en ${d} d`;
}

export function fmtBytes(n) {
  const mb = n / 1000000;
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mb) + "\u00a0MB";
}
