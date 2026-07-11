/**
 * Protocol Analyzer — 06-ANALYZER_ENGINE §1.1.
 *
 * Scope boundary (§1.1's explicit warning): "Protocol" here is NOT "Format".
 * `Xray JSON` / `Sing-box JSON` / `Clash YAML` are Formats — detecting those
 * from raw text is the Format Detector's job (04-PARSER_ENGINE). `VLESS` /
 * `VMess` / `Trojan` / `Shadowsocks` / `Hysteria2` / `TUIC` / `WireGuard` are
 * Protocols — detecting/confirming those is THIS module's job, and it works
 * exclusively on already-parsed UNM data (`node.protocol`), never on a raw
 * file. The two concepts/layers must never be conflated.
 *
 * `node.protocol` is already a required, parser-set `UNMNode` field —
 * `createNode` enforces `isProtocol` at construction (`core/unm/create-node.js`)
 * — so for any node built through the normal Parser pipeline this module's
 * `recognized` flag is always true. It still earns its place as an
 * independent boundary check: like every Analyzer, this module will
 * eventually be wrapped by `analyzer.worker.js` (ADR-003) and the Network/
 * TLS/Reality/Security Analyzers built after it (§1.2-§1.5) consume its
 * confirmation rather than re-trusting `node.protocol` blindly. Pure & Sync,
 * mirroring `data-completeness.js`.
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../types").ProtocolAnalysis} ProtocolAnalysis
 */

import { isProtocol } from "../../unm/schema/enums.js";

/**
 * Run the Protocol Analyzer on one node.
 * @param {UNMNode} node
 * @returns {ProtocolAnalysis}
 */
export function analyzeProtocol(node) {
  return {
    protocol: node.protocol,
    recognized: isProtocol(node.protocol),
  };
}
