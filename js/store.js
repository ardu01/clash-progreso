import { APP_VERSION } from "./caches.js";

const DB = "clash-progreso";
const STORE = "exports";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: ["tag", "timestamp"] });
        os.createIndex("tag", "tag");
      }
      if (!db.objectStoreNames.contains("copies")) {
        db.createObjectStore("copies", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function allExports() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putExport(exp) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(exp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("No se pudo guardar"));
  });
}

export async function deleteTag(tag) {
  const rows = await allExports();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const os = tx.objectStore(STORE);
    for (const row of rows) {
      if (row.tag === tag) os.delete([row.tag, row.timestamp]);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("No se pudo guardar"));
  });
}

export async function clearExports() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("No se pudo guardar"));
  });
}

export async function putCopy(copy) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("copies", "readwrite");
    tx.objectStore("copies").add({ at: Date.now(), copy });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("No se pudo guardar"));
  });
}

export async function latestCopyAt() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("copies", "readonly");
    const req = tx.objectStore("copies").getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      const last = rows.reduce((m, row) => Math.max(m, row.at || 0), 0);
      resolve(last || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export function latestByTag(rows) {
  const map = new Map();
  for (const row of rows) {
    const prev = map.get(row.tag);
    if (!prev || row.timestamp > prev.timestamp) map.set(row.tag, row);
  }
  return map;
}

const SEED_KEY = "cp-seeded";

async function importMissing(paths) {
  const existing = await allExports();
  const have = new Set(existing.map((r) => r.tag + "@" + r.timestamp));
  for (const path of paths) {
    const res = await fetch(path + (String(path).includes("?") ? "&" : "?") + "v=" + APP_VERSION);
    if (!res.ok) continue;
    const exp = await res.json();
    const key = exp.tag + "@" + exp.timestamp;
    if (have.has(key)) continue;
    await putExport(exp);
    have.add(key);
  }
}

export async function seedBundled(paths) {
  if (localStorage.getItem(SEED_KEY) === "1") return allExports();
  await importMissing(paths);
  localStorage.setItem(SEED_KEY, "1");
  return allExports();
}

export async function restoreBundled(paths) {
  await importMissing(paths);
  localStorage.setItem(SEED_KEY, "1");
  return allExports();
}
