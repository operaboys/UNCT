/**
 * Template Store tests (P12-8). `core/storage/template-store.js` is a thin,
 * differently-configured wrapper around the already-tested `createNodeStore`
 * (see `tests/storage/node-store.test.js` for that engine's own CRUD/
 * Immutability/browser-restart coverage) — these tests only pin the two
 * things unique to THIS wrapper: it defaults to its own IndexedDB database
 * (isolated from the main node collection) and it still round-trips a real
 * UNMNode (proving "a Template IS a UNMNode" holds all the way to storage,
 * not just in the type signature).
 */
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createTemplateStore } from "../../core/storage/template-store.js";
import { createNodeStore } from "../../core/storage/node-store.js";
import { createNode } from "../../core/unm/create-node.js";

let dbCounter = 0;
/** @param {string} [dbName] */
function freshDbName(dbName) {
  dbCounter += 1;
  return dbName ?? `unct-test-templates-${dbCounter}`;
}

/** @param {Partial<Parameters<typeof createNode>[0]>} [overrides] */
function makeNode(overrides = {}) {
  return createNode({
    sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
    remark: "My Home Server",
    ...overrides,
  });
}

describe("createTemplateStore — a Template is a UNMNode, round-tripped exactly", () => {
  it("saveNode + getNode round-trips a real UNMNode exactly, frozen", async () => {
    const store = createTemplateStore({ dbName: freshDbName() });
    const node = makeNode();
    await store.saveNode(node);

    const fetched = await store.getNode(node.nodeId);
    expect(fetched).toEqual(node);
    expect(Object.isFrozen(fetched)).toBe(true);
    await store.close();
  });

  it("`remark` survives round-trip as the template's human-readable name (no separate name field invented)", async () => {
    const store = createTemplateStore({ dbName: freshDbName() });
    const node = makeNode({ remark: "Reality VPS #3" });
    await store.saveNode(node);

    const fetched = await store.getNode(node.nodeId);
    expect(fetched?.remark).toBe("Reality VPS #3");
    await store.close();
  });

  it("saveNodes/getAllNodes/deleteNode/countNodes all work exactly as node-store.js's (same engine)", async () => {
    const store = createTemplateStore({ dbName: freshDbName() });
    const a = makeNode({ address: "a.example.com" });
    const b = makeNode({ address: "b.example.com" });
    await store.saveNodes([a, b]);

    expect(await store.countNodes()).toBe(2);
    await store.deleteNode(a.nodeId);
    expect(await store.countNodes()).toBe(1);
    expect(await store.getAllNodes()).toEqual([b]);
    await store.close();
  });
});

describe("createTemplateStore — isolated from the main node collection", () => {
  it("defaults to its own dbName ('unct-templates'), distinct from node-store's default ('unct-storage')", async () => {
    const templateStore = createTemplateStore();
    const nodeStore = createNodeStore();
    const node = makeNode();

    await templateStore.saveNode(node);

    // The SAME nodeId saved as a template must NOT appear in the default
    // node-store's collection — they are different IndexedDB databases.
    expect(await nodeStore.getNode(node.nodeId)).toBeNull();
    await templateStore.close();
    await nodeStore.close();
  });

  it("a template saved under a given dbName survives a fresh store instance against that same dbName", async () => {
    const dbName = freshDbName();
    const node = makeNode();

    const before = createTemplateStore({ dbName });
    await before.saveNode(node);
    await before.close();

    const after = createTemplateStore({ dbName });
    expect(await after.getNode(node.nodeId)).toEqual(node);
    await after.close();
  });
});
