/**
 * TXT Export — Export Engine (08-EXPORT_ENGINE §2, ADR-004: Exporter lives in
 * `core/`, not `ui/`). Doc 08 §2 scope: "VLESS, VMESS, Trojan, SS, TUIC,
 * Hysteria2, WireGuard, Mixed Lists" — exactly the protocol set
 * `to-url.js`'s `URL_SUPPORTED_PROTOCOLS` already covers, so TXT Export is
 * one URL per line, reusing the Converter Engine's existing Batch Conversion
 * (`convertBatch`, ADR-012) rather than re-deriving per-node serialization.
 * "Mixed Lists" is the natural result of batching nodes of different
 * protocols through the SAME `url` format — no extra branching needed.
 *
 * `skipped` (08's "Export Anything, Lose Nothing" mission) surfaces any node
 * `convertBatch` could not represent as a URL, so the caller can warn the
 * user instead of silently dropping it.
 *
 * @typedef {import("../types/unm").UNMNode} UNMNode
 */
import { convertBatch } from "../converter/conversion.js";
import { withSkipReason } from "./skip-reason.js";

/**
 * @param {readonly UNMNode[]} nodes
 * @returns {{ content: string, skipped: {nodeId: string, protocol: string, reason: string}[] }}
 */
export function exportTxt(nodes) {
  const { converted, skipped } = convertBatch(nodes, "url");
  return { content: converted.map((c) => c.output).join("\n"), skipped: withSkipReason(skipped, "TXT") };
}
