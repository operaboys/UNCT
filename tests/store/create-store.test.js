/**
 * Generic store primitive (core/store/create-store.js, ADR-015).
 * Pure getState/setState/subscribe pub-sub — no Preact, no DOM.
 */
import { describe, it, expect, vi } from "vitest";
import { createStore } from "../../core/store/create-store.js";

describe("createStore", () => {
  it("getState returns the initial state before any update", () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it("setState with a plain value replaces state and notifies subscribers", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });

    expect(store.getState()).toEqual({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  it("setState with an updater function receives the previous state", () => {
    const store = createStore({ count: 1 });
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(store.getState()).toEqual({ count: 2 });
  });

  it("does not notify subscribers when the updater returns the same reference", () => {
    const initial = { count: 0 };
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState((prev) => prev);

    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(initial);
  });

  it("unsubscribe stops further notifications to that listener", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports multiple independent subscribers", () => {
    const store = createStore({ count: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.setState({ count: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
