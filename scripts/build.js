/**
 * Packaging build — the one place ADR-014's scoped Build Step exception
 * actually runs. Bundles `ui/main.tsx` (TypeScript + TSX) into a single
 * classic (non-module) script at `assets/js/app.js`, the exact path
 * `MASTER_FILE_STRUCTURE` already names. `core/` is never passed through
 * esbuild's transform for the app entry — it is only resolved as plain ESM
 * source, the same files Vitest runs directly.
 *
 * "Classic", not `type="module"`: a module script's `import` graph is what
 * Chromium blocks under `file://` (CORS). A single self-contained classic
 * script has no runtime import graph, so `index.html` keeps working when
 * opened directly from disk (Deployment Mode 1).
 *
 * `core/worker/parser.worker.js` IS bundled here too (ADR-014 Decision
 * point 6's deferred Worker question, closed by ADR-016): a real dedicated
 * Worker fetches its script over HTTP(S) and cannot resolve bare npm
 * specifiers (e.g. `core/parser/clash/decode.js`'s `import ... from
 * "js-yaml"`) the way Node/Vitest can — the raw source 404s past that
 * import in a real browser. Bundling it into one self-contained ES module
 * at `assets/js/parser-worker.js` (format "esm", matching the real
 * `new Worker(url, { type: "module" })` construction in
 * `ui/store/parser-worker-client.ts`) resolves every bare specifier at
 * build time, the same way `app.js` already resolves `preact`. This does
 * NOT touch `core/`'s own source or the `npm test`/`npm run typecheck` dev
 * loop — only this packaging step's output changes.
 *
 * Not a dev-loop step — `npm test`/`npm run typecheck` never invoke this.
 * Run it only when packaging a release.
 *
 * `minify: true` on both outputs (2026-06-27, per Mehdi's review of the
 * Export Center checkpoint): esbuild already does this for free — no new
 * dependency, no architecture change — and brings `app.js` back under
 * 14-DEPENDENCY_POLICY §2.1's 50KB-gzip UI-Layer budget (was ~59.4KB
 * unminified, now ~43.6KB). `sourcemap: true` is kept on both so minified
 * output stays debuggable. The deeper question — whether §2.1's "UI Layer"
 * budget should be redefined now that ui/ and core/ are bundled together
 * into one artifact (Rule 11: screens call core/ directly) — is deferred;
 * minification alone closes the immediate overage without forcing that
 * decision yet.
 */
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

await mkdir(path.join(root, "assets/js"), { recursive: true });

const appOutfile = path.join(root, "assets/js/app.js");
await build({
  entryPoints: [path.join(root, "ui/main.tsx")],
  outfile: appOutfile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2023",
  jsx: "automatic",
  jsxImportSource: "preact",
  sourcemap: true,
  minify: true,
  logLevel: "info",
});
console.log(`Built ${path.relative(root, appOutfile)}`);

const workerOutfile = path.join(root, "assets/js/parser-worker.js");
await build({
  entryPoints: [path.join(root, "core/worker/parser.worker.js")],
  outfile: workerOutfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2023",
  sourcemap: true,
  minify: true,
  logLevel: "info",
});
console.log(`Built ${path.relative(root, workerOutfile)}`);
