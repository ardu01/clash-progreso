/** Reglas de desbloqueo. El JSON lo deja Clash en data/ref/desbloqueos.json; aquí no hay cifras propias. */

const RECURSO = { Gold: "oro", Elixir: "elixir", "Dark Elixir": "oscuro" };

let libro = null;

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function esSinConfirmar(notes) {
  return (notes || []).some((n) => String(n).toLowerCase().includes("sin confirmar"));
}

export function recursoDe(cost) {
  if (!cost || typeof cost.amount !== "number" || !Number.isFinite(cost.amount)) return null;
  const r = RECURSO[cost.resource];
  if (!r) return null;
  return { r, n: cost.amount };
}

function idPorNombre(items) {
  const map = new Map();
  for (const [id, item] of Object.entries(items || {})) {
    if (!item || !item.nombre_en) continue;
    const sec = item.seccion_exportacion || "";
    if (sec.endsWith("2") || sec.includes("builder")) continue;
    if (!map.has(norm(item.nombre_en))) map.set(norm(item.nombre_en), String(id));
  }
  return (name) => map.get(norm(name)) || null;
}

function anotar(porId, id, regla) {
  if (!id || porId.has(id)) return;
  porId.set(id, regla);
}

export function fijarDesbloqueos(data, items) {
  const idDe = idPorNombre(items);
  const porId = new Map();
  const edificioPorClave = new Map();
  for (const b of (data && data.buildings) || []) {
    const id = idDe(b.name_en);
    if (!id) continue;
    edificioPorClave.set(b.key, id);
    anotar(porId, id, { tipo: "edificio", id, ...b });
  }
  const hall = data && data.hero_hall;
  const hallId = hall ? idDe(hall.name_en) : null;
  if (hall && hallId) edificioPorClave.set(hall.key, hallId);
  for (const g of (data && data.guardians) || []) {
    anotar(porId, idDe(g.name_en), { tipo: "guardian", id: idDe(g.name_en), ...g });
  }
  for (const h of (data && data.heroes) || []) {
    const id = idDe(h.name_en);
    anotar(porId, id, {
      tipo: "heroe",
      id,
      nombre: h.name_es || h.name_en,
      nivel: h.hero_hall_level,
      prerrequisito: hallId,
      level1_cost: h.level1_cost,
      level1_time_seconds: h.level1_time_seconds,
      notes: h.notes,
      source_url: h.source_url,
    });
  }
  const ejercito = [
    ["tropa", data && data.troops],
    ["hechizo", data && data.spells],
    ["asedio", data && data.siege_machines],
  ];
  for (const [tipo, lista] of ejercito) {
    for (const row of lista || []) {
      const id = idDe(row.name_en);
      anotar(porId, id, {
        tipo,
        id,
        nombre: row.name_es || row.name_en,
        nivel: row.unlock_building_level,
        prerrequisito: edificioPorClave.get(row.unlock_building) || null,
        notes: row.notes,
        source_url: row.source_url,
      });
    }
  }
  const petId = edificioPorClave.get("pet_house") || null;
  for (const row of (data && data.pets) || []) {
    const id = idDe(row.name_en);
    anotar(porId, id, {
      tipo: "mascota",
      id,
      nombre: row.name_es || row.name_en,
      nivel: row.pet_house_level,
      prerrequisito: petId,
      notes: row.notes,
      source_url: row.source_url,
    });
  }
  libro = {
    porId,
    edificioPorClave,
    hallId,
    petId,
    fuente: data && data.sources ? data.sources.fandom : "",
  };
  return libro;
}

export function libroDesbloqueos() {
  return libro;
}
