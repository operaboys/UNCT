/**
 * Generic, framework-agnostic reactive store factory — the vanilla
 * getState/setState/subscribe primitive every domain store in `core/store/`
 * is built from. Zero Preact/UI import here or anywhere in `core/`
 * (Rule 11, ADR-015); the Preact bridge hook lives in `ui/store/`.
 */

/**
 * @template T
 * @param {T} initialState
 * @returns {{
 *   getState: () => T,
 *   setState: (updater: T | ((prev: T) => T)) => void,
 *   subscribe: (listener: (state: T) => void) => () => void,
 * }}
 */
export function createStore(initialState) {
  let state = initialState;
  /** @type {Set<(state: T) => void>} */
  const listeners = new Set();

  function getState() {
    return state;
  }

  /** @param {T | ((prev: T) => T)} updater */
  function setState(updater) {
    const next = typeof updater === "function"
      ? /** @type {(prev: T) => T} */ (updater)(state)
      : updater;
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  /** @param {(state: T) => void} listener */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}
