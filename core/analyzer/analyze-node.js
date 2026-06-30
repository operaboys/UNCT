/**
 * Analyzer Engine — chain composition + batch entry point
 * (06-ANALYZER_ENGINE §1.0-§1.5, §2.6; 09-DEVELOPMENT_ROADMAP). The six
 * Spec-قطعی Core analyzers (Completeness/Protocol/Network/TLS/Reality/
 * Security) are complete and frozen since Phase 6; this module adds NO new
 * analysis judgment of its own for those six — it only THREADS them in their
 * natural dependency order so each downstream module consumes the upstream
 * verdict instead of recomputing it (the §1.0 consumption rule), exactly as
 * the end-to-end chain test already validated. Phase 10 adds the Compatibility
 * Analyzer (§2.6, the first نیمه‌قطعی/Extended module) alongside them — it
 * reads only `node` directly, with no dependency on the other six's verdicts
 * (Client/Platform Compatibility is its own, orthogonal question; see
 * `extended/compatibility-analyzer.js`'s own boundary notes). It lives in
 * `core/` (not in `analyzer.worker.js`) per Separation of Concerns — the
 * Worker is a thin wrapper around this, mirroring how `converter.worker.js`
 * wraps `convertBatch` (ADR-003).
 *
 * What it returns (and deliberately does NOT): the six §1 modules together
 * can fill exactly ONE of `AnalysisObject`'s frozen fields today —
 * `securityScore` (06 §1.2 / ADR-011) — plus the honestly-derivable
 * `realityDetected` (security === "reality"); the Compatibility Analyzer maps
 * onto `AnalysisObject.compatibilityScore` conceptually but does not produce
 * that single 0-100 number itself (06 §3's risk-scoring formula is still an
 * open flag, not this module's job to resolve). The remaining `AnalysisObject`
 * fields (`riskScore`, `compatibilityScore`, `cloudflareDetected`,
 * `workerDetected`, `cleanIPDetected`, `dnsLeakRisk`) come from the rest of
 * §2's semi-definitive modules and the Final Report aggregation — future
 * phases — so this module returns the analyzers' raw verdict bundle rather
 * than fabricating those values into a full `AnalysisObject` (Rule 9: never
 * invent data). Assembling the complete `AnalysisObject` is a later phase's
 * job once its remaining inputs exist.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("./types").CompletenessResult} CompletenessResult
 * @typedef {import("./types").ProtocolAnalysis} ProtocolAnalysis
 * @typedef {import("./types").NetworkAnalysis} NetworkAnalysis
 * @typedef {import("./types").TlsAnalysis} TlsAnalysis
 * @typedef {import("./types").RealityAnalysis} RealityAnalysis
 * @typedef {import("./types").SecurityAnalysis} SecurityAnalysis
 * @typedef {import("./types").CompatibilityAnalysis} CompatibilityAnalysis
 * @typedef {import("./types").CloudflareAnalysis} CloudflareAnalysis
 * @typedef {import("./types").CleanIpAnalysis} CleanIpAnalysis
 * @typedef {{ completeness: CompletenessResult, protocol: ProtocolAnalysis, network: NetworkAnalysis, tls: TlsAnalysis, reality: RealityAnalysis, security: SecurityAnalysis, compatibility: CompatibilityAnalysis, cloudflare: CloudflareAnalysis, cleanIp: CleanIpAnalysis }} AnalysisBundle
 */

import { analyzeCompleteness } from "./core/data-completeness.js";
import { analyzeProtocol } from "./core/protocol-analyzer.js";
import { analyzeNetwork } from "./core/network-analyzer.js";
import { analyzeTls } from "./core/tls-analyzer.js";
import { analyzeReality } from "./core/reality-analyzer.js";
import { analyzeSecurity } from "./core/security-analyzer.js";
import { analyzeCompatibility } from "./extended/compatibility-analyzer.js";
import { analyzeCloudflare } from "./extended/cloudflare-analyzer.js";
import { analyzeCleanIp } from "./extended/clean-ip-analyzer.js";

/**
 * Run all six Phase 6 Core analyzers plus the Phase 10 Extended analyzers
 * (Compatibility, Cloudflare, Clean IP) over one node, threading each upstream
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
  const compatibility = analyzeCompatibility(node);
  const cloudflare = analyzeCloudflare(node);
  const cleanIp = analyzeCleanIp(node);
  return { completeness, protocol, network, tls, reality, security, compatibility, cloudflare, cleanIp };
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
