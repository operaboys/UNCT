/**
 * Parser/Validation State domain store (core/store/parser-state.js, ADR-015).
 * Built on real `createNode` (not mocked) — exercises actual UNM instances,
 * including their Immutability (Rule 8): updateNode replaces a node by id
 * with a NEW instance, never mutates the one already in the collection.
 *
 * `fake-indexeddb/auto` (mirroring tests/storage/node-store.test.js) backs
 * the two write-through/persistence describe blocks below (Critical Fix #3):
 * one with a `vi.fn()`-stubbed node-store to assert exactly which calls fire
 * and when relative to `whenIdle()`; one against a REAL `createNodeStore()`
 * to prove the actual browser-restart scenario end to end, through the real
 * `createParserStore()` path — never by calling node-store.js directly.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { createParserStore } from "../../core/store/parser-state.js";
import { createNodeStore } from "../../core/storage/node-store.js";
import { createNode, withValidation } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    ...overrides,
  }));
}

let dbCounter = 0;
/** A fresh, never-reused DB name per test — avoids cross-test interference. */
function freshDbName() {
  dbCounter += 1;
  return `unct-test-parser-state-${dbCounter}`;
}

/** A `vi.fn()`-stubbed node-store — lets tests assert exactly which calls fire, without real IndexedDB. */
function stubNodeStore() {
  return {
    saveNode: vi.fn(/** @param {any} n */ async (n) => n),
    saveNodes: vi.fn(/** @param {any} ns */ async (ns) => ns),
    getNode: vi.fn(async () => /** @type {any} */ (null)),
    getAllNodes: vi.fn(async () => /** @type {any[]} */ ([])),
    deleteNode: vi.fn(async () => undefined),
    deleteAllNodes: vi.fn(async () => undefined),
    countNodes: vi.fn(async () => 0),
    close: vi.fn(async () => undefined),
  };
}

describe("createParserStore", () => {
  it("starts with an empty node collection", () => {
    const store = createParserStore();
    expect(store.getState()).toEqual({ nodes: [] });
  });

  it("setNodes replaces the whole collection", () => {
    const store = createParserStore();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    store.setNodes([a, b]);

    expect(store.getState().nodes).toEqual([a, b]);
  });

  it("addNode appends without losing existing nodes", () => {
    const store = createParserStore();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    store.addNode(a);
    store.addNode(b);

    expect(store.getState().nodes).toEqual([a, b]);
  });

  it("updateNode replaces only the matching node, by reference", () => {
    const store = createParserStore();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });
    store.setNodes([a, b]);

    // Same nodeId as `b`, but a NEW frozen instance (Rule 8) — the realistic
    // case of re-validating/re-analyzing a node already in the collection.
    const bUpdated = withValidation(b, { ...b.validation, addressValid: false });
    store.updateNode(b.nodeId, bUpdated);

    expect(store.getState().nodes).toEqual([a, bUpdated]);
    expect(store.getState().nodes[0]).toBe(a);
    expect(store.getState().nodes[1]).toBe(bUpdated);
    expect(store.getState().nodes[1]).not.toBe(b);
  });

  it("clearNodes empties the collection", () => {
    const store = createParserStore();
    store.addNode(node());
    store.clearNodes();
    expect(store.getState()).toEqual({ nodes: [] });
  });

  it("notifies subscribers on every mutation", () => {
    const store = createParserStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.addNode(node());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ nodes: store.getState().nodes });
  });
});

