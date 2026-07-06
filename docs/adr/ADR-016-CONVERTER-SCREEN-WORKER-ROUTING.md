# ADR-016 — Converter Screen Parsing Routes Through a Real Worker, file://-Only Fallback

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Deciders** | Mehdi (Architecture Review) |
| **Related** | `10-PERFORMANCE_ENGINE` §1 (Rule 01/02), §3 (SharedArrayBuffer Feature Detection — the precedent pattern this ADR reuses); `14-DEPENDENCY_POLICY` §2.1 (Bundle Size Budget — see Consequences); `ADR-014-BUILD-STEP-SCOPED-TO-UI-AND-ASSEMBLY.md` Decision point 6 (the open question this ADR closes); `ADR-003-WORKER-ARCHITECTURE.md`, `ADR-010-WORKER-RESULT-VERSIONING.md`; `core/worker/worker-manager.js`, `core/worker/parser.worker.js`, `ui/store/parser-worker-client.ts`, `scripts/build.js` |
| **Anti-Chaos Rule** | None triggered — doc 10 §3 already establishes feature-detection-with-fallback as the sanctioned pattern for an unconditional-sounding Worker rule meeting a real browser capability gap (SharedArrayBuffer/COOP+COEP). This ADR applies that same pattern to Rule 01/02, it does not relax it. |
| **Tier** | Lightweight — additive decision, closes an explicitly-deferred open flag (ADR-014 point 6), no change to doc 10's Worker Pool architecture, Message-Based-only communication rule, or the Versioning mechanism (ADR-010). |

## Context

`ui/converter/converter-screen.tsx` (the first real Phase 9 screen) initially called
`core/parser/parse-and-validate.js` directly on the main thread. Doc 10 §1 states Rule 01/02
unconditionally — "Main Thread فقط برای UI" / "Parsing در Worker" — with no numeric threshold or
exception carved out anywhere in the document. Calling `parseAndValidate` from the UI thread is a
direct violation of Rule 02, not a gray area.

ADR-014 (the Build Step decision) explicitly deferred this exact question rather than inventing it
ahead of need: "the question of how a real browser `workerFactory` constructs a `Worker` from a
`file://`-served single HTML app is left open until the first Phase 9 screen actually wires a
Worker." The Converter Screen is that screen.

Mehdi's checkpoint feedback offered two literal options: (1) a Lightweight ADR defining and
justifying, with a real benchmark rather than an assumption, a numeric size threshold under which
main-thread parsing in the Converter Screen would be acceptable, or (2) actually moving the
screen's parsing onto a real Worker. Before picking either, the actual constraint was benchmarked
directly rather than assumed.

### Benchmark (real, not assumed)

A minimal classic-script and module-script Worker construction was run under Playwright/Chromium,
once from a `file://` URL and once served over `http://localhost`, with no artificial payload size
involved at all — the question being tested was *can a Worker be constructed*, not *how large an
input is too large*:

```
file://  + classic Worker  → throws synchronously:
  "Failed to construct 'Worker': Script at 'file:///.../worker.js' cannot be accessed from origin 'null'."
file://  + module Worker   → throws synchronously, same message.
http://  + classic Worker  → succeeds ("classic-worker-ok:pong").
http://  + module Worker   → succeeds ("module-worker-ok:pong").
```

This proves the real axis is **page origin / deployment mode**, not input size: `new Worker(...)`
fails identically for a 10-byte payload and a 10 MB payload under `file://`, and succeeds
identically for both once the page has an HTTP(S) origin. A byte-size threshold (Mehdi's literal
Option 1 phrasing) would therefore be measuring the wrong variable — it cannot fix a `file://`
failure no matter where the threshold is set, and it would needlessly route small HTTP-served
inputs through the main thread when a real Worker is already fully available there. Framing the
fix as **capability detection**, not **size thresholding**, is the correction this ADR makes to
the original framing.

## Decision

**Hybrid, resolving both of Mehdi's options at once**: parsing is routed through a real, dedicated
Worker by default — fully satisfying Rule 01/02 — and falls back to the existing main-thread
`parseAndValidate` only when constructing that Worker is physically impossible, which the benchmark
above shows happens in exactly one case: a `file://` page origin.

