/**
 * Parser/Validation State — the in-memory working set of `UNMNode`s produced
 * by the current Parse operation (Import screen, Phase 9). Each node already
 * carries its own `validation` (always present) and `analysis` (once the
 * Analyzer has run) inline, per UNM (05-UNIVERSAL_NODE_MODEL) — this store
 * does not duplicate either; it only holds the node collection itself.
 *
 * Distinct from `core/storage/` (ADR-013): that is the durable,
 * cross-session IndexedDB-backed collection. This store is the transient,
 * current-session set a screen is actively working with — committing it to
 * `core/storage/` is a separate, explicit action a screen takes.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {{ nodes: readonly UNMNode[] }} ParserState
 */

import { createStore } from "./create-store.js";

/** @returns {ParserState} */
function emptyState() {
  return { nodes: [] };
}

/**
 * @returns {{
 *   getState: () => ParserState,
 *   subscribe: (listener: (state: ParserState) => void) => () => void,
 *   setNodes: (nodes: readonly UNMNode[]) => void,
 *   addNode: (node: UNMNode) => void,
 *   updateNode: (nodeId: string, next: UNMNode) => void,
 *   clearNodes: () => void,
 * }}
 */
export function createParserStore() {
  const store = createStore(emptyState());

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /** @param {readonly UNMNode[]} nodes */
    setNodes(nodes) {
      store.setState({ nodes });
    },

    /** @param {UNMNode} node */
    addNode(node) {
      store.setState((prev) => ({ nodes: [...prev.nodes, node] }));
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
    },

    clearNodes() {
      store.setState(emptyState());
    },
  };
}
