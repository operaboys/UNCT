/**
 * `createWorkerEntry` (`core/worker/shared/handler-envelope.js`) —
 * Regression: a Job must never hang forever (doc 10 §6.1), even when the
 * WORKER's own outgoing `self.postMessage(response)` throws (e.g. an
 * unexpected non-cloneable value somewhere in a real result). Before this
 * fix, that throw became an unhandled rejection inside the Worker's own
 * global scope — it never reached `self.postMessage` at all, so the main
 * thread's Job Promise (`worker-manager.js`) would wait forever for a
 * message that was never actually sent. `createWorkerEntry` now retries
 * with a minimal, definitely-cloneable failure envelope instead.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createWorkerEntry } from "../../core/worker/shared/handler-envelope.js";

/** @param {number} ms */
function flush(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createWorkerEntry — self.postMessage failure recovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries with a minimal failure envelope when the real response cannot be sent", async () => {
    /** @type {any[]} */
    const sent = [];
    let callCount = 0;
    vi.stubGlobal("self", {
      postMessage(/** @type {any} */ response) {
        callCount += 1;
        if (callCount === 1) {
          throw new Error("could not be cloned");
        }
        sent.push(response);
      },
      onmessage: null,
    });

    createWorkerEntry(() => ({ someResult: true }));
    await /** @type {any} */ (self).onmessage({ data: { jobId: "j1", generationId: 1, track: "t", payload: {} } });
    await flush();

    expect(callCount).toBe(2);
    expect(sent).toHaveLength(1);
    expect(sent[0].ok).toBe(false);
    expect(sent[0].jobId).toBe("j1");
    expect(sent[0].generationId).toBe(1);
    expect(sent[0].track).toBe("t");
    expect(sent[0].error.message).toMatch(/could not be sent/);
  });

  it("sends the real response directly when postMessage succeeds (no regression on the happy path)", async () => {
    /** @type {any[]} */
    const sent = [];
    vi.stubGlobal("self", {
      postMessage(/** @type {any} */ response) {
        sent.push(response);
      },
      onmessage: null,
    });

    createWorkerEntry(() => ({ someResult: "real" }));
    await /** @type {any} */ (self).onmessage({ data: { jobId: "j2", generationId: 1, track: "t", payload: {} } });
    await flush();

    expect(sent).toHaveLength(1);
    expect(sent[0].ok).toBe(true);
    expect(sent[0].result).toEqual({ someResult: "real" });
  });

  it("still returns the failure envelope's { ok: false, error } shape directly callable (no self required)", async () => {
    const handler = createWorkerEntry(() => {
      throw new Error("real processing failure");
    });
    const response = await handler({ jobId: "j3", generationId: 1, track: "t", payload: {} });
    expect(response.ok).toBe(false);
    expect(/** @type {any} */ (response).error.message).toBe("real processing failure");
  });
});
