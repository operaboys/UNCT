/**
 * Storage Abstraction Layer — the ONLY public entry point for persisting
 * UNMNodes (09-DEVELOPMENT_ROADMAP Phase 8; ADR-013). Every caller (future
 * `core/store/` UI hooks in Phase 9, tests, anything else) talks to
 * `createNodeStore()`'s returned methods — never to `idb-adapter.js` or
 * `indexedDB` directly. That indirection is the whole point: swapping the
 * engine (raw IndexedDB today, an optional Dexie adapter later per
 * 14-DEPENDENCY_POLICY §4) means changing the `adapter` this factory is
 * built with, not the methods below.
 *
 * Rule 9 (never invent data) applies here too: a `UNMNode`'s `analysis`,
 * `validation`, and `conversion` sub-objects are persisted exactly as given —
 * whatever shape they actually have today (e.g. `analysis` is currently the
 * raw six-module Bundle from `core/analyzer/analyze-node.js`, NOT a complete
 * spec-05 `AnalysisObject`). This module performs zero structural validation
 * or coercion against those types; IndexedDB's structured-clone storage
 * already preserves arbitrary nested shapes without help. When a future
 * phase produces a real complete `AnalysisObject`, nothing here needs to
 * change or migrate.
 *
 * Nodes are Immutable (Rule 8). A value read back out of IndexedDB is a
 * fresh structured-clone — never frozen — so this layer re-freezes it before
 * returning, keeping the same Immutability guarantee `createNode()` gives a
 * freshly-built node.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {Omit<UNMNode, "analysis" | "validation" | "conversion"> & {
 *   analysis?: unknown, validation?: unknown, conversion?: unknown,
 * }} StorableNode
 */

import { createIdbAdapter } from "./idb-adapter.js";
import { deepFreeze } from "../unm/create-node.js";

/**
 * @param {unknown} node
 * @param {string} caller
 */
function assertHasNodeId(node, caller) {
  if (!node || typeof node !== "object" || typeof (/** @type {any} */ (node)).nodeId !== "string") {
    throw new Error(`node-store: ${caller} requires a value with a string nodeId (STORAGE_CONTRACT_VIOLATION)`);
  }
}

/**
 * @param {unknown} nodeId
 * @param {string} caller
 */
function assertIsNodeId(nodeId, caller) {
  if (typeof nodeId !== "string" || nodeId.length === 0) {
    throw new Error(`node-store: ${caller} requires a non-empty string nodeId (STORAGE_CONTRACT_VIOLATION)`);
  }
}

/**
 * @param {{
 *   dbName?: string, storeName?: string, version?: number,
 *   adapter?: ReturnType<typeof createIdbAdapter>,
 * }} [options]
 */
export function createNodeStore(options = {}) {
  const adapter = options.adapter ?? createIdbAdapter({
    dbName: options.dbName, storeName: options.storeName, version: options.version,
  });

  /**
   * Upsert one node (insert or overwrite-by-nodeId).
   * @param {StorableNode} node
   * @returns {Promise<StorableNode>}
   */
  async function saveNode(node) {
    assertHasNodeId(node, "saveNode");
    await adapter.put(node);
    return node;
  }

  /**
   * Upsert many nodes in one atomic transaction.
   * @param {readonly StorableNode[]} nodes
   * @returns {Promise<readonly StorableNode[]>}
   */
  async function saveNodes(nodes) {
    for (const node of nodes) assertHasNodeId(node, "saveNodes");
    await adapter.putMany(nodes);
    return nodes;
  }

  /**
   * @param {string} nodeId
   * @returns {Promise<StorableNode | null>}
   */
  async function getNode(nodeId) {
    assertIsNodeId(nodeId, "getNode");
    const result = /** @type {StorableNode | undefined} */ (await adapter.get(nodeId));
    return result === undefined ? null : /** @type {StorableNode} */ (deepFreeze(result));
  }

  /** @returns {Promise<StorableNode[]>} */
  async function getAllNodes() {
    const results = /** @type {StorableNode[]} */ (await adapter.getAll());
    return results.map((node) => /** @type {StorableNode} */ (deepFreeze(node)));
  }

  /**
   * @param {string} nodeId
   * @returns {Promise<void>}
   */
  async function deleteNode(nodeId) {
    assertIsNodeId(nodeId, "deleteNode");
    await adapter.remove(nodeId);
  }

  /** @returns {Promise<void>} */
  async function deleteAllNodes() {
    await adapter.clear();
  }

  /** @returns {Promise<number>} */
  async function countNodes() {
    return adapter.count();
  }

  /** @returns {Promise<void>} */
  async function close() {
    await adapter.close();
  }

  return {
    saveNode, saveNodes, getNode, getAllNodes,
    deleteNode, deleteAllNodes, countNodes, close,
  };
}
