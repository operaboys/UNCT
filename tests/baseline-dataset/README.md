# Baseline Test Dataset

Physical home of the Baseline Test Dataset (15-TESTING_FRAMEWORK §5, **MANDATORY**).

## Two layers — and why they land in different phases

The Foundation Acceptance Gate is scoped in two stages across phases; the
rationale and the formal decision are recorded in
[`docs/adr/ADR-006-PHASE1-GATE-SCOPE.md`](../../docs/adr/ADR-006-PHASE1-GATE-SCOPE.md).
This file documents only the day-to-day mechanics — see the ADR for *why*.

What Phase 1 *can* and *does* gate is everything below the parser:

| Layer | Phase 1 status | Gate file |
|---|---|---|
| UNM construction invariants (05) | ✅ covered | `foundation-gate.test.js` |
| Validation Engine (Stage 13) | ✅ covered | `foundation-gate.test.js` |
| Error Code Registry | ✅ covered | `../errors/registry.test.js` |
| Raw-config Parser pass rate ≥95% | ⏳ Phase 2/3 | (added with parsers) |
| Recovery on broken samples | ⏳ Phase 2/3 | (added with parsers) |

## Phase 1 Foundation Acceptance Gate

`foundation-gate.test.js` runs a curated set of **canonical UNM fixtures**
(`unm-fixtures.js`) through `createNode` + `applyValidation` and asserts:

- **Valid fixtures** (the Golden canonical set, covering all 7 protocols) build
  successfully and validate to `overallValid === true` at a pass rate **≥ 95%**.
- **Invalid fixtures** are correctly flagged (`overallValid === false`) — guarding
  the Validation Engine's False-Positive Rate (15 §7, < 2%).
- **No Critical Failure** — no fixture throws unexpectedly.

When parsers arrive, the raw-config dataset is added alongside this file and the
gate is extended to chain `parse → applyValidation`; the Golden subset here stays
the immutable UNM-level reference (never modified, never removed — 15 §5).
