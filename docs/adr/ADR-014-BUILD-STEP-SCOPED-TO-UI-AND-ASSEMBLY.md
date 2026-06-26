# ADR-014 — Build Step Allowed, Scoped Only to `ui/` + Final Assembly

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-26 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `docs/architecture/BUILD-STEP-PROPOSAL.md` (superseded by this ADR), `IMPLEMENTATION_BLUEPRINT` §4 (Packaging Strategy), `ULTIMATE_BLUEPRINT_INDEX` ("Gap شناخته‌شده — Build & Bundling Strategy"), `01-MASTER_BLUEPRINT` / `14-DEPENDENCY_POLICY` (`No Build Step`), `14-DEPENDENCY_POLICY` §1/§2/§2.1/§6, `09-DEVELOPMENT_ROADMAP` Phase 9, `MASTER_FILE_STRUCTURE` (root `index.html`, `assets/js/app.js`), ADR-001 (Preact), ADR-005 (Phase 1 Tooling) |
| **Anti-Chaos Rule** | Rule 13 — this amends a previously locked rule (`No Build Step`), so it is a **Full ADR**, not a Lightweight one (per `ULTIMATE_BLUEPRINT_INDEX`'s two-tier ADR rule) |

## Context

`docs/architecture/BUILD-STEP-PROPOSAL.md` laid out the tension between the locked `No Build Step`
rule and the `Single HTML Application` packaging target, plus three candidate resolutions, and was
sent for Mehdi's explicit decision before any Phase 9 UI code was written (per Mehdi's instruction:
"خودسرانه تصمیم نگیر").

Mehdi's decision: a **scoped variant of Option 2** from that proposal — a light bundler
(`esbuild`) is adopted, but **only** for `ui/` and the final single-file assembly step. `core/`
(85 files as of Phase 8) is explicitly untouched. The deciding factor: the file `://` CORS
restriction on ES-module `import` (identified while drafting the proposal) means *some* bundling
of `ui/` is unavoidable regardless of TypeScript — so adding real TypeScript/TSX for `ui/` at the
same time costs nothing extra; it would otherwise be a separate decision with its own cost.

## Decision

1. **`esbuild` is adopted as a Dev Dependency** (`14-DEPENDENCY_POLICY` §6 Future Dependency
   Review: small, single-purpose, build-time only — zero runtime footprint, active maintenance,
   MIT license). It bundles `ui/`'s TypeScript/TSX source into one classic (non-module) JS file at
   `assets/js/app.js`, which `index.html` loads via plain `<script src="assets/js/app.js">` — not
   `type="module"`. A classic script has no runtime `import` graph, so the `file://` CORS
   restriction on ES-module imports never triggers; Deployment Mode 1 ("Open HTML File مستقیم",
   `IMPLEMENTATION_BLUEPRINT` §5) keeps working unmodified.
2. **`core/` is explicitly NOT subject to this Build Step.** It stays exactly as built in Phases
   1–8: plain ES2023 JS + JSDoc + `.d.ts`, type-checked with `tsc --noEmit`, zero Bundler, zero
   migration. `npm test` (Vitest) keeps running directly against `core/`'s raw files — no build
   step is inserted into the Core dev/test loop.
3. **`ui/` is written in real TypeScript + TSX from day one (Phase 9).** `htm` (the no-build JSX
   alternative approved alongside Preact in `14-DEPENDENCY_POLICY` §1) is no longer needed for
   `ui/`, since `ui/` now goes through a real JSX transform anyway — this does not revoke `htm`'s
   approval, it is simply unused.
4. **`No Build Step` (`01-MASTER_BLUEPRINT` / `14-DEPENDENCY_POLICY`) is amended with this explicit,
   narrow exception** — the same pattern as ADR-001's Preact exception: the rule still applies in
   general (Core has zero build tooling, the end product is still "open a file, no install, no
   server"); the exception is limited to `ui/`'s bundling and the final assembly producing
   `assets/js/app.js` from `ui/main.tsx`.
5. `assets/js/app.js` is a **generated artifact**, not hand-written — produced by `npm run build`
   (a new script, `scripts/build.js`, wrapping `esbuild`'s JS API). It is `.gitignore`d, the same
   way `dist/`/`build/` already were (kept "for safety" since Phase 1). `index.html` and the rest
   of `assets/` (CSS, icons) stay hand-written, per `MASTER_FILE_STRUCTURE`'s root layout — this
   ADR does not introduce a separate `dist/` folder; the build target is exactly the path
   `MASTER_FILE_STRUCTURE` already named.
6. **Worker inlining is explicitly deferred**, not solved by this ADR. `core/worker/*.worker.js`
   files are unaffected by this decision (they are Core, not `ui/`); the question of how a real
   browser `workerFactory` constructs a `Worker` from a `file://`-served single HTML app is left
   open until the first Phase 9 screen actually wires a Worker (whichever phase 9 step that is)
   — it is not invented here ahead of need.

## Consequences

- New Dev Dependency `esbuild` + new runtime Dependency `preact` enter `package.json` (Preact was
  approved in ADR-001/`14-DEPENDENCY_POLICY` §1 but never actually added as a package since no UI
  code existed before Phase 9).
- `tsconfig.json`'s `include` is extended to also type-check `ui/**/*.ts` and `ui/**/*.tsx`
  (`jsx: "react-jsx"`, `jsxImportSource: "preact"`); `core/`'s existing `allowJs`/`checkJs` config
  is untouched.
- `npm run build` is a new script, separate from `npm test`/`npm run typecheck` — it is a
  packaging step (run before shipping a release), not a step required for Core development.
- Per `ULTIMATE_BLUEPRINT_INDEX`'s "Gap شناخته‌شده — Build & Bundling Strategy", the concrete
  mechanics (exact `esbuild` config, eventual Worker-inlining approach, CSS/asset handling) should
  eventually be written up as a short `BUILD_PIPELINE_SPEC` note once the pipeline has handled a
  real Worker-using screen — not invented speculatively now.
- `docs/architecture/BUILD-STEP-PROPOSAL.md` is kept as the historical record of the options that
  were considered; it is superseded by this ADR for any future reader trying to find the actual
  decision.
