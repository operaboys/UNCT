/**
 * Worker Manager tests (10-PERFORMANCE_ENGINE §5/§6/§6.1; ADR-010).
 * Uses the in-thread Worker Mock (`tests/setup/worker-mock.js`, ADR-003) —
 * no real Worker thread is simulated, exactly per 15-TESTING_FRAMEWORK's
 * prescribed approach.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createWorkerManager, computePoolSize, resolveHardwareConcurrency, CancelledError,
} from "../../core/worker/worker-manager.js";
import { createMockWorkerFactory } from "../setup/worker-mock.js";

/**
 * Echoes the payload back after `payload.delay` ms (0 = next microtask only).
 * @param {any} message
 */
function delayedEchoHandler(message) {
  const delay = (message.payload && message.payload.delay) || 0;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        jobId: message.jobId, generationId: message.generationId, track: message.track,
        ok: true, result: message.payload,
      });
    }, delay);
  });
}

/** @param {unknown} value */
function asRecord(value) {
  return /** @type {Record<string, any>} */ (value);
}

describe("computePoolSize (doc 10 §5: Max(2, Min(8, hardwareConcurrency - 1)))", () => {
  it("never goes below 2, even on a single-core device", () => {
    expect(computePoolSize(1)).toBe(2);
    expect(computePoolSize(0)).toBe(2);
  });
  it("reserves one core for the UI thread otherwise", () => {
    expect(computePoolSize(4)).toBe(3);
    expect(computePoolSize(5)).toBe(4);
  });
  it("caps at 8 regardless of how many cores are reported", () => {
    expect(computePoolSize(16)).toBe(8);
    expect(computePoolSize(33)).toBe(8);
  });
});

describe("resolveHardwareConcurrency", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads navigator.hardwareConcurrency when available", () => {
    vi.stubGlobal("navigator", { hardwareConcurrency: 6 });
    expect(resolveHardwareConcurrency()).toBe(6);
  });

  it("falls back to the default when navigator is unavailable", () => {
    vi.stubGlobal("navigator", undefined);
    expect(resolveHardwareConcurrency(4)).toBe(4);
  });

  it("falls back when hardwareConcurrency is not a finite number", () => {
    vi.stubGlobal("navigator", {});
    expect(resolveHardwareConcurrency(4)).toBe(4);
  });
});

describe("createWorkerManager — pool, dispatch, queueing", () => {
  it("requires a workerFactory", () => {
    expect(() => createWorkerManager(/** @type {any} */ ({}))).toThrow(/workerFactory/);
  });

  it("exposes the resolved pool size", () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 3,
    });
    expect(manager.poolSize).toBe(3);
  });

  it("runs a job and resolves with the worker's result", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 2,
    });
    const { promise } = manager.runJob({ label: "hello" });
    await expect(promise).resolves.toEqual({ label: "hello" });
  });

  it("queues jobs beyond pool size and still resolves every one", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 1,
    });
    const jobs = [1, 2, 3].map((n) => manager.runJob({ label: `job-${n}` }));
    expect(manager.pendingCount).toBeGreaterThan(0);
    const results = await Promise.all(jobs.map((j) => j.promise));
    expect(results.map((r) => asRecord(r).label)).toEqual(["job-1", "job-2", "job-3"]);
  });

  it("rejects with an Error when the worker's handler throws", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(() => { throw new Error("boom"); }),
      poolSize: 1,
    });
    const { promise } = manager.runJob({});
    await expect(promise).rejects.toThrow(/boom/);
  });
});

describe("Task Cancellation Policy (doc 10 §6.1) + Versioning (ADR-010)", () => {
  it("Import A -> Import B -> A Cancelled -> B Continues (same track auto-supersedes)", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 2,
    });

    const a = manager.runJob({ label: "A", delay: 50 }, { track: "import" });
    // Let A actually start running on its worker before B is dispatched.
    await new Promise((r) => setTimeout(r, 5));

    const b = manager.runJob({ label: "B", delay: 5 }, { track: "import" });

    const resultB = await b.promise;
    expect(asRecord(resultB).label).toBe("B");

    await expect(a.promise).rejects.toBeInstanceOf(CancelledError);
  });

  it("explicit cancel() rejects a still-queued job and never lets it publish", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 1,
    });
    const busy = manager.runJob({ label: "busy", delay: 30 });
    const toCancel = manager.runJob({ label: "to-cancel", delay: 0 });

    toCancel.cancel();

    await expect(toCancel.promise).rejects.toBeInstanceOf(CancelledError);
    await expect(busy.promise).resolves.toEqual({ label: "busy", delay: 30 });
  });

  it("supports cancellation via an AbortSignal", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 1,
    });
    const controller = new AbortController();
    const busy = manager.runJob({ label: "busy", delay: 30 });
    const job = manager.runJob({ label: "abort-me" }, { signal: controller.signal });

    controller.abort();

    await expect(job.promise).rejects.toBeInstanceOf(CancelledError);
    await expect(busy.promise).resolves.toEqual({ label: "busy", delay: 30 });
  });

  it("jobs on independent tracks never supersede each other", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 2,
    });
    const a = manager.runJob({ label: "A" }, { track: "import" });
    const b = manager.runJob({ label: "B" }, { track: "export" });

    await expect(a.promise).resolves.toEqual({ label: "A" });
    await expect(b.promise).resolves.toEqual({ label: "B" });
  });
});

