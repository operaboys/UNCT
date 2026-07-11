# ADR-026 — Lightweight: Visualization Group (P12-11) — No Chart Library

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Type** | Lightweight ADR (dependency decision, doc 14-DEPENDENCY_POLICY) |
| **Scope** | `ui/subscription/` |
| **Phase** | Phase 12 — P12-11 Visualization Group |

## Context

ULTIMATE_BLUEPRINT_INDEX's Backlog دسته ۳ grouped five Visualization ideas together
under the assumption they'd share one Library decision: Visual Topology Mapper, Node
Relationship Map, Subscription Visualizer, Cloudflare Topology View, Reality Visualizer.

Before picking a library, each of the five was checked against what data actually
exists today (`core/types/unm.d.ts`, `core/analyzer/types.d.ts`). Full findings live in
`ULTIMATE_BLUEPRINT_INDEX.md`'s P12-11 section; summary:

- **Node Relationship Map** — removed. No field anywhere in UNM records a relationship
  between two nodes. `MetadataObject.sourceFile?` is the only candidate and it is never
  actually populated by any of the six parsers (`grep` across `core/parser/*/normalize.js`
  confirms zero call sites set it) — so even that weak grouping is dead data, not a real
  signal. Nothing here is "missing a field we could add" — a proxy config format has no
  concept of "this node relates to that node" to extract in the first place.
- **Cloudflare Topology View** — removed. `WorkerAnalysis` is a flat, single-node record
  (`workerDomain`, `pathSegments`, `uuidSegment`, `parameters`, `encodedDataFindings`) —
  a handful of scalars for ONE endpoint, not a multi-hop network. "Topology" implies
  edges between distinct entities (client → CDN → origin); UNM models one proxy config,
  never a network path, so there is nothing plural to draw a topology *of*.
- **Reality Visualizer** — removed, for the identical single-node/scalar reason:
  `RealityAnalysis` is `applicable`/`compatible`/`pbkPlausible`/`sidPlausible`/`issues[]`
  for one node — already fully legible as text (Analyzer Screen's Reality Analysis
  section, Extractor Screen's Reality Extractor table). A chart of 4 booleans and a
  short string list adds no information a reader doesn't already have from the table.
- **Visual Topology Mapper** — removed, same reasoning as Node Relationship Map: the
  name itself implies a graph of connections between nodes, which do not exist.
- **Subscription Visualizer** — kept. `SubscriptionSummary.protocolDistribution`
  (`core/analyzer/extended/subscription-analyzer.js`, Phase 10) is real, aggregate,
  multi-category data across the WHOLE node collection — genuinely chart-worthy, unlike
  the other four's single-node scalars.

With only one surviving feature, and that feature being a single bar chart over at most
seven categories (`PROTOCOLS.length`), a full charting library was evaluated as
disproportionate before even comparing bundle sizes: the entire "chart" is `count / max
* 100` per category, rendered as a `<div>` width percentage. `ui/export/qr-render.ts`
already established the precedent of hand-rolling markup (SVG path strings for QR
codes) in this codebase instead of reaching for a rendering dependency for a
narrow, well-understood shape.

## Decision

1. **No chart/graph library is added.** `ui/subscription/chart.ts`'s `buildProtocolBars`
   is a ~10-line pure function (bar width = `count / max * 100`, rounded, sorted
   highest-first); `subscription-screen.tsx` renders each bar as a plain `<div>` with a
   percentage `width` style — no `<svg>`, no canvas, no dependency. Zero added bytes to
   `assets/js/app.js` beyond the function itself.
2. **Node Relationship Map, Cloudflare Topology View, Reality Visualizer, and Visual
   Topology Mapper are removed from the Backlog entirely** (not left "Blocked") — per
   the review's own instruction, a Backlog entry stays only while a plausible path to
   building it exists; these four have none under the current UNM architecture. Adding
   the underlying data (e.g. an inter-node relationship field) would itself require a
   full ADR touching Architecture Freeze Scope (spec 05) and is out of this review's
   scope to propose speculatively.
3. If a future, differently-shaped need for richer charts emerges (e.g. a real
   multi-series time-series view), this ADR does not preclude evaluating a library
   then — it only closes the question for the five items reviewed here, with the
   evidence available today.

## Consequences

- `ui/subscription/chart.ts` + `tests/ui/subscription/chart.test.js`: new pure module,
  unit-tested, zero new runtime dependency.
- `docs/blueprints/ULTIMATE_BLUEPRINT_INDEX.md` and `03-FEATURE_MATRIX.md`'s Backlog
  tables updated: four items removed, one (✅ Subscription Visualizer) marked done.
- No change to `14-DEPENDENCY_POLICY`'s dependency list — this ADR documents a decision
  NOT to add one, kept as a Lightweight ADR for audit-trail consistency with how other
  dependency decisions in this project are recorded (ADR-017, ADR-018, ADR-023, ADR-025).
