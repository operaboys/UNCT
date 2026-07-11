/**
 * Node Tags store (Subscription Center "Tag Nodes", doc 03 §2.2 / doc 07
 * §4.4). A nodeId -> string[] map kept COMPLETELY SEPARATE from `UNMNode`
 * itself — chosen over adding a `tags` field directly to `UNMNode` so this
 * feature never needs to touch the frozen UNM shape (05-UNIVERSAL_NODE_MODEL,
 * Architecture Freeze Scope) or its ADR process at all: `nodeId` is stable
 * and internally generated (Rule 4), so an external mapping keyed by it is
 * exactly as reliable as a field on the node would be, with zero Freeze risk.
 *
 * Mirrors `recent-exports-state.js`'s pattern exactly: a LocalStorage-backed,
 * fully-synchronous write-through store (Storage Responsibility Matrix,
 * IMPLEMENTATION_BLUEPRINT §3). No hard cap on tags per node (same
 * `metadata.warnings`-style "just an array" philosophy) — this is per-node
 * user annotation, not a bounded log.
 */
import { createStore } from "./create-store.js";
import { createLocalAdapter } from "../storage/local-adapter.js";

const STORAGE_KEY = "nodeTags";

/**
 * @typedef {{ tagsByNodeId: Readonly<Record<string, readonly string[]>> }} NodeTagsState
 */

/** @param {unknown} value */
function isValidTagMap(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (tags) => Array.isArray(tags) && tags.every((t) => typeof t === "string"),
    )
  );
}

/**
 * @param {{ adapter?: ReturnType<typeof createLocalAdapter> }} [options]
 */
export function createNodeTagsStore(options = {}) {
  const adapter = options.adapter ?? createLocalAdapter();
  const persisted = adapter.get(STORAGE_KEY);
  const initialTags = isValidTagMap(persisted) ? persisted : {};
  const store = createStore(/** @type {NodeTagsState} */ ({ tagsByNodeId: initialTags }));

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /**
     * Adds `tag` (trimmed) to `nodeId`'s tag list. A no-op if `tag` is
     * blank after trimming, or already present on that node (no duplicate
     * tags on the same node).
     * @param {string} nodeId
     * @param {string} tag
     */
    addTag(nodeId, tag) {
      const trimmed = tag.trim();
      if (!trimmed) return;
      store.setState((prev) => {
        const existing = prev.tagsByNodeId[nodeId] ?? [];
        if (existing.includes(trimmed)) return prev;
        return { tagsByNodeId: { ...prev.tagsByNodeId, [nodeId]: [...existing, trimmed] } };
      });
      adapter.set(STORAGE_KEY, store.getState().tagsByNodeId);
    },

    /**
     * Removes `tag` from `nodeId`'s tag list. Drops the `nodeId` key
     * entirely once its last tag is removed (never leaves an empty array
     * lingering).
     * @param {string} nodeId
     * @param {string} tag
     */
    removeTag(nodeId, tag) {
      store.setState((prev) => {
        const existing = prev.tagsByNodeId[nodeId];
        if (!existing || !existing.includes(tag)) return prev;
        const filtered = existing.filter((t) => t !== tag);
        const tagsByNodeId = { ...prev.tagsByNodeId };
        if (filtered.length === 0) delete tagsByNodeId[nodeId];
        else tagsByNodeId[nodeId] = filtered;
        return { tagsByNodeId };
      });
      adapter.set(STORAGE_KEY, store.getState().tagsByNodeId);
    },

    /**
     * Drops every entry whose `nodeId` is not in `validNodeIds` — cleanup
     * for when nodes are removed from the working set (e.g. Deduplicate),
     * so tags never accumulate for nodes that no longer exist.
     * @param {Iterable<string>} validNodeIds
     */
    pruneOrphans(validNodeIds) {
      const validSet = new Set(validNodeIds);
      store.setState((prev) => {
        /** @type {Record<string, readonly string[]>} */
        const tagsByNodeId = {};
        let changed = false;
        for (const [nodeId, tags] of Object.entries(prev.tagsByNodeId)) {
          if (validSet.has(nodeId)) tagsByNodeId[nodeId] = tags;
          else changed = true;
        }
        return changed ? { tagsByNodeId } : prev;
      });
      adapter.set(STORAGE_KEY, store.getState().tagsByNodeId);
    },
  };
}