1. **`ui/store/parser-worker-client.ts`** (new) owns this routing decision. It is UI-layer, not
   Core (Rule 11 — constructing the right Worker URL needs the deployed page's own file layout,
   a UI/deployment concern), mirroring why `ADR-014` already put bundling concerns in `ui/`, not
   `core/`.
2. **Feature detection, not platform sniffing**: `createParserWorkerManager(WorkerCtor)` wraps the
   real `createWorkerManager({ workerFactory: () => new WorkerCtor(...) })` call in a single
   `try`/`catch`. `createWorkerManager` eagerly constructs its whole pool by calling
   `workerFactory()` once per pool slot at call time (already true of `core/worker/worker-manager.js`
   before this ADR), so the very first call already proves whether construction is possible at all
   — there is no separate "probe" step to keep in sync with the real dispatch path. On catch
   (the `file://` case, and the no-`Worker`-global case for non-browser/test environments), the
   manager is `null` and `parseRawConfigWith` falls back to calling `parseAndValidate` directly.
   This is exactly doc 10 §3's own pattern (`typeof SharedArrayBuffer !== 'undefined'` →
   `MessageChannel` fallback), applied to `typeof Worker` capability instead.
3. **No bundling/inlining trick is needed for the Worker script itself.** `core/worker/
   parser.worker.js` is loaded as a real `{ type: "module" }` Worker from a plain root-relative URL
   string (`"core/worker/parser.worker.js"`), the same convention `index.html` already uses for
   `<script src="assets/js/app.js">` — not `import.meta.url`-relative, since `scripts/build.js`
   bundles `ui/main.tsx` into a single classic IIFE (ADR-014) where `import.meta` does not survive.
   `parser.worker.js` needed zero code changes: `core/worker/shared/handler-envelope.js`'s
   `createWorkerEntry` already self-wires `self.onmessage`/`self.postMessage` whenever
   `self.postMessage` exists, i.e. automatically inside a real dedicated Worker context.
4. **The flattened wire result is unflattened back into a real, deep-frozen `UNMNode`** by the new
   `core/worker/unflatten-node.js` (the exact, lossless inverse of `parser.worker.js#flattenNode`),
   before reaching `parserStore` — `core/store/parser-state.js` and `core/store/selectors.js`
   expect the real nested UNM shape, not the Worker's flat wire format (ADR-003's flatten step is
   specifically for crossing the thread boundary; it does not leak past `ui/store/`).
5. **`parseRawConfigWith(manager, raw)`** is the actual dispatch logic, parameterized over the
   manager so both branches are deterministically unit-testable: `null` exercises the fallback path
   directly against `parseAndValidate`; a manager built from `tests/setup/worker-mock.js`'s
   `createMockWorkerFactory(handleParserJob)` (the same Worker Mock `tests/worker/parser-worker.
   test.js` already uses) exercises the real dispatch-through-a-worker-manager path end-to-end,
   including `CancelledError`/track-supersede behavior, without a real browser thread.
   `parseRawConfig(raw)` is a thin production wrapper over the module's real singleton manager,
   computed once from the real global `Worker` at module-load time.
