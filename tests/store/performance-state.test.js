/**
 * Tests for `createPerformanceStore()` — the Performance State domain store
 * (Phase 12 P12-2, ADR-021). Mirrors the analyzer-state.test.js structure.
 */
import { describe, it, expect, vi } from "vitest";
import { createPerformanceStore } from "../../core/store/performance-state.js";

/** Minimal valid PoolStats fixture. */
function makeStats(overrides = {}) {
  return Object.freeze({
    poolSize: 2,
    busyCount: 0,
    pendingCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    failedCount: 0,
    lastJobDurationMs: null,
    avgRecentDurationMs: null,
    snapshotAt: Date.now(),
    ...overrides,
  });
}

describe("createPerformanceStore — initial state", () => {
  it("starts with an empty pools map", () => {
    const store = createPerformanceStore();
    expect(store.getState()).toEqual({ pools: {} });
  });
});

describe("createPerformanceStore — recordPoolStats", () => {
  it("records stats for a single pool", () => {
    const store = createPerformanceStore();
    const stats = makeStats({ completedCount: 5 });
    store.recordPoolStats("parser", stats);
    expect(store.getState().pools.parser).toBe(stats);
  });

  it("records stats for multiple pools independently", () => {
    const store = createPerformanceStore();
    const parserStats = makeStats({ poolSize: 2 });
    const analyzerStats = makeStats({ poolSize: 1, completedCount: 3 });
    store.recordPoolStats("parser", parserStats);
    store.recordPoolStats("analyzer", analyzerStats);
    const { pools } = store.getState();
    expect(pools.parser).toBe(parserStats);
    expect(pools.analyzer).toBe(analyzerStats);
    expect(pools.converter).toBeUndefined();
  });

  it("updates stats for an existing pool without affecting others", () => {
    const store = createPerformanceStore();
    store.recordPoolStats("parser", makeStats({ completedCount: 1 }));
    store.recordPoolStats("analyzer", makeStats({ completedCount: 2 }));
    const updated = makeStats({ completedCount: 99 });
    store.recordPoolStats("parser", updated);
    const { pools } = store.getState();
    expect(pools.parser).toBe(updated);
    expect(pools.analyzer?.completedCount).toBe(2);
  });
});

describe("createPerformanceStore — clearStats", () => {
  it("resets pools back to empty map", () => {
    const store = createPerformanceStore();
    store.recordPoolStats("parser", makeStats());
    store.recordPoolStats("converter", makeStats());
    store.clearStats();
    expect(store.getState()).toEqual({ pools: {} });
  });
});

describe("createPerformanceStore — subscribe", () => {
  it("notifies listener on recordPoolStats", () => {
    const store = createPerformanceStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.recordPoolStats("parser", makeStats());
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].pools.parser).toBeDefined();
  });

  it("notifies listener on clearStats", () => {
    const store = createPerformanceStore();
    store.recordPoolStats("parser", makeStats());
    const listener = vi.fn();
    store.subscribe(listener);
    store.clearStats();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual({ pools: {} });
  });

  it("unsubscribe stops notifications", () => {
    const store = createPerformanceStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.recordPoolStats("parser", makeStats());
    expect(listener).not.toHaveBeenCalled();
  });
});
