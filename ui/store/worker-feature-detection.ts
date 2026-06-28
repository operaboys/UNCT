/**
 * Shared Worker construction feature-detection (ADR-016): every
 * `create<X>WorkerManager(WorkerCtor)` in `ui/` (`parser-worker-client.ts`,
 * and now `ui/converter/converter-worker-client.ts`) wrapped the exact same
 * `typeof WorkerCtor !== "function"` guard + `createWorkerManager` try/catch
 * body, differing only in the Worker script URL — that duplication is
 * genuine (not just superficial similarity), so it is factored out once
 * here rather than re-derived per client.
 *
 * `createWorkerManager` eagerly constructs its whole pool by calling
 * `workerFactory()` once per pool slot at call time, so this single call
 * already proves whether construction is possible at all (ADR-016's own
 * reasoning) — there is no separate "probe" step to keep in sync with the
 * real dispatch path. The two cases this catches: no global `Worker`
 * (non-browser/test environments) and a `file://` page origin, where
 * `new Worker(...)` throws synchronously for both classic and module
 * Workers regardless of input size (ADR-016's benchmark).
 */
import { createWorkerManager } from "../../core/worker/worker-manager.js";

export type WorkerCtor = new (url: string, opts: { type: "module" }) => unknown;

export function createDetectedWorkerManager(
  WorkerCtor: WorkerCtor | undefined,
  workerUrl: string,
): ReturnType<typeof createWorkerManager> | null {
  if (typeof WorkerCtor !== "function") return null;
  try {
    return createWorkerManager({
      workerFactory: () => new WorkerCtor(workerUrl, { type: "module" }) as never,
    });
  } catch {
    return null;
  }
}
