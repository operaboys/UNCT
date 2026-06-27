// @vitest-environment jsdom
/**
 * useStoreSelector tests (ADR-015's Preact bridge, `ui/store/use-store-
 * selector.ts`) — the same Subscribe/Re-render-on-state-change coverage
 * `core/store/create-store.test.js` already gives the underlying primitive,
 * now exercised through a real Preact render cycle against a real
 * `createStore()` instance (no mocking of either side).
 *
 * `preact/test-utils#act` flushes Preact's debounced render queue and
 * effect queue synchronously, which is what lets a plain `useEffect`-based
 * subscribe (rather than `useSyncExternalStore`) be asserted on without a
 * real browser frame.
 */
import { describe, it, expect } from "vitest";
import { h, render } from "preact";
import { act } from "preact/test-utils";
import { createStore } from "../../../core/store/create-store.js";
import { useStoreSelector } from "../../../ui/store/use-store-selector.js";

/** @param {{ store: any, selector: (s: any) => any, onRender: (v: any) => void }} props */
function Probe({ store, selector, onRender }) {
  const value = useStoreSelector(store, selector);
  onRender(value);
  return null;
}

describe("useStoreSelector — subscribe/re-render on selector-relevant store changes", () => {
  it("renders the store's current selected value on mount", async () => {
    const store = createStore({ count: 1 });
    /** @type {any[]} */
    const renders = [];
    const container = document.createElement("div");

    await act(() => {
      render(h(Probe, { store, selector: (s) => s.count, onRender: (v) => renders.push(v) }), container);
    });

    expect(renders.at(-1)).toBe(1);
  });

  it("re-renders with the new selected value after the store updates", async () => {
    const store = createStore({ count: 1 });
    /** @type {any[]} */
    const renders = [];
    const container = document.createElement("div");

    await act(() => {
      render(h(Probe, { store, selector: (s) => s.count, onRender: (v) => renders.push(v) }), container);
    });

    await act(() => {
      store.setState({ count: 2 });
    });

    expect(renders.at(-1)).toBe(2);
  });

  it("does not re-render when the store updates but the selected slice is unchanged", async () => {
    const store = createStore({ count: 1, other: "a" });
    /** @type {any[]} */
    const renders = [];
    const container = document.createElement("div");

    await act(() => {
      render(h(Probe, { store, selector: (s) => s.count, onRender: (v) => renders.push(v) }), container);
    });
    const renderCountBefore = renders.length;

    await act(() => {
      store.setState((prev) => ({ ...prev, other: "b" }));
    });

    expect(renders.length).toBe(renderCountBefore);
  });

  it("unsubscribes on unmount — a later store update triggers no further render", async () => {
    const store = createStore({ count: 1 });
    /** @type {any[]} */
    const renders = [];
    const container = document.createElement("div");

    await act(() => {
      render(h(Probe, { store, selector: (s) => s.count, onRender: (v) => renders.push(v) }), container);
    });

    await act(() => {
      render(null, container);
    });
    const renderCountAfterUnmount = renders.length;

    store.setState({ count: 99 });

    expect(renders.length).toBe(renderCountAfterUnmount);
  });

  it("re-syncs immediately when the selector reference changes (effect deps include selector)", async () => {
    const store = createStore({ a: 1, b: 100 });
    /** @type {any[]} */
    const renders = [];
    const container = document.createElement("div");
    const selectA = (/** @type {{ a: number, b: number }} */ s) => s.a;
    const selectB = (/** @type {{ a: number, b: number }} */ s) => s.b;

    await act(() => {
      render(h(Probe, { store, selector: selectA, onRender: (v) => renders.push(v) }), container);
    });
    expect(renders.at(-1)).toBe(1);

    await act(() => {
      render(h(Probe, { store, selector: selectB, onRender: (v) => renders.push(v) }), container);
    });
    expect(renders.at(-1)).toBe(100);
  });
});
