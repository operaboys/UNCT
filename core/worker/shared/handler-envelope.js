/**
 * Shared Worker message envelope (ADR-010: jobId/generationId/track) and
 * `self.onmessage` wiring, factored out once so `parser.worker.js`,
 * `analyzer.worker.js`, and `converter.worker.js` don't each reimplement it
 * (ADR-003 — Worker files are thin wrappers; this is the wrapper's only
 * shared plumbing, not business logic).
 *
 * `createWorkerEntry(processPayload)` returns a pure, directly-callable
 * handler: `handler({ jobId, generationId, track, payload }) ->
 * Promise<{ jobId, generationId, track, ok, result } | { ..., ok:false, error }>`.
 * Tests (and `tests/setup/worker-mock.js`) call this returned function
 * directly — no DOM/Worker globals required (15-TESTING_FRAMEWORK's "no
 * Worker API in Vitest by default" gap). When the same module is actually
 * loaded inside a real Worker, `self.postMessage` exists, so this function
 * also wires itself to `self.onmessage` — one file, two valid call paths.
 *
 * @param {(payload: unknown) => unknown | Promise<unknown>} processPayload
 */
export function createWorkerEntry(processPayload) {
  /**
   * @param {unknown} message
   */
  async function handleMessage(message) {
    const { jobId, generationId, track, payload } =
      /** @type {{ jobId?: string, generationId?: number, track?: string, payload?: unknown }} */ (message || {});
    try {
      const result = await processPayload(payload);
      return { jobId, generationId, track, ok: true, result };
    } catch (err) {
      return {
        jobId, generationId, track, ok: false,
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  if (typeof self !== "undefined" && typeof self.postMessage === "function") {
    self.onmessage = (evt) => {
      handleMessage(evt.data).then((response) => self.postMessage(response));
    };
  }

  return handleMessage;
}
