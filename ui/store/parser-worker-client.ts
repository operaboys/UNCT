/**
 * Real-Worker routing for the Converter Screen's parse step (ADR-016,
 * resolving the 10-PERFORMANCE_ENGINE §1 Rule 01/02 tension the first real
 * Phase 9 screen surfaced: "Parsing در Worker", unconditionally worded).
 *
 * Parsing routes through a real dedicated Worker
 * (`core/worker/parser.worker.js` + `core/worker/worker-manager.js`) by
 * DEFAULT — fully Rule 01/02 compliant. Worker construction is feature-
 * detected via a single try/catch around `createWorkerManager` (which
 * eagerly constructs its whole pool by calling `workerFactory()` once per
 * pool slot at call time, so the very first call already proves whether
 * construction is possible at all): when it throws, parsing falls back to
 * the existing main-thread `core/parser/parse-and-validate.js`. Empirically
 * (a real Playwright benchmark, not an assumption — see ADR-016), that
 * throw happens ONLY when the page itself is served from a `file://`
 * origin, where `new Worker(...)` throws synchronously for both classic and
 * module workers ("cannot be accessed from origin 'null'") — regardless of
 * input size. `file://` is also the one case doc 10's Rule 01/02 cannot
 * possibly be met in any form: there is no origin there to grant ANY
 * Worker script access, so falling back is the only available behavior,
 * not a relaxation of the rule.
 *
 * Lives in `ui/store/`, not `core/worker/`: constructing the right Worker
 * URL needs the deployed page's own file layout (`index.html`'s location
 * relative to the worker script), a UI/deployment concern, not pure Core
 * logic (Rule 11). The URL below is a plain root-relative string, not
 * `import.meta.url`-relative — `scripts/build.js` bundles `ui/main.tsx`
 * into a single classic IIFE script (ADR-014), and `import.meta` does not
 * survive that bundling. A bare path resolved against the page's own base
 * URL at runtime is the same convention `index.html` already uses for
 * `<script src="assets/js/app.js">`.
 *
 * It points at `assets/js/parser-worker.js`, NOT the raw
 * `core/worker/parser.worker.js` source: a real Worker fetches its script
 * over HTTP(S) and cannot resolve the bare `"js-yaml"` specifier that
 * `core/parser/clash/decode.js` imports transitively (ES module imports in
 * a real dedicated Worker have no bundler step at runtime, unlike Vitest's
 * own resolver). `scripts/build.js` bundles `core/worker/parser.worker.js`
 * into that self-contained ES module alongside `app.js` (ADR-016).
 */
import { parseAndValidate } from "../../core/parser/parse-and-validate.js";
import { createWorkerManager, CancelledError } from "../../core/worker/worker-manager.js";
import { unflattenNode } from "../../core/worker/unflatten-node.js";
import type { UNMNode } from "../../core/types/unm";

export { CancelledError };

const PARSER_WORKER_URL = "assets/js/parser-worker.js";
const TRACK = "converter-screen-parse";

export interface ParseResult {
  parserName: string;
  recovered: boolean;
  nodes: Readonly<UNMNode>[];
}

type ParserWorkerManager = ReturnType<typeof createWorkerManager>;

/**
 * Pure, dependency-injected feature detection — exported so the fallback
 * decision (not just the formatting logic) is unit-testable without a real
 * browser, by passing a fake/throwing/working `WorkerCtor` directly.
 */
export function createParserWorkerManager(
  WorkerCtor: (new (url: string, opts: { type: "module" }) => unknown) | undefined,
): ParserWorkerManager | null {
  if (typeof WorkerCtor !== "function") return null;
  try {
    return createWorkerManager({
      workerFactory: () => new WorkerCtor(PARSER_WORKER_URL, { type: "module" }) as never,
    });
  } catch {
    return null;
  }
}

const workerManager = createParserWorkerManager(
  typeof Worker === "undefined" ? undefined : Worker,
);

/**
 * The actual parse-dispatch logic, parameterized over the manager so tests
 * can exercise both branches deterministically (a real `WorkerManager` built
 * from `tests/setup/worker-mock.js` for the Worker path, `null` for the
 * fallback path) — `parseRawConfig` below is a thin wrapper over this with
 * the module's real singleton.
 */
export function parseRawConfigWith(manager: ParserWorkerManager | null, raw: string): Promise<ParseResult> {
  if (!manager) {
    return Promise.resolve().then(() => parseAndValidate(raw));
  }
  const { promise } = manager.runJob({ raw }, { track: TRACK });
  return promise.then((result) => {
    const flat = result as { parserName: string; recovered: boolean; nodes: Record<string, unknown>[] };
    return {
      parserName: flat.parserName,
      recovered: flat.recovered,
      nodes: flat.nodes.map(unflattenNode),
    };
  });
}

export function parseRawConfig(raw: string): Promise<ParseResult> {
  return parseRawConfigWith(workerManager, raw);
}
