/**
 * Recent Exports store (Dashboard "Recent Exports" panel).
 *
 * Mirrors `settings-state.js`'s pattern exactly: a LocalStorage-backed,
 * fully-synchronous write-through store (Storage Responsibility Matrix,
 * IMPLEMENTATION_BLUEPRINT §3 — "LocalStorage → Theme, UI Preferences,
 * Recent Settings"). This is a short log (capped at `MAX_ENTRIES`), not an
 * archive — it holds only Export *metadata* (format, node count, timestamp),
 * never the exported content itself, and stays fully independent from
 * parserStore/analyzerStore.
 */
import { createStore } from "./create-store.js";
import { createLocalAdapter } from "../storage/local-adapter.js";

const STORAGE_KEY = "recentExports";
const MAX_ENTRIES = 10;

/**
 * @typedef {{ format: string, nodeCount: number, timestamp: string }} RecentExportEntry
 * @typedef {{ entries: readonly RecentExportEntry[] }} RecentExportsState
 */

/** @param {unknown} value */
function isValidEntryList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof e.format === "string" &&
        typeof e.nodeCount === "number" &&
        typeof e.timestamp === "string",
    )
  );
}

/**
 * @param {{ adapter?: ReturnType<typeof createLocalAdapter> }} [options]
 */
export function createRecentExportsStore(options = {}) {
  const adapter = options.adapter ?? createLocalAdapter();
  const persisted = adapter.get(STORAGE_KEY);
  const initialEntries = isValidEntryList(persisted) ? persisted : [];
  const store = createStore(/** @type {RecentExportsState} */ ({ entries: initialEntries }));

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /**
     * @param {string} format
     * @param {number} nodeCount
     */
    addExport(format, nodeCount) {
      const entry = { format, nodeCount, timestamp: new Date().toISOString() };
      store.setState((prev) => ({ entries: [entry, ...prev.entries].slice(0, MAX_ENTRIES) }));
      adapter.set(STORAGE_KEY, store.getState().entries);
    },
  };
}
