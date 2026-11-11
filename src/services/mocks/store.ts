import { DEMO_STORAGE_KEY } from "@/constants";
import type { DemoDatabase } from "@/data/database";
import { createSeedDatabase } from "@/data/seed";

type Listener = () => void;

const listeners = new Set<Listener>();

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function load(): DemoDatabase {
  const seed = createSeedDatabase();
  if (!canUseStorage()) return seed;

  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return seed;

    const parsed = JSON.parse(raw) as Partial<DemoDatabase>;
    // Merge onto a fresh seed so new collections added by a later release
    // still exist for developers who already have demo data in the browser.
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

let state: DemoDatabase = load();
let revision = 0;

function persist() {
  revision += 1;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or private-mode failures must not break the demo experience.
    }
  }
  listeners.forEach((listener) => listener());
}

/**
 * Shared demo data store.
 *
 * MOCK-ONLY: every mock service mutates this one store and persists it to
 * localStorage, which is what makes a patient-created appointment visible to
 * the doctor and hospital admin dashboards. Replace the service container in
 * `src/services/index.ts` with the HTTP adapters once the backend is ready.
 */
export const demoDb = {
  get(): DemoDatabase {
    return state;
  },

  /** Mutate the database and notify every subscriber. */
  mutate(mutator: (db: DemoDatabase) => void) {
    mutator(state);
    persist();
  },

  /** Replace the whole database (used by import/restore flows). */
  replace(next: DemoDatabase) {
    state = next;
    persist();
  },

  /** Reset the demo dataset back to the shipped seed. */
  reset() {
    state = createSeedDatabase();
    persist();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Monotonic counter, useful as a React dependency. */
  getRevision() {
    return revision;
  },
};

export type { DemoDatabase };