describe("createParserStore — write-through to node-store (Critical Fix #3)", () => {
  it("addNode updates Sync state immediately; node-store is only written in the background", async () => {
    const nodeStore = stubNodeStore();
    const store = createParserStore({ nodeStore });
    const a = node();

    store.addNode(a);

    // Sync read reflects the mutation right away...
    expect(store.getState().nodes).toEqual([a]);
    // ...but the background write hasn't run yet (it's scheduled as a
    // microtask via `pending.then(...)`, never inline with the call above).
    expect(nodeStore.saveNode).not.toHaveBeenCalled();

    await store.whenIdle();

    expect(nodeStore.saveNode).toHaveBeenCalledTimes(1);
    expect(nodeStore.saveNode).toHaveBeenCalledWith(a);
  });

  it("setNodes deletes node-store's old collection, then saves the new one", async () => {
    const nodeStore = stubNodeStore();
    const store = createParserStore({ nodeStore });
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    store.setNodes([a, b]);
    await store.whenIdle();

    expect(nodeStore.deleteAllNodes).toHaveBeenCalledTimes(1);
    expect(nodeStore.saveNodes).toHaveBeenCalledWith([a, b]);
  });

  it("updateNode saves the replacement node to node-store", async () => {
    const nodeStore = stubNodeStore();
    const store = createParserStore({ nodeStore });
    const a = node();
    store.addNode(a);
    await store.whenIdle();

    const updated = withValidation(a, { ...a.validation, addressValid: false });
    store.updateNode(a.nodeId, updated);
    await store.whenIdle();

    expect(nodeStore.saveNode).toHaveBeenLastCalledWith(updated);
  });

  it("clearNodes deletes node-store's whole collection", async () => {
    const nodeStore = stubNodeStore();
    const store = createParserStore({ nodeStore });
    store.addNode(node());

    store.clearNodes();
    await store.whenIdle();

    expect(nodeStore.deleteAllNodes).toHaveBeenCalledTimes(1);
  });

  it("a rejected background write is reported via onPersistError, never thrown", async () => {
    const nodeStore = stubNodeStore();
    const failure = new Error("indexeddb exploded");
    nodeStore.saveNode.mockRejectedValueOnce(failure);
    const onPersistError = vi.fn();
    const store = createParserStore({ nodeStore, onPersistError });

    expect(() => store.addNode(node())).not.toThrow();
    await store.whenIdle();

    expect(onPersistError).toHaveBeenCalledWith(failure);
  });

  it("hydrate() loads node-store's collection into Sync state", async () => {
    const nodeStore = stubNodeStore();
    const a = node();
    nodeStore.getAllNodes.mockResolvedValueOnce([a]);
    const store = createParserStore({ nodeStore });

    await store.hydrate();

    expect(store.getState()).toEqual({ nodes: [a] });
  });

  it("hydrate() reports (not throws) a read failure, leaving state empty", async () => {
    const nodeStore = stubNodeStore();
    const failure = new Error("indexeddb unavailable");
    nodeStore.getAllNodes.mockRejectedValueOnce(failure);
    const onPersistError = vi.fn();
    const store = createParserStore({ nodeStore, onPersistError });

    await expect(store.hydrate()).resolves.toBeUndefined();

    expect(onPersistError).toHaveBeenCalledWith(failure);
    expect(store.getState()).toEqual({ nodes: [] });
  });
});

describe("createParserStore — persistence (real IndexedDB round-trip, browser-restart proof)", () => {
  it("a node added via one instance is visible after hydrate() on a brand-new instance against the same dbName", async () => {
    const dbName = freshDbName();
    const a = node();

    const before = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    before.addNode(a);
    await before.whenIdle();

    // Simulates a fresh page load: a brand-new createParserStore(), backed by
    // a brand-new createNodeStore(), pointed at the same underlying dbName —
    // no shared in-memory state with `before` other than IndexedDB itself.
    const after = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    await after.hydrate();

    expect(after.getState().nodes).toEqual([a]);
  });

  it("setNodes's wholesale-replace semantic (Converter Screen's actual flow) survives a simulated reload", async () => {
    const dbName = freshDbName();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    const before = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    before.setNodes([a]);
    await before.whenIdle();
    before.setNodes([b]);
    await before.whenIdle();

    const after = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    await after.hydrate();

    // `a` does NOT reappear — setNodes replaces the persisted collection too.
    expect(after.getState().nodes).toEqual([b]);
  });

  it("clearNodes is reflected after a simulated reload — nothing reappears", async () => {
    const dbName = freshDbName();

    const before = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    before.addNode(node());
    await before.whenIdle();
    before.clearNodes();
    await before.whenIdle();

    const after = createParserStore({ nodeStore: createNodeStore({ dbName }) });
    await after.hydrate();

    expect(after.getState().nodes).toEqual([]);
  });
});
