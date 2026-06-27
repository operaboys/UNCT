/**
 * Parser/Validation State domain store (core/store/parser-state.js, ADR-015).
 * Built on real `createNode` (not mocked) — exercises actual UNM instances,
 * including their Immutability (Rule 8): updateNode replaces a node by id
 * with a NEW instance, never mutates the one already in the collection.
 */
import { describe, it, expect, vi } from "vitest";
import { createParserStore } from "../../core/store/parser-state.js";
import { createNode, withValidation } from "../../core/unm/create-node.js";

/** @param {Record<string, unknown>} [overrides] */
function node(overrides = {}) {
  return createNode(/** @type {any} */ ({
    sourceType: "vless-url", protocol: "vless", address: "example.com", port: 443,
    ...overrides,
  }));
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
