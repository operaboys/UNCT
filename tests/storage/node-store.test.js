/**
 * Storage Engine tests (09-DEVELOPMENT_ROADMAP Phase 8; ADR-013).
 *
 * `fake-indexeddb/auto` (15-TESTING_FRAMEWORK) polyfills `indexedDB` so
 * `createNodeStore` runs against a REAL (if in-memory) IndexedDB implementation
 * — no DOM/browser needed. Each test uses its own unique `dbName` so tests
 * never interfere with each other regardless of Vitest's file-isolation mode.
 *
 * Three things this suite must prove, matching the user's exact Phase 8 ask:
 *  1. Ordinary CRUD works and nodes round-trip frozen (Rule 8).
 *  2. The Roadmap's literal Exit Condition — "Projects persist after browser
 *     restart" — by closing one store and opening a brand NEW store instance
 *     against the SAME dbName, simulating a fresh page load.
 *  3. No hardcoded shape assumption: a node's `analysis` field carrying
 *     today's raw six-module Bundle (`core/analyzer/analyze-node.js`'s
 *     `AnalysisBundle`, NOT spec-05's complete `AnalysisObject`) is persisted
 *     and read back byte-for-byte, proving the Storage layer never validates
 *     or coerces against the full `AnalysisObject` type.
 */
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createNodeStore } from "../../core/storage/node-store.js";
import { createNode } from "../../core/unm/create-node.js";
import { analyzeNode } from "../../core/analyzer/analyze-node.js";
import { parseUrl, normalizeUrl } from "../../core/parser/url/index.js";
import { VLESS_REALITY } from "../url/fixtures.js";

let dbCounter = 0;
/** A fresh, never-reused DB name per test — avoids cross-test interference. */
function freshDbName() {
  dbCounter += 1;
  return `unct-test-${dbCounter}`;
}

/** @param {Partial<Parameters<typeof createNode>[0]>} [overrides] */
function makeNode(overrides = {}) {
  return createNode({
    sourceType: "vless-url", protocol: "vless", address: "a.example.com", port: 443, uuid: "uuid-1",
    ...overrides,
  });
}

describe("createNodeStore — basic CRUD", () => {
  it("saveNode + getNode round-trips a node exactly, frozen", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    const node = makeNode();
    await store.saveNode(node);

    const fetched = await store.getNode(node.nodeId);
    expect(fetched).toEqual(node);
    expect(Object.isFrozen(fetched)).toBe(true);
    await store.close();
  });

  it("getNode returns null for a nodeId that was never saved", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    expect(await store.getNode("00000000-0000-4000-8000-000000000000")).toBeNull();
    await store.close();
  });

  it("saveNodes (batch) + getAllNodes returns every node, frozen", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    const nodes = [
      makeNode({ address: "a.example.com" }),
      makeNode({ address: "b.example.com" }),
      makeNode({ address: "c.example.com" }),
    ];
    await store.saveNodes(nodes);

    const all = await store.getAllNodes();
    expect(all).toHaveLength(3);
    expect(new Set(all.map((n) => n.nodeId))).toEqual(new Set(nodes.map((n) => n.nodeId)));
    for (const n of all) expect(Object.isFrozen(n)).toBe(true);
    await store.close();
  });

  it("saveNode upserts (overwrite-by-nodeId), never duplicates", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    const node = makeNode();
    await store.saveNode(node);
    const updated = { ...node, remark: "updated" };
    await store.saveNode(updated);

    expect(await store.countNodes()).toBe(1);
    const fetched = await store.getNode(node.nodeId);
    expect(fetched?.remark).toBe("updated");
    await store.close();
  });

  it("deleteNode removes exactly the targeted node", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    const a = makeNode({ address: "a.example.com" });
    const b = makeNode({ address: "b.example.com" });
    await store.saveNodes([a, b]);

    await store.deleteNode(a.nodeId);

    expect(await store.getNode(a.nodeId)).toBeNull();
    expect(await store.getNode(b.nodeId)).not.toBeNull();
    expect(await store.countNodes()).toBe(1);
    await store.close();
  });

  it("deleteAllNodes clears the store; countNodes reflects it", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    await store.saveNodes([makeNode({ address: "a.example.com" }), makeNode({ address: "b.example.com" })]);
    expect(await store.countNodes()).toBe(2);

    await store.deleteAllNodes();

    expect(await store.countNodes()).toBe(0);
    expect(await store.getAllNodes()).toEqual([]);
    await store.close();
  });
});

describe("createNodeStore — survives a fresh instance on the same DB (browser-restart proof)", () => {
  it("a brand-new store opened against the same dbName sees data saved by a prior, now-closed instance", async () => {
    const dbName = freshDbName();
    const node = makeNode();

    const before = createNodeStore({ dbName });
    await before.saveNode(node);
    await before.close();

    // Simulates a fresh page load: a new createNodeStore() call, no shared
    // in-memory state with `before` other than the underlying IndexedDB.
    const after = createNodeStore({ dbName });
    const fetched = await after.getNode(node.nodeId);
    expect(fetched).toEqual(node);
    await after.close();
  });
});

describe("createNodeStore — no hardcoded shape (Rule 9)", () => {
  it("persists today's raw analyzer Bundle in `analysis` exactly as-is, not a fabricated AnalysisObject", async () => {
    const parsed = normalizeUrl(parseUrl(VLESS_REALITY));
    const bundle = analyzeNode(parsed);
    const nodeWithAnalysis = { ...parsed, analysis: bundle };

    const store = createNodeStore({ dbName: freshDbName() });
    await store.saveNode(nodeWithAnalysis);

    const fetched = await store.getNode(parsed.nodeId);
    expect(fetched?.analysis).toEqual(bundle);
    // The Bundle's actual keys — NOT spec-05 AnalysisObject's keys (riskScore,
    // compatibilityScore, ...) — proving nothing here assumed/coerced the type.
    expect(Object.keys(fetched?.analysis ?? {}).sort()).toEqual(
      ["compatibility", "completeness", "network", "protocol", "reality", "security", "tls"].sort(),
    );
    await store.close();
  });
});

describe("createNodeStore — contract violations", () => {
  it("saveNode rejects a value without a string nodeId", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    await expect(store.saveNode(/** @type {any} */ ({ protocol: "vless" })))
      .rejects.toThrow(/STORAGE_CONTRACT_VIOLATION/);
    await store.close();
  });

  it("saveNodes rejects the whole batch if any one entry lacks a nodeId", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    await expect(store.saveNodes([makeNode(), /** @type {any} */ ({})]))
      .rejects.toThrow(/STORAGE_CONTRACT_VIOLATION/);
    await store.close();
  });

  it("getNode rejects a non-string/empty nodeId", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    await expect(store.getNode(/** @type {any} */ (42))).rejects.toThrow(/STORAGE_CONTRACT_VIOLATION/);
    await expect(store.getNode("")).rejects.toThrow(/STORAGE_CONTRACT_VIOLATION/);
    await store.close();
  });

  it("deleteNode rejects a non-string/empty nodeId", async () => {
    const store = createNodeStore({ dbName: freshDbName() });
    await expect(store.deleteNode(/** @type {any} */ (null))).rejects.toThrow(/STORAGE_CONTRACT_VIOLATION/);
    await store.close();
  });
});
