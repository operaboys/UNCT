/**
 * Packaging build — the one place ADR-014's scoped Build Step exception
 * actually runs. Bundles `ui/main.tsx` (TypeScript + TSX) into a single
 * classic (non-module) script at `assets/js/app.js`, the exact path
 * `MASTER_FILE_STRUCTURE` already names. `core/` is never passed through
 * esbuild's transform — it is only resolved as plain ESM source, the same
 * files Vitest runs directly.
 *
 * "Classic", not `type="module"`: a module script's `import` graph is what
 * Chromium blocks under `file://` (CORS). A single self-contained classic
 * script has no runtime import graph, so `index.html` keeps working when
 * opened directly from disk (Deployment Mode 1).
 *
 * Not a dev-loop step — `npm test`/`npm run typecheck` never invoke this.
 * Run it only when packaging a release.
 */
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outfile = path.join(root, "assets/js/app.js");

await mkdir(path.dirname(outfile), { recursive: true });

await build({
  entryPoints: [path.join(root, "ui/main.tsx")],
  outfile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2023",
  jsx: "automatic",
  jsxImportSource: "preact",
  sourcemap: true,
  logLevel: "info",
});

console.log(`Built ${path.relative(root, outfile)}`);
