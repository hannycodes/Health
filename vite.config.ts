import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Mounts the Express API inside the Vite dev server so `npm run dev` is enough
 * for sign-in and the admin portal; `/api/ai` still goes to the AI gateway.
 */
function localApi(): Plugin {
  return {
    name: "myhealth-local-api",
    configureServer(server) {
      // Vitest also loads this config; only the dev server should start the API.
      if (process.env.VITEST) return;

      const child = spawn(process.execPath, ["server/src/index.js"], {
        cwd: rootDir,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      });

      child.stdout?.on("data", (chunk: Buffer) =>
        server.config.logger.info(`[api] ${chunk.toString().trim()}`),
      );
      child.stderr?.on("data", (chunk: Buffer) =>
        server.config.logger.warn(`[api] ${chunk.toString().trim()}`),
      );
      child.on("exit", (code) => {
        if (code && code !== 0) {
          server.config.logger.warn(
            `[api] exited with code ${code}. Is port 8000 already in use?`,
          );
        }
      });

      server.httpServer?.on("close", () => child.kill());
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // The clinical AI gateway (`npm run dev:ai`) keeps the provider key
      // server-side; the more specific prefix must come first.
      "/api/ai": {
        target: "http://127.0.0.1:8787",
        changeOrigin: false,
      },
      // The one API lives in server/ (Express, port 8000). Run `npm run api`.
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    // Page-level tests render the full router and mock service layer; the
    // default 5s is tight on a cold module graph.
    testTimeout: 15_000,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    restoreMocks: true,
    env: { VITE_DATA_SOURCE: "mock" },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
