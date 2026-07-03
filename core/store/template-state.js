/**
 * Template State — the in-memory, cross-session library of saved Templates
 * (Template Builder, P12-8). Mirrors `core/store/parser-state.js`'s
 * write-through pattern exactly (same Sync-state-first / background-persist
 * / `hydrate()` / `whenIdle()` shape) — the only structural difference is
 * that a Template Library is edited item-by-item (`removeTemplate`), unlike
 * the Converter's working set, which is normally wholesale-replaced by a new
 * Parse.
 *
 * A Template is a `UNMNode`, unchanged — see `core/storage/template-store.js`'s
 * header comment for why no new shape or placeholder mechanism was invented.
 * "Saving as a Template" persists the exact frozen node object the user
 * already has (Rule 8: nothing here mutates it).
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {{ templates: readonly UNMNode[] }} TemplateState
 */

import { createStore } from "./create-store.js";
import { createTemplateStore as createTemplateStorageAdapter } from "../storage/template-store.js";

/** @returns {TemplateState} */
function emptyState() {
  return { templates: [] };
}

/** @param {unknown} error */
function defaultOnPersistError(error) {
  console.error("template-state: background persistence to template-store failed", error);
}

/**
 * @param {{
 *   templateStore?: ReturnType<typeof createTemplateStorageAdapter>,
 *   onPersistError?: (error: unknown) => void,
 * }} [options]
 * @returns {{
 *   getState: () => TemplateState,
 *   subscribe: (listener: (state: TemplateState) => void) => () => void,
 *   addTemplate: (node: UNMNode) => void,
 *   removeTemplate: (nodeId: string) => void,
 *   clearTemplates: () => void,
 *   hydrate: () => Promise<void>,
 *   whenIdle: () => Promise<void>,
 * }}
 */
export function createTemplateLibraryStore(options = {}) {
  const templateStore = options.templateStore ?? createTemplateStorageAdapter();
  const onPersistError = options.onPersistError ?? defaultOnPersistError;
  const store = createStore(emptyState());

  /** Serializes background writes so they land in IndexedDB in the same order they were applied in memory; never rejects. */
  let pending = Promise.resolve();
  /** @param {() => Promise<unknown>} operation */
  function persist(operation) {
    pending = pending.then(operation).then(
      () => undefined,
      (error) => onPersistError(error),
    );
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /** @param {UNMNode} node */
    addTemplate(node) {
      store.setState((prev) => ({
        templates: [...prev.templates.filter((t) => t.nodeId !== node.nodeId), node],
      }));
      persist(() => templateStore.saveNode(/** @type {any} */ (node)));
    },

    /** @param {string} nodeId */
    removeTemplate(nodeId) {
      store.setState((prev) => ({ templates: prev.templates.filter((t) => t.nodeId !== nodeId) }));
      persist(() => templateStore.deleteNode(nodeId));
    },

    clearTemplates() {
      store.setState(emptyState());
      persist(() => templateStore.deleteAllNodes());
    },

    /** Loads whatever `core/storage/template-store.js` already has into this Sync store. Reports (never throws) on read failure. */
    async hydrate() {
      try {
        const templates = await templateStore.getAllNodes();
        store.setState({ templates: /** @type {any} */ (templates) });
      } catch (error) {
        onPersistError(error);
      }
    },

    /** Test-only: resolves once every background write fired so far has settled. Production code never calls this. */
    whenIdle() {
      return pending;
    },
  };
}
