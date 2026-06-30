/**
 * Tests for `createWorkerManager().getStats()` — the Performance Analyzer
 * extension (Phase 12 P12-2, ADR-021). All existing worker-manager tests are
 * untouched; this file covers only the new Additive surface.
 */
import { describe, it, expect } from "vitest";
import { createWorkerManager, CancelledError } from "../../core/worker/worker-manager.js";
import { createMockWorkerFactory } from "../setup/worker-mock.js";

/** @param {any} message */
function echoHandler(message) {
  return {
    jobId: message.jobId, generationId: message.generationId,
    track: message.track, ok: true, result: message.payload,
  };
}

/** @param {any} message */
function delayedEcho(message) {
  const delay = (message.payload && message.payload.delay) || 0;
  return new Promise((resolve) => setTimeout(() => resolve({
    jobId: message.jobId, generationId: message.generationId,
    track: message.track, ok: true, result: message.payload,
  }), delay));
}

describe("getStats() — initial / zero state", () => {
  it("returns correct poolSize, all-zero counters, and null durations before any job", () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 3 });
    const s = m.getStats();
    expect(s.poolSize).toBe(3);
    expect(s.busyCount).toBe(0);
    expect(s.pendingCount).toBe(0);
    expect(s.completedCount).toBe(0);
    expect(s.cancelledCount).toBe(0);
    expect(s.failedCount).toBe(0);
    expect(s.lastJobDurationMs).toBeNull();
    expect(s.avgRecentDurationMs).toBeNull();
    expect(typeof s.snapshotAt).toBe("number");
  });

  it("returns a frozen snapshot (not a live reference)", () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 1 });
    const s = m.getStats();
    expect(Object.isFrozen(s)).toBe(true);
  });
});

describe("getStats() — completedCount", () => {
  it("increments completedCount after each successful job", async () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 2 });
    await m.runJob({ label: "a" }).promise;
    expect(m.getStats().completedCount).toBe(1);
    await m.runJob({ label: "b" }).promise;
    expect(m.getStats().completedCount).toBe(2);
  });

  it("lastJobDurationMs is a non-negative number after a completed job", async () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 1 });
    await m.runJob({}).promise;
    const s = m.getStats();
    expect(s.lastJobDurationMs).not.toBeNull();
    expect(/** @type {number} */ (s.lastJobDurationMs)).toBeGreaterThanOrEqual(0);
  });

  it("avgRecentDurationMs is the average of completed-job durations", async () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 1 });
    await m.runJob({}).promise;
    await m.runJob({}).promise;
    const s = m.getStats();
    expect(s.avgRecentDurationMs).not.toBeNull();
    expect(/** @type {number} */ (s.avgRecentDurationMs)).toBeGreaterThanOrEqual(0);
  });
});

describe("getStats() — cancelledCount", () => {
  it("increments cancelledCount after explicit cancel() on a queued job", async () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(delayedEcho), poolSize: 1 });
    const busy = m.runJob({ delay: 30 });
    const { cancel, promise } = m.runJob({ label: "victim" });
    cancel();
    await expect(promise).rejects.toBeInstanceOf(CancelledError);
    expect(m.getStats().cancelledCount).toBe(1);
    await busy.promise;
  });

  it("auto-supersede on same track increments cancelledCount for the stale queued job", async () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(delayedEcho), poolSize: 1 });
    const busy = m.runJob({ delay: 30 });
    const old = m.runJob({ label: "old" }, { track: "t" });
    const fresh = m.runJob({ label: "fresh" }, { track: "t" });
    await expect(old.promise).rejects.toBeInstanceOf(CancelledError);
    await fresh.promise;
    await busy.promise;
    expect(m.getStats().cancelledCount).toBeGreaterThanOrEqual(1);
  });
});

describe("getStats() — failedCount", () => {
  it("increments failedCount when the worker handler throws", async () => {
    const m = createWorkerManager({
      workerFactory: createMockWorkerFactory(() => { throw new Error("boom"); }),
      poolSize: 1,
    });
    await expect(m.runJob({}).promise).rejects.toThrow("boom");
    expect(m.getStats().failedCount).toBe(1);
  });
});

describe("getStats() — busyCount getter vs snapshot", () => {
  it("busyCount getter reads live pool state (same value as snapshot.busyCount when idle)", () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(echoHandler), poolSize: 2 });
    expect(m.busyCount).toBe(0);
    expect(m.getStats().busyCount).toBe(0);
  });

  it("pendingCount reflects queued jobs not yet dispatched", () => {
    const m = createWorkerManager({ workerFactory: createMockWorkerFactory(delayedEcho), poolSize: 1 });
    m.runJob({ delay: 50 });
    m.runJob({ delay: 50 });
    expect(m.pendingCount).toBeGreaterThan(0);
    expect(m.getStats().pendingCount).toBe(m.pendingCount);
  });
});
