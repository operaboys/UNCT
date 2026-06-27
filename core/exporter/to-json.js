/**
 * JSON Export — Export Engine (08-EXPORT_ENGINE §3, ADR-004). Doc 08 §3 lists
 * four JSON variants:
 *
 *  - Xray JSON / Sing-box JSON: a single multi-outbound config, built by
 *    reusing the Converter Engine's existing per-node serializers
 *    (`to-xray.js`/`to-singbox.js` via `convertBatch`, ADR-012) and merging
 *    each one's single-element `outbounds` array — no new serialization
 *    logic, just batching what already exists.
 *  - Normalized JSON: the `UNMNode`s themselves, verbatim. This is the
 *    Round-Trip-eligible variant 08 §1 requires ("Export → Import → UNM"
 *    must reproduce the original node) — UNM is already the canonical,
 *    lossless form, so this export is a direct `JSON.stringify`, not a
 *    transformation.
 *  - Analysis JSON: the Analyzer's verdict bundles (`AnalyzerState.
 *    analysisByNodeId`, core/store/analyzer-state.js) verbatim — a one-way
 *    report export (08 §1's carve-out: not meant for re-import), so it is
 *    also a direct `JSON.stringify`, never a re-derived score.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 * @typedef {import("../analyzer/analyze-node.js").AnalysisBundle} AnalysisBundle
 */
import { convertBatch } from "../converter/conversion.js";
import { withSkipReason } from "./skip-reason.js";

/**
 * @param {readonly UNMNode[]} nodes
 * @param {"xrayJson" | "singboxJson"} format
 * @param {string} formatLabel
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
function exportOutboundsJson(nodes, format, formatLabel) {
  const { converted, skipped } = convertBatch(nodes, format);
  const outbounds = converted.flatMap((c) => JSON.parse(c.output).outbounds);
  return { content: JSON.stringify({ outbounds }), skipped: withSkipReason(skipped, formatLabel) };
}

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function exportXrayJson(nodes) {
  return exportOutboundsJson(nodes, "xrayJson", "Xray JSON");
}

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function exportSingboxJson(nodes) {
  return exportOutboundsJson(nodes, "singboxJson", "Sing-box JSON");
}

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {string}
 */
export function exportNormalizedJson(nodes) {
  return JSON.stringify(nodes);
}

/**
 * @param {Readonly<Record<string, AnalysisBundle>>} analysisByNodeId
 * @returns {string}
 */
export function exportAnalysisJson(analysisByNodeId) {
  return JSON.stringify(analysisByNodeId);
}
