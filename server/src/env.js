import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load server/.env before any other module reads process.env.
 *
 * Node 22 ships process.loadEnvFile, so no dotenv dependency is needed. Import
 * this module first; ESM evaluates imports in source order, which guarantees the
 * variables exist by the time the auth and app modules are evaluated.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

try {
  process.loadEnvFile(path.join(here, "..", ".env"));
} catch {
  // No .env file present: fall back to the shell environment and defaults.
}
