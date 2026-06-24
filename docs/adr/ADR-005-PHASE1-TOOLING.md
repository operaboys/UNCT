# ADR-005 — Phase 1 Tooling: Vitest + JS/JSDoc, Zero-Build (Interim)

| | |
|---|---|
| **Status** | Accepted (interim — scoped to development; final packaging ADR still OPEN) |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `14-DEPENDENCY_POLICY`, `15-TESTING_FRAMEWORK`, `IMPLEMENTATION_BLUEPRINT` §4 |
| **Anti-Chaos Rule** | Rule 13 |

## Context

Two real tensions were flagged across the blueprints:

1. **Testing Framework** was explicitly left as a "Phase 1 Decision Required"
   (`14-DEPENDENCY_POLICY` §1). Candidates: Vitest, Jest, Web Test Runner.
2. **Build Step vs No-Build / TypeScript-as-Optional-Future** (`IMPLEMENTATION_BLUEPRINT` §4) —
   "Single HTML Output / No Build Step" is in tension with a modular codebase and a possible
   future move to TypeScript. The blueprints state this is **one combined question** to be settled
   by a single shared ADR **before Phase 9** — not now.

## Decision (interim, development-scoped)

1. **Testing Framework: Vitest.** ESM-native, fast, integrates cleanly with `fake-indexeddb` and
   in-thread worker mocking (`15-TESTING_FRAMEWORK`). It is a **dev dependency only** — the app
   still runs Zero-Build from static files.
2. **Language/Types: JavaScript (ES2023) + JSDoc + `.d.ts`.** Runtime code is plain JS that runs
   in the browser with **no build step**. UNM interfaces are expressed as `.d.ts` / JSDoc and
   checked with `tsc --noEmit` (a *check*, not an emit/build). TypeScript-as-source remains
   "Optional Future".
3. **Bundler / final packaging: DEFERRED.** For development we use Native ES Modules without a
   bundler. The final "Single HTML / PWA / APK" packaging decision (and whether a light build step
   is accepted) is **out of scope here** and remains an OPEN ADR to be decided before Phase 9.

## Explicitly NOT decided here

- Whether a light build step (esbuild/tsc emit) is ultimately accepted.
- Whether the project migrates to TypeScript source.
- The final distribution format (single file vs folder vs PWA/Capacitor).

These stay open per `IMPLEMENTATION_BLUEPRINT` §4 and will be resolved in a dedicated combined ADR.

## Consequences

- Phase 1 can proceed with type safety and automated tests without committing the project to a
  build pipeline.
- `package.json` / `node_modules` are dev-only; `.gitignore` excludes `node_modules/`.
- If the future packaging ADR chooses a build step, this interim ADR is superseded, not violated.
