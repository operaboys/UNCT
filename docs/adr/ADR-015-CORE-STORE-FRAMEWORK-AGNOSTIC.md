# ADR-015 — `core/store/` Is Framework-Agnostic (No Preact Import), Ever

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `docs/adr/ADR-013-STORAGE-ENGINE-VS-STORE.md` (corrects its table, line "Imports Preact"), `MASTER_FILE_STRUCTURE` (`core/store/` annotation "Context/Hooks ساده... سند 11"), `11-STATE_MANAGEMENT` (Selector Pattern), `ANTI_CHAOS_BLUEPRINT` Rule 11 + "مرز دقیق Rule 11", `ADR-014-BUILD-STEP-SCOPED-TO-UI-AND-ASSEMBLY.md` (`core/` exempt from the Build Step, stays plain JS) |
| **Anti-Chaos Rule** | Rule 11 (no Core logic in UI; extended here to: no UI *framework* in Core either), Rule 13 |

## Context

Two project documents disagree about whether `core/store/` may import Preact:

- `MASTER_FILE_STRUCTURE` annotates `core/store/` as "Context/Hooks ساده به‌جای
  `state.js` (سند 11)" — i.e. Preact Context/Hooks living inside `core/`.
- `ADR-013`'s comparison table (already Accepted) states `core/store/`
  "Imports Preact: Yes (Phase 9 only)" and sketches a public API of
  React-like hooks (`useParserState()`).

Both directly contradict:

- `ANTI_CHAOS_BLUEPRINT` Rule 11 — "هیچ UI Component حق داشتن منطق Core را
  ندارد" — and its "مرز دقیق Rule 11" section, which defines `core/store/`
  itself as the **Adapter Layer** UI reads through **Selectors**, explicitly
  framing it as the thing standing *between* Core and UI, not a UI-framework
  module.
- `09-DEVELOPMENT_ROADMAP`'s own Phase 9 note, quoted inside ADR-013's
  Context section: "Core (`core/`) هیچ Importای از Preact ندارد."
- `ADR-014`, accepted immediately before this one, which re-affirms `core/`
  stays plain ES2023 JS + JSDoc with zero framework dependency — the Build
  Step it introduces is scoped to `ui/` precisely because `core/` never
  touches Preact.

This surfaced while building the first real `core/store/` code (Phase 9
tooling step, after ADR-014): writing a Preact-hooks-based store inside
`core/` would have made `core/` depend on Preact for the first time,
silently reversing Rule 11 and ADR-014 in the same breath that just locked
them. Asked directly, Mehdi resolved it in favor of Rule 11's reading.

## Decision

1. `core/store/` is **framework-agnostic**, exactly like every other `core/`
   module. It exports a small vanilla store primitive
   (`createStore()` — `getState`/`setState`/`subscribe`), domain stores built
   on it (`createParserStore()` for Parser/Validation state, per
   `11-STATE_MANAGEMENT`'s State Domains), and pure **Selectors**
   (`selectNodesSortedBySecurity()`, etc.) — the exact pattern
   `ANTI_CHAOS_BLUEPRINT`'s "مرز دقیق Rule 11" names as the contract between
   Core and UI. Zero Preact import, testable directly with Vitest, no DOM.
2. The Preact-facing half — hooks like `useParserState()` that subscribe a
   Component to a `core/store/` instance — lives in `ui/store/` (new,
   Phase 9), never in `core/`. `11-STATE_MANAGEMENT`'s "Custom Hook ساده در
   صورت نیاز واقعی" is exactly this: a small bridge hook, not a Core module.
3. `ADR-013`'s comparison table is corrected by this ADR: `core/store/`
   "Imports Preact" is **Never**, not "Yes (Phase 9 only)". `ADR-013`'s own
   file is left as historical record (per the same convention `ADR-014` used
   for the superseded proposal doc) — this ADR is the current source of
   truth for that one row.
4. `MASTER_FILE_STRUCTURE`'s `core/store/` annotation ("Context/Hooks ساده
   به‌جای `state.js`") is read going forward as describing the *concept*
   (Preact-driven reactive state replacing a hand-rolled engine, per
   `11-STATE_MANAGEMENT`'s whole point), split across two layers: the
   state/selectors in `core/store/`, the Preact Hooks in `ui/store/` — not
   as a literal instruction to import Preact inside `core/`.
5. Selector memoization (`11-STATE_MANAGEMENT`'s "Selectorها باید Memoize
   شوند") is the `ui/store/` bridge hook's responsibility (e.g. `useMemo`
   around a selector call), per Render Optimization Rules (spec 13) — not
   something `core/store/`'s plain functions do themselves.

## Consequences

- `core/store/` stays inside the same Vitest-only, zero-Preact test loop as
  every other `core/` module — no new test setup needed.
- The first concrete consumer (`ui/store/`'s bridge hook + the Converter
  Screen wiring) is built next, as its own step; this ADR does not implement
  `ui/store/`.
- `core/storage/` (ADR-013's actual subject, IndexedDB persistence) is
  untouched by this ADR — still a separate module, still Preact-free, as
  ADR-013 already established. This ADR only corrects ADR-013's
  characterization of `core/store/`, the sibling folder ADR-013 deliberately
  did not implement.
- Any future state domain (`analyzerState`, `converterState`,
  `settingsState`, per `MASTER_FILE_STRUCTURE`) follows this same shape:
  a `core/store/*-state.js` domain store + selectors, paired with a
  `ui/store/use-*.ts` bridge hook — not a single Preact-importing file.