describe("Main Thread is never synchronously blocked by dispatch", () => {
  it("runJob() returns control to the caller before the (heavy) handler body runs", async () => {
    /** @type {string[]} */
    const order = [];
    const heavyHandler = (/** @type {any} */ message) => {
      order.push("handler-start");
      let x = 0;
      for (let i = 0; i < 1e5; i += 1) x += i; // simulated heavy synchronous work
      return { jobId: message.jobId, generationId: message.generationId, track: message.track, ok: true, result: x };
    };
    const manager = createWorkerManager({ workerFactory: createMockWorkerFactory(heavyHandler), poolSize: 1 });

    order.push("before-runJob");
    const { promise } = manager.runJob({});
    order.push("after-runJob");

    await promise;
    order.push("after-resolve");

    // The handler (the "heavy work") never runs inline inside runJob() — it
    // is always deferred at least one microtask, so dispatch is non-blocking.
    expect(order).toEqual(["before-runJob", "after-runJob", "handler-start", "after-resolve"]);
  });
});

describe("Regression — a Job must never hang forever (doc 10 §6.1), even when postMessage itself throws", () => {
  // The real-world trigger this closes: `dispatchNext()`'s call to
  // `idle.worker.postMessage(...)` used to have no guard around it. If a
  // payload ever failed to cross the structured-clone boundary (e.g. an
  // unexpected non-cloneable value), postMessage throws SYNCHRONOUSLY on the
  // main thread, before the Worker ever sees the job — no message/error
  // event will ever arrive for it. Without a guard, that permanently leaves
  // the pool slot marked busy (never freed) and the Job's Promise unsettled
  // forever — a real "Analyze never finishes" class of bug (Developer
  // Console's Performance Logs would show a permanently `busyCount`d slot).
  /** @param {(message: unknown) => unknown | Promise<unknown>} handler @param {() => void} onPostMessage */
  function createThrowingWorkerFactory(handler, onPostMessage) {
    return () => {
      /** @type {{ message: Set<(evt: {data?: unknown}) => void>, error: Set<(evt: {message?: string}) => void> }} */
      const listeners = { message: new Set(), error: new Set() };
      return {
        postMessage(/** @type {unknown} */ data) {
          onPostMessage();
          throw new Error("DataCloneError: could not be cloned");
        },
        addEventListener(/** @type {"message"|"error"} */ type, /** @type {any} */ cb) {
          listeners[type].add(cb);
        },
        removeEventListener() {},
        terminate() {},
      };
    };
  }

  it("settles the job as a real rejection instead of hanging when postMessage throws synchronously", async () => {
    let sendAttempts = 0;
    const manager = createWorkerManager({
      workerFactory: createThrowingWorkerFactory(delayedEchoHandler, () => { sendAttempts += 1; }),
      poolSize: 1,
    });

    const { promise } = manager.runJob({ label: "will-fail-to-send" });

    await expect(promise).rejects.toThrow(/DataCloneError|could not be cloned/);
    expect(sendAttempts).toBe(1);
  });

  it("frees the pool slot so the NEXT queued job still dispatches (no permanent slot leak)", async () => {
    const manager = createWorkerManager({
      workerFactory: createThrowingWorkerFactory(delayedEchoHandler, () => {}),
      poolSize: 1,
    });

    const first = manager.runJob({ label: "first" });
    const second = manager.runJob({ label: "second" });

    await expect(first.promise).rejects.toThrow();
    await expect(second.promise).rejects.toThrow();
    // Both jobs actually settled (neither is stuck pending) and the single
    // slot never stayed permanently "busy" — getStats() reflects 2 real
    // failures, not 2 jobs silently vanishing into an unsettled limbo.
    const stats = manager.getStats();
    expect(stats.failedCount).toBe(2);
    expect(stats.busyCount).toBe(0);
    expect(stats.pendingCount).toBe(0);
  });
});
