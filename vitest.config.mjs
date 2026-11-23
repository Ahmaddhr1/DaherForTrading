import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Integration tests: they call the real API route handlers against a real
// (throwaway) MongoDB. See tests/README.md.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    // One shared database: run files one after another so they can't race.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
