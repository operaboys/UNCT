# ADR-028 — Lightweight: `metadata.alternativeCandidates`

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Type** | Lightweight ADR (ULTIMATE_BLUEPRINT_INDEX §Architecture Freeze — Additive category; explicitly the canonical example given there: "افزودن یک فیلد اختیاری جدید به `metadata`") |
| **Scope** | `core/types/unm.d.ts` (`MetadataObject`), `core/parser/factory.js`, `core/unm/create-node.js`, `core/parser/parse-and-validate.js`, `core/worker/parser.worker.js`, `core/worker/unflatten-node.js` |
| **Phase** | Phase 12 — Developer Console "Alternative Candidates" |

## Context

`core/parser/factory.js#parseWithFallback` (12-PARSER_FACTORY §5) already computes a
ranked `candidates` list (every registered parser that cleared
`UNKNOWN_FORMAT_THRESHOLD`, sorted by descending confidence) while choosing which
parser wins. Before this ADR, that ranking was transient — used only to drive the
fallback loop, then discarded. `core/parser/parse-and-validate.js` kept only
`{ name, extraction, recovered }`, so no node ever retained anything beyond its own
winning parser's `metadata.confidence`. The Developer Console's "Detection Logs /
Detection Metadata Viewer" (doc 07 §4.7) therefore shipped with its second half
("Alternative Candidates") as a disabled placeholder (Rule 9 — no fabrication without a
real data source).

## Decision

Expose the already-computed ranking as a new **optional** field on `MetadataObject`,
via `parseWithFallback`'s existing return value — no new computation, no change to
parser selection:

1. `core/parser/factory.js#parseWithFallback` returns the `candidates` array (already
   computed, already filtered to threshold-passing entries, already sorted) alongside
   `{ name, extraction, recovered }`. Zero change to the fallback/recovery loop itself.
2. `MetadataObject` gains `alternativeCandidates?: readonly { name: string, confidence:
   number }[]` (`core/types/unm.d.ts`) — optional, so every node built before this ADR
   (and any node built without going through `parseWithFallback`, e.g. Custom Parser
   plugins) remains valid without it.
3. `core/unm/create-node.js` gains `withAlternativeCandidates(node, list)`, mirroring
   the existing `withValidation(node, validation)` — produces a NEW frozen node (Rule
   8), never mutates.
4. `core/parser/parse-and-validate.js` (the main-thread / `file://`-fallback pipeline,
   ADR-016) computes `candidates.filter(c => c.name !== name)` (i.e. every candidate
   that reached the threshold but was NOT the selected parser) and applies it via
   `withAlternativeCandidates` to every node in the batch.
5. `core/worker/parser.worker.js` — the DEFAULT path for real browser usage
   (ADR-016: Worker-first, `file://` main-thread fallback only) — does the identical
   computation before flattening, and `flattenNode` gains one more `meta`-prefixed key,
   `metaAlternativeCandidates`, appended after the existing ones (same pattern
   ADR-021 already used for additive changes inside this Architecture Freeze Scope
   file: new field only, zero change to any existing key or to the fallback/recovery
   logic itself).
6. `core/worker/unflatten-node.js` (not Architecture Freeze Scope — a plain new Phase 5
   addition per its own header) gains `"metaAlternativeCandidates"` in `META_KEYS` so
   the flat wire value round-trips back onto `metadata.alternativeCandidates`.

## What is explicitly NOT changed

- `ParserFactory.selectParser`, the Highest-Confidence-Wins algorithm, or the
  Primary→Secondary recovery fallback chain (12 §4, §5).
- `metadata.confidence` — still exactly the winning parser's own score, untouched.
- Any parser's `detect()`/`parse()`/`recover()` contract.
- The Worker's `postMessage` payload shape for the job REQUEST (`{raw}`), the pool
  dispatch/cancellation machinery, or any other flattened field's name/meaning — only
  one new flat key is added, and only ever additively (existing consumers that don't
  know about it simply never read it).
- Custom Parser plugins (`core/plugin/parse-with-plugins.js`) — nodes produced by that
  distinct fallback tier (ADR-020) never went through `parseWithFallback`'s Highest-
  Confidence-Wins ranking in the first place, so they get no `alternativeCandidates`
  field at all (not a fabricated empty array pretending detection ran) — the UI treats
  its absence the same as an empty list.

## Consequences

- Developer Console's "Alternative Candidates" sub-panel now reads real per-node data
  (`core/store/selectors.js#selectDetectionLog`, extended) instead of a disabled
  placeholder.
- A node from a single-candidate detection (only one parser reached the threshold) gets
  `alternativeCandidates: []` — the UI renders an honest "only eligible parser" message
  for that node rather than an empty table implying data that doesn't exist.
- All existing `parseWithFallback`/`parseAndValidate` callers keep working — the new
  field is additive on both the return value and the type.
