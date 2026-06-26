/**
 * AnalyzerWorker — REAL wrapper (09-DEVELOPMENT_ROADMAP Phase 6 Core complete;
 * worker wired in alongside Phase 7 Item 5). The Analyzer Engine's six
 * Spec-قطعی Core modules (Completeness/Protocol/Network/TLS/Reality/Security)
 * are complete and frozen since Phase 6; this file adds zero analysis logic
 * of its own (ADR-003) — it only calls `analyzeBatch` (`core/analyzer/
 * analyze-node.js`), exactly mirroring how `parser.worker.js` wraps
 * `parseWithFallback`/`normalizeAll` and `converter.worker.js` wraps
 * `convertBatch`.
 *
 * Input payload: `{ nodes: UNMNode[] }` — the parsed nodes to analyze.
 * Output result: `{ analyzed: { nodeId, analysis }[] }`, where `analysis` is
 * the six-module verdict bundle `analyzeNode` produces. (That bundle is NOT
 * yet a complete spec-05-§4 `AnalysisObject`: the six Core modules can fill
 * only `securityScore` today; the rest of `AnalysisObject` needs §2's
 * semi-definitive modules + Final Report aggregation — future phases — and
 * fabricating them would violate Rule 9. See `analyze-node.js`.)
 */
import { analyzeBatch } from "../analyzer/analyze-node.js";
import { createWorkerEntry } from "./shared/handler-envelope.js";

/**
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */

/**
 * @param {unknown} payload
 */
function processAnalyzerPayload(payload) {
  const { nodes } = /** @type {{ nodes?: unknown }} */ (payload || {});
  if (!Array.isArray(nodes)) {
    throw new Error("analyzer.worker: payload.nodes must be an array (WORKER_CONTRACT_VIOLATION)");
  }
  return analyzeBatch(/** @type {UNMNode[]} */ (nodes));
}

/** Pure, directly-callable handler; also self-wires to `self.onmessage` under feature detection. */
export const handleAnalyzerJob = createWorkerEntry(processAnalyzerPayload);
