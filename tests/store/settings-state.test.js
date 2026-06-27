// @vitest-environment jsdom
/**
 * Settings State (core/store/settings-state.js, Theme Engine — 07-UI_UX_SYSTEM
 * §2) tests. Run under jsdom so `createLocalAdapter()`'s DEFAULT engine is a
 * REAL `localStorage` (jsdom implements it fully) — the same "exercise the
 * real default integration, not a mock" rigor `tests/storage/node-store.test.js`
 * already applies to `createIdbAdapter()` via `fake-indexeddb/auto`. Each test
 * gets its own uniquely-prefixed `createLocalAdapter` (mirroring that suite's
 * `freshDbName()`) so tests never see each other's persisted keys.
 *
 * jsdom has no `matchMedia` implementation at all (confirmed: `typeof
 * window.matchMedia === "undefined"`, unlike `localStorage`) — there is no
 * devDependency that polyfills it the way `fake-indexeddb` polyfills
 * `indexedDB`, so it is always injected here via `options.matchMedia`, never
 * left to the (nonexistent) global default.
 */
import { describe, it, expect, vi } from "vitest";
import { createSettingsStore } from "../../core/store/settings-state.js";
import { createLocalAdapter } from "../../core/storage/local-adapter.js";

let prefixCounter = 0;
/** A fresh, never-reused localStorage key prefix per test. */
function freshPrefix() {
  prefixCounter += 1;
  return `unct-test-${prefixCounter}:`;
}

/**
 * A real, controllable fake `matchMedia` — no real implementation exists in
 * jsdom to polyfill, so this stands in for the OS-level Web Platform API.
 * @param {boolean} initialMatches
 */
function fakeMatchMedia(initialMatches) {
  /** @type {(() => void) | undefined} */
  let handler;
  const mql = {
    matches: initialMatches,
    addEventListener(/** @type {string} */ event, /** @type {() => void} */ cb) {
      handler = cb;
    },
    removeEventListener(/** @type {string} */ event, /** @type {() => void} */ cb) {
      if (handler === cb) handler = undefined;
    },
  };
  return {
    matchMedia: () => mql,
    /** Simulates the OS theme changing, firing the registered `change` listener (if any). */
    fireSystemChange(/** @type {boolean} */ nextMatches) {
      mql.matches = nextMatches;
      handler?.();
    },
    hasListener: () => handler !== undefined,
  };
}

describe("createSettingsStore — defaults", () => {
  it("defaults to \"auto\" choice with no persisted value, resolved from the injected system preference", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia } = fakeMatchMedia(true);
    const store = createSettingsStore({ adapter, matchMedia });

    expect(store.getState()).toEqual({ themeChoice: "auto", resolvedTheme: "dark" });
    store.close();
  });

  it("resolves \"auto\" to \"light\" when the system preference does not match dark", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });

    expect(store.getState()).toEqual({ themeChoice: "auto", resolvedTheme: "light" });
    store.close();
  });

  it("uses the REAL default createLocalAdapter() (real jsdom localStorage), not just an injected one", () => {
    const { matchMedia } = fakeMatchMedia(false);
    const store = createSettingsStore({ matchMedia });
    try {
      expect(store.getState().themeChoice).toBe("auto");
    } finally {
      store.close();
      // Clean up the real, shared default-prefixed key so other tests/files are unaffected.
      createLocalAdapter().remove("theme");
    }
  });
});

describe("createSettingsStore — persistence (real localStorage round-trip)", () => {
  it("reads back a previously persisted choice on a fresh store instance (browser-restart proof)", () => {
    const prefix = freshPrefix();
    const { matchMedia } = fakeMatchMedia(true);

    const before = createSettingsStore({ adapter: createLocalAdapter({ prefix }), matchMedia });
    before.setThemeChoice("light");
    before.close();

    const after = createSettingsStore({ adapter: createLocalAdapter({ prefix }), matchMedia });
    expect(after.getState()).toEqual({ themeChoice: "light", resolvedTheme: "light" });
    after.close();
  });

  it("ignores a corrupted/unrecognized persisted value and falls back to the \"auto\" default", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    adapter.set("theme", "not-a-real-choice");
    const { matchMedia } = fakeMatchMedia(true);

    const store = createSettingsStore({ adapter, matchMedia });
    expect(store.getState().themeChoice).toBe("auto");
    store.close();
  });
});

describe("createSettingsStore — setThemeChoice", () => {
  it("setThemeChoice(\"dark\") updates state and persists through the adapter", () => {
    const prefix = freshPrefix();
    const adapter = createLocalAdapter({ prefix });
    const { matchMedia } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });

    store.setThemeChoice("dark");

    expect(store.getState()).toEqual({ themeChoice: "dark", resolvedTheme: "dark" });
    expect(adapter.get("theme")).toBe("dark");
    store.close();
  });

  it("an explicit \"dark\"/\"light\" choice ignores the system preference entirely", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia } = fakeMatchMedia(true); // system says dark
    const store = createSettingsStore({ adapter, matchMedia });

    store.setThemeChoice("light");

    expect(store.getState().resolvedTheme).toBe("light");
    store.close();
  });

  it("notifies subscribers on every change", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setThemeChoice("dark");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ themeChoice: "dark", resolvedTheme: "dark" });
    store.close();
  });
});

describe("createSettingsStore — \"Auto Mode\"/\"System Sync\" live tracking", () => {
  it("while choice is \"auto\", a live OS preference change updates resolvedTheme", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia, fireSystemChange } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });
    expect(store.getState().resolvedTheme).toBe("light");

    fireSystemChange(true);

    expect(store.getState()).toEqual({ themeChoice: "auto", resolvedTheme: "dark" });
    store.close();
  });

  it("an OS preference change is ignored while an explicit (non-auto) choice is active", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia, fireSystemChange } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });
    store.setThemeChoice("dark");

    fireSystemChange(true); // system "changes" to dark too, but choice is the explicit "dark", not "auto"
    fireSystemChange(false);

    expect(store.getState()).toEqual({ themeChoice: "dark", resolvedTheme: "dark" });
    store.close();
  });

  it("close() unsubscribes from the OS media query", () => {
    const adapter = createLocalAdapter({ prefix: freshPrefix() });
    const { matchMedia, hasListener } = fakeMatchMedia(false);
    const store = createSettingsStore({ adapter, matchMedia });
    expect(hasListener()).toBe(true);

    store.close();

    expect(hasListener()).toBe(false);
  });
});
