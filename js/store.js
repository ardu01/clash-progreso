const DB = "clash-progreso";
const STORE = "exports";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: ["tag", "timestamp"] });
        os.createIndex("tag", "tag");
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
  });
}

export async function clearExports() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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
    const res = await fetch(path);
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
