/**
 * Performance State — pool-level operational metrics for the three Worker
 * pools (Parser / Analyzer / Converter), consumed by the Developer Console
 * Performance Logs section (07-UI_UX_SYSTEM §4.7, Phase 12 P12-2).
 *
 * Deliberately NOT a node-level store: this holds `PoolStats` snapshots, not
 * UNMNode data. The same Pub/Sub primitive (`createStore`) as every other
 * domain store (ADR-015) is used here for consistency. Preact-free (Rule 11).
 *
 * @typedef {import("../worker/worker-manager.js").PoolStats} PoolStats
 * @typedef {"parser"|"analyzer"|"converter"} PoolName
 * @typedef {{ pools: Partial<Record<PoolName, PoolStats>> }} PerformanceState
 */

import { createStore } from "./create-store.js";

/** @returns {PerformanceState} */
function emptyState() {
  return { pools: {} };
}

/**
 * @returns {{
 *   getState: () => PerformanceState,
 *   subscribe: (listener: (state: PerformanceState) => void) => () => void,
 *   recordPoolStats: (poolName: PoolName, stats: PoolStats) => void,
 *   clearStats: () => void,
 * }}
 */
export function createPerformanceStore() {
  const store = createStore(emptyState());

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /**
     * Merge a fresh snapshot for one pool, preserving the other pools' last
     * known values (same merge-not-replace pattern as `setAnalysisBatch`).
     * @param {PoolName} poolName
     * @param {PoolStats} stats
     */
    recordPoolStats(poolName, stats) {
      store.setState((prev) => ({
        pools: { ...prev.pools, [poolName]: stats },
      }));
    },

    clearStats() {
      store.setState(emptyState());
    },
  };
}
