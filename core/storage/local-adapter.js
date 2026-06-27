/**
 * Raw LocalStorage adapter — the swappable low-level engine behind Settings'
 * persistence (IMPLEMENTATION_BLUEPRINT §3 Storage Responsibility Matrix:
 * "LocalStorage → Theme, UI Preferences, Recent Settings"), mirroring the
 * same Two-Layer separation ADR-013 established for IndexedDB
 * (idb-adapter.js): a small, swappable raw-engine surface here; a public
 * domain API above (core/store/settings-state.js) that never touches
 * `localStorage`/JSON (de)serialization directly.
 *
 * Unlike IndexedDB, `localStorage` itself is fully synchronous — no
 * transaction/event plumbing is needed, so this surface stays sync too (no
 * Promise wrapping of an already-sync engine).
 *
 * Every key is namespaced under `prefix` (default `"unct:"`) so `clear()`
 * only removes this app's own keys, never another key a host page/origin
 * might already keep in the same flat `localStorage` namespace — the
 * IndexedDB adapter gets that isolation for free via its own dedicated
 * `dbName`; this file does the equivalent itself since `localStorage` has no
 * such per-app database concept.
 */

const DEFAULT_PREFIX = "unct:";

/**
 * @param {{ prefix?: string, engine?: Storage }} [options]
 */
export function createLocalAdapter(options = {}) {
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const engine = options.engine ?? globalThis.localStorage;

  /** @param {string} name */
  function namespacedKey(name) {
    return `${prefix}${name}`;
  }

  return {
    /**
     * @param {string} name
     * @returns {unknown} `undefined` when never set or the stored value is not valid JSON.
     */
    get(name) {
      const raw = engine.getItem(namespacedKey(name));
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    },

    /**
     * @param {string} name
     * @param {unknown} value
     */
    set(name, value) {
      engine.setItem(namespacedKey(name), JSON.stringify(value));
    },

    /** @param {string} name */
    remove(name) {
      engine.removeItem(namespacedKey(name));
    },

    /** Removes only THIS adapter's own (prefixed) keys — never a foreign key sharing the same origin. */
    clear() {
      /** @type {string[]} */
      const ownKeys = [];
      for (let i = 0; i < engine.length; i += 1) {
        const key = engine.key(i);
        if (key !== null && key.startsWith(prefix)) ownKeys.push(key);
      }
      for (const key of ownKeys) engine.removeItem(key);
    },
  };
}
