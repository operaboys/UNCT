import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * `ui/` source (ADR-014) is real `.ts`/`.tsx`, but the whole codebase's
 * import convention (tsconfig's `moduleResolution: "Bundler"`, already used
 * by e.g. `converter-screen.tsx`'s own `./format.js` import for `format.ts`)
 * writes `.js` even when the file on disk is `.ts`/`.tsx`. esbuild resolves
 * that pattern unconditionally (its documented `.js`-import-to-`.ts`-file
 * convention); Vite's own resolver only does the same swap when the
 * IMPORTING file is itself `.ts`/`.tsx` — plain-`.js` test files importing
 * `ui/` modules fall outside that heuristic. This plugin extends the same
 * swap to every importer, matching esbuild's behavior so Vitest can load the
 * exact modules `scripts/build.js` bundles, with no per-test-file workaround.
 */
function resolveTsViaJsExtension() {
  return {
    name: "resolve-ts-via-js-extension",
    enforce: "pre",
    /** @param {string} id @param {string | undefined} importer */
    resolveId(id, importer) {
      if (!importer || !id.startsWith(".") || !id.endsWith(".js")) return null;
      const jsPath = resolve(dirname(importer), id);
      if (existsSync(jsPath)) return null;
      const base = jsPath.slice(0, -3);
      for (const ext of [".ts", ".tsx"]) {
        if (existsSync(base + ext)) return base + ext;
      }
      return null;
    },
  };
}

/**
 * Vitest configuration (ADR-005: dev dependency only; the app stays Zero-Build).
 *
 * Testing Infrastructure per 15-TESTING_FRAMEWORK §Testing Infrastructure:
 *  - environment "node" by default — Foundation Layer logic is pure & Sync.
 *  - Storage/Worker suites (later phases) opt into jsdom / fake-indexeddb via
 *    per-file pragmas; fake-indexeddb is already a devDependency.
 */
export default defineConfig({
  plugins: [resolveTsViaJsExtension()],
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
