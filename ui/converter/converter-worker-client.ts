/**
 * Real-Worker routing for the Converter Screen's convert step, reusing
 * ADR-016's exact pattern (originally written for the same screen's parse
 * step, in `ui/store/parser-worker-client.ts`): a real, dedicated Worker
 * (`core/worker/converter.worker.js` + `core/worker/worker-manager.js`) by
 * DEFAULT, with a single feature-detection check (now shared via
 * `ui/store/worker-feature-detection.ts`) falling back to the existing
 * main-thread `convertBatch` only when constructing a Worker is physically
 * impossible — the `file://` page-origin case ADR-016 benchmarked.
 *
 * Unlike `parser-worker-client.ts`, there is no flatten/unflatten step here:
 * `core/worker/converter.worker.js` takes ordinary (non-flattened) `UNMNode`
 * objects as input and returns `convertBatch`'s own already-flat,
 * already-structured-clone-safe `{ converted, skipped }` shape unchanged —
 * confirmed directly from both files' source, not assumed by analogy. The
 * flatten step ADR-003 mandates is specific to crossing the thread boundary
 * with a deep-frozen `UNMNode`; the Converter Worker's input/output shapes
 * never needed it.
 *
 * It points at `assets/js/converter-worker.js`, NOT the raw
 * `core/worker/converter.worker.js` source, for the same reason
 * `parser-worker-client.ts` points at `assets/js/parser-worker.js`: a real
 * Worker fetches its script over HTTP(S) and cannot resolve the bare
 * `"js-yaml"` specifier `core/converter/to-clash.js` imports directly. This
 * was verified in a real browser (not assumed from the parser Worker's
 * precedent alone) before adding `scripts/build.js`'s matching bundle
 * target: the raw unbundled file fires a real `Worker.onerror` plus a
 * console 404 on the bare specifier when constructed as a real
 * `{ type: "module" }` Worker; the bundled artifact responds correctly.
 */
import { convertBatch } from "../../core/converter/conversion.js";
import { createWorkerManager, CancelledError } from "../../core/worker/worker-manager.js";
import { createDetectedWorkerManager, type WorkerCtor } from "../store/worker-feature-detection.js";
import type { UNMNode } from "../../core/types/unm";

export { CancelledError };

const CONVERTER_WORKER_URL = "assets/js/converter-worker.js";
const TRACK = "converter-screen-convert";

export type ExportFormat = "url" | "xrayJson" | "singboxJson" | "clashYaml";

export interface ConvertResult {
  converted: { nodeId: string; output: string }[];
  skipped: { nodeId: string; protocol: string }[];
}

type ConverterWorkerManager = ReturnType<typeof createWorkerManager>;

/**
 * Pure, dependency-injected feature detection — exported so the fallback
 * decision is unit-testable without a real browser, by passing a fake/
 * throwing/working `WorkerCtor` directly (mirrors
 * `parser-worker-client.ts`'s `createParserWorkerManager`).
 */
export function createConverterWorkerManager(WorkerCtor: WorkerCtor | undefined): ConverterWorkerManager | null {
  return createDetectedWorkerManager(WorkerCtor, CONVERTER_WORKER_URL);
}

const workerManager = createConverterWorkerManager(
  typeof Worker === "undefined" ? undefined : Worker,
);

/**
 * The actual convert-dispatch logic, parameterized over the manager so
 * tests can exercise both branches deterministically — `convertBatchInWorker`
 * below is a thin wrapper over this with the module's real singleton.
 */
export function convertBatchWith(
  manager: ConverterWorkerManager | null,
  nodes: readonly Readonly<UNMNode>[],
  targetFormat: ExportFormat,
): Promise<ConvertResult> {
  if (!manager) {
    return Promise.resolve().then(() => convertBatch(nodes, targetFormat));
  }
  const { promise } = manager.runJob({ nodes, targetFormat }, { track: TRACK });
  return promise as Promise<ConvertResult>;
}

export function convertBatchInWorker(
  nodes: readonly Readonly<UNMNode>[],
  targetFormat: ExportFormat,
): Promise<ConvertResult> {
  return convertBatchWith(workerManager, nodes, targetFormat);
}
