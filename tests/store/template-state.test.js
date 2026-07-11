/**
 * Template Library domain store (core/store/template-state.js, P12-8).
 * Mirrors tests/store/parser-state.test.js's structure exactly (same
 * write-through pattern, same test shape) — the only real difference under
 * test is `removeTemplate` (item-by-item deletion), which parser-state's
 * working-set model doesn't need.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { createTemplateLibraryStore } from "../../core/store/template-state.js";
import { createTemplateStore } from "../../core/storage/template-store.js";
import { createNode } from "../../core/unm/create-node.js";

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
  return `unct-test-template-state-${dbCounter}`;
}

/** A `vi.fn()`-stubbed template-store — lets tests assert exactly which calls fire, without real IndexedDB. */
function stubTemplateStore() {
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

describe("createTemplateLibraryStore", () => {
  it("starts with an empty template collection", () => {
    const store = createTemplateLibraryStore();
    expect(store.getState()).toEqual({ templates: [] });
  });

  it("addTemplate appends without losing existing templates", () => {
    const store = createTemplateLibraryStore();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    store.addTemplate(a);
    store.addTemplate(b);

    expect(store.getState().templates).toEqual([a, b]);
  });

  it("addTemplate upserts by nodeId — saving the same node twice does not duplicate it", () => {
    const store = createTemplateLibraryStore();
    const a = node();

    store.addTemplate(a);
    store.addTemplate(a);

    expect(store.getState().templates).toEqual([a]);
  });

  it("removeTemplate removes exactly the targeted template", () => {
    const store = createTemplateLibraryStore();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });
    store.addTemplate(a);
    store.addTemplate(b);

    store.removeTemplate(a.nodeId);

    expect(store.getState().templates).toEqual([b]);
  });

  it("clearTemplates empties the collection", () => {
    const store = createTemplateLibraryStore();
    store.addTemplate(node());
    store.clearTemplates();
    expect(store.getState()).toEqual({ templates: [] });
  });

  it("notifies subscribers on every mutation", () => {
    const store = createTemplateLibraryStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.addTemplate(node());

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ templates: store.getState().templates });
  });
});

describe("createTemplateLibraryStore — write-through to template-store", () => {
  it("addTemplate updates Sync state immediately; template-store is only written in the background", async () => {
    const templateStore = stubTemplateStore();
    const store = createTemplateLibraryStore({ templateStore });
    const a = node();

    store.addTemplate(a);

    expect(store.getState().templates).toEqual([a]);
    expect(templateStore.saveNode).not.toHaveBeenCalled();

    await store.whenIdle();

    expect(templateStore.saveNode).toHaveBeenCalledTimes(1);
    expect(templateStore.saveNode).toHaveBeenCalledWith(a);
  });

  it("removeTemplate deletes the matching entry from template-store", async () => {
    const templateStore = stubTemplateStore();
    const store = createTemplateLibraryStore({ templateStore });
    const a = node();
    store.addTemplate(a);
    await store.whenIdle();

    store.removeTemplate(a.nodeId);
    await store.whenIdle();

    expect(templateStore.deleteNode).toHaveBeenCalledWith(a.nodeId);
  });

  it("clearTemplates deletes template-store's whole collection", async () => {
    const templateStore = stubTemplateStore();
    const store = createTemplateLibraryStore({ templateStore });
    store.addTemplate(node());

    store.clearTemplates();
    await store.whenIdle();

    expect(templateStore.deleteAllNodes).toHaveBeenCalledTimes(1);
  });

  it("a rejected background write is reported via onPersistError, never thrown", async () => {
    const templateStore = stubTemplateStore();
    const failure = new Error("indexeddb exploded");
    templateStore.saveNode.mockRejectedValueOnce(failure);
    const onPersistError = vi.fn();
    const store = createTemplateLibraryStore({ templateStore, onPersistError });

    expect(() => store.addTemplate(node())).not.toThrow();
    await store.whenIdle();

    expect(onPersistError).toHaveBeenCalledWith(failure);
  });

  it("hydrate() loads template-store's collection into Sync state", async () => {
    const templateStore = stubTemplateStore();
    const a = node();
    templateStore.getAllNodes.mockResolvedValueOnce([a]);
    const store = createTemplateLibraryStore({ templateStore });

    await store.hydrate();

    expect(store.getState()).toEqual({ templates: [a] });
  });

  it("hydrate() reports (not throws) a read failure, leaving state empty", async () => {
    const templateStore = stubTemplateStore();
    const failure = new Error("indexeddb unavailable");
    templateStore.getAllNodes.mockRejectedValueOnce(failure);
    const onPersistError = vi.fn();
    const store = createTemplateLibraryStore({ templateStore, onPersistError });

    await expect(store.hydrate()).resolves.toBeUndefined();

    expect(onPersistError).toHaveBeenCalledWith(failure);
    expect(store.getState()).toEqual({ templates: [] });
  });
});

describe("createTemplateLibraryStore — persistence (real IndexedDB round-trip, browser-restart proof)", () => {
  it("a template added via one instance is visible after hydrate() on a brand-new instance against the same dbName", async () => {
    const dbName = freshDbName();
    const a = node();

    const before = createTemplateLibraryStore({ templateStore: createTemplateStore({ dbName }) });
    before.addTemplate(a);
    await before.whenIdle();

    const after = createTemplateLibraryStore({ templateStore: createTemplateStore({ dbName }) });
    await after.hydrate();

    expect(after.getState().templates).toEqual([a]);
  });

  it("removeTemplate survives a simulated reload — the removed template does not reappear", async () => {
    const dbName = freshDbName();
    const a = node({ address: "a.example.com" });
    const b = node({ address: "b.example.com" });

    const before = createTemplateLibraryStore({ templateStore: createTemplateStore({ dbName }) });
    before.addTemplate(a);
    before.addTemplate(b);
    await before.whenIdle();
    before.removeTemplate(a.nodeId);
    await before.whenIdle();

    const after = createTemplateLibraryStore({ templateStore: createTemplateStore({ dbName }) });
    await after.hydrate();

    expect(after.getState().templates).toEqual([b]);
  });
});
