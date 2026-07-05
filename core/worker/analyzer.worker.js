/**
 * AnalyzerWorker — REAL wrapper (09-DEVELOPMENT_ROADMAP Phase 6 Core complete;
 * worker wired in alongside Phase 7 Item 5; Phase 10 adds the Compatibility
 * Analyzer). The Analyzer Engine's six Spec-قطعی Core modules (Completeness/
 * Protocol/Network/TLS/Reality/Security) plus the Phase 10 Compatibility
 * Analyzer (06 §2.6, the first نیمه‌قطعی module) are wired in; this file adds
 * zero analysis logic of its own (ADR-003) — it only calls `analyzeBatch`
 * (`core/analyzer/analyze-node.js`), exactly mirroring how `parser.worker.js`
 * wraps `parseWithFallback`/`normalizeAll` and `converter.worker.js` wraps
 * `convertBatch`. Adding the Compatibility Analyzer required NO change here —
 * `analyzeBatch` already threads through whatever `analyzeNode` returns.
 *
 * Input payload: `{ nodes: UNMNode[] }` — the parsed nodes to analyze.
 * Output result: `{ analyzed: { nodeId, analysis }[] }`, where `analysis` is
 * the full verdict bundle `analyzeNode` produces — now including the ADR-022
 * DNS Analyzer's `dns` field and the ADR-027 `compatibilityScore`/`riskScore`
 * fields, no change needed here either, same reason as Compatibility above.
 * (That bundle is still NOT a complete spec-05-§4 `AnalysisObject`: the
 * remaining fields — `cloudflareDetected`/`workerDetected`/`cleanIPDetected`
 * as single booleans, plus the still-unbuilt Final Report's Summary/
 * Warnings/Recommendations — need the rest of §2's semi-definitive modules
 * and a future Final Report phase; fabricating them would violate Rule 9.
 * See `analyze-node.js`/`risk-score.js`.)
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
