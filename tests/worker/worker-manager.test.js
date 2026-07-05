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

describe("Investigation — 'Analyze sometimes gets stuck' report, Pool-Size-Dependent hypothesis", () => {
  // The real-world trigger under investigation: nothing in `analyzer-screen.tsx`
  // (or any other screen) ever calls a Job's `cancel()` on unmount — leaving a
  // page/navigate-away mid-Analyze means the in-flight Job simply keeps running
  // to completion in the background; only a NEW Analyze on the same track marks
  // it stale via generationId, so its eventual (correct) result is discarded as
  // a `CancelledError` rather than updating stale UI state (doc 10 §6.1). The
  // user's own device observation (Performance Logs' analyzer pool showing
  // BUSY=1, worse on desktop, self-resolving after an unusually long delay)
  // pointed at `computePoolSize`'s `navigator.hardwareConcurrency`-driven
  // sizing (desktop: usually maxed at 8; mobile: typically 3-6) as a possible
  // culprit. These tests simulate that EXACT "unmount doesn't cancel, then
  // re-Analyze" sequence directly against `createWorkerManager` with an
  // artificially large pool (16, well beyond the real 8-slot cap) using the
  // `poolSize` override the manager already exposes for exactly this purpose.
  it("large pool (16): stale in-flight Job A (never cancelled) never blocks Job B on the same track from dispatching immediately", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 16,
    });
    const TRACK = "analyzer-screen-analyze";

    // Job A: simulates the user's first Analyze click; nothing ever cancels
    // it (no unmount hook does) even though the user "navigates away". The
    // rejection assertion is attached immediately (not awaited yet) so
    // there is never a real window where A's eventual rejection has no
    // handler attached, regardless of exactly when it settles below.
    const a = manager.runJob({ label: "A", delay: 80 }, { track: TRACK });
    const aRejection = expect(a.promise).rejects.toBeInstanceOf(CancelledError);
    await new Promise((r) => setTimeout(r, 10)); // let A actually start running

    // Job B: simulates the user navigating back and clicking Analyze again,
    // BEFORE A's still-running response has arrived.
    const startedBAt = Date.now();
    const b = manager.runJob({ label: "B", delay: 5 }, { track: TRACK });

    // With 16 slots and only 1 (A) occupied, B must be dispatched to its own
    // idle slot IMMEDIATELY, not queued behind A -- a large pool gives B
    // *more*, not less, room to run concurrently with A's still-in-flight job.
    expect(manager.pendingCount).toBe(0);
    const statsRightAfterB = manager.getStats();
    expect(statsRightAfterB.busyCount).toBe(2); // A and B both genuinely in flight

    const resultB = await b.promise;
    const bElapsedMs = Date.now() - startedBAt;
    expect(asRecord(resultB).label).toBe("B");
    // B resolves in roughly its own 5ms delay, not A's 80ms -- proving B was
    // never stuck waiting on A's slot.
    expect(bElapsedMs).toBeLessThan(60);

    // A's real (but now stale) result eventually arrives and is discarded as
    // a CancelledError -- its slot frees itself the moment that happens, it
    // is never left permanently busy.
    await aRejection;
    const finalStats = manager.getStats();
    expect(finalStats.busyCount).toBe(0);
    expect(finalStats.pendingCount).toBe(0);
  });

  it("contrast — a SMALL pool (1) makes B wait for A's slot (delayed, not stuck): the 'unusually long delay before self-resolving' symptom is more consistent with a small pool than a large one", async () => {
    const manager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 1,
    });
    const TRACK = "analyzer-screen-analyze";

    const a = manager.runJob({ label: "A", delay: 80 }, { track: TRACK });
    // Attached immediately (see the equivalent comment in the previous test)
    // -- this test's own B genuinely blocks the event loop's return to this
    // function until AFTER A settles, so without this the window between
    // A's real rejection and this file reaching an `expect(a.promise)` call
    // would otherwise be observed as a real (if transient) unhandled rejection.
    const aRejection = expect(a.promise).rejects.toBeInstanceOf(CancelledError);
    await new Promise((r) => setTimeout(r, 10));

    const startedBAt = Date.now();
    const b = manager.runJob({ label: "B", delay: 5 }, { track: TRACK });

    // With only 1 slot (already occupied by A), B is genuinely QUEUED --
    // this is the "unusually long delay" shape: B is not stuck forever, but
    // it cannot start until A's slot frees (when A's stale response arrives).
    expect(manager.pendingCount).toBe(1);

    const resultB = await b.promise;
    const bElapsedMs = Date.now() - startedBAt;
    expect(asRecord(resultB).label).toBe("B");
    // B's real wait is bounded by A's remaining delay (~70ms left), not
    // instant -- this is the queueing-driven delay a SMALL pool produces,
    // the opposite direction of the "big pool is worse" hypothesis.
    expect(bElapsedMs).toBeGreaterThan(40);

    await aRejection;
    const finalStats = manager.getStats();
    expect(finalStats.busyCount).toBe(0);
    expect(finalStats.pendingCount).toBe(0);
  });

  it("large pool (16): a hard page reload's worker teardown never leaves a stale Job unsettled in a NEW manager instance", async () => {
    // Simulates the "full page reload mid-Job" scenario: a real page reload
    // destroys the OLD JS realm (and every Worker it owned) entirely -- the
    // NEW page evaluates its module graph from scratch, constructing a
    // BRAND NEW `workerManager` singleton with an empty Job map. There is no
    // code path by which the old manager's in-flight Job could ever reach
    // into the new manager's pool -- modelled here by simply constructing a
    // second, independent manager and confirming it starts clean.
    const oldManager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 16,
    });
    const stale = oldManager.runJob({ label: "pre-reload", delay: 80 }, { track: "analyzer-screen-analyze" });
    // A real page reload discards the abandoned Job's promise along with the
    // whole old Realm -- nothing ever observes its eventual settlement. This
    // `.catch` only exists so the test process itself doesn't flag it as an
    // unhandled rejection; it is not modelling any real app-level handling.
    stale.promise.catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const newManager = createWorkerManager({
      workerFactory: createMockWorkerFactory(delayedEchoHandler), poolSize: 16,
    });
    const freshStats = newManager.getStats();
    expect(freshStats.busyCount).toBe(0);
    expect(freshStats.pendingCount).toBe(0);

    const fresh = newManager.runJob({ label: "post-reload" }, { track: "analyzer-screen-analyze" });
    await expect(fresh.promise).resolves.toEqual({ label: "post-reload" });
  });
});
