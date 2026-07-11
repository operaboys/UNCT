# ADR-006 — Foundation Acceptance Gate Scope (Phase 1)

| | |
|---|---|
| **Status** | Accepted (Lightweight ADR) |
| **Date** | 2026-06-24 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `15-TESTING_FRAMEWORK` §5–§7, `09-DEVELOPMENT_ROADMAP` |
| **Anti-Chaos Rule** | Rule 13 — Testing Framework Structure is in the Architecture Freeze Scope (`ULTIMATE_BLUEPRINT_INDEX` §Architecture Freeze Scope), so this scope split is recorded as an ADR rather than a README note. |
| **Tier** | Lightweight — additive scoping clarification, not a structural change to the gate's algorithm or criteria. |

## Context

`15-TESTING_FRAMEWORK` §5 specifies the Baseline Test Dataset as 100 **raw config
texts** (50 valid / 30 partially-broken / 20 invalid, plus a 20-config immutable
Golden subset) and §6 specifies the Foundation Acceptance Gate as the pass/fail
condition for exiting Phase 1. Both assume the dataset flows through a **Parser**:
`Raw config text → Parser → UNM`.

Phase 1 (`09-DEVELOPMENT_ROADMAP`) builds the Foundation Layer only: UNM,
Validation Engine, Error Code Registry, Testing Infrastructure. Parsers are
Phase 2/3 deliverables. Running the Gate as literally specified would require
asserting a ≥95% pass rate against Parser code that does not exist yet — an
impossible and meaningless measurement at this point in the roadmap.

## Decision

Foundation Acceptance Gate در پایان Phase 1 فقط روی UNM + Validation Engine
سنجیده می‌شود؛ بخش Recovery/Parser-level همان Gate در پایان Phase 2/3 دوباره و
به‌طور کامل سنجیده خواهد شد.

Concretely:

- **Phase 1 gate** (`tests/baseline-dataset/foundation-gate.test.js`) runs
  curated, hand-built `UNMNode` fixtures (`unm-fixtures.js` — covering all 7
  protocols) through `createNode` + `applyValidation` and checks the same
  criteria §6/§7 require at this layer: valid fixtures pass at ≥95%, invalid
  fixtures are correctly rejected, and no fixture throws unexpectedly.
- **Phase 2/3 gate** (added alongside the Parsers) replaces/extends this with
  the full raw-text dataset from §5, chaining `parse → applyValidation`, and
  re-measures the same ≥95% / <2% false-positive criteria end-to-end,
  including Recovery on the partially-broken samples.
- The Golden 20-config subset (§5) is introduced when Parsers exist and, once
  introduced, is immutable per §5 — it is not part of the Phase 1 fixtures.

## Consequences

- Phase 1 can close out and Phase 2 can start without waiting on Parsers that
  are explicitly out of Phase 1's scope.
- The Phase 1 gate is a real but partial measurement: it proves UNM
  construction and Validation are stable, not that any raw-config format can
  be correctly parsed — that claim is deferred to the Phase 2/3 gate by design,
  not by oversight.
- `tests/baseline-dataset/README.md` documents the day-to-day mechanics of the
  two layers and must stay consistent with this ADR; it links here for the
  rationale rather than restating it.
