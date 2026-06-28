/**
 * Parser/Validation State — the in-memory working set of `UNMNode`s produced
 * by the current Parse operation (Import screen, Phase 9). Each node already
 * carries its own `validation` (always present) inline, per UNM
 * (05-UNIVERSAL_NODE_MODEL) — this store does not duplicate it; it only
 * holds the node collection itself. The Analyzer's per-node verdicts live in
 * the sibling `core/store/analyzer-state.js` instead of inline on
 * `node.analysis`: that field is frozen to the spec-05 §4 `AnalysisObject`
 * shape, and today's Analyzer Engine can only fill one of its fields
 * (`securityScore`) — see `core/analyzer/analyze-node.js`.
 *
 * Write-through to `core/storage/` (Critical Fix #3, closing 09-ROADMAP
 * Phase 8's Exit Condition "projects persist after browser restart"): wired
 * directly here, in Core, rather than a new `ui/store/` coordinator —
 * mirroring the sibling `core/store/settings-state.js`, which already
 * read/writes through `core/storage/local-adapter.js` from inside Core, and
 * fulfilling `core/storage/node-store.js`'s own header comment, which names
 * "future `core/store/` UI hooks" as its intended caller. ADR-015 already
 * settled that `core/store/` may import other Core modules — Rule 11 only
 * forbids importing Preact/UI into Core — so no new ADR is needed here.
 *
 * IndexedDB is inherently async, unlike LocalStorage, so this cannot be a
 * Sync read/write-through like `settings-state.js`'s. Every mutator still
 * updates the in-memory Sync store FIRST and returns immediately — no
 * Selector or `getState()` call here ever becomes a Promise — then fires the
 * matching `node-store.js` write in the background. Background writes are
 * serialized through one `pending` chain (so e.g. a fast double-Parse lands
 * in IndexedDB in the same order it was applied in memory) and never throw:
 * failures are reported via `onPersistError` (default `console.error`), not
 * propagated, since nothing here awaits them. `hydrate()` is the read-side
 * counterpart — called once on app mount (`ui/main.tsx`) to load whatever
 * `core/storage/` already has into this Sync store, instead of starting
 * empty. `whenIdle()` exists only so tests can deterministically wait for a
 * background write before asserting on it; production code never calls it.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {{ nodes: readonly UNMNode[] }} ParserState
 */

import { createStore } from "./create-store.js";
import { createNodeStore } from "../storage/node-store.js";

/** @returns {ParserState} */
function emptyState() {
  return { nodes: [] };
}

/** @param {unknown} error */
function defaultOnPersistError(error) {
  console.error("parser-state: background persistence to node-store failed", error);
}

/**
 * @param {{
 *   nodeStore?: ReturnType<typeof createNodeStore>,
 *   onPersistError?: (error: unknown) => void,
 * }} [options]
 * @returns {{
 *   getState: () => ParserState,
 *   subscribe: (listener: (state: ParserState) => void) => () => void,
 *   setNodes: (nodes: readonly UNMNode[]) => void,
 *   addNode: (node: UNMNode) => void,
 *   updateNode: (nodeId: string, next: UNMNode) => void,
 *   clearNodes: () => void,
 *   hydrate: () => Promise<void>,
 *   whenIdle: () => Promise<void>,
 * }}
 */
export function createParserStore(options = {}) {
  const nodeStore = options.nodeStore ?? createNodeStore();
  const onPersistError = options.onPersistError ?? defaultOnPersistError;
  const store = createStore(emptyState());

  /** Serializes background writes (so they land in IndexedDB in the same order they were applied in memory); never rejects. */
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

    /** @param {readonly UNMNode[]} nodes */
    setNodes(nodes) {
      store.setState({ nodes });
      persist(async () => {
        await nodeStore.deleteAllNodes();
        await nodeStore.saveNodes(/** @type {any} */ (nodes));
      });
    },

    /** @param {UNMNode} node */
    addNode(node) {
      store.setState((prev) => ({ nodes: [...prev.nodes, node] }));
      persist(() => nodeStore.saveNode(/** @type {any} */ (node)));
    },

    /**
     * Replace one node by id with a new immutable instance (e.g. after
     * `applyValidation`/the Analyzer attach a fresh node — Rule 8, never
     * mutate the original).
     * @param {string} nodeId
     * @param {UNMNode} next
     */
    updateNode(nodeId, next) {
      store.setState((prev) => ({
        nodes: prev.nodes.map((n) => (n.nodeId === nodeId ? next : n)),
      }));
      persist(() => nodeStore.saveNode(/** @type {any} */ (next)));
    },

    clearNodes() {
      store.setState(emptyState());
      persist(() => nodeStore.deleteAllNodes());
    },

    /** Loads whatever `core/storage/` already has into this Sync store. Reports (never throws) on read failure. */
    async hydrate() {
      try {
        const nodes = await nodeStore.getAllNodes();
        store.setState({ nodes: /** @type {any} */ (nodes) });
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
