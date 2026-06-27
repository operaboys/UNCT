/**
 * The Preact bridge ADR-015 deferred: a small custom hook (11-STATE_
 * MANAGEMENT's "Custom Hook ساده در صورت نیاز واقعی" allowance, not a new
 * dependency like `preact/compat`'s `useSyncExternalStore`) that subscribes
 * a Component to ANY `core/store/` instance — `useState` mirrors the
 * store's current selected value, `useEffect` (re-)subscribes and pushes
 * fresh values in. `core/store/` itself stays zero-Preact (ADR-015); this
 * file is the only place that imports both `preact/hooks` and a store.
 *
 * Memoization (11-STATE_MANAGEMENT's "Selectorها باید Memoize شوند",
 * render-optimization spec 13) is this hook's caller's responsibility, not
 * this hook's: pass a STABLE selector reference. A module-level selector
 * (e.g. `selectAllNodes`) is already stable — pass it directly. A
 * parameterized selector (e.g. `selectNodeById(state, id)`) needs the
 * caller to wrap it, e.g. `useMemo(() => (s) => selectNodeById(s, id), [id])`
 * — otherwise a new closure every render would re-subscribe every render.
 */
import { useEffect, useState } from "preact/hooks";

export interface ReadableStore<State> {
  getState(): State;
  subscribe(listener: (state: State) => void): () => void;
}

export function useStoreSelector<State, Selected>(
  store: ReadableStore<State>,
  selector: (state: State) => Selected,
): Selected {
  const [selected, setSelected] = useState<Selected>(() => selector(store.getState()));

  useEffect(() => {
    setSelected(selector(store.getState()));
    return store.subscribe((state) => setSelected(selector(state)));
  }, [store, selector]);

  return selected;
}
