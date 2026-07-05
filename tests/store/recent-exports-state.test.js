// @vitest-environment jsdom
/**
 * Recent Exports State (core/store/recent-exports-state.js, Dashboard
 * "Recent Exports" panel) tests. Run under jsdom so `createLocalAdapter()`'s
 * DEFAULT engine is a REAL `localStorage` (jsdom implements it fully) —
 * mirroring `tests/store/settings-state.test.js`'s rigor. Each test gets its
 * own uniquely-prefixed `createLocalAdapter` so tests never see each other's
 * persisted keys.
 */
import { describe, it, expect, vi } from "vitest";
import { createRecentExportsStore } from "../../core/store/recent-exports-state.js";
import { createLocalAdapter } from "../../core/storage/local-adapter.js";

let prefixCounter = 0;
/** A fresh, never-reused localStorage key prefix per test. */
function freshPrefix() {
  prefixCounter += 1;
  return `unct-test-${prefixCounter}:`;
}

describe("createRecentExportsStore — defaults", () => {
  it("starts with an empty entries list when nothing is persisted", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createRecentExportsStore({ adapter });

    expect(store.getState()).toEqual({ entries: [] });
  });

  it("ignores a corrupted/unrecognized persisted value and falls back to an empty list", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    adapter.set("recentExports", "not-a-real-entry-list");

    const store = createRecentExportsStore({ adapter });

    expect(store.getState()).toEqual({ entries: [] });
  });

  it("uses the REAL default createLocalAdapter() (real jsdom localStorage), not just an injected one", () => {
    createLocalAdapter().remove("recentExports");
    try {
      const store = createRecentExportsStore();
      expect(store.getState()).toEqual({ entries: [] });
    } finally {
      createLocalAdapter().remove("recentExports");
    }
  });
});

describe("createRecentExportsStore — addExport", () => {
  it("adds a new entry with format, nodeCount, and a real ISO timestamp", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createRecentExportsStore({ adapter });

    store.addExport("txt", 5);

    const { entries } = store.getState();
    expect(entries).toHaveLength(1);
    expect(entries[0].format).toBe("txt");
    expect(entries[0].nodeCount).toBe(5);
    expect(() => new Date(entries[0].timestamp).toISOString()).not.toThrow();
    expect(new Date(entries[0].timestamp).toISOString()).toBe(entries[0].timestamp);
  });

  it("persists through the adapter (browser-restart proof)", () => {
    const prefix = freshPrefix();
    const before = createRecentExportsStore({ adapter: createLocalAdapter({ prefix }) });
    before.addExport("zip", 3);

    const after = createRecentExportsStore({ adapter: createLocalAdapter({ prefix }) });
    expect(after.getState().entries).toHaveLength(1);
    expect(after.getState().entries[0]).toMatchObject({ format: "zip", nodeCount: 3 });
  });

  it("prepends new entries — most recent first", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createRecentExportsStore({ adapter });

    store.addExport("txt", 1);
    store.addExport("qr", 1);

    const { entries } = store.getState();
    expect(entries.map((e) => e.format)).toEqual(["qr", "txt"]);
  });

  it("notifies subscribers on every addExport call", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createRecentExportsStore({ adapter });
    const listener = vi.fn();
    store.subscribe(listener);

    store.addExport("html", 10);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      entries: [expect.objectContaining({ format: "html", nodeCount: 10 })],
    });
  });

  it("caps stored entries at 10, dropping the oldest once the cap is exceeded", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createRecentExportsStore({ adapter });

    for (let i = 0; i < 12; i += 1) {
      store.addExport("txt", i);
    }

    const { entries } = store.getState();
    expect(entries).toHaveLength(10);
    // Newest-first: the last-added (nodeCount 11) is at index 0, the oldest
    // surviving entry (nodeCount 2) is at index 9 — nodeCount 0 and 1 (the
    // two oldest) were dropped.
    expect(entries[0].nodeCount).toBe(11);
    expect(entries[9].nodeCount).toBe(2);
    expect(entries.some((e) => e.nodeCount === 0)).toBe(false);
    expect(entries.some((e) => e.nodeCount === 1)).toBe(false);
  });

  it("persists the capped (not unbounded) list through the adapter", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    const store = createRecentExportsStore({ adapter });

    for (let i = 0; i < 12; i += 1) {
      store.addExport("txt", i);
    }

    expect(adapter.get("recentExports")).toHaveLength(10);
  });
});
