import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { seedDatabase } from "./seed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? path.join(here, "..", "data");
const dbFile = path.join(dataDir, "db.json");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(dbFile)) {
    const seeded = seedDatabase();
    fs.writeFileSync(dbFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }

  try {
    return JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch {
    // A corrupt file must not take the API down; rebuild from the seed.
    const seeded = seedDatabase();
    fs.writeFileSync(dbFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }
}

/**
 * Single in-process data store.
 *
 * JSON-file persistence keeps local development dependency-free; swap this
 * module for a real database client without touching the route layer.
 */
export const db = load();

export function saveDb() {
  ensureDataDir();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

export function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function resetDb() {
  const seeded = seedDatabase();
  Object.keys(db).forEach((key) => {
    delete db[key];
  });
  Object.assign(db, seeded);
  saveDb();
  return db;
}