6. **`core/worker/parser.worker.js` is bundled by `scripts/build.js` into `assets/js/parser-worker.js`
   before it can be loaded by a real Worker, in addition to (not instead of) staying a plain ESM
   source file Vitest runs directly.** This was found, not assumed: real-browser verification (this
   ADR's own benchmark methodology, applied a second time against the actual built app rather than a
   minimal repro) showed `new Worker("core/worker/parser.worker.js", { type: "module" })` constructs
   successfully under `http://` (proving point 2's feature detection above is correct) but the Worker
   never finishes loading — `registerClashParser` (one of the six parser registrations
   `parser.worker.js` imports eagerly) transitively imports the bare npm specifier `"js-yaml"`
   (`core/parser/clash/decode.js`, `core/converter/to-clash.js`), which a real Worker's module loader
   cannot resolve without a bundler or import map, unlike Node/Vitest's own resolver. The failure is
   silent from the page's perspective (a 404 inside the Worker's own module graph, no `pageerror`),
   so every Parse job dispatched to it hangs forever — this gap existed undetected until a real
   browser loaded the real, unbundled file, since every prior "real WorkerManager" test
   (`tests/worker/parser-worker.test.js`, `tests/worker/worker-manager.test.js`, and this ADR's own
   `tests/ui/store/parser-worker-client.test.js`) used `tests/setup/worker-mock.js`'s
   `createMockWorkerFactory`, which calls the handler function directly inside the already-loaded
   Vitest module graph and never triggers a fresh module-resolution fetch.
   `scripts/build.js` resolves this exactly the way it already resolves `preact` for `app.js`:
   bundling `core/worker/parser.worker.js` (format `"esm"`, matching the real
   `{ type: "module" }` Worker construction — unlike `app.js`'s classic-script `"iife"` format, a
   Worker has no `file://` CORS restriction on its own script tag to avoid, so there is no reason to
   avoid `type: "module"` there) into one self-contained ES module at `assets/js/parser-worker.js`,
   resolving `js-yaml` (which ships an ESM build via its `"module"` package.json field) and every
   other bare specifier at build time. `PARSER_WORKER_URL` in `ui/store/parser-worker-client.ts`
   points at this bundled path, not the raw `core/worker/` source. This is the exact question ADR-014
   Decision point 6 pre-authorized and deferred ("the question of how a real browser `workerFactory`
   constructs a `Worker` from a `file://`-served single HTML app is left open until the first Phase 9
   screen actually wires a Worker") — closed here as a packaging-step extension, not a fresh
   architectural fork: `core/`'s own source, `npm test`, and `npm run typecheck` are unchanged: only
   `scripts/build.js`'s output gains a second bundled artifact alongside `app.js`.

## Consequences

- **`assets/js/app.js` now exceeds `14-DEPENDENCY_POLICY` §2.1's "UI Layer" sub-budget (≤50KB gzip)
  by ~1KB — measured, not estimated**: real gzip of the built `app.js` is ~51.0KB (52206 bytes).
  Root cause, confirmed via an esbuild metafile: `js-yaml` (~92KB of pre-minify source, the single
  largest dependency in the bundle by far) is pulled into `app.js` by
  `core/converter/conversion.js` → `to-clash.js`, since the Converter Screen's "Clash YAML" export
  option calls `convertBatch` directly on the main thread, separately from the Parse-side `js-yaml`
  usage this ADR already isolated into `assets/js/parser-worker.js` (~38KB gzip) via
  `registerClashParser`. §2.1's own risk note named exactly this dependency ("YAML Parser") as a
  likely contributor to gradual bundle growth — this is that prediction materializing, not a new
  risk. The combined fetch weight across both artifacts (~51KB + ~38KB ≈ 89KB gzip) stays
  comfortably under §2.1's overall external-dependency ceiling (≤150KB gzip). Per Mehdi's review
  (2026-06-27): no immediate fix required; flagged here so the ~1KB overage on the UI-Layer
  sub-budget specifically is a recorded, approved fact rather than a future surprise. A real fix, if
  ever needed, would split `to-clash.js`'s `js-yaml`-dependent serialization into the existing
  (currently unwired) `core/worker/converter.worker.js` rather than touching this ADR's Parse-side
  Worker routing.
- **`file://` (Deployment Mode 1) is the only deployment mode where Rule 02 cannot be fully met**,
  and it cannot be met in *any* form there — there is no origin to grant a Worker script access to,
  regardless of approach (a 0-byte input would still fail). Falling back is the only available
  behavior in that mode, not a relaxation of the rule chosen for convenience.
- **HTTP(S)-served deployment (Deployment Mode 2+) gets a real Worker unconditionally**, satisfying
  Rule 01/02 exactly as written, for inputs of any size — no threshold exists to misconfigure or to
  need revisiting as input sizes grow.
- **`ui/converter/converter-screen.tsx`'s `handleParse` is now async**, awaiting
  `parseRawConfig(raw)`; a `CancelledError` (a superseded Parse click on the same
  `"converter-screen-parse"` track) is caught and silently ignored, never surfaced as a user-facing
  error — per doc 10 §6.1 ("Stale Jobs must never update State"), the same policy
  `core/worker/worker-manager.js` already enforces for every other Worker consumer.
- **No change to `core/worker/worker-manager.js`, `core/worker/parser.worker.js`'s own source, or
  doc 10's Pool formula/architecture** — this ADR only adds a UI-layer routing/fallback decision in
  front of already-existing, already-tested Core Worker infrastructure, plus a second bundling
  target in `scripts/build.js` (point 6 above). `core/`'s dev/test loop (`npm test`,
  `npm run typecheck`) still runs directly against `core/worker/parser.worker.js`'s raw source,
  unchanged.
