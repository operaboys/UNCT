/**
 * Analyzer Engine — chain composition + batch entry point
 * (06-ANALYZER_ENGINE §1.0-§1.5; 09-DEVELOPMENT_ROADMAP). The six Spec-قطعی
 * Core analyzers (Completeness/Protocol/Network/TLS/Reality/Security) are
 * complete and frozen since Phase 6; this module adds NO new analysis
 * judgment of its own — it only THREADS them in their natural dependency
 * order so each downstream module consumes the upstream verdict instead of
 * recomputing it (the §1.0 consumption rule), exactly as the end-to-end
 * chain test already validated. It lives in `core/` (not in
 * `analyzer.worker.js`) per Separation of Concerns — the Worker is a thin
 * wrapper around this, mirroring how `converter.worker.js` wraps
 * `convertBatch` (ADR-003).
 *
 * What it returns (and deliberately does NOT): the six modules together can
 * fill exactly ONE of `AnalysisObject`'s frozen fields today —
 * `securityScore` (06 §1.2 / ADR-011) — plus the honestly-derivable
 * `realityDetected` (security === "reality"). The remaining `AnalysisObject`
 * fields (`riskScore`, `compatibilityScore`, `cloudflareDetected`,
 * `workerDetected`, `cleanIPDetected`, `dnsLeakRisk`) come from §2's
 * semi-definitive modules and the Final Report aggregation — future phases —
 * so this module returns the analyzers' raw verdict bundle rather than
 * fabricating those values into a full `AnalysisObject` (Rule 9: never invent
 * data). Assembling the complete `AnalysisObject` is a later phase's job once
 * its remaining inputs exist.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("./types").CompletenessResult} CompletenessResult
 * @typedef {import("./types").ProtocolAnalysis} ProtocolAnalysis
 * @typedef {import("./types").NetworkAnalysis} NetworkAnalysis
 * @typedef {import("./types").TlsAnalysis} TlsAnalysis
 * @typedef {import("./types").RealityAnalysis} RealityAnalysis
 * @typedef {import("./types").SecurityAnalysis} SecurityAnalysis
 * @typedef {{ completeness: CompletenessResult, protocol: ProtocolAnalysis, network: NetworkAnalysis, tls: TlsAnalysis, reality: RealityAnalysis, security: SecurityAnalysis }} AnalysisBundle
 */

import { analyzeCompleteness } from "./core/data-completeness.js";
import { analyzeProtocol } from "./core/protocol-analyzer.js";
import { analyzeNetwork } from "./core/network-analyzer.js";
import { analyzeTls } from "./core/tls-analyzer.js";
import { analyzeReality } from "./core/reality-analyzer.js";
import { analyzeSecurity } from "./core/security-analyzer.js";

/**
 * Run all six Phase 6 Core analyzers over one node, threading each upstream
 * verdict into the next (no redundant recomputation).
 * @param {UNMNode} node
 * @returns {AnalysisBundle}
 */
export function analyzeNode(node) {
  const completeness = analyzeCompleteness(node);
  const protocol = analyzeProtocol(node);
  const network = analyzeNetwork(node);
  const tls = analyzeTls(node, completeness);
  const reality = analyzeReality(node, completeness, tls);
  const security = analyzeSecurity(node, completeness, tls, reality);
  return { completeness, protocol, network, tls, reality, security };
}

/**
 * Analyze a collection of nodes — the batch entry point the Analyzer Worker
 * wraps. Every node built through the Parser pipeline carries a known
 * protocol, so (unlike Batch Conversion) there is nothing to skip; each node
 * yields one bundle, keyed by its own `nodeId`.
 * @param {readonly UNMNode[]} nodes
 * @returns {{ analyzed: { nodeId: string, analysis: AnalysisBundle }[] }}
 */
export function analyzeBatch(nodes) {
  return { analyzed: nodes.map((node) => ({ nodeId: node.nodeId, analysis: analyzeNode(node) })) };
}
