import { defineConfig } from "vitest/config";

/**
 * Vitest configuration (ADR-005: dev dependency only; the app stays Zero-Build).
 *
 * Testing Infrastructure per 15-TESTING_FRAMEWORK §Testing Infrastructure:
 *  - environment "node" by default — Foundation Layer logic is pure & Sync.
 *  - Storage/Worker suites (later phases) opt into jsdom / fake-indexeddb via
 *    per-file pragmas; fake-indexeddb is already a devDependency.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["core/**/*.js"],
      // index.js files are pure re-export barrels — nothing to cover.
      exclude: ["core/**/index.js"],
      reporter: ["text", "html"],
    },
  },
});
