# ADR-013 — Storage Engine Lives in `core/storage/`, Distinct from `core/store/`

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-26 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `09-DEVELOPMENT_ROADMAP` Phase 8, `IMPLEMENTATION_BLUEPRINT` §3 (Storage Responsibility Matrix), `14-DEPENDENCY_POLICY` §4, `15-TESTING_FRAMEWORK`, `MASTER_FILE_STRUCTURE` |
| **Anti-Chaos Rule** | Rule 11 (no Core logic in UI), Rule 13 |

## Context

`MASTER_FILE_STRUCTURE` already names a `core/store/` folder (`parserState.js`, `analyzerState.js`,
`settingsState.js`) and describes it explicitly as "Context/Hooks ساده به‌جای state.js (سند 11)" —
a Preact-based **reactive UI state layer**, scoped to Phase 9 (09-DEVELOPMENT_ROADMAP's Phase 9 note:
"Core (`core/`) هیچ Importای از Preact ندارد" — Preact may only be imported from `ui/`).

Separately, 09-DEVELOPMENT_ROADMAP's **Phase 8** calls for a "Storage Layer" with deliverables
"IndexedDB Storage, Storage Abstraction Layer, Backup System" — real, durable persistence,
independent of any UI framework. `IMPLEMENTATION_BLUEPRINT` §3's Storage Responsibility Matrix and
`14-DEPENDENCY_POLICY` §4 (Primary: Native IndexedDB, Secondary: optional Dexie Adapter) confirm this
is a Core-layer concern, not a UI concern. `15-TESTING_FRAMEWORK` itself already treats these as two
distinct test targets ("`fake-indexeddb` — برای تست `core/store/` **و** Storage Layer") — confirming
the two were never meant to be the same module.

`MASTER_FILE_STRUCTURE` does not, however, name an exact folder for this distinct "Storage Layer"
concept — a structural gap, the same kind ADR-012 resolved for `ConversionObject`/Batch Conversion.
Left unresolved, the obvious-looking shortcut — building IndexedDB persistence inside the
already-named `core/store/` — would silently merge two unrelated responsibilities (durable
cross-session persistence vs. in-memory reactive UI state) into one folder.

## Decision

Real persistence (Phase 8) lives in a **new, separate** top-level module: `core/storage/` — a sibling
of `core/parser/`, `core/analyzer/`, `core/converter/`, `core/validator/`, `core/normalizer/`,
`core/exporter/`, `core/worker/`, `core/unm/`. It holds:
- a raw-IndexedDB adapter (the swappable low-level engine; satisfies 14-DEPENDENCY_POLICY §4's
  "Primary: Native IndexedDB" without requiring Dexie),
- the Storage Abstraction Layer (the public, engine-agnostic API every caller actually imports).

`core/store/` is **not** touched by this work. It remains reserved, exactly as
`MASTER_FILE_STRUCTURE` named it, for the Phase 9 Preact Context/Hooks reactive layer. The two folders
are deliberately separate and must never be merged:

| | `core/storage/` (this ADR, Phase 8) | `core/store/` (reserved, Phase 9) |
|---|---|---|
| Holds | Durable IndexedDB persistence | In-memory Preact Context/Hooks |
| Survives browser restart | Yes (that is its entire purpose) | No (purely runtime UI state) |
| Imports Preact | Never | Yes (Phase 9 only) |
| Public API | `createNodeStore()` (engine-agnostic CRUD) | React-like hooks (`useParserState()`, ...) |

This decision is recorded now (even though `core/store/` is not implemented until Phase 9)
specifically so the location is not "discovered" or collapsed into `core/store/` later — the same
rationale ADR-004 used for `core/exporter/`.

## Consequences

- `core/storage/` has zero Preact/UI imports — it is pure, Sync-callable-where-possible (IndexedDB
  itself is inherently async) Core logic, unit-testable with `fake-indexeddb` and no DOM (15
  -TESTING_FRAMEWORK).
- `core/store/` stays an empty placeholder (`.gitkeep`) until Phase 9; this ADR does not implement it.
- A future Dexie adapter (14-DEPENDENCY_POLICY §4, optional) can be swapped in behind
  `core/storage/`'s adapter interface — the Storage Abstraction Layer's public API
  (`createNodeStore()`'s returned methods) does not change either way.
- Phase 8's "Backup System" deliverable (Project Files Import/Export/Migration, per the Storage
  Responsibility Matrix) is **not** part of this ADR's scope. **Ruling (2026-06-26, Mehdi):**
  it is formally deferred to Phase 9, bundled together WITH the Export Engine
  (`core/exporter/`, ADR-004) as a single piece of work — not as an independent Phase 8/9 task.
  The Storage Responsibility Matrix treats Project-Files Backup/Import/Export/Migration and
  Export as ONE capability, not two separate deliverables, so they are scheduled and built
  together when Phase 9 starts.
