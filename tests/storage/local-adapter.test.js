// @vitest-environment jsdom
/**
 * Raw LocalStorage adapter (core/storage/local-adapter.js, ADR-013's
 * Two-Layer pattern mirrored for `localStorage`) tests. Run under jsdom for a
 * REAL `localStorage` (jsdom implements it fully, unlike `matchMedia`) — the
 * same "exercise the real engine, not a mock" rigor
 * `tests/storage/node-store.test.js` applies to `createIdbAdapter()`.
 *
 * `core/store/settings-state.js`'s own tests only exercise this adapter's
 * `get`/`set` half (the only two methods Settings' domain layer calls); this
 * suite covers the full surface directly, including `remove`/`clear` and the
 * prefix-isolation `clear()` relies on, which nothing else in the codebase
 * exercises (Rule 6: no code without a test case).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createLocalAdapter } from "../../core/storage/local-adapter.js";

beforeEach(() => {
  localStorage.clear();
});

describe("createLocalAdapter — get/set", () => {
  it("get returns undefined for a key that was never set", () => {
    const adapter = createLocalAdapter({ prefix: "p1:" });
    expect(adapter.get("missing")).toBeUndefined();
  });

  it("set + get round-trips a value exactly (string, number, boolean, plain object)", () => {
    const adapter = createLocalAdapter({ prefix: "p1:" });
    adapter.set("a", "dark");
    adapter.set("b", 42);
    adapter.set("c", true);
    adapter.set("d", { nested: ["x", "y"] });

    expect(adapter.get("a")).toBe("dark");
    expect(adapter.get("b")).toBe(42);
    expect(adapter.get("c")).toBe(true);
    expect(adapter.get("d")).toEqual({ nested: ["x", "y"] });
  });

  it("set overwrites a previous value for the same key", () => {
    const adapter = createLocalAdapter({ prefix: "p1:" });
    adapter.set("theme", "dark");
    adapter.set("theme", "light");
    expect(adapter.get("theme")).toBe("light");
  });

  it("namespaces keys under the given prefix in the real underlying engine", () => {
    const adapter = createLocalAdapter({ prefix: "myprefix:" });
    adapter.set("theme", "dark");
    expect(localStorage.getItem("myprefix:theme")).toBe(JSON.stringify("dark"));
  });

  it("get returns undefined for a raw value that is not valid JSON", () => {
    localStorage.setItem("p1:broken", "{not json");
    const adapter = createLocalAdapter({ prefix: "p1:" });
    expect(adapter.get("broken")).toBeUndefined();
  });
});

describe("createLocalAdapter — remove", () => {
  it("removes exactly the targeted key, leaving others untouched", () => {
    const adapter = createLocalAdapter({ prefix: "p1:" });
    adapter.set("a", 1);
    adapter.set("b", 2);

    adapter.remove("a");

    expect(adapter.get("a")).toBeUndefined();
    expect(adapter.get("b")).toBe(2);
  });
});

describe("createLocalAdapter — clear (prefix isolation)", () => {
  it("clear removes only this adapter's own (prefixed) keys", () => {
    const adapter = createLocalAdapter({ prefix: "myapp:" });
    adapter.set("a", 1);
    adapter.set("b", 2);
    localStorage.setItem("unrelated-key", "untouched");
    localStorage.setItem("otherapp:theme", "dark");

    adapter.clear();

    expect(adapter.get("a")).toBeUndefined();
    expect(adapter.get("b")).toBeUndefined();
    expect(localStorage.getItem("unrelated-key")).toBe("untouched");
    expect(localStorage.getItem("otherapp:theme")).toBe("dark");
  });

  it("clear on an adapter with no keys yet is a no-op (does not throw)", () => {
    const adapter = createLocalAdapter({ prefix: "empty:" });
    expect(() => adapter.clear()).not.toThrow();
  });
});

describe("createLocalAdapter — default prefix + default engine", () => {
  it("uses the documented default prefix (\"unct:\") when none is given", () => {
    const adapter = createLocalAdapter();
    adapter.set("theme", "dark");
    expect(localStorage.getItem("unct:theme")).toBe(JSON.stringify("dark"));
    adapter.remove("theme");
  });

  it("defaults to the real global localStorage engine", () => {
    const adapter = createLocalAdapter({ prefix: "default-engine-test:" });
    adapter.set("k", "v");
    expect(localStorage.getItem("default-engine-test:k")).toBe(JSON.stringify("v"));
    adapter.clear();
  });
});
