// @vitest-environment jsdom
/**
 * `core/storage/wipe.js#wipeAllAppData` (ADR-030 Decision 4) tests. Runs
 * under jsdom for a real `localStorage`, with `fake-indexeddb/auto` polyfilling
 * `indexedDB` (same combination `tests/storage/local-adapter.test.js` and
 * `tests/storage/node-store.test.js` each use separately) so both halves of
 * the wipe can be exercised against real engines, not mocks.
 */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { wipeAllAppData } from "../../core/storage/wipe.js";
import { createLocalAdapter } from "../../core/storage/local-adapter.js";
import { createNodeStore } from "../../core/storage/node-store.js";
import { createTemplateStore } from "../../core/storage/template-store.js";
import { vlessNode } from "../setup/factories.js";

beforeEach(() => {
  localStorage.clear();
});

describe("wipeAllAppData", () => {
  it("clears the default-prefixed LocalStorage keys every domain store shares", async () => {
    const adapter = createLocalAdapter();
    adapter.set("themeChoice", "dark");
    adapter.set("strictValidation", true);
    localStorage.setItem("unrelated-host-page-key", "untouched");

    await wipeAllAppData();

    expect(adapter.get("themeChoice")).toBeUndefined();
    expect(adapter.get("strictValidation")).toBeUndefined();
    expect(localStorage.getItem("unrelated-host-page-key")).toBe("untouched");
  });

  it("deletes the default node-store IndexedDB database (unct-storage)", async () => {
    const store = createNodeStore();
    await store.saveNode(vlessNode());
    expect(await store.countNodes()).toBe(1);
    await store.close();

    await wipeAllAppData();

    const reopened = createNodeStore();
    expect(await reopened.countNodes()).toBe(0);
    await reopened.close();
  });

  it("deletes the default template-store IndexedDB database (unct-templates)", async () => {
    const store = createTemplateStore();
    await store.saveNode(vlessNode());
    expect(await store.countNodes()).toBe(1);
    await store.close();

    await wipeAllAppData();

    const reopened = createTemplateStore();
    expect(await reopened.countNodes()).toBe(0);
    await reopened.close();
  });
});
