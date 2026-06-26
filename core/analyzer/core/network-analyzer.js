/**
 * Network Analyzer — 06-ANALYZER_ENGINE §1.4.
 *
 * Question (§1.4): is the node's transport `network` (ws/grpc/tcp/...) one the
 * *selected protocol* can actually run over? This is a COMPATIBILITY check, on
 * UNM data only — distinct from:
 *  - validity (is `network` a well-formed value? — Validation Engine, spec 04),
 *  - quality scoring (Security/Reality Analyzer, §1.2/§1.5).
 *
 * Two protocol families behave differently here, and conflating them would
 * produce false positives on every real node:
 *
 *  1. Stream-transport protocols (vless/vmess/trojan) genuinely *choose* a
 *     transport via the Xray/sing-box `streamSettings` layer — tcp, ws, grpc,
 *     http-upgrade, kcp, xhttp, quic are all real options to validate against.
 *  2. Self-transporting protocols (hysteria2/tuic over QUIC, wireguard over its
 *     own UDP) carry NO separate transport. Their config formats have no
 *     transport field, so the Parser leaves them at `DEFAULT_NETWORK` ("tcp")
 *     — see `core/unm/schema/defaults.js`. For these, "tcp" is the neutral
 *     default and the only compatible network; an explicit ws/grpc/etc. on
 *     such a node is meaningless and flagged. (Shadowsocks is native-tcp but
 *     can ride ws/grpc via a v2ray-style plugin, so it allows those too.)
 *
 * Pure & Sync, mirroring `data-completeness.js` / `protocol-analyzer.js`;
 * eventually wrapped by `analyzer.worker.js` (ADR-003).
 *
 * @typedef {import("../../types/unm").UNMNode} UNMNode
 * @typedef {import("../../types/unm").Protocol} Protocol
 * @typedef {import("../../types/unm").NetworkType} NetworkType
 * @typedef {import("../types").NetworkAnalysis} NetworkAnalysis
 */

import { isProtocol } from "../../unm/schema/enums.js";

/** Full Xray/sing-box streamSettings transport set (vless/vmess/trojan). */
const STREAM_TRANSPORTS = Object.freeze(
  /** @type {NetworkType[]} */ (["tcp", "ws", "grpc", "http-upgrade", "kcp", "xhttp", "quic"]),
);

/**
 * The compatibility matrix: which transports each protocol can run over. This
 * is the single source of truth other analyzers read instead of re-deriving
 * protocol↔transport rules (mirrors `relevantFields` in data-completeness.js).
 * @type {Readonly<Record<Protocol, readonly NetworkType[]>>}
 */
const SUPPORTED_BY_PROTOCOL = Object.freeze({
  vless: STREAM_TRANSPORTS,
  vmess: STREAM_TRANSPORTS,
  trojan: STREAM_TRANSPORTS,
  // Native tcp, plus ws/grpc when carried by a v2ray-style plugin.
  shadowsocks: Object.freeze(/** @type {NetworkType[]} */ (["tcp", "ws", "grpc"])),
  // Self-transporting (QUIC / WireGuard UDP): no streamSettings transport, so
  // only the neutral default "tcp" the Parser assigns is compatible.
  hysteria2: Object.freeze(/** @type {NetworkType[]} */ (["tcp"])),
  tuic: Object.freeze(/** @type {NetworkType[]} */ (["tcp"])),
  wireguard: Object.freeze(/** @type {NetworkType[]} */ (["tcp"])),
});

/**
 * The transports a protocol can run over — the compatibility set. Returns an
 * empty list for an unrecognized protocol (so `compatible` is false rather
 * than throwing).
 * @param {Protocol} protocol
 * @returns {NetworkType[]}
 */
export function supportedNetworks(protocol) {
  if (!isProtocol(protocol)) return [];
  return [...SUPPORTED_BY_PROTOCOL[protocol]];
}

/**
 * Run the Network Analyzer on one node.
 * @param {UNMNode} node
 * @returns {NetworkAnalysis}
 */
export function analyzeNetwork(node) {
  const supported = supportedNetworks(node.protocol);
  return {
    network: node.network,
    protocol: node.protocol,
    compatible: supported.includes(node.network),
    supportedNetworks: supported,
  };
}
