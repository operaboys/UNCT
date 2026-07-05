// @vitest-environment jsdom
/**
 * Node Tags State (core/store/node-tags-state.js, Subscription Center "Tag
 * Nodes", doc 03 §2.2) tests. Run under jsdom so `createLocalAdapter()`'s
 * DEFAULT engine is a REAL `localStorage` — mirroring
 * `tests/store/recent-exports-state.test.js`'s rigor. Each test gets its own
 * uniquely-prefixed `createLocalAdapter` so tests never see each other's
 * persisted keys.
 */
import { describe, it, expect, vi } from "vitest";
import { createNodeTagsStore } from "../../core/store/node-tags-state.js";
import { createLocalAdapter } from "../../core/storage/local-adapter.js";

let prefixCounter = 0;
/** A fresh, never-reused localStorage key prefix per test. */
function freshPrefix() {
  prefixCounter += 1;
  return `unct-test-${prefixCounter}:`;
}

describe("createNodeTagsStore — defaults", () => {
  it("starts with an empty tag map when nothing is persisted", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    expect(store.getState()).toEqual({ tagsByNodeId: {} });
  });

  it("ignores a corrupted/unrecognized persisted value and falls back to an empty map", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    adapter.set("nodeTags", "not-a-real-tag-map");

    const store = createNodeTagsStore({ adapter });

    expect(store.getState()).toEqual({ tagsByNodeId: {} });
  });
});

describe("createNodeTagsStore — addTag", () => {
  it("adds a tag to a node with no prior tags", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "home");

    expect(store.getState().tagsByNodeId["node-1"]).toEqual(["home"]);
  });

  it("appends a second tag onto the same node without a hard cap", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "home");
    store.addTag("node-1", "fast");

    expect(store.getState().tagsByNodeId["node-1"]).toEqual(["home", "fast"]);
  });

  it("trims whitespace before storing", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "  home  ");

    expect(store.getState().tagsByNodeId["node-1"]).toEqual(["home"]);
  });

  it("is a no-op for a blank/whitespace-only tag", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "   ");

    expect(store.getState().tagsByNodeId["node-1"]).toBeUndefined();
  });

  it("does not add the same tag twice on the same node", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "home");
    store.addTag("node-1", "home");

    expect(store.getState().tagsByNodeId["node-1"]).toEqual(["home"]);
  });

  it("keeps different nodes' tags independent", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.addTag("node-1", "home");
    store.addTag("node-2", "office");

    expect(store.getState().tagsByNodeId).toEqual({ "node-1": ["home"], "node-2": ["office"] });
  });

  it("persists through the adapter (browser-restart proof)", () => {
    const prefix = freshPrefix();
    const before = createNodeTagsStore({ adapter: createLocalAdapter({ prefix }) });
    before.addTag("node-1", "home");

    const after = createNodeTagsStore({ adapter: createLocalAdapter({ prefix }) });
    expect(after.getState().tagsByNodeId["node-1"]).toEqual(["home"]);
  });

  it("notifies subscribers when a tag is actually added", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });
    const listener = vi.fn();
    store.subscribe(listener);

    store.addTag("node-1", "home");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("createNodeTagsStore — removeTag", () => {
  it("removes one tag, keeping the rest", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");
    store.addTag("node-1", "fast");

    store.removeTag("node-1", "home");

    expect(store.getState().tagsByNodeId["node-1"]).toEqual(["fast"]);
  });

  it("drops the nodeId key entirely once its last tag is removed", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");

    store.removeTag("node-1", "home");

    expect(store.getState().tagsByNodeId).not.toHaveProperty("node-1");
  });

  it("is a no-op for a nodeId with no tags", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });

    store.removeTag("node-1", "home");

    expect(store.getState().tagsByNodeId).toEqual({});
  });

  it("persists the removal through the adapter", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");

    store.removeTag("node-1", "home");

    const after = createNodeTagsStore({ adapter: createLocalAdapter({ prefix }) });
    expect(after.getState().tagsByNodeId).toEqual({});
  });
});

describe("createNodeTagsStore — pruneOrphans", () => {
  it("drops tags for nodeIds no longer in the valid set (e.g. after Deduplicate)", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");
    store.addTag("node-2", "office");

    store.pruneOrphans(["node-1"]);

    expect(store.getState().tagsByNodeId).toEqual({ "node-1": ["home"] });
  });

  it("is a no-op when every tagged node is still valid", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");
    const listener = vi.fn();
    store.subscribe(listener);

    store.pruneOrphans(["node-1", "node-2"]);

    expect(store.getState().tagsByNodeId).toEqual({ "node-1": ["home"] });
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists the pruned map through the adapter", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    const store = createNodeTagsStore({ adapter });
    store.addTag("node-1", "home");
    store.addTag("node-2", "office");

    store.pruneOrphans(["node-1"]);

    const after = createNodeTagsStore({ adapter: createLocalAdapter({ prefix }) });
    expect(after.getState().tagsByNodeId).toEqual({ "node-1": ["home"] });
  });
});
