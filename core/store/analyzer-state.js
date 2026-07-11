/**
 * Analyzer State — the in-memory per-node Analyzer verdict bundle the
 * Analyzer Screen (Phase 9, 07-UI_UX_SYSTEM §4.3) reads from.
 *
 * Deliberately NOT stored on `UNMNode.analysis`: that field is frozen to the
 * spec-05 §4 `AnalysisObject` shape (riskScore, securityScore,
 * compatibilityScore, cloudflareDetected, realityDetected, workerDetected,
 * cleanIPDetected, dnsLeakRisk), while `core/analyzer/analyze-node.js`'s
 * `analyzeBatch` deliberately returns only the six Core modules' raw verdict
 * bundle (`AnalysisBundle`) today — assembling the full `AnalysisObject`
 * needs Phase 10's semi-definitive modules + Final Report aggregation
 * (Rule 9: never invent data). Keeping the bundle in its own store, keyed by
 * `nodeId`, lets the Analyzer Screen display real, already-computed verdicts
 * now without writing a wrong-shaped/fabricated value onto `node.analysis`.
 *
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 * @typedef {{ analysisByNodeId: Readonly<Record<string, AnalysisBundle>> }} AnalyzerState
 */

import { createStore } from "./create-store.js";

/** @returns {AnalyzerState} */
function emptyState() {
  return { analysisByNodeId: {} };
}

/**
 * @returns {{
 *   getState: () => AnalyzerState,
 *   subscribe: (listener: (state: AnalyzerState) => void) => () => void,
 *   setAnalysisBatch: (entries: readonly { nodeId: string, analysis: AnalysisBundle }[]) => void,
 *   clearAnalysis: () => void,
 * }}
 */
export function createAnalyzerStore() {
  const store = createStore(emptyState());

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    /**
     * Merge a batch of fresh verdicts in by nodeId (Rule 8 — each value
     * replaces the previous one for that id, never mutated in place).
     * @param {readonly { nodeId: string, analysis: AnalysisBundle }[]} entries
     */
    setAnalysisBatch(entries) {
      store.setState((prev) => {
        const next = { ...prev.analysisByNodeId };
        for (const { nodeId, analysis } of entries) next[nodeId] = analysis;
        return { analysisByNodeId: next };
      });
    },

    clearAnalysis() {
      store.setState(emptyState());
    },
  };
}
