# Baseline Test Dataset

Physical home of the Baseline Test Dataset (15-TESTING_FRAMEWORK §5, **MANDATORY**).

## Two layers — and why they land in different phases

The Foundation Acceptance Gate is scoped in two stages across phases; the
rationale and the formal decision are recorded in
[`docs/adr/ADR-006-PHASE1-GATE-SCOPE.md`](../../docs/adr/ADR-006-PHASE1-GATE-SCOPE.md).
This file documents only the day-to-day mechanics — see the ADR for *why*.

What Phase 1 *can* and *does* gate is everything below the parser:

| Layer | Status | Gate file |
|---|---|---|
| UNM construction invariants (05) | ✅ covered | `foundation-gate.test.js` |
| Validation Engine (Stage 13) | ✅ covered | `foundation-gate.test.js` |
| Error Code Registry | ✅ covered | `../errors/registry.test.js` |
| Raw-config Parser pass rate ≥95% | ✅ covered | `raw-config-gate.test.js` |
| Recovery on broken samples | ✅ covered | `raw-config-gate.test.js` |

## Phase 1 Foundation Acceptance Gate

`foundation-gate.test.js` runs a curated set of **canonical UNM fixtures**
(`unm-fixtures.js`) through `createNode` + `applyValidation` and asserts:

- **Valid fixtures** (the Golden canonical set, covering all 7 protocols) build
  successfully and validate to `overallValid === true` at a pass rate **≥ 95%**.
- **Invalid fixtures** are correctly flagged (`overallValid === false`) — guarding
  the Validation Engine's False-Positive Rate (15 §7, < 2%).
- **No Critical Failure** — no fixture throws unexpectedly.

## Phase 2/3 Foundation Acceptance Gate (raw-config level)

`raw-config-dataset.js` holds the 100 **raw** config texts mandated by 15 §5
(50 valid / 30 partially-broken / 20 invalid), covering all 7 protocols across
all 6 input formats (url, subscription, xray, singbox, clash, wireguard).
`raw-config-gate.test.js` runs every sample through the real production pipeline
— `ParserFactory.selectParser` + the §5 `parseWithFallback` recovery chain →
`normalizeMany`/`normalize` → `applyValidation` — and asserts the 15 §6/§7
criteria, broken down by protocol and by category:

- **valid** must parse (no recovery) into all-valid nodes at ≥95%,
- **partially-broken** must be salvaged into ≥1 valid node at ≥90% (the bulk via
  real `recover()`), and
- **invalid** must never yield a valid node (false-positive rate <2%).

The test prints a full `[GATE]` breakdown to the test output.

Two `recover()` features (misspelled URL scheme, lightly-polluted Base64
subscription) were previously unreachable through the factory because they
failed *detection* before any parser was selected. `ADR-009` closed this gap
with bounded fuzzy tolerance in `detectUrl`/`detectSubscription` (mid
confidence score, well below a clean match, so it never outranks a real
config); both paths are now reachable end-to-end via `parseWithFallback` and
covered by dedicated tests in `tests/url/` and `tests/subscriptions/`, in
addition to the existing per-parser unit tests that call `recover()` directly.

The Golden subset (the `unm-fixtures.js` valid set) stays the immutable UNM-level
reference (never modified, never removed — 15 §5).
