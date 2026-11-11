import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { apiPlugin } from "./server/api";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    port: 5173,
    // The clinical AI gateway (`npm run dev:ai`) keeps the provider key
    // server-side and is proxied so the browser only talks to its own origin.
    proxy: {
      "/api/ai": {
        target: "http://127.0.0.1:8787",
        changeOrigin: false,
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