- **`assets/js/parser-worker.js` (+ its `.map`) joins `assets/js/app.js` as a generated,
  `.gitignore`d build artifact** — produced by the same `npm run build` invocation, never
  hand-edited, never committed.
- **Re-verified against the actual built app in a real browser** (not just the minimal
  classic/module-Worker repro this ADR's Decision section benchmarks): both a plain URL config and
  a Clash YAML config (the specific input shape that exercises the `js-yaml`-dependent
  `registerClashParser` path point 6 fixes) were parsed through `index.html` under both `file://`
  and a real `http://` origin. `file://`: zero Workers spawned, zero console/page errors, correct
  parsed output (main-thread fallback engaged as designed). `http://`: 3 Workers spawned (matching
  pool size), zero console/page errors, correct parsed output for both inputs — including the Clash
  YAML case, proving the `js-yaml` bundling fix actually resolves the failure it targets, not just
  that the Worker constructs successfully.
- A future Phase 9 screen wiring the Analyzer or Converter Worker pools should reuse this exact
  pattern (`create<X>WorkerManager(WorkerCtor)` + try/catch + fallback, AND a matching
  `scripts/build.js` bundle target if that Worker's own import graph reaches a bare specifier)
  rather than re-deriving it, since the underlying capability gaps (`file://` origin; bare
  specifiers unresolvable inside a real Worker's module loader) are identical for every Worker kind,
  not specific to parsing.

## Addendum — Build output is committed, not `.gitignore`d (Critical Fix #1)

**Date:** 2026-06-28 | **Decider:** Mehdi

The "`assets/js/parser-worker.js` (+ its `.map`) joins `assets/js/app.js` as a generated,
`.gitignore`d build artifact ... never hand-edited, never committed" line above is corrected by the
same decision recorded in `ADR-014`'s own Addendum: Gitignoring the build output meant a plain
clone/ZIP-download of the repository opened `index.html` to a non-functional page, which directly
defeats doc 01's Offline-First goal and Deployment Mode 1. `assets/js/parser-worker.js` and
`assets/js/parser-worker.js.map` are now committed alongside `assets/js/app.js` — still only ever
written by `npm run build`, never hand-edited, but no longer excluded from the repository.

## Addendum — Converter Screen's Convert step now also routes through a real Worker

**Date:** 2026-06-28 | **Decider:** Mehdi

This ADR's Consequences section above says a real fix to the bundle-size overage "would split
`to-clash.js`'s `js-yaml`-dependent serialization into the existing **(currently unwired)**
`core/worker/converter.worker.js`". That parenthetical is now corrected: `core/worker/
converter.worker.js` is no longer unwired. It is wired to the Converter Screen's Convert step,
following this exact ADR's own pattern, and the resulting bundle-size effect was the opposite of
that paragraph's framing — see below.

What changed, reusing this ADR's pattern rather than re-deriving it (per the ADR's own closing
note above, "a future Phase 9 screen wiring the Analyzer or Converter Worker pools should reuse
this exact pattern"):

- **`ui/store/worker-feature-detection.ts` (new)**: the `typeof WorkerCtor !== "function"` guard +
  `createWorkerManager` try/catch body this ADR introduced in `parser-worker-client.ts` is now
  factored out into one shared `createDetectedWorkerManager(WorkerCtor, workerUrl)`, since the
  Converter Worker client needed the exact same logic, differing only in the Worker script URL.
  `parser-worker-client.ts`'s own `createParserWorkerManager` was refactored to delegate to this
  helper too — no behavior change there, same try/catch, same return type.
- **`ui/converter/converter-worker-client.ts` (new)**: mirrors `parser-worker-client.ts`'s
  Worker-first-with-`file://`-fallback structure (`create ConverterWorkerManager`,
  `convertBatchWith(manager, nodes, targetFormat)` parameterized for testing, `convertBatchInWorker`
  as the real-singleton wrapper, dispatched on its own `"converter-screen-convert"` track). Unlike
  the parser client, it needs **no flatten/unflatten step**: `core/worker/converter.worker.js`
  takes ordinary `UNMNode` objects and returns `convertBatch`'s own already-flat,
  already-structured-clone-safe `{ converted, skipped }` shape unchanged — confirmed directly from
  source, not assumed by analogy to the parser client. `convertBatchWith`'s Worker-routed-path test
  asserts the result `toEqual` the direct `convertBatch` output exactly (not modulo generated
  fields, unlike the parser client's `stableNode()`-stripped comparison), proving this.
- **`scripts/build.js` gains a third bundle target**, `assets/js/converter-worker.js` (+ `.map`),
  for the identical reason point 6 above bundles `parser.worker.js`: a real Worker fetches its
  script over HTTP(S) and cannot resolve the bare `"js-yaml"` specifier `core/converter/to-clash.js`
  imports. This was verified in a real browser before adding the build target, not assumed from the
  parser Worker's precedent alone: the raw unbundled `core/worker/converter.worker.js`, constructed
  as a real `{ type: "module" }` Worker, fires a real `Worker.onerror` plus a console 404 on the
  bare specifier; the bundled artifact responds correctly to a real conversion job.
- **`ui/converter/converter-screen.tsx`'s Output Panel is now async**: the previous synchronous
  `useMemo(() => convertBatch(nodes, format), [nodes, format])` is replaced with a `useState` +
  `useEffect` pair that calls `convertBatchInWorker(nodes, format)` and ignores a `CancelledError`
  from a superseded call (the same "Stale Jobs must never update State" policy, doc 10 §6.1, this
  ADR already applies to `handleParse`) — same pattern, same staleness discipline, now on both of
  this screen's Worker-routed steps.
- **`core/converter/`, `core/worker/converter.worker.js`'s own envelope/wiring, and
  `core/worker/worker-manager.js` are unchanged** — exactly as this ADR's own "no change to
  `core/worker/worker-manager.js`, `core/worker/parser.worker.js`'s own source" precedent for the
  Parse-side fix. Only a new UI/Client layer was added.

**Bundle-size correction:** the Consequences section above attributes `app.js`'s ~1KB
sub-budget overage to `core/converter/conversion.js` → `to-clash.js` pulling `js-yaml` into
`app.js` because "the Converter Screen's 'Clash YAML' export option calls `convertBatch` directly
on the main thread". That is no longer the path: the Converter Screen's Convert step now goes
through `assets/js/converter-worker.js`, not `app.js`, for the Worker-available case. `app.js`
still bundles `core/converter/conversion.js` (the `file://`-fallback code path still needs it
in-thread, and `ui/export/export-screen.tsx`'s own direct `core/exporter/` → `convertBatch` calls
are unaffected by this fix and remain main-thread by design, out of this ADR's scope), so the
`js-yaml` weight has not left `app.js` — this fix does not retroactively resolve the §2.1 overage
noted above, only adds a second, separate Worker-routed path for the common case.

**Real-browser E2E verification** (the actual Converter Screen UI, not an isolated Worker probe):
a real `vless://` URL was pasted into the Converter Screen's Input Panel, parsed, and converted to
Clash YAML through `index.html` under both origins. `http://`: the converter Worker actually
spawned and the Output Panel rendered correct Clash YAML. `file://`: zero Workers spawned for the
Convert step, main-thread fallback engaged, same correct Clash YAML output. A console 404
observed during the `http://` run was confirmed via direct CDP `Network.responseReceived`
inspection to be the browser's own automatic `favicon.ico` request — unrelated to the converter
Worker or its bundle, reproduced and ruled out, not a real defect.

**`core/exporter/` / Export Center is explicitly out of scope for this fix** and remains exactly
as before: `ui/export/export-screen.tsx` still calls `core/exporter/{to-txt,to-yaml,to-json,...}.js`
→ `convertBatch` directly on the main thread. That is a separate, unchanged code path — see the
correction this Addendum's date also applies to `README.md`'s Known Limitations section.

## Addendum — Analyzer Worker is now bundled too (correcting this ADR's own prior claim)

**Date:** 2026-07-06 | **Decider:** Mehdi

`ui/store/analyzer-worker-client.ts` originally loaded `core/worker/analyzer.worker.js` from its
raw, unbundled source, on the stated reasoning that its whole import graph has zero BARE npm
specifiers (unlike the parser/converter Workers' `js-yaml` problem above) — "confirmed by grep...
and re-confirmed against a real browser." That reasoning, while true, was too narrow: a real
"Worker error" was reported in production use, reproducible only intermittently and with a
**single node** (ruling out any data-size or computation cause), after repeated Analyze attempts
across screen navigations. The raw `core/worker/analyzer.worker.js` entry point actually pulls in
**18 separate files** by relative import (`core/analyzer/core/*`, `core/analyzer/extended/*`,
`core/analyzer/risk-score.js`, `core/validator/validators.js`, `core/unm/schema/enums.js`,
`core/worker/shared/handler-envelope.js`, ...) — confirmed directly via `esbuild`'s `metafile`
output, not assumed. A real Worker has to fetch and link all 18 individually at construction time;
this is the exact same `Worker.onerror` failure class this ADR's two Addenda above already
document and fixed for the parser/converter Workers, just never triggered by a bare specifier
this time — a flaky/failed fetch or module-link step on any ONE of those 18 files (across a real
network, a real mobile browser's module-Worker implementation, etc.) would produce precisely this
symptom: intermittent, data-independent, and (per `core/worker/worker-manager.js`'s own
`handleError`) surfaced as the literal fallback string `"Worker error"` whenever the real
`ErrorEvent.message` itself comes back empty — which is exactly the bare, contentless message text
reported.

Before concluding this was the cause, a thorough alternative investigation was done and ruled
out: a **2646-combination stress test** (`analyzeBatch` over every Protocol × SecurityType ×
NetworkType combination, with adversarial values — empty/5000-char/malformed-Base64/injection-
shaped strings — injected into every optional `UNMNode` field simultaneously) produced zero
exceptions, and all six Core + all Extended analyzer modules were read end-to-end and confirmed
defensively written (`typeof`/`Array.isArray` guards, try/catch around `atob`/`JSON.parse`/
`decodeURIComponent`). This rules out the analyzer *logic* itself as the cause with high
confidence — the remaining, well-precedented explanation is the unbundled *Worker script loading*
step, not anything `analyzeBatch` computes.

**Fix:** `core/worker/analyzer.worker.js` is now bundled by `scripts/build.js` the same way as the
other two Workers, into `assets/js/analyzer-worker.js` (15.2KB minified). `ANALYZER_WORKER_URL` in
`ui/store/analyzer-worker-client.ts` now points at that bundled artifact instead of the raw source.
No change to `core/analyzer/`'s own source, `core/worker/worker-manager.js`, or
`core/worker/analyzer.worker.js` itself — only the packaging/loading path changed, exactly this
ADR's own established precedent for the parser/converter Workers above.

**Honesty note:** this closes a real, well-precedented architectural inconsistency (the ONE Worker
still loaded unbundled, on a narrower check than the other two ever required) that matches the
reported symptom's exact failure class. It could not be verified against the user's own real
device/browser from this environment — real-browser E2E verification here (Playwright/Chromium,
the full existing suite plus the dedicated Analyze-timeout test) all pass against the new bundled
artifact with zero regressions, but that is not proof this was the specific trigger on the
reporting device. If the "Worker error" recurs after this fix, the next actionable step is the
exact literal error text plus the reporting browser/OS (module Worker support has historically
varied most on older/mobile WebKit), not a further guess from this environment alone.
